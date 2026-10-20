from __future__ import annotations

import unittest
from unittest.mock import patch

from src.llm_clients import LLMConfig
from src.session_service import WorkflowSession


class RecordingEngine:
    def __init__(self, _config: LLMConfig, prompt_language: str = "en"):
        self.config = _config
        self.prompt_language = prompt_language
        self.code_calls: list[dict] = []
        self.plan_calls: list[dict] = []

    def generate_code(self, problem: str, **kwargs):
        self.code_calls.append({"problem": problem, **kwargs})
        return {
            "ok": True,
            "code": "def solve(value):\n    return value + 1",
            "message": "done",
            "attempts": 1,
            "generation": {},
        }

    def create_plan(self, problem: str, **kwargs):
        self.plan_calls.append({"problem": problem, **kwargs})
        return {
            "ok": True,
            "plan": "## Plan\n\n1. Correct the return value.",
            "message": "done",
            "attempts": 1,
            "used_error_feedback": True,
        }


class WorkflowSessionPromptStateTests(unittest.TestCase):
    def test_full_plan_and_raw_response_survive_logging_and_regeneration(self) -> None:
        session = self.make_session()
        raw = "##ĠPlanĊ1.ĠReplace `a+b` with `a-b`.Ċ2.ĠReplace `a-b` with `a+b`."
        plan = "## Plan\n1. Replace `a+b` with `a-b`.\n2. Replace `a-b` with `a+b`."
        with patch.object(session.engine, "create_plan", return_value={
            "ok": True, "plan": plan, "raw_response": raw,
            "plan_processing": "whitespace_only", "attempts": 1,
        }):
            session.run_plan(use_error_feedback=True)
        event = session.events[-1]["data"]
        self.assertEqual(event["raw_response"], raw)
        self.assertEqual(event["plan"], plan)
        self.assertEqual(event["plan_processing"], "whitespace_only")
        session.run_generate(use_plan=True)
        self.assertEqual(session.engine.code_calls[-1]["plan"], plan)

    def make_session(self, *, context_enabled: bool = False) -> WorkflowSession:
        with patch("src.session_service.Adacoder", RecordingEngine):
            return WorkflowSession(
                problem_statement="Implement solve(value)",
                test_text="assert solve(1) == 2",
                llm_config=LLMConfig(
                    provider="vllm",
                    model="test",
                    base_url="http://example/v1",
                ),
                test_mode="manual",
                context_enabled=context_enabled,
                additional_instruction="Keep the signature unchanged.",
            )

    def test_additional_guidance_accumulates_and_replayed_values_are_idempotent(self) -> None:
        session = self.make_session()

        session.update_options(additional_instruction="Prefer an iterative implementation.")
        expected = "Keep the signature unchanged.\n\nPrefer an iterative implementation."
        self.assertEqual(session.additional_instruction, expected)

        session.update_options(additional_instruction=expected)
        session.update_options(additional_instruction="Keep the signature unchanged.")
        session.update_options(additional_instruction="Prefer an iterative implementation.")
        session.update_options(additional_instruction="")
        session.update_options(additional_instruction=None)
        self.assertEqual(session.additional_instruction, expected)

        cumulative = f"{expected}\n\nHandle negative values."
        session.update_options(additional_instruction=cumulative)
        self.assertEqual(session.additional_instruction, cumulative)

    def test_prompt_language_rebuilds_engine_for_future_calls(self) -> None:
        session = self.make_session()
        original_engine = session.engine

        with patch("src.session_service.Adacoder", RecordingEngine):
            session.update_options(prompt_language="zh-CN")

        self.assertEqual(session.prompt_language, "zh-CN")
        self.assertIsNot(session.engine, original_engine)
        self.assertEqual(session.engine.prompt_language, "zh-CN")
        self.assertIs(session.engine.config, session.llm_config)
        self.assertEqual(session.engine.config.temperature, 0.2)
        self.assertEqual(session.engine.config.max_tokens, 1024)

    def test_planner_receives_required_current_state_when_context_is_disabled(self) -> None:
        session = self.make_session(context_enabled=False)
        session.current_code = "def solve(value):\n    return value"
        session.resolved_test_code = "assert solve(2) == 3"
        session.latest_evaluation = {
            "passed": False,
            "stage": "exec_tests",
            "error_type": "AssertionError",
            "error": "expected 3, got 2",
            "traceback": "Traceback: assert solve(2) == 3",
            "details": {"actual": 2, "expected": 3},
        }

        session.run_plan(use_error_feedback=True)

        call = session.engine.plan_calls[-1]
        self.assertEqual(call["current_code"], session.current_code)
        self.assertEqual(call["test_code"], session.resolved_test_code)
        self.assertIs(call["evaluation"], session.latest_evaluation)
        self.assertIsNone(call["context_entries"])

    def test_regeneration_receives_failed_code_and_evaluation_without_context(self) -> None:
        session = self.make_session(context_enabled=False)
        session.resolved_test_code = session.test_text
        session.resolved_tests_confirmed = True
        failed_code = "def solve(value):\n    return value"
        evaluation = {
            "passed": False,
            "stage": "exec_tests",
            "error_type": "AssertionError",
            "traceback": "full traceback",
        }
        session.current_code = failed_code
        session.current_plan = "## Plan\n\n1. Add one to the value."
        session.latest_evaluation = evaluation

        session.run_generate(use_plan=True)

        call = session.engine.code_calls[-1]
        self.assertEqual(call["current_code"], failed_code)
        self.assertEqual(call["test_code"], session.resolved_test_code)
        self.assertIs(call["evaluation"], evaluation)
        self.assertIsNone(call["context_entries"])

    def test_optional_context_keeps_only_latest_nonempty_entry_per_kind(self) -> None:
        session = self.make_session(context_enabled=True)
        session.add_context(role="assistant", kind="code", title="Old Code", content="old code")
        session.add_context(role="assistant", kind="plan", title="Old Plan", content="old plan")
        session.add_context(role="assistant", kind="code", title="Current Code", content="new code")
        session.add_context(role="assistant", kind="plan", title="Current Plan", content="new plan")
        session.add_context(role="user", kind="guidance", title="Guidance", content="new guidance")
        session.add_context(role="user", kind="empty", title="Empty", content="   ")

        context = session._context_for_llm()

        self.assertIsNotNone(context)
        by_kind = {entry["kind"]: entry for entry in context or []}
        self.assertEqual(by_kind["code"]["content"], "new code")
        self.assertEqual(by_kind["plan"]["content"], "new plan")
        self.assertNotIn("guidance", by_kind)
        self.assertNotIn("test_guidance", by_kind)
        self.assertNotIn("empty", by_kind)


if __name__ == "__main__":
    unittest.main()
