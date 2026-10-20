# Claude uses its native SDK; base_url should point to the root and must not include /v1.
from typing import Literal


Provider = Literal[
    "openai",    # Official default; third-party OpenAI-compatible BASE_URL is also supported.
    "gemini",
    "claude",
    "ollama",
    "vllm",
    "other",     # Other models or compatible endpoints.
]

provider_set={
    "openai",    # Official default; third-party OpenAI-compatible BASE_URL is also supported.
    "gemini",
    "claude",
    "ollama",
    "vllm",
    "other",     # Other models or compatible endpoints.
}
