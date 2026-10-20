from __future__ import annotations

import copy
import unittest
from unittest.mock import patch

from src.llm_clients import LLMConfig
from src.session_service import SessionStore


class RestoreSessionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = LLMConfig(
            provider="vllm",
            base_url="http://127.0.0.1:8003/v1",
            model="test-model",
        )

    def make_snapshot(self) -> dict:
        with patch("src.session_service.Adacoder"):
            store = SessionStore()
            session = store.create_session(
                problem_statement="Implement solve(x)",
                test_text="assert solve(1) == 2",
                llm_config=self.config,
                test_mode="manual",
                context_enabled=True,
                max_rounds=3,
            )
        session.current_code = "def solve(x):\n    return x + 1\n"
        session.current_plan = "Preserve behavior on empty inputs."
        session.current_stage = "evaluate"
        session.status = "completed"
        session.passed = True
        session.attempt_count = 2
        session.regeneration_count = 1
        session.latest_evaluation = {
            "passed": True,
            "test_summary": {"passed": 1, "total": 1},
        }
        session.add_context(
            role="user", kind="guidance", title="Additional rule",
            content="Handle edge cases as well.",
        )
        return copy.deepcopy(session.to_dict())

    def test_restart_from_saved_json_preserves_full_workflow(self) -> None:
        snapshot = self.make_snapshot()
        with patch("src.session_service.Adacoder"):
            restored_store = SessionStore()
            resumed = restored_store.restore_session(snapshot, self.config)

        current = resumed.to_dict()
        for key in (
            "session_id", "problem_statement", "test_text",
            "current_code", "current_plan", "current_stage",
            "passed", "attempt_count", "regeneration_count",
            "latest_evaluation", "context_entries", "events",
            "created_at", "updated_at",
        ):
            self.assertEqual(current[key], snapshot[key], key)
        self.assertIs(restored_store.get_session(snapshot["session_id"]), resumed)

    def test_session_snapshot_includes_configured_output_limit(self) -> None:
        config = LLMConfig(
            provider="vllm", model="test-model",
            base_url="http://127.0.0.1:8003/v1", max_tokens=4096,
        )
        with patch("src.session_service.Adacoder"):
            store = SessionStore()
            session = store.create_session(
                problem_statement="Implement solve(x)", test_text="assert solve(1) == 2",
                llm_config=config, test_mode="manual",
                context_enabled=False, max_rounds=3,
            )
            snapshot = session.to_dict()
            self.assertEqual(snapshot["llm"]["max_tokens"], 4096)
            restored = SessionStore().restore_session(snapshot, config)
            self.assertEqual(restored.to_dict()["llm"]["max_tokens"], 4096)

    def test_updating_active_budget_keeps_progress_and_rebuilds_model(self) -> None:
        snapshot = self.make_snapshot()
        with patch("src.session_service.Adacoder"):
            store = SessionStore()
            session = store.restore_session(snapshot, self.config)
            previous_engine = session.engine
            previous_code = session.current_code
            previous_plan = session.current_plan
            previous_stage = session.current_stage
            previous_events = list(session.events)
            session.update_options(max_tokens=4096)
        self.assertEqual(session.llm_config.max_tokens, 4096)
        self.assertIsNot(session.engine, previous_engine)
        self.assertEqual(session.current_code, previous_code)
        self.assertEqual(session.current_plan, previous_plan)
        self.assertEqual(session.current_stage, previous_stage)
        self.assertEqual(session.events, previous_events)
        self.assertEqual(session.study_events[-1]["event_type"], "output_budget_updated")

    def test_repeated_restore_does_not_duplicate_a_live_session(self) -> None:
        snapshot = self.make_snapshot()
        with patch("src.session_service.Adacoder"):
            store = SessionStore()
            first = store.restore_session(snapshot, self.config)
            second = store.restore_session(snapshot, self.config)
        self.assertIs(first, second)
        self.assertEqual(len(store.list_sessions()), 1)

    def test_invalid_snapshot_does_not_create_session(self) -> None:
        with patch("src.session_service.Adacoder"):
            store = SessionStore()
            with self.assertRaisesRegex(ValueError, "requirement"):
                store.restore_session({"session_id": "abc12345"}, self.config)
        self.assertEqual(store.list_sessions(), [])


if __name__ == "__main__":
    unittest.main()
