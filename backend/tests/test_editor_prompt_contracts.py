from __future__ import annotations

import unittest
from unittest.mock import patch

import main as backend_main


class CapturingRouter:
    system_prompt = ""
    user_prompt = ""

    def __init__(self, system_prompt: str, _config: object):
        type(self).system_prompt = system_prompt

    def __enter__(self) -> CapturingRouter:
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def generate(self, user_prompt: str) -> str:
        type(self).user_prompt = user_prompt
        return "assert solve(0) == 0"

    def generation_info(self) -> dict[str, object]:
        return {"duration_ms": 1, "usage": {}}


class EditorTestSuggestionPromptTests(unittest.TestCase):
    def test_prompt_uses_explicit_contract_instead_of_current_behavior(self) -> None:
        request = backend_main.TestSuggestionRequest(
            source='''def solve(value: int) -> int:
    """Return twice the supplied value."""
    return value + value
''',
            function_name="solve",
            test_description="Cover the documented zero boundary.",
            additional_instruction="Do not assume negative values are invalid.",
            llm=backend_main.LLMSettingsRequest(model="test-model"),
        )

        with patch.object(backend_main, "LLMRouter", CapturingRouter):
            response = backend_main.create_test_suggestions(request)

        self.assertTrue(response["ok"])
        prompt = CapturingRouter.user_prompt
        self.assertIn("signature, docstring", prompt)
        self.assertIn("do not\ntreat its current behavior as the specification", prompt)
        self.assertIn("Do not invent exception behavior", prompt)
        self.assertIn("return fields, data structures", prompt)
        self.assertIn("5 to 10", prompt)
        self.assertIn("non-redundant", prompt)
        self.assertIn("distinct requirement or boundary", prompt)
        self.assertIn("ONLY executable top-level Python statements", prompt)
        self.assertIn("Cover the documented zero boundary.", prompt)
        self.assertIn("Do not assume negative values are invalid.", prompt)
        self.assertIn("grounded only in explicit behavioral contracts", CapturingRouter.system_prompt)


if __name__ == "__main__":
    unittest.main()
