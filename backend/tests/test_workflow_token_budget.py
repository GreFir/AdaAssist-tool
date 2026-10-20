from __future__ import annotations

import unittest
from unittest.mock import patch, Mock, MagicMock

from main import CreateSessionRequest, LLMSettingsRequest, create_session, make_llm_config


class WorkflowTokenBudgetTests(unittest.TestCase):
    def test_make_llm_config_honors_max_tokens(self) -> None:
        cfg = make_llm_config(LLMSettingsRequest(
            provider="vllm", model="test-model", max_tokens=4096))
        self.assertEqual(cfg.max_tokens, 4096)

    def test_create_session_forwards_max_tokens_to_engine(self) -> None:
        request = CreateSessionRequest(
            problem="Implement solve()", test_text="assert solve() == 1",
            llm=LLMSettingsRequest(provider="vllm", model="test-model", max_tokens=4096),
        )
        mock_session = Mock()
        mock_session.to_dict.return_value = {"session_id": "unit-test-12345"}
        with patch("main.store.create_session", return_value=mock_session) as create:
            payload = create_session(request)
        self.assertTrue(payload["ok"])
        self.assertEqual(create.call_args.kwargs["llm_config"].max_tokens, 4096)

    def test_patch_session_budget_uses_existing_session(self) -> None:
        from main import UpdateSessionRequest, update_session
        fake_session = MagicMock()
        fake_session.to_dict.return_value = {"session_id": "test-existing-session"}
        with patch("main.get_session_or_404", return_value=fake_session):
            response = update_session("test-existing-session", UpdateSessionRequest(max_tokens=4096))
        self.assertTrue(response["ok"])
        self.assertEqual(fake_session.update_options.call_args.kwargs["max_tokens"], 4096)

    def test_profile_validation_rejects_out_of_range(self) -> None:
        from pydantic import ValidationError
        for bad_value in (127, 32769):
            with self.subTest(bad_value=bad_value):
                with self.assertRaises(ValidationError):
                    LLMSettingsRequest(model="test-model", max_tokens=bad_value)


if __name__ == "__main__":
    unittest.main()
