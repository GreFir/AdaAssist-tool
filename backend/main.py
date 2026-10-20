from __future__ import annotations

import argparse
import re
from typing import Any, Literal

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.llm_clients import LLMConfig, LLMRouter
from src.session_service import SessionStore
from src.utils import normalize_test_output


class LLMSettingsRequest(BaseModel):
    provider: str = "other"
    base_url: str = ""
    api_key: str = ""
    model: str = Field(min_length=1)
    max_tokens: int = Field(default=1024, ge=128, le=32768)


class CreateSessionRequest(BaseModel):
    problem: str = Field(min_length=1)
    test_text: str = ""
    test_description: str = Field(default="", max_length=12_000)
    additional_instruction: str = Field(default="", max_length=12_000)
    test_mode: Literal["manual", "generate"] = "manual"
    resolved_test_code: str = ""
    llm: LLMSettingsRequest
    context_enabled: bool = False
    max_rounds: int = Field(default=3, ge=1, le=10)
    prompt_language: Literal["en", "zh-CN"] = "en"


class UpdateSessionRequest(BaseModel):
    plan: str | None = None
    problem: str | None = None
    test_text: str | None = None
    test_description: str | None = Field(default=None, max_length=12_000)
    additional_instruction: str | None = Field(default=None, max_length=12_000)
    test_mode: Literal["manual", "generate"] | None = None
    resolved_test_code: str | None = None
    context_enabled: bool | None = None
    max_rounds: int | None = Field(default=None, ge=1, le=10)
    prompt_language: Literal["en", "zh-CN"] | None = None


class SessionActionRequest(BaseModel):
    action: Literal["generate", "evaluate", "plan", "regenerate", "restart", "auto", "auto_resume", "generate_tests", "guidance"]
    problem: str | None = None
    test_text: str | None = None
    test_description: str | None = Field(default=None, max_length=12_000)
    additional_instruction: str | None = Field(default=None, max_length=12_000)
    test_mode: Literal["manual", "generate"] | None = None
    resolved_test_code: str | None = None
    code_override: str | None = None
    code_event_id: str | None = None
    use_error_feedback: bool = True
    max_rounds: int | None = Field(default=None, ge=1, le=10)
    context_enabled: bool | None = None
    plan_override: str | None = None
    prompt_language: Literal["en", "zh-CN"] | None = None


class StudyEventRequest(BaseModel):
    event_type: str = Field(min_length=1, max_length=64)
    participant_id: str = Field(default="", max_length=128)
    task_id: str = Field(default="", max_length=128)
    condition: str = Field(default="", max_length=32)
    data: dict[str, Any] = Field(default_factory=dict)


class InlineCompletionRequest(BaseModel):
    """A small, cursor-local request used by the VS Code inline provider."""

    prefix: str = Field(min_length=1, max_length=12_000)
    suffix: str = Field(default="", max_length=4_000)
    language: str = Field(default="python", max_length=32)
    llm: LLMSettingsRequest
    max_tokens: int = Field(default=192, ge=32, le=512)


class TestSuggestionRequest(BaseModel):
    """Generate reviewable assert suggestions for one completed function."""

    source: str = Field(min_length=1, max_length=16_000)
    function_name: str = Field(min_length=1, max_length=256)
    language: str = Field(default="python", max_length=32)
    test_description: str = Field(default="", max_length=12_000)
    additional_instruction: str = Field(default="", max_length=12_000)
    llm: LLMSettingsRequest


store = SessionStore()
app = FastAPI(title="AdaAssist Backend", version="0.1.0")


def ok(session: dict[str, Any], **extra: Any) -> dict[str, Any]:
    payload = {"ok": True, "session": session}
    payload.update(extra)
    return payload


