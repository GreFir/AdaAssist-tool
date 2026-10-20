from __future__ import annotations

import unittest

from src.executor.AdacoderExe import AdacoderExecutor


class FakeRouter:
    def __init__(self, response: str):
        self.response = response
        self.prompts: list[str] = []

    def generate(self, user_prompt: str) -> str:
        self.prompts.append(user_prompt)
        return self.response

    def generation_info(self) -> dict:
        return {"duration_ms": 0, "usage": {}}


def executor_with(response: str, prompt_language: str = "en") -> tuple[AdacoderExecutor, FakeRouter]:
    executor = object.__new__(AdacoderExecutor)
    executor.prompt_language = prompt_language
    router = FakeRouter(response)
    executor.llmrouter = router
    return executor, router


class ExecutorPromptTests(unittest.TestCase):
    def test_chinese_language_localizes_code_test_and_plan_prompts(self) -> None:
        code_executor, code_router = executor_with("def solve(value):\n    return value", "zh-CN")
        code_executor.execute_coder("实现 solve(value)", test_code="assert solve(1) == 1")
        self.assertIn("## 原始任务", code_router.prompts[-1])
        self.assertIn("## 公开测试", code_router.prompts[-1])
        self.assertIn("只返回完整的 Python 实现", code_router.prompts[-1])

        test_executor, test_router = executor_with("assert solve(1) == 1", "zh-CN")
        test_executor.generate_test_code("实现 solve(value)")
        self.assertIn("## 任务说明", test_router.prompts[-1])
        self.assertIn("只使用普通的顶层 `assert`", test_router.prompts[-1])

        plan_executor, plan_router = executor_with("## 计划\n1. 检查并修复当前返回值。", "zh-CN")
        plan_executor.execute_planner("实现 solve(value)", current_code="def solve(value):\n    return None")
        self.assertIn("## 当前候选代码", plan_router.prompts[-1])
        self.assertIn("只按下面的 Markdown 格式输出计划", plan_router.prompts[-1])

    def test_initial_coder_treats_task_as_authoritative(self) -> None:
        executor, router = executor_with("def solve(value):\n    return value")

        result = executor.execute_coder("Implement solve(value)")

        self.assertTrue(result["ok"])
        prompt = router.prompts[0]
        self.assertIn("## Original Task\nImplement solve(value)", prompt)
        self.assertIn("authoritative specification", prompt)
        self.assertIn("Do not invent validation rules, exceptions", prompt)
        self.assertIn("Preserve the requested function or class names and signatures", prompt)
        self.assertIn("Return only the complete Python implementation", prompt)
        self.assertIn("aggregation basis, edge case, and tie-breaking rule", prompt)
        self.assertIn("return exactly those fields and value shapes", prompt)
        self.assertIn("never rely on dictionary or input insertion order", prompt)
        self.assertIn("scores[group] = scores.get(group, 0) + record[value_field]", prompt)
        self.assertIn("min(scores, key=lambda group: (-scores[group], group))", prompt)
        self.assertIn("count-based selection", prompt)
        self.assertIn("chooses the lexicographically largest tied item", prompt)

    def test_coder_receives_public_tests_as_behavior_examples(self) -> None:
        executor, router = executor_with("def solve(value):\n    return value")

        result = executor.execute_coder(
            "Implement solve(value)",
            test_code="assert solve(0) == 0",
        )

        self.assertTrue(result["ok"])
        prompt = router.prompts[0]
        self.assertIn("## Public Tests", prompt)
        self.assertIn("assert solve(0) == 0", prompt)
        self.assertIn("without hardcoding their inputs", prompt)

    def test_repair_coder_receives_code_plan_and_complete_failure(self) -> None:
        executor, router = executor_with("def solve(value):\n    return value + 1")
        evaluation = {
            "stage": "exec_tests",
            "error_type": "ValueError",
            "error": "one public test failed",
            "traceback": "Traceback: bad value",
            "test_summary": {"total": 3, "passed": 2, "failed": 1, "pass_rate": 2 / 3},
            "test_results": [
                {"index": 1, "line": 1, "source": "assert solve(0) == 0", "passed": True, "message": ""},
                {"index": 2, "line": 2, "source": "assert solve(1) == 1", "passed": False, "error_type": "ValueError", "message": "bad value"},
                {"index": 3, "line": 3, "source": "assert solve(2) == 2", "passed": True, "message": ""},
            ],
        }

        result = executor.execute_coder(
            "Implement solve(value)",
            plan="## Plan\n1. Correct the return value.",
            current_code="def solve(value):\n    return value + 2",
            evaluation=evaluation,
        )

        self.assertTrue(result["ok"])
        prompt = router.prompts[0]
        self.assertIn("## Current Failed Code", prompt)
        self.assertIn("return value + 2", prompt)
        self.assertIn("## Approved Repair Plan", prompt)
        self.assertIn("Correct the return value", prompt)
        self.assertIn("## Latest Failure", prompt)
        self.assertIn("Stage: exec_tests", prompt)
        self.assertIn("Error Type: ValueError", prompt)
        self.assertIn("Test Summary: 2/3 passed (67%), 1 failed", prompt)
        self.assertIn("[PASSED] #1, line 1: assert solve(0) == 0", prompt)
        self.assertIn("[FAILED] #2, line 2: assert solve(1) == 1 | ValueError: bad value", prompt)
        self.assertIn("Traceback for the first failure:\nTraceback: bad value", prompt)
        self.assertIn("The repair plan is advisory", prompt)
        self.assertIn("Preserve behavior that is already correct", prompt)
        self.assertIn("keep internal bookkeeping out of the public result", prompt)
        self.assertIn("explicit secondary selection or sorting key", prompt)
        self.assertIn("scores[group] = scores.get(group, 0) + record[value_field]", prompt)
        self.assertIn("min(scores, key=lambda group: (-scores[group], group))", prompt)
        self.assertIn("first-seen selection", prompt)
        self.assertIn("chooses the lexicographically largest tied item", prompt)

    def test_planner_receives_current_state_and_keeps_complete_response(self) -> None:
        raw_response = (
            "Ċ##ĠPlanĊ1.ĠFix the aggregation."
            "ĊĊ##ĠExplanationĊThis remains visible."
        )
        executor, router = executor_with(raw_response)

        result = executor.execute_planner(
            "Implement summarize(orders)",
            current_code="def summarize(orders):\n    return None",
            test_code="assert summarize([]) == {}",
            relat_err_dict={
                "stage": "exec_tests",
                "error_type": "AssertionError",
                "error": "empty input failed",
                "traceback": "full traceback text",
                "test_summary": {"total": 2, "passed": 1, "failed": 1, "pass_rate": 0.5},
                "test_results": [
                    {"index": 1, "line": 1, "source": "assert summarize([]) == {}", "passed": False, "error_type": "AssertionError", "message": ""},
                    {"index": 2, "line": 2, "source": "assert summarize([1]) == {1: 1}", "passed": True, "message": ""},
                ],
            },
        )

        prompt = router.prompts[0]
        self.assertIn("## Current Candidate Code", prompt)
        self.assertIn("return None", prompt)
        self.assertIn("## Public Tests Used", prompt)
        self.assertIn("assert summarize([]) == {}", prompt)
        self.assertIn("Error Message: empty input failed", prompt)
        self.assertIn("Test Summary: 1/2 passed (50%), 1 failed", prompt)
        self.assertIn("[FAILED] #1, line 1: assert summarize([]) == {} | AssertionError", prompt)
        self.assertIn("[PASSED] #2, line 2: assert summarize([1]) == {1: 1}", prompt)
        self.assertIn("full traceback text", prompt)
        self.assertIn("Use the fewest steps needed and never more than 5", prompt)
        self.assertIn("Each step must be one short, concrete, actionable sentence", prompt)
        self.assertNotIn("top group by a total numeric field", prompt)
        self.assertNotIn("explore various approaches", prompt)
        self.assertEqual(
            result["plan"],
            "## Plan\n1. Fix the aggregation.\n\n## Explanation\nThis remains visible.",
        )

    def test_planner_preserves_full_instructions_and_records_raw_response(self) -> None:
        raw_response = """## Plan
1. Replace `a+b` with `a-b`.
2. Replace `a-b` with `a+b`.
3. Preserve the key `Name`.
4. Preserve the key `name`.
5. Preserve two literal spaces in `a  b`.
6. Use this exact update:
```python
    ready.append(node)
```
## Verification
Check the empty graph.
"""
        executor, router = executor_with(raw_response)
        result = executor.execute_planner("Implement dependency_order(graph)")
        self.assertEqual(result["plan"], raw_response.strip())
        self.assertEqual(result["raw_response"], raw_response)
        self.assertEqual(result["plan_processing"], "whitespace_only")
        self.assertEqual(len(router.prompts), 1)

    def test_planner_preserves_constraints_after_220_characters(self) -> None:
        raw = "## Plan\n1. " + ("Preserve existing dependency traversal. " * 8)
        raw += "Use a min-heap for all ready nodes."
        executor, _ = executor_with(raw)
        result = executor.execute_planner("Implement solve(value)")
        self.assertEqual(result["plan"], raw)
        self.assertTrue(result["plan"].endswith("Use a min-heap for all ready nodes."))

    def test_planner_does_not_disguise_malformed_output_as_a_numbered_plan(self) -> None:
        raw = "Ċ<jupyter_text>ĊPlan1.ĠInspect inputs.Ċ<jupyter_code>ĊdefĠf():ĊĠĠreturnĠ1"
        executor, _ = executor_with(raw)
        result = executor.execute_planner("Implement f()")
        self.assertEqual(result["raw_response"], raw)
        self.assertEqual(result["plan"], "<jupyter_text>\nPlan1. Inspect inputs.\n<jupyter_code>\ndef f():\n  return 1")

    def test_test_prompt_forbids_invented_requirements_and_repetition(self) -> None:
        executor, router = executor_with("assert solve(0) == 0")

        result = executor.generate_test_code("Implement solve(value)")

        self.assertTrue(result["ok"])
        prompt = router.prompts[0]
        self.assertIn("Test only behavior explicitly required", prompt)
        self.assertIn("Do not invent exception behavior, type validation", prompt)
        self.assertIn("Prefer 5 to 10 non-redundant assertions", prompt)
        self.assertIn("distinct requirement or boundary", prompt)

    def test_evaluation_identifies_the_failed_public_assertion(self) -> None:
        executor, _ = executor_with("")

        result = executor.evaluate_code(
            "def solve(value):\n    return value + 1",
            "assert solve(0) == 1\nassert solve(1) == 1",
        )

        self.assertFalse(result["passed"])
        self.assertEqual(result["error_type"], "AssertionError")
        self.assertEqual(result["test_line"], 2)
        self.assertEqual(result["failed_test"], "assert solve(1) == 1")
        self.assertIn("line 2: assert solve(1) == 1", result["error"])

    def test_evaluation_reports_all_failed_top_level_assertions(self) -> None:
        executor, _ = executor_with("")

        result = executor.evaluate_code(
            "def solve(value):\n    return value + 1",
            "assert solve(0) == 0\nassert solve(1) == 1\nassert solve(2) == 3",
        )

        self.assertFalse(result["passed"])
        self.assertEqual(len(result["failed_tests"]), 2)
        self.assertEqual([item["line"] for item in result["failed_tests"]], [1, 2])
        self.assertIn("assert solve(0) == 0", result["error"])
        self.assertIn("assert solve(1) == 1", result["error"])
        self.assertEqual(result["test_summary"], {"total": 3, "passed": 1, "failed": 2, "pass_rate": 1 / 3})
        self.assertEqual([item["passed"] for item in result["test_results"]], [False, False, True])

    def test_evaluation_reports_each_passing_top_level_assertion(self) -> None:
        executor, _ = executor_with("")

        result = executor.evaluate_code(
            "def solve(value):\n    return value + 1",
            "assert solve(0) == 1\nassert solve(1) == 2",
        )

        self.assertTrue(result["passed"])
        self.assertEqual(result["test_summary"], {"total": 2, "passed": 2, "failed": 0, "pass_rate": 1.0})
        self.assertEqual([item["line"] for item in result["test_results"]], [1, 2])
        self.assertTrue(all(item["passed"] for item in result["test_results"]))

    def test_evaluation_continues_after_non_assertion_error_inside_assert(self) -> None:
        executor, _ = executor_with("")

        result = executor.evaluate_code(
            "def solve(value):\n    if value == 1:\n        raise ValueError('bad value')\n    return value",
            "assert solve(0) == 0\nassert solve(1) == 1\nassert solve(2) == 3\nassert solve(3) == 3",
        )

        self.assertFalse(result["passed"])
        self.assertEqual(result["test_summary"], {"total": 4, "passed": 2, "failed": 2, "pass_rate": 0.5})
        self.assertEqual([item["passed"] for item in result["test_results"]], [True, False, False, True])
        self.assertEqual([item.get("error_type") for item in result["failed_tests"]], ["ValueError", "AssertionError"])
        self.assertIn("ValueError: bad value", result["error"])
        self.assertIn("assert solve(2) == 3", result["error"])
        self.assertIn("ValueError: bad value", result["traceback"])


if __name__ == "__main__":
    unittest.main()
