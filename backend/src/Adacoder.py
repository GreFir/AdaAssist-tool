from __future__ import annotations

from dataclasses import replace
from typing import Any, Callable

from .executor import AdacoderExecutor
from .llm_clients import LLMConfig
from .utils import DebugSpecialist

StageCallback = Callable[[dict[str, Any]], None]


class Adacoder:
    def __init__(
        self,
        config: LLMConfig,
        planner_config: LLMConfig | None = None,
        prompt_language: str = "en",
    ):
        # Keep stage settings independent: mutating one stage must not silently
        # change the others. Plans and tests also need far less output than a
        # full implementation, which reduces runaway repetition on local models.
        self.coder_config = replace(config)
        self.planner_config = replace(
            planner_config or config,
            max_tokens=min((planner_config or config).max_tokens, 512),
        )
        self.tester_config = replace(config, max_tokens=min(config.max_tokens, 768))
        self.prompt_language = "zh-CN" if prompt_language == "zh-CN" else "en"
        self.coder = self._init_coder()
        self.planner = self._init_planner()
        self.tester = self._init_tester()
        self.debugger = self._init_debugger()

    def _init_coder(self) -> AdacoderExecutor:
        if self.prompt_language == "zh-CN":
            system_prompt = (
                "你是一名严谨的 Python 实现助手。将用户的原始任务视为最高优先级的契约。"
                "严格实现该契约，保留指定的名称和函数签名，不要自行增加校验、异常、字段或行为。"
                "当任务要求最大化某个分数且并列时选择字典序最小的名称，必须累计指定分数，并使用等价于 "
                "min((-score, name)) 的比较；max((score, name)) 会错误地选择并列项中字典序最大的名称。"
                "只返回完整的 Python 实现，不要包含 Markdown 或解释。"
            )
        else:
            system_prompt = (
                "You are a precise Python implementation assistant. "
                "Treat the user's original task as the authoritative contract. "
                "Implement exactly that contract, preserve requested names and signatures, "
                "and do not invent validation, exceptions, fields, or behavior. "
                "When maximizing a score with a lexicographically smallest tie-break, accumulate "
                "the specified score and use a comparison equivalent to min((-score, name)); "
                "max((score, name)) incorrectly chooses the largest tied name. "
                "Return only a complete Python implementation without markdown or explanation."
            )
        return AdacoderExecutor(
            system_prompt=system_prompt,
            LLM_Config=self.coder_config,
            prompt_language=self.prompt_language,
        )

    def _init_planner(self) -> AdacoderExecutor:
        if self.prompt_language == "zh-CN":
            system_prompt = (
                "你是一名 Python 代码修复规划助手。请根据原始任务和公开测试诊断当前失败的实现。"
                "原始任务是最高优先级的依据，不要自行增加需求。"
                "只返回直接针对根因的修复计划，使用完成修复所需的最少步骤，最多 5 步，每步只写一个具体动作。"
            )
        else:
            system_prompt = (
                "You are a Python repair-planning assistant. Diagnose the current failed "
                "implementation against the original task and public tests. The original task "
                "is authoritative: never invent requirements. Return only a repair plan that "
                "directly addresses the supported root cause. Use the fewest steps needed, never "
                "more than 5, and put one concrete action in each step."
            )
        return AdacoderExecutor(
            system_prompt=system_prompt,
            LLM_Config=self.planner_config,
            prompt_language=self.prompt_language,
        )

    def _init_tester(self) -> AdacoderExecutor:
        system_prompt = (
            "你是一名 Python 测试生成助手。你的唯一任务是为指定的 Python 任务编写可运行的顶层 assert 测试。"
            "只测试任务明确要求的行为，不要自行增加校验、异常、返回字段、数据结构或约束。"
            "不要实现或重新定义候选解答。只输出 Python 测试代码，不要使用 Markdown 代码围栏。"
            if self.prompt_language == "zh-CN"
            else (
                "You are a Python test generation assistant. "
                "Your only job is to write runnable top-level assert tests for the requested Python task. "
                "Test only behavior explicitly required by the task; never invent validation, exceptions, "
                "return fields, data structures, or constraints. "
                "Never implement or redefine the candidate solution. "
                "Output only Python test code without markdown fences."
            )
        )
        return AdacoderExecutor(
            system_prompt=system_prompt,
            LLM_Config=self.tester_config,
            prompt_language=self.prompt_language,
        )

    def _init_debugger(self) -> DebugSpecialist:
        return DebugSpecialist()

    def generate_code(
        self,
        problem_statement: str,
        *,
        plan: str = "",
        test_code: str = "",
        additional_instruction: str = "",
        context_entries: list[dict[str, Any]] | None = None,
        stage: str = "generate",
        current_code: str = "",
        evaluation: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        result = self.coder.execute_coder(
            problem_statement=problem_statement,
            plan=plan,
            test_code=test_code,
            additional_instruction=additional_instruction,
            context_entries=context_entries,
            current_code=current_code,
            evaluation=evaluation,
        )
        code = result.get("code", "")
        if not code:
            error = str(result.get("error") or "No code was returned by the model.")
            return {
                "ok": False,
                "stage": stage,
                "message": "Failed to generate code from the model.",
                "attempts": result.get("attempts", 0),
                "prompt": result.get("prompt", ""),
                "code": "",
                "error": error,
                "raw_response": result.get("raw_response", ""),
                "generation": result.get("generation", {}),
            }

        return {
            "ok": True,
            "stage": stage,
            "message": "Code generation completed.",
            "attempts": result.get("attempts", 0),
            "prompt": result.get("prompt", ""),
            "code": code,
            "generation": result.get("generation", {}),
        }

    def generate_tests(
        self,
        problem_statement: str,
        *,
        test_description: str = "",
        additional_instruction: str = "",
        context_entries: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        result = self.tester.generate_test_code(
            problem_statement=problem_statement,
            test_description=test_description,
            additional_instruction=additional_instruction,
            context_entries=context_entries,
        )
        test_code = result.get("test_code", "")
        if not test_code:
            error = str(result.get("error") or "No test code was returned by the model.")
            return {
                "ok": False,
                "stage": "tests",
                "message": "Failed to generate tests from the model.",
                "attempts": result.get("attempts", 0),
                "prompt": result.get("prompt", ""),
                "test_code": "",
                "error": error,
                "raw_response": result.get("raw_response", ""),
                "diagnostic": result.get("diagnostic", {}),
                "diagnostics": result.get("diagnostics", []),
                "generation": result.get("generation", {}),
            }

        return {
            "ok": True,
            "stage": "tests",
            "message": "Test generation completed.",
            "attempts": result.get("attempts", 0),
            "prompt": result.get("prompt", ""),
            "test_code": test_code,
            "diagnostic": result.get("diagnostic", {}),
            "diagnostics": result.get("diagnostics", []),
            "generation": result.get("generation", {}),
        }

    def evaluate_code(self, code: str, test_code: str) -> dict[str, Any]:
        result = self.coder.evaluate_code(code=code, test_code=test_code)
        message = "Code passed all tests." if result.get("passed") else "Code evaluation failed."
        return {
            "ok": True,
            "stage": "evaluate",
            "message": message,
            "evaluation": result,
        }

    def create_plan(
        self,
        problem_statement: str,
        *,
        evaluation: dict[str, Any] | None = None,
        additional_instruction: str = "",
        context_entries: list[dict[str, Any]] | None = None,
        use_error_feedback: bool = True,
        current_code: str = "",
        test_code: str = "",
    ) -> dict[str, Any]:
        result = self.planner.execute_planner(
            problem_statement=problem_statement,
            relat_err_dict=evaluation or {},
            additional_instruction=additional_instruction,
            context_entries=context_entries,
            use_error_feedback=use_error_feedback,
            current_code=current_code,
            test_code=test_code,
        )
        plan = result.get("plan", "")
        if not plan:
            error = str(result.get("error") or "No plan was returned by the model.")
            return {
                "ok": False,
                "stage": "plan",
                "message": "Failed to generate a plan.",
                "attempts": result.get("attempts", 0),
                "prompt": result.get("prompt", ""),
                "plan": "",
                "error": error,
                "used_error_feedback": use_error_feedback,
                "raw_response": result.get("raw_response", ""),
                "plan_processing": result.get("plan_processing", ""),
            }

        return {
            "ok": True,
            "stage": "plan",
            "message": "Plan generated successfully.",
            "attempts": result.get("attempts", 0),
            "prompt": result.get("prompt", ""),
            "plan": plan,
            "used_error_feedback": use_error_feedback,
            "raw_response": result.get("raw_response", ""),
            "plan_processing": result.get("plan_processing", ""),
        }

    def apply_debug_fix(self, code: str, evaluation: dict[str, Any]) -> dict[str, Any]:
        fix_result = self.debugger.fix(code, evaluation)
        fixed_code = fix_result.get("fixed_code", code)
        changed = bool(fix_result.get("changed", False))
        return {
            "ok": changed,
            "stage": "debug_fix",
            "message": "Applied local debug fixes." if changed else "No local debug fix was applied.",
            "changed": changed,
            "fixes": fix_result.get("fixes", []),
            "code": fixed_code,
        }

    def workflow(
        self,
        problem_statement: str,
        test_code: str,
        *,
        context_entries: list[dict[str, Any]] | None = None,
        max_rounds: int = 3,
        emit: StageCallback | None = None,
    ) -> dict[str, Any]:
        events: list[dict[str, Any]] = []

        def record(event: dict[str, Any]) -> None:
            events.append(event)
            if emit is not None:
                emit(event)

        current_context = list(context_entries or [])

        generation = self.generate_code(
            problem_statement,
            test_code=test_code,
            context_entries=current_context,
            stage="generate",
        )
        record(generation)
        if not generation.get("ok"):
            return {
                "passed": False,
                "error": generation.get("error", generation.get("message", "")),
                "events": events,
            }

        code = generation.get("code", "")
        evaluation_result = self.evaluate_code(code, test_code)
        record(evaluation_result)
        evaluation = evaluation_result.get("evaluation", {})
        if evaluation.get("passed"):
            return {
                "passed": True,
                "code": code,
                "code_test_res_dict": evaluation,
                "events": events,
            }

        for _ in range(max_rounds):
            if self.debugger.could_be_fixed(
                evaluation.get("stage", ""),
                evaluation.get("error_type", ""),
            ):
                fix_result = self.apply_debug_fix(code, evaluation)
                record(fix_result)
                if fix_result.get("changed"):
                    code = fix_result.get("code", code)
                    evaluation_result = self.evaluate_code(code, test_code)
                    record(evaluation_result)
                    evaluation = evaluation_result.get("evaluation", {})
                    if evaluation.get("passed"):
                        return {
                            "passed": True,
                            "code": code,
                            "code_test_res_dict": evaluation,
                            "events": events,
                        }

            plan_result = self.create_plan(
                problem_statement,
                evaluation=evaluation,
                current_code=code,
                test_code=test_code,
                context_entries=current_context,
                use_error_feedback=True,
            )
            record(plan_result)
            if not plan_result.get("ok"):
                return {
                    "passed": False,
                    "code": code,
                    "code_test_res_dict": evaluation,
                    "error": plan_result.get("error", plan_result.get("message", "")),
                    "events": events,
                }

            generation = self.generate_code(
                problem_statement,
                plan=plan_result.get("plan", ""),
                test_code=test_code,
                current_code=code,
                evaluation=evaluation,
                context_entries=current_context,
                stage="regenerate",
            )
            record(generation)
            if not generation.get("ok"):
                return {
                    "passed": False,
                    "code": code,
                    "code_test_res_dict": evaluation,
                    "error": generation.get("error", generation.get("message", "")),
                    "events": events,
                }

            code = generation.get("code", "")
            evaluation_result = self.evaluate_code(code, test_code)
            record(evaluation_result)
            evaluation = evaluation_result.get("evaluation", {})
            if evaluation.get("passed"):
                return {
                    "passed": True,
                    "code": code,
                    "code_test_res_dict": evaluation,
                    "events": events,
                }

        return {
            "passed": False,
            "code": code,
            "code_test_res_dict": evaluation,
            "events": events,
        }