def get_session_or_404(session_id: str):
    try:
        return store.get_session(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


def make_llm_config(settings: LLMSettingsRequest) -> LLMConfig:
    return LLMConfig(
        provider=settings.provider,  # type: ignore[arg-type]
        base_url=settings.base_url,
        api_key=settings.api_key,
        model=settings.model,
        max_tokens=settings.max_tokens,
    )


def clean_model_code(text: str) -> str:
    """Remove common Markdown wrappers while retaining only model-authored code."""
    cleaned = text.replace("Ġ", " ").replace("Ċ", "\n").strip()
    fenced = re.match(r"^```(?:python)?\s*\n([\s\S]*?)\n?```$", cleaned, flags=re.IGNORECASE)
    if fenced:
        cleaned = fenced.group(1).strip()
    return cleaned


def clean_test_suggestions(text: str) -> str:
    """Compatibility entry point shared with workflow test generation."""
    return normalize_test_output(text).code


@app.post("/api/editor/completions")
def create_inline_completion(request: InlineCompletionRequest) -> dict[str, Any]:
    if request.language.lower() != "python":
        raise HTTPException(status_code=400, detail="Inline completion currently supports Python only.")

    prompt = f"""You are an inline Python code completion engine.
Return ONLY the exact text to insert at <CURSOR>. Do not repeat any supplied code or
function header, do not add tests, do not use Markdown fences, and do not explain the answer. Continue the current
function consistently with its names, types, indentation, and nearby logic. Keep
the completion focused: normally no more than 12 lines unless the function must be
closed correctly.

<PREFIX>
{request.prefix}
<CURSOR>
<SUFFIX>
{request.suffix}
"""
    try:
        config = make_llm_config(request.llm)
        config.max_tokens = request.max_tokens
        with LLMRouter(
            "You complete code precisely and return no prose.",
            config,
        ) as router:
            completion = clean_model_code(router.generate(prompt))
            generation = router.generation_info()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inline completion failed: {exc}") from exc

    if not completion:
        raise HTTPException(status_code=502, detail="The model returned an empty inline completion.")
    return {"ok": True, "completion": completion, "generation": generation}


@app.post("/api/editor/test-suggestions")
def create_test_suggestions(request: TestSuggestionRequest) -> dict[str, Any]:
    if request.language.lower() != "python":
        raise HTTPException(status_code=400, detail="Test suggestions currently support Python only.")

    test_goal = request.test_description.strip()
    additional_instruction = request.additional_instruction.strip()
    guidance = ""
    if test_goal:
        guidance += f"\n## Test Generation Goals\n{test_goal}\n"
    if additional_instruction:
        guidance += f"\n## Additional User Instruction\n{additional_instruction}\n"

    prompt = f"""Write 5 to 10 concise, non-redundant Python assert statements for the
function below. Derive expected behavior primarily from its signature, docstring,
comments, explicit examples, and the user-provided goals or instructions below. Use
the implementation only to identify execution paths and candidate edge cases; do not
treat its current behavior as the specification. Do not invent exception behavior,
validation rules, return fields, data structures, or constraints that are not stated
by those sources. Each assertion must cover a distinct requirement or boundary.

The function is already imported into the test file, so call `{request.function_name}`
directly. Return ONLY executable top-level Python statements: no Markdown fences,
imports, test functions, test framework, or prose. Do not redefine the function. The
<FUNCTION> tags below delimit input only; never repeat them in output.
{guidance}

<FUNCTION>
{request.source}
</FUNCTION>
"""
    try:
        with LLMRouter(
            "You write precise, minimal Python test assertions grounded only in "
            "explicit behavioral contracts and return no prose.",
            make_llm_config(request.llm),
        ) as router:
            raw_response = router.generate(prompt)
            normalized = normalize_test_output(raw_response, target_symbols=[request.function_name])
            tests = normalized.code
            generation = router.generation_info()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Test suggestion failed: {exc}") from exc

    if not tests:
        raise HTTPException(
            status_code=502,
            detail=normalized.message or "The model did not return usable top-level assert statements.",
        )
    return {"ok": True, "tests": tests, "generation": generation}


@app.get("/api/sessions")
def list_sessions() -> dict[str, Any]:
    return {"ok": True, "sessions": store.list_sessions()}


@app.post("/api/sessions")
def create_session(request: CreateSessionRequest) -> dict[str, Any]:
    llm_config = LLMConfig(
        provider=request.llm.provider,  # type: ignore[arg-type]
        base_url=request.llm.base_url,
        api_key=request.llm.api_key,
        model=request.llm.model,
    )
    session = store.create_session(
        problem_statement=request.problem,
        test_text=request.test_text,
        test_description=request.test_description,
        additional_instruction=request.additional_instruction,
        llm_config=llm_config,
        test_mode=request.test_mode,
        context_enabled=request.context_enabled,
        max_rounds=request.max_rounds,
        prompt_language=request.prompt_language,
    )
    if request.resolved_test_code.strip():
        session.update_options(resolved_test_code=request.resolved_test_code)
    return ok(session.to_dict())


class RestoreSessionRequest(BaseModel):
    snapshot: dict[str, Any]
    llm: LLMSettingsRequest


@app.post("/api/sessions/restore")
def restore_session(request: RestoreSessionRequest) -> dict[str, Any]:
    try:
        session = store.restore_session(request.snapshot, make_llm_config(request.llm))
    except (ValueError, TypeError, OverflowError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ok(session.to_dict())


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    session = get_session_or_404(session_id)
    return ok(session.to_dict())


@app.patch("/api/sessions/{session_id}")
def update_session(session_id: str, request: UpdateSessionRequest) -> dict[str, Any]:
    session = get_session_or_404(session_id)
    with session.lock:
        session.update_options(
            problem_statement=request.problem,
            test_text=request.test_text,
            test_description=request.test_description,
            additional_instruction=request.additional_instruction,
            test_mode=request.test_mode,
            resolved_test_code=request.resolved_test_code,
            context_enabled=request.context_enabled,
            max_rounds=request.max_rounds,
            prompt_language=request.prompt_language,
            plan=request.plan,
            announce_resolved_tests=request.resolved_test_code is not None,
        )
        return ok(session.to_dict())


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str) -> dict[str, Any]:
    _ = get_session_or_404(session_id)
    store.delete_session(session_id)
    return {"ok": True}


@app.post("/api/sessions/{session_id}/interrupt")
def interrupt_session(session_id: str) -> dict[str, Any]:
    session = get_session_or_404(session_id)
    session.request_interrupt()
    return ok(session.to_dict(), stage_result={
        "stage": "interrupt",
        "message": "Interrupt requested. The workflow will pause after the current stage.",
        "interrupted": True,
        "passed": session.passed,
    })


@app.post("/api/sessions/{session_id}/study-events")
def record_study_event(session_id: str, request: StudyEventRequest) -> dict[str, Any]:
    session = get_session_or_404(session_id)
    with session.lock:
        event = session.record_study_event(
            event_type=request.event_type,
            participant_id=request.participant_id,
            task_id=request.task_id,
            condition=request.condition,
            data=request.data,
        )
        return {"ok": True, "event": event}


@app.post("/api/sessions/{session_id}/actions")
def run_action(session_id: str, request: SessionActionRequest) -> dict[str, Any]:
    session = get_session_or_404(session_id)

    with session.lock:
        if (
            request.context_enabled is not None
            or request.max_rounds is not None
            or request.problem is not None
            or request.test_text is not None
            or request.test_mode is not None
            or request.test_description is not None
            or request.additional_instruction is not None
            or request.prompt_language is not None
        ):
            session.update_options(
                problem_statement=request.problem,
                test_text=request.test_text,
                test_description=request.test_description,
                additional_instruction=request.additional_instruction,
                test_mode=request.test_mode,
                context_enabled=request.context_enabled,
                max_rounds=request.max_rounds,
                prompt_language=request.prompt_language,
            )
        if request.plan_override is not None:
            session.update_options(plan=request.plan_override)
        if request.resolved_test_code is not None:
            session.update_options(resolved_test_code=request.resolved_test_code)

        try:
            evaluated_code_event_id = request.code_event_id
            if request.action == "evaluate" and request.code_override is not None:
                evaluated_code_event_id = session.update_current_code_from_edit(
                    request.code_override,
                    code_event_id=request.code_event_id,
                )

            if request.action == "generate":
                stage_result = session.run_generate(use_plan=False)
            elif request.action == "evaluate":
                stage_result = session.run_evaluate(code_event_id=evaluated_code_event_id)
            elif request.action == "generate_tests":
                stage_result = session.run_generate_tests()
            elif request.action == "plan":
                stage_result = session.run_plan(use_error_feedback=request.use_error_feedback)
            elif request.action == "regenerate":
                stage_result = session.run_generate(use_plan=True)
            elif request.action == "restart":
                session.reset_progress(reset_context=True)
                stage_result = session.run_generate(use_plan=False, from_prompt=False)
            elif request.action == "auto":
                stage_result = session.run_auto(max_rounds=request.max_rounds, resume=False)
            elif request.action == "auto_resume":
                stage_result = session.run_auto(max_rounds=request.max_rounds, resume=True)
            elif request.action == "guidance":
                stage_result = session.run_guidance()
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported action: {request.action}")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        return ok(session.to_dict(), stage_result=stage_result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the AdaAssist backend server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port, log_level="info", access_log=False)


if __name__ == "__main__":
    main()
