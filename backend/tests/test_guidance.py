from __future__ import annotations

import unittest
from unittest.mock import patch

from src.executor.AdacoderExe import AdacoderExecutor
from src.llm_clients import LLMConfig
from src.session_service import WorkflowSession


class FakeRouter:
    def __init__(self, responses: list[str]):
        self.responses = list(responses)
        self.prompts: list[str] = []

    def generate(self, user_prompt: str) -> str:
        self.prompts.append(user_prompt)
        return self.responses.pop(0)

    def generation_info(self) -> dict:
        return {"duration_ms": 1, "usage": {"input_tokens": 2, "output_tokens": 3}}


def executor_with(responses: list[str]) -> tuple[AdacoderExecutor, FakeRouter]:
    executor = object.__new__(AdacoderExecutor)
    executor.prompt_language = "en"
    router = FakeRouter(responses)
    executor.llmrouter = router
    return executor, router


class ExecutorGuidanceTests(unittest.TestCase):
    def test_test_goals_and_additional_instruction_enter_test_prompt(self) -> None:
        executor, router = executor_with(["assert solve(0) == 0"])

        result = executor.generate_test_code(
            "Implement solve(value)",
            test_description="Cover zero and negative values.",
            additional_instruction="The function must not mutate its input.",
        )

        self.assertTrue(result["ok"])
        self.assertIn("Cover zero and negative values.", router.prompts[0])
        self.assertIn("must not mutate its input", router.prompts[0])

    def test_additional_instruction_enters_code_and_plan_prompts(self) -> None:
        code_executor, code_router = executor_with(["def solve(value):\n    return value"])
        plan_executor, plan_router = executor_with(["## Plan\n- Keep the input unchanged."])

        code_executor.execute_coder(
            "Implement solve(value)",
            additional_instruction="Do not mutate the input.",
        )
        plan_executor.execute_planner(
            "Implement solve(value)",
            additional_instruction="Do not mutate the input.",
        )

        self.assertIn("Do not mutate the input.", code_router.prompts[0])
        self.assertIn("Do not mutate the input.", plan_router.prompts[0])

    def test_plan_restores_tokenizer_markers_without_dropping_content(self) -> None:
        raw_plan = "ĊĊ##ĠPlanĊ1.ĠInspect input.ĊĊ##ĠCodeĊkeep this section"
        executor, _ = executor_with([raw_plan])

        result = executor.execute_planner("Implement solve(value)")

        self.assertEqual(
            result["plan"],
            "## Plan\n1. Inspect input.\n\n## Code\nkeep this section",
        )
        self.assertTrue(result["ok"])

    def test_failed_test_generation_keeps_all_diagnostics_and_raw_response(self) -> None:
        executor, _ = executor_with(["assert solve(1) =="] * 4)

        result = executor.generate_test_code("Implement solve(value)")

        self.assertFalse(result["ok"])
        self.assertEqual(result["attempts"], 4)
        self.assertEqual(result["diagnostic"]["reason_code"], "invalid_syntax")
        self.assertEqual(len(result["diagnostics"]), 4)
        self.assertEqual(result["raw_response"], "assert solve(1) ==")


class FakeEngine:
    def __init__(self, _config: LLMConfig, prompt_language: str = "en"):
        self.prompt_language = prompt_language
        self.calls: dict[str, dict] = {}

    def generate_tests(self, problem: str, **kwargs):
        self.calls["tests"] = {"problem": problem, **kwargs}
        return {
            "ok": True,
            "test_code": "assert solve(0) == 0",
            "message": "done",
            "attempts": 1,
            "generation": {},
        }

    def generate_code(self, problem: str, **kwargs):
        self.calls["code"] = {"problem": problem, **kwargs}
        return {
            "ok": True,
            "code": "def solve(value):\n    return value",
            "message": "done",
            "attempts": 1,
            "generation": {},
        }

    def create_plan(self, problem: str, **kwargs):
        self.calls["plan"] = {"problem": problem, **kwargs}
        return {
            "ok": True,
            "plan": "## Plan\n- Preserve the input.",
            "message": "done",
            "attempts": 1,
            "used_error_feedback": True,
        }


class FailingEngine(FakeEngine):
    def generate_tests(self, problem: str, **kwargs):
        return {
            "ok": False,
            "message": "Failed to generate tests from the model.",
            "error": "invalid test response",
            "attempts": 4,
            "diagnostic": {"reason_code": "invalid_syntax", "message": "invalid syntax"},
            "diagnostics": [{"attempt": 1, "reason_code": "invalid_syntax"}],
            "raw_response": "assert solve(1) ==",
            "generation": {"attempts": []},
        }


class SessionGuidanceTests(unittest.TestCase):
    def make_session(self, engine_type=FakeEngine) -> WorkflowSession:
        with patch("src.session_service.Adacoder", engine_type):
            return WorkflowSession(
                problem_statement="Implement solve(value)",
                test_text="",
                llm_config=LLMConfig(provider="vllm", model="test", base_url="http://example/v1"),
                test_mode="generate",
                test_description="Cover zero.",
                additional_instruction="Do not mutate input.",
            )

    def test_session_persists_and_passes_guidance_to_every_generation_kind(self) -> None:
        session = self.make_session()

        session.resolve_generated_tests()
        session.set_resolved_test_code(session.resolved_test_code, confirmed=True)
        session.run_generate(use_plan=False)
        session.latest_evaluation = {"passed": False, "stage": "exec_tests", "error": "x"}
        session.run_plan(use_error_feedback=True)

        snapshot = session.to_dict()
        self.assertEqual(snapshot["test_description"], "Cover zero.")
        self.assertEqual(snapshot["additional_instruction"], "Do not mutate input.")
        self.assertEqual(session.engine.calls["tests"]["test_description"], "Cover zero.")
        self.assertEqual(session.engine.calls["tests"]["additional_instruction"], "Do not mutate input.")
        self.assertEqual(session.engine.calls["code"]["additional_instruction"], "Do not mutate input.")
        self.assertEqual(session.engine.calls["plan"]["additional_instruction"], "Do not mutate input.")

    def test_guidance_update_is_persisted_and_acknowledged(self) -> None:
        session = self.make_session()

        session.update_options(
            test_description="Cover boundaries.",
            additional_instruction="Prefer iterative code.",
        )
        result = session.run_guidance()

        self.assertEqual(result["stage"], "guidance")
        self.assertEqual(session.test_description, "Cover boundaries.")
        self.assertEqual(
            session.additional_instruction,
            "Do not mutate input.\n\nPrefer iterative code.",
        )
        self.assertIn("guidance", session.available_actions())

    def test_test_generation_failure_is_recorded_on_session(self) -> None:
        session = self.make_session(FailingEngine)

        with self.assertRaisesRegex(RuntimeError, "invalid test response"):
            session.resolve_generated_tests()

        event = session.events[-1]
        self.assertEqual(event["stage"], "tests")
        self.assertEqual(event["status"], "failed")
        self.assertEqual(event["data"]["diagnostic"]["reason_code"], "invalid_syntax")
        self.assertEqual(event["data"]["raw_response"], "assert solve(1) ==")


if __name__ == "__main__":
    unittest.main()
