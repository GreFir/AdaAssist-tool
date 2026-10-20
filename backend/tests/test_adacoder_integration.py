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
        self.assertEqual(planner.config.max_tokens, 1024)
        self.assertEqual(planner.config.temperature, 0.5)
        self.assertEqual(coder.config.temperature, 0.2)
        self.assertEqual(tester.config.temperature, 0.2)
        self.assertEqual(config.temperature, 0.2)
        self.assertEqual(tester.config.max_tokens, 1024)
        self.assertEqual(config.max_tokens, 1024)
        self.assertIn("original task as the authoritative contract", coder.system_prompt)
        self.assertIn("max((score, name)) incorrectly chooses the largest tied name", coder.system_prompt)
        self.assertIn("never invent requirements", planner.system_prompt)
        self.assertIn("with 4 to 8 distinct, actionable steps", planner.system_prompt)
        self.assertIn("max((score, name))", planner.system_prompt)
        self.assertIn("Test only behavior explicitly required", tester.system_prompt)

    def test_workflow_max_output_tokens_apply_consistently_to_all_model_stages(self) -> None:
        for budget, expected_planner, expected_tester in (
            (256, 256, 256),
            (4096, 4096, 4096),
        ):
            with self.subTest(budget=budget):
                RecordingExecutor.instances = []
                config = LLMConfig(provider="vllm", model="test", max_tokens=budget)
                with patch("src.Adacoder.AdacoderExecutor", RecordingExecutor):
                    engine = Adacoder(config)
                coder, planner, tester = RecordingExecutor.instances
                self.assertEqual(coder.config.max_tokens, budget)
                self.assertEqual(planner.config.max_tokens, expected_planner)
                self.assertEqual(tester.config.max_tokens, expected_tester)
                self.assertEqual(engine.coder_config.max_tokens, budget)

    def test_explicit_planner_budget_is_preserved(self) -> None:
        config = LLMConfig(provider="vllm", model="test", max_tokens=1024)
        planner_config = LLMConfig(provider="vllm", model="test", max_tokens=3072, temperature=0.7)
        with patch("src.Adacoder.AdacoderExecutor", RecordingExecutor):
            engine = Adacoder(config, planner_config=planner_config)
        self.assertEqual(engine.planner_config.max_tokens, 3072)
        self.assertEqual(engine.planner_config.temperature, 0.7)
        self.assertIsNot(engine.planner_config, planner_config)
        self.assertEqual(config.max_tokens, 1024)

    def test_chinese_prompt_language_localizes_all_system_prompts(self) -> None:
        config = LLMConfig(provider="vllm", model="test", base_url="http://example/v1")

        with patch("src.Adacoder.AdacoderExecutor", RecordingExecutor):
            Adacoder(config, prompt_language="zh-CN")

        coder, planner, tester = RecordingExecutor.instances
        self.assertEqual([coder.prompt_language, planner.prompt_language, tester.prompt_language], ["zh-CN"] * 3)
        self.assertIn("严谨的 Python 实现助手", coder.system_prompt)
        self.assertIn("4 至 8 个", planner.system_prompt)
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
