from __future__ import annotations
from .llm_config import LLMConfig
from .llm_provider import provider_set
from typing import Any
import requests
import time


class OutputTokenLimitError(RuntimeError):
    """A response was truncated; changing transport cannot complete it."""

    def __init__(self, message: str, partial_response: str = ""):
        super().__init__(message)
        self.partial_response = partial_response


class LLMRouter:
    def __init__(self,system_prompt: str, cfg: LLMConfig,is_history:bool=False):
        self.cfg = cfg
        self.provider = cfg.provider.lower().strip()
        self.system_prompt = system_prompt
        self.is_history=is_history

        # Use one shared history variable across native and OpenAI-compatible paths.
        self.conversation = []
        self.last_generation_info: dict[str, Any] = {}
        self._last_usage: dict[str, int] = {}

        if self.provider not in provider_set:
            self.provider="other"

        # Validate before building clients.
        if not cfg.model:
            raise ValueError("model cannot be empty")

        if not cfg.api_key and self.provider not in ("ollama","vllm"):
            raise ValueError("api_key cannot be empty")

        self.client = self._build_client()
        self.claude_client=self._build_claude_client()

    def _build_client(self):
        provider = self.provider
        base_url = self._effective_base_url()

        # 1) Official OpenAI
        if provider == "openai":
            from openai import OpenAI

            kwargs: dict[str, Any] = {
                "api_key": self.cfg.api_key,
                "timeout": self.cfg.timeout,
            }
            if base_url:
                kwargs["base_url"] = base_url

            return OpenAI(**kwargs)

        # 2) OpenAI-compatible backends.
        # Framework convention: deepseek / ollama / vllm / other are treated as
        # OpenAI-compatible endpoints here.
        elif provider in ("ollama", "vllm", "claude","other"):
            from openai import OpenAI

            if not base_url:
                raise ValueError(
                    f"{provider} requires base_url for OpenAI-compatible endpoint access"
                )

            kwargs: dict[str, Any] = {
                "api_key": self.cfg.api_key or "EMPTY",
                "timeout": self.cfg.timeout,
                "base_url": base_url,
            }
            # Study services are exposed on an intranet address.  Do not inherit a
            # desktop SOCKS/HTTP proxy here: an absent socksio extra otherwise
            # prevents the OpenAI client from making any request at all.
            if provider == "vllm":
                import httpx
                kwargs["http_client"] = httpx.Client(trust_env=False, timeout=self.cfg.timeout)
            return OpenAI(**kwargs)

        # 3) Gemini
        elif provider == "gemini":
            from google import genai
            from google.genai import types

            kwargs: dict[str, Any] = {
                "api_key": self.cfg.api_key,
            }

            # Gemini custom base_url uses http_options.
            if base_url:
                kwargs["http_options"] = types.HttpOptions(
                    base_url=base_url
                )

            return genai.Client(**kwargs)

        raise ValueError(f"Unsupported provider: {provider}")

    def _build_claude_client(self):
        provider=self.provider
        base_url = getattr(self.cfg, "base_url", None)
        if base_url:
            base_url = base_url.rstrip("/")
            if base_url.endswith("/v1"):
                base_url = base_url[:-3]
        # 4) Claude uses a separate native client.
        if provider == "claude":
            from anthropic import Anthropic
            kwargs: dict[str, Any] = {
                "api_key": self.cfg.api_key,
            }
            if base_url:
                kwargs["base_url"] = base_url

            return Anthropic(**kwargs)
        else:
            return None

    def close(self):
        for name in ("client", "claude_client"):
            obj = getattr(self, name, None)
            if obj is not None:
                try:
                    obj.close()
                except Exception:
                    pass
                
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

    # ---------------------------
    # Public API
    # ---------------------------
    def generate(
        self,
        user_prompt: str,
        *,
        extra_body: dict[str, Any] | None = None,
    ) -> str:
        """
        Wait for a complete response, falling back in provider strategy order.
        """
        errors: list[str] = []
        started_at = time.perf_counter()
        self._last_usage = {}
        self._last_finish_reason = None

        for step in self._strategy_order():
            try:
                if step == "gemini_native":
                    answer = self._gemini_native(user_prompt)

                elif step == "claude_native":
                    answer = self._claude_native(user_prompt)

                elif step == "sdk_responses":
                    answer = self._openai_sdk_responses(user_prompt, extra_body=extra_body)

                elif step == "sdk_chat":
                    answer = self._openai_sdk_chat(user_prompt, extra_body=extra_body)

                elif step == "http_responses":
                    answer = self._http_responses(user_prompt, extra_body=extra_body)

                elif step == "http_chat":
                    answer = self._http_chat(user_prompt, extra_body=extra_body)
                else:
                    errors.append(f"{step}: unknown strategy")
                    continue
                self.last_generation_info = {
                    "duration_ms": round((time.perf_counter() - started_at) * 1000),
                    "strategy": step,
                    "usage": dict(self._last_usage),
                    "finish_reason": self._last_finish_reason,
                    "max_output_tokens": self.cfg.max_tokens,
                    "fallback_errors": list(errors),
                }
                return answer
            except OutputTokenLimitError as exc:
                self._record_output_limit(started_at, step, exc)
                raise
            except Exception as exc:
                errors.append(f"{step}: {type(exc).__name__}: {exc}")

        self.last_generation_info = {
            "duration_ms": round((time.perf_counter() - started_at) * 1000),
            "strategy": "",
            "usage": dict(self._last_usage),
            "errors": errors,
        }
        raise RuntimeError("All invocation strategies failed:\n" + "\n".join(errors))

    def _record_output_limit(self, started_at: float, strategy: str, exc: Exception) -> None:
        self.last_generation_info = {
            "duration_ms": round((time.perf_counter() - started_at) * 1000),
            "strategy": strategy, "usage": dict(self._last_usage),
            "finish_reason": "length", "truncated": True,
            "max_output_tokens": self.cfg.max_tokens, "errors": [str(exc)],
            "raw_response": getattr(exc, "partial_response", ""),
        }

    def _check_output_limit(self, finish_reason: str | None, partial_response: str = "") -> None:
        self._last_finish_reason = finish_reason
        if finish_reason in {"length", "max_output_tokens"}:
            raise OutputTokenLimitError(
                f"Model output reached the {self.cfg.max_tokens}-token output limit and was truncated. "
                "The incomplete output was not accepted. Shorten the requested output or increase "
                "the stage output budget before retrying.",
                partial_response=partial_response,
            )

    def _check_responses_limit(self, response: Any, partial_response: str = "") -> None:
        details = response.get("incomplete_details") if isinstance(response, dict) else getattr(response, "incomplete_details", None)
        reason = details.get("reason") if isinstance(details, dict) else getattr(details, "reason", None)
        if not partial_response and reason == "max_output_tokens":
            if isinstance(response, dict):
                try:
                    partial_response = self._extract_text_from_responses_json(response)
                except RuntimeError:
                    partial_response = ""
            else:
                partial_response = getattr(response, "output_text", "") or ""
        self._check_output_limit(reason, partial_response)

    def generation_info(self) -> dict[str, Any]:
        """Return metadata for the most recent generation without exposing credentials."""
        return dict(self.last_generation_info)

    def _remember_usage(self, usage: Any) -> None:
        if usage is None:
            return
        if hasattr(usage, "model_dump"):
            usage = usage.model_dump()
        elif not isinstance(usage, dict):
            usage = {
                key: getattr(usage, key)
                for key in ("prompt_tokens", "completion_tokens", "input_tokens", "output_tokens", "total_tokens")
                if isinstance(getattr(usage, key, None), int)
            }
        if not isinstance(usage, dict):
            return
        aliases = {
            "prompt_tokens": "input_tokens",
            "completion_tokens": "output_tokens",
        }
        normalized: dict[str, int] = {}
        for key in ("input_tokens", "output_tokens", "prompt_tokens", "completion_tokens", "total_tokens"):
            value = usage.get(key)
            if isinstance(value, int):
                normalized[aliases.get(key, key)] = value
        if "total_tokens" not in normalized and normalized.get("input_tokens") is not None and normalized.get("output_tokens") is not None:
            normalized["total_tokens"] = normalized["input_tokens"] + normalized["output_tokens"]
        self._last_usage = normalized

    # ---------------------------
    # Strategy order
    # ---------------------------
    def _strategy_order(self) -> list[str]:
        if self.provider == "gemini":
            return [
                "gemini_native",
                "sdk_chat",
                "http_chat",
            ]

        if self.provider == "claude":
            # Claude supports the OpenAI SDK chat format in the official compatibility docs.
            return [
                "claude_native",
                "sdk_chat",
            ]

        # Other providers use this fallback order:
        # OpenAI SDK Responses -> OpenAI SDK Chat -> requests Responses -> requests Chat
        return [
            "sdk_responses",
            "sdk_chat",
            "http_responses",
            "http_chat",
        ]

    # ---------------------------
    # Defaults
    # ---------------------------
    def _default_base_url(self) -> str | None:
        if self.provider == "openai":
            return "https://api.openai.com/v1"
        if self.provider == "gemini":
            return "https://generativelanguage.googleapis.com/v1beta/openai"
        if self.provider=="claude":
            # Used by the OpenAI SDK compatibility path.
            return "https://api.anthropic.com/v1"
        return None

    def _effective_base_url(self) -> str | None:
        url = self.cfg.base_url or self._default_base_url()
        return url.rstrip("/") if url else None

    def _effective_api_key(self) -> str:
        if self.provider == "ollama" and not self.cfg.api_key:
            # Ollama-compatible endpoints usually accept a placeholder key.
            return "ollama"
        return self.cfg.api_key

    # ---------------------------
    # Native Gemini
    # ---------------------------
    def _gemini_native(self, user_prompt: str) -> str:
        from google.genai import types

        client = self.client

        # Ensure conversation history exists.
        if not hasattr(self, "conversation") or self.conversation is None:
            self.conversation = []

        # 1) Append the current user message first.
        self.conversation.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_prompt)],
            )
        )

        try:
            # 2) Send the full history to Gemini.
            response = client.models.generate_content(
                model=self.cfg.model,
                contents=self.conversation,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt
                ),
            )

            text = getattr(response, "text", None)
            if not isinstance(text, str) or not text.strip():
                # Roll back the appended user message on failure to avoid polluting history.
                self.conversation.pop()
                raise RuntimeError(f"Gemini native response did not contain usable text: {response}")

            answer = text.strip()

            # 3) Store the model response in history.
            self.conversation.append(
                types.Content(
                    role="assistant",
                    parts=[types.Part.from_text(text=answer)],
                )
            )

            return answer
        except Exception:
            if self.conversation and self.conversation[-1]["role"] == "user" and self.conversation[-1]["content"] == user_prompt:
                self.conversation.pop()
            raise

    # ---------------------------
    # Native Claude
    # ---------------------------
    def _claude_native(self, user_prompt: str) -> str:
        # print("Trying Claude native path")
        # raise(RuntimeError("Claude path disabled for testing"))
        if self.claude_client is None:
            raise(RuntimeError("Failed to initialize Claude client"))
        client = self.claude_client
        if not hasattr(self, "conversation") or self.conversation is None:
            self.conversation = []
        
        if not self.is_history:
            self.conversation = []
        
        history = list(self.conversation)
        history.append(
            {
                "role": "user",
                "content": user_prompt,
            }
        )

        message = client.messages.create(
            model=self.cfg.model,
            max_tokens=self.cfg.max_tokens,
            system=self.system_prompt,
            messages=history,
        )

        parts: list[str] = []
        for block in message.content:
            text = getattr(block, "text", None)
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())

        answer = "\n".join(parts).strip()

        if not answer:
            raise RuntimeError(f"Claude native response did not contain usable text: {message}")

        self.conversation = history + [
            {
                "role": "assistant",
                "content": answer,
            }
        ]
        return answer

    # ---------------------------
    # OpenAI SDK - Responses
    # ---------------------------
    def _openai_sdk_responses(
        self,
        user_prompt: str,
        *,
        extra_body: dict[str, Any] | None = None,
    ) -> str:
        # print("Trying SDK Responses path")
        # raise(RuntimeError("SDK Responses path disabled for testing"))

        client = self.client
        if not hasattr(self, "conversation") or self.conversation is None:
            self.conversation = []

        if not self.is_history:
            self.conversation=[]

        history = list(self.conversation)
        history.append(
            {
                "role": "user",
                "content": user_prompt,
            }
        )

        req: dict[str, Any] = {
            "model": self.cfg.model,
            "instructions": self.system_prompt,
            "input": history,
            "temperature": self.cfg.temperature,
            "stream": False,
            "max_output_tokens": self.cfg.max_tokens,
        }

        if extra_body:
            req["extra_body"] = extra_body

        resp = client.responses.create(**req)
        self._remember_usage(getattr(resp, "usage", None))
        self._check_responses_limit(resp)

        output_text = getattr(resp, "output_text", None)
        if isinstance(output_text, str) and output_text.strip():
            answer = output_text.strip()
        elif hasattr(resp, "model_dump"):
            answer = self._extract_text_from_responses_json(resp.model_dump()).strip()
        else:
            raise RuntimeError(f"Failed to parse SDK Responses return value: {resp}")

        if not answer:
            raise RuntimeError(f"OpenAI Responses returned empty text: {resp}")

        self.conversation = history + [
            {
                "role": "assistant",
                "content": answer,
            }
        ]
        return answer

    # ---------------------------
    # OpenAI SDK - Chat
    # ---------------------------
    def _openai_sdk_chat(
        self,
        user_prompt: str,
        *,
        extra_body: dict[str, Any] | None = None,
    ) -> str:
        # print("Trying SDK Chat path")
        # raise(RuntimeError("SDK Chat path disabled for testing"))
        client = self.client

        if not hasattr(self, "conversation") or self.conversation is None:
            self.conversation = []
        if not self.is_history:
            self.conversation=[]

        # Keep only user/assistant history; system/developer messages are added per request.
        history = list(self.conversation)
        history.append(
            {
                "role": "user",
                "content": user_prompt,
            }
        )


        messages = [
            {"role": "system", "content": self.system_prompt},
            *history,
        ]

        req: dict[str, Any] = {
            "model": self.cfg.model,
            "messages": messages,
            "temperature": self.cfg.temperature,
            "stream": False,
            "max_tokens": self.cfg.max_tokens,
        }
        if extra_body:
            req["extra_body"] = extra_body

        resp = client.chat.completions.create(**req)
        self._remember_usage(getattr(resp, "usage", None))
        self._check_output_limit(
            getattr(resp.choices[0], "finish_reason", None),
            resp.choices[0].message.content or "",
        )

        content = resp.choices[0].message.content

        if isinstance(content, str) and content.strip():
            answer = content.strip()
        elif hasattr(resp, "model_dump"):
            answer = self._extract_text_from_chat_json(resp.model_dump()).strip()
        else:
            raise RuntimeError(f"Failed to parse SDK Chat return value: {resp}")

        if not answer:
            raise RuntimeError(f"OpenAI Chat returned empty text: {resp}")

        self.conversation = history + [
            {
                "role": "assistant",
                "content": answer,
            }
        ]
        return answer

        

    # ---------------------------
    # HTTP - Responses
    # ---------------------------
    def _http_responses(
        self,
        user_prompt: str,
        *,
        extra_body: dict[str, Any] | None = None,
    ) -> str:
        # print("Trying HTTP Responses path")
        # raise(RuntimeError("HTTP Responses path disabled for testing"))
        base_url = self._effective_base_url()
        if not base_url:
            raise RuntimeError("No BASE_URL is available for requests + /responses")

        if self.provider == "claude" and not self.cfg.base_url:
            raise RuntimeError("Direct Claude API does not provide /responses; set a compatible BASE_URL to use this fallback")

        url = f"{base_url}/responses"

        if not hasattr(self, "conversation") or self.conversation is None:
            self.conversation = []

        if not self.is_history:
            self.conversation=[]

        # Append the current user message first.
        history = list(self.conversation)
        history.append(
            {
                "role": "user",
                "content": user_prompt,
            }
        )

        
        payload: dict[str, Any] = {
            "model": self.cfg.model,
            "instructions": self.system_prompt,
            "input": history,
            "temperature": self.cfg.temperature,
            "stream": False,
            "max_output_tokens": self.cfg.max_tokens,
        }

        if extra_body:
            payload.update(extra_body)

        resp = requests.post(
            url,
            headers=self._headers(),
            json=payload,
            timeout=self.cfg.timeout,
        )
        resp.raise_for_status()

        data = resp.json()
        self._remember_usage(data.get("usage"))
        self._check_responses_limit(data)
        answer = self._extract_text_from_responses_json(data).strip()

        if not answer:
            raise RuntimeError(f"HTTP /responses returned empty text: {data}")

        # Commit assistant response to history after success.
        self.conversation = history + [
            {
                "role": "assistant",
                "content": answer,
            }
        ]

        return answer

    # ---------------------------
    # HTTP - Chat
    # ---------------------------
    def _http_chat(
        self,
        user_prompt: str,
        *,
        extra_body: dict[str, Any] | None = None,
    ) -> str:
        # print("Trying HTTP Chat path")
        # raise(RuntimeError("HTTP Chat path disabled for testing"))
        base_url = self._effective_base_url()
        if not base_url:
            raise RuntimeError("No BASE_URL is available for requests + /chat/completions")

        if self.provider == "claude" and not self.cfg.base_url:
            raise RuntimeError("Direct Claude API does not provide OpenAI-style /chat/completions; set a compatible BASE_URL to use this fallback")

        url = f"{base_url}/chat/completions"

        if not hasattr(self, "conversation") or self.conversation is None:
            self.conversation = []

        if not self.is_history:
            self.conversation=[]

        # Copy history first to avoid polluting official context on failure.
        history = list(self.conversation)
        # Keep only user/assistant history; system is not stored in self.conversation.
        history.append(
            {
                "role": "user",
                "content": user_prompt,
            }
        )

        payload: dict[str, Any] = {
            "model": self.cfg.model,
            "messages": [
                {"role": "system", "content": self.system_prompt},
                *history,
            ],
            "temperature": self.cfg.temperature,
            "stream": False,
            "max_tokens": self.cfg.max_tokens,
        }

        if extra_body:
            payload.update(extra_body)

        resp = requests.post(
            url,
            headers=self._headers(),
            json=payload,
            timeout=self.cfg.timeout,
        )
        resp.raise_for_status()

        data = resp.json()
        self._remember_usage(data.get("usage"))
        choice = (data.get("choices") or [{}])[0]
        self._check_output_limit(choice.get("finish_reason"), (choice.get("message") or {}).get("content") or "")
        answer = self._extract_text_from_chat_json(data).strip()

        if not answer:
            raise RuntimeError(f"HTTP /chat/completions returned empty text: {data}")

        # Commit history only after request success.
        self.conversation = history + [
            {
                "role": "assistant",
                "content": answer,
            }
        ]

        return answer

    # ---------------------------
    # Helpers
    # ---------------------------
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._effective_api_key()}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _extract_text_from_chat_json(data: dict[str, Any]) -> str:
        try:
            content = data["choices"][0]["message"]["content"]
        except Exception as exc:
            raise RuntimeError(f"Unexpected chat response structure: {data}") from exc

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "text" and isinstance(item.get("text"), str):
                        parts.append(item["text"])
                    elif isinstance(item.get("content"), str):
                        parts.append(item["content"])
            merged = "\n".join(x for x in parts if x.strip()).strip()
            if merged:
                return merged

        raise RuntimeError(f"Failed to extract text from chat response: {data}")

    @staticmethod
    def _extract_text_from_responses_json(data: dict[str, Any]) -> str:
        if isinstance(data.get("output_text"), str) and data["output_text"].strip():
            return data["output_text"].strip()

        output = data.get("output", [])
        parts: list[str] = []

        if isinstance(output, list):
            for item in output:
                if not isinstance(item, dict):
                    continue
                content_list = item.get("content", [])
                if not isinstance(content_list, list):
                    continue
                for c in content_list:
                    if not isinstance(c, dict):
                        continue
                    if c.get("type") in ("output_text", "text") and isinstance(c.get("text"), str):
                        parts.append(c["text"])

        merged = "\n".join(x for x in parts if x.strip()).strip()
        if merged:
            return merged

        raise RuntimeError(f"Failed to extract text from responses response: {data}")
    
    def get_conversation(self)->list[dict[str,str]]:
        if self.conversation is not None:
            return [{"system":self.system_prompt}]+self.conversation
        else:
            return [{"system":self.system_prompt}]
