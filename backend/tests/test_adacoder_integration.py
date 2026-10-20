from __future__ import annotations

import unittest
from unittest.mock import patch

from src.Adacoder import Adacoder
from src.llm_clients import LLMConfig


class RecordingExecutor:
    instances: list["RecordingExecutor"] = []

    def __init__(self, system_prompt: str, LLM_Config: LLMConfig, prompt_language: str = "en"):
        self.system_prompt = system_prompt
        self.config = LLM_Config
        self.prompt_language = prompt_language
        self.coder_call: dict | None = None
        self.planner_call: dict | None = None
        type(self).instances.append(self)

    def execute_coder(self, **kwargs):
        self.coder_call = kwargs
        return {"ok": True, "code": "def solve(value):\n    return value", "attempts": 1}

    def execute_planner(self, **kwargs):
        self.planner_call = kwargs
        return {"ok": True, "plan": "## Plan\n1. Fix the return value.", "attempts": 1}


class AdacoderIntegrationTests(unittest.TestCase):
    def test_plan_wrapper_forwards_raw_response_for_success_and_failure(self) -> None:
        with patch("src.Adacoder.AdacoderExecutor", RecordingExecutor):
            engine = Adacoder(LLMConfig(provider="vllm", model="test"))
        for plan in ("## Plan\n1. Keep `a+b`.", ""):
            with self.subTest(plan=plan), patch.object(engine.planner, "execute_planner", return_value={
                "plan": plan, "raw_response": "original output",
                "plan_processing": "whitespace_only", "attempts": 1,
            }):
                result = engine.create_plan("Implement solve(value)")
                self.assertEqual(result["raw_response"], "original output")
                self.assertEqual(result["plan_processing"], "whitespace_only")
                self.assertEqual(result["ok"], bool(plan))

    def setUp(self) -> None:
        RecordingExecutor.instances = []

    def test_stage_configs_are_independent_and_prompts_are_contract_grounded(self) -> None:
        config = LLMConfig(
            provider="vllm",
            model="test",
            base_url="http://example/v1",
            max_tokens=1024,
        )

        with patch("src.Adacoder.AdacoderExecutor", RecordingExecutor):
            Adacoder(config)

        coder, planner, tester = RecordingExecutor.instances
        self.assertIsNot(coder.config, planner.config)
        self.assertIsNot(coder.config, tester.config)
        self.assertEqual(coder.config.max_tokens, 1024)
        self.assertEqual(planner.config.max_tokens, 512)
        self.assertEqual(tester.config.max_tokens, 768)
        self.assertEqual(config.max_tokens, 1024)
        self.assertIn("original task as the authoritative contract", coder.system_prompt)
        self.assertIn("max((score, name)) incorrectly chooses the largest tied name", coder.system_prompt)
        self.assertIn("never invent requirements", planner.system_prompt)
        self.assertIn("Use the fewest steps needed, never more than 5", planner.system_prompt)
        self.assertNotIn("max((score, name))", planner.system_prompt)
        self.assertIn("Test only behavior explicitly required", tester.system_prompt)

    def test_chinese_prompt_language_localizes_all_system_prompts(self) -> None:
        config = LLMConfig(provider="vllm", model="test", base_url="http://example/v1")

        with patch("src.Adacoder.AdacoderExecutor", RecordingExecutor):
            Adacoder(config, prompt_language="zh-CN")

        coder, planner, tester = RecordingExecutor.instances
        self.assertEqual([coder.prompt_language, planner.prompt_language, tester.prompt_language], ["zh-CN"] * 3)
        self.assertIn("严谨的 Python 实现助手", coder.system_prompt)
        self.assertIn("最多 5 步", planner.system_prompt)
        self.assertIn("Python 测试生成助手", tester.system_prompt)

    def test_wrapper_forwards_current_failure_state(self) -> None:
        config = LLMConfig(provider="vllm", model="test", base_url="http://example/v1")
        evaluation = {"error_type": "AssertionError", "traceback": "full traceback"}

        with patch("src.Adacoder.AdacoderExecutor", RecordingExecutor):
            engine = Adacoder(config)
            engine.generate_code(
                "Implement solve(value)",
                plan="Fix it.",
                test_code="assert solve(1) == 1",
                current_code="def solve(value):\n    return None",
                evaluation=evaluation,
            )
            engine.create_plan(
                "Implement solve(value)",
                evaluation=evaluation,
                current_code="def solve(value):\n    return None",
                test_code="assert solve(1) == 1",
            )

        self.assertEqual(engine.coder.coder_call["current_code"], "def solve(value):\n    return None")
        self.assertEqual(engine.coder.coder_call["test_code"], "assert solve(1) == 1")
        self.assertIs(engine.coder.coder_call["evaluation"], evaluation)
        self.assertEqual(engine.planner.planner_call["test_code"], "assert solve(1) == 1")
        self.assertIs(engine.planner.planner_call["relat_err_dict"], evaluation)


if __name__ == "__main__":
    unittest.main()
