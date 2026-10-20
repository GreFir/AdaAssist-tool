"""Regression tests for resuming an Interactive session in Auto mode.

These tests avoid network/model calls and exercise saved workflow checkpoints.
"""
from __future__ import annotations

import unittest
from unittest.mock import patch

from src.llm_clients import LLMConfig
from src.session_service import WorkflowSession


class AutoModeHandoffTests(unittest.TestCase):
    def make_session(self):
        with patch("src.session_service.Adacoder"):
            session = WorkflowSession(
                problem_statement="Implement solve(x)",
                test_text="assert solve(2) == 3",
                llm_config=LLMConfig(provider="vllm", model="fake", base_url="http://example/v1"),
                test_mode="manual",
                max_rounds=3,
            )
        session.resolved_test_code = session.test_text
        session.resolved_tests_confirmed = True
        session.current_code = "def solve(x): return x"
        session.latest_evaluation = {"passed": False, "stage": "exec_tests", "error": "assertion failed"}
        return session

    def test_resume_uses_saved_human_edited_plan_without_replanning(self):
        session = self.make_session()
        session.current_plan = "Human-edited repair instructions"
        session.plan_user_edited = True
        session.add_event(stage="plan", status="completed", title="Plan ready", message="Human reviewed")

        def fake_generate(*, use_plan, **kwargs):
            self.assertTrue(use_plan)
            self.assertEqual(session.current_plan, "Human-edited repair instructions")
            self.assertTrue(session.plan_user_edited)
            session.current_stage = "regenerate"
            session.regeneration_count += 1
            return {"ok": True}

        def fake_evaluate(**kwargs):
            session.latest_evaluation = {"passed": True}
            session.passed = True
            session.current_stage = "evaluate"
            return {"evaluation": session.latest_evaluation}

        with patch.object(session, "run_generate", side_effect=fake_generate) as generate, \
                patch.object(session, "run_plan") as plan, \
                patch.object(session, "run_evaluate", side_effect=fake_evaluate):
            result = session.run_auto(resume=True)

        self.assertTrue(result["passed"])
        generate.assert_called_once()
        plan.assert_not_called()
        self.assertEqual(session.regeneration_count, 1)

    def test_resume_after_failed_evaluation_plans_from_existing_code(self):
        session = self.make_session()
        session.add_event(stage="evaluate", status="failed", title="Failed", message="Still failing")

        def fake_plan(*, use_error_feedback):
            self.assertTrue(use_error_feedback)
            session.current_plan = "Fix the error"
            session.current_stage = "plan"
            return {"ok": True}

        def fake_generate(*, use_plan, **kwargs):
            self.assertTrue(use_plan)
            session.current_stage = "regenerate"
            session.regeneration_count += 1
            return {"ok": True}

        def fake_evaluate(**kwargs):
            session.latest_evaluation = {"passed": True}
            session.passed = True
            session.current_stage = "evaluate"
            return {"evaluation": session.latest_evaluation}

        with patch.object(session, "run_debug_fix", return_value=None), \
                patch.object(session, "run_plan", side_effect=fake_plan) as planner, \
                patch.object(session, "run_generate", side_effect=fake_generate), \
                patch.object(session, "run_evaluate", side_effect=fake_evaluate):
            result = session.run_auto(resume=True)

        self.assertTrue(result["passed"])
        planner.assert_called_once()

    def test_editing_tests_clears_stale_evaluation_before_auto_resume(self):
        session = self.make_session()
        session.update_options(test_text="assert solve(3) == 4")
        self.assertIsNone(session.latest_evaluation)
        self.assertFalse(session.passed)
        self.assertEqual(session.current_code, "def solve(x): return x")

    def test_edited_resolved_tests_invalidate_prior_result(self):
        session = self.make_session()
        session.update_options(resolved_test_code="assert solve(9) == 10")
        self.assertIsNone(session.latest_evaluation)
        self.assertFalse(session.passed)
        self.assertEqual(session.current_code, "def solve(x): return x")


if __name__ == "__main__":
    unittest.main()
