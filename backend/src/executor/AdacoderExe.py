# Generate code directly from the prompt first; the first step has no plan.

# Plan:
# 1. Call the model directly through the router; the first step has no plan input.
# 2. Reuse the previous attempt when possible; after failure, a model-generated plan can guide regeneration.

# Tool inputs:
# 1. User requirement (required)
# 2. Modules to import (optional)
# 3. Test examples (optional)
# 4. File that stores the test code (required)
from ..llm_clients import LLMRouter,LLMConfig
import ast
import re

from ..utils import diagnose_code_output, normalize_test_output, normalize_tokenizer_artifacts, preprocess
import traceback
from typing import Any

def format_llm_error(exc: Exception) -> str:
    return f"{type(exc).__name__}: {exc}"


def normalize_repair_plan(text: str, prompt_language: str = "en") -> str:
    """Normalize a complete response without rewriting the model's plan.

    Keep operators, case, repeated steps, code blocks, and trailing constraints.
    This experimental policy only restores transport whitespace markers; the
    planning prompt remains responsible for asking for a concise plan.
    """
    return normalize_tokenizer_artifacts(text).strip()


class AdacoderExecutor():
    def __init__(
        self,
        system_prompt: str = "",
        LLM_Config: LLMConfig = LLMConfig(),
        prompt_language: str = "en",
    ):
        self.llmconfig=LLM_Config
        self.prompt_language = "zh-CN" if prompt_language == "zh-CN" else "en"
        self.llmrouter=self._init_roter(system_prompt,LLM_Config)

    def _init_roter(self,system_prompt:str,LLM_Config:LLMConfig):
        return LLMRouter(system_prompt,LLM_Config)

    def _extract_target_symbols(self, problem_statement: str) -> list[str]:
        patterns = [
            r"\bdef\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(",
            r"\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|:)",
            r"\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(",
            r"(?:\u5b9e\u73b0|\u7f16\u5199|\u5b9a\u4e49|\u5b9e\u73b0\u51fd\u6570|\u51fd\u6570)\s*`?([A-Za-z_][A-Za-z0-9_]*)`?\s*\(",
            r"(?:implement|write|define)\s+(?:the\s+)?(?:function|class)\s+`?([A-Za-z_][A-Za-z0-9_]*)`?",
        ]
        names: list[str] = []
        for pattern in patterns:
            for match in re.findall(pattern, problem_statement, flags=re.IGNORECASE):
                if match and match not in names:
                    names.append(match)
        return names[:6]

    def _build_context_block(self, context_entries: list[dict[str, Any]] | None) -> str:
        if not context_entries:
            return ""

        sections: list[str] = []
        for index, entry in enumerate(context_entries[-8:], start=1):
            if not isinstance(entry, dict):
                continue

            role = str(entry.get("role", "system")).strip() or "system"
            kind = str(entry.get("kind", "context")).strip() or "context"
            content = str(entry.get("content", "")).strip()
            if not content:
                continue

            title = str(entry.get("title", kind)).strip() or kind
            sections.append(
                f"### {index}. {title} ({role})\n{content}"
            )

        if not sections:
            return ""

        if self.prompt_language == "zh-CN":
            return "## 上下文\n以下内容有帮助时可以复用，但必须优先遵循当前任务。\n\n" + "\n\n".join(sections) + "\n\n"
        return "## Context\nReuse the following context when it is helpful, but prioritize the current task.\n\n" + "\n\n".join(sections) + "\n\n"

    def _build_additional_instruction_block(self, additional_instruction: str) -> str:
        cleaned = additional_instruction.strip()
        if not cleaned:
            return ""
        if self.prompt_language == "zh-CN":
            return f"""## 用户补充要求
{cleaned}

将其视为当前任务的附加约束，不要忽略或替换原始任务说明。

"""
        return f"""## Additional User Instruction
{cleaned}

Treat this as an additional constraint on the task. Do not ignore or replace the original task description.

"""

    def _build_failure_block(self, evaluation: dict[str, Any] | None) -> str:
        evaluation = evaluation or {}

        def value(name: str) -> str:
            raw_value = evaluation.get(name)
            if raw_value is None or raw_value == "":
                return "(not available)"
            return str(raw_value)

        test_results = evaluation.get("test_results")
        test_summary = evaluation.get("test_summary")
        structured_feedback = ""
        if isinstance(test_results, list) and test_results:
            valid_results = [item for item in test_results if isinstance(item, dict)]
            summary = test_summary if isinstance(test_summary, dict) else {}
            total = int(summary.get("total", len(valid_results)) or len(valid_results))
            passed = int(summary.get("passed", sum(item.get("passed") is True for item in valid_results)) or 0)
            failed = int(summary.get("failed", total - passed) or 0)
            percentage = round((passed / total) * 100) if total else 0
            result_lines: list[str] = []
            for fallback_index, item in enumerate(valid_results[:20], start=1):
                status = "PASSED" if item.get("passed") is True else "FAILED"
                index = item.get("index") or fallback_index
                line = item.get("line")
                location = f"line {line}" if line else "line unknown"
                source = " ".join(str(item.get("source") or "assert").split())[:300]
                result_line = f"- [{status}] #{index}, {location}: {source}"
                if status == "FAILED":
                    error_type = str(item.get("error_type") or "TestFailure").strip()
                    message = " ".join(str(item.get("message") or "").split())[:180]
                    result_line += f" | {error_type}" + (f": {message}" if message else "")
                result_lines.append(result_line)
            if len(valid_results) > 20:
                result_lines.append(f"- ... {len(valid_results) - 20} additional results omitted")

            if self.prompt_language == "zh-CN":
                localized_lines = []
                for line in result_lines:
                    localized = line.replace("[PASSED]", "[通过]").replace("[FAILED]", "[失败]")
                    localized = localized.replace(", line unknown:", "，行号未知：")
                    localized = re.sub(r", line (\d+):", r"，第 \1 行：", localized)
                    localized_lines.append(localized)
                structured_feedback = (
                    f"\n测试汇总：{passed}/{total} 通过（{percentage}%），{failed} 失败"
                    "\n逐项测试结果：\n" + "\n".join(localized_lines) + "\n"
                )
            else:
                structured_feedback = (
                    f"\nTest Summary: {passed}/{total} passed ({percentage}%), {failed} failed"
                    "\nPer-Test Results:\n" + "\n".join(result_lines) + "\n"
                )

        if self.prompt_language == "zh-CN":
            return f"""阶段：{value("stage")}
错误类型：{value("error_type")}
错误信息：{value("error")}
{structured_feedback}首个失败的回溯信息：
{value("traceback")}"""
        return f"""Stage: {value("stage")}
Error Type: {value("error_type")}
Error Message: {value("error")}
{structured_feedback}Traceback for the first failure:
{value("traceback")}"""

    def execute_coder(
        self,
        problem_statement:str="",
        plan:str="",
        test_code: str = "",
        additional_instruction: str = "",
        context_entries: list[dict[str, Any]] | None = None,
        current_code: str = "",
        evaluation: dict[str, Any] | None = None,
    )->dict[str, Any]:
        if problem_statement=="":
            raise(RuntimeError("Input cannot be empty."))
        context_block = self._build_context_block(context_entries)
        instruction_block = self._build_additional_instruction_block(additional_instruction)
        tests_block = ""
        if test_code.strip():
            if self.prompt_language == "zh-CN":
                tests_block = f"""## 公开测试
```python
{test_code.strip()}
```

将这些测试作为所需行为的具体示例。必须全部满足，但不得对测试输入进行硬编码。原始任务仍是最高优先级的依据。

"""
            else:
                tests_block = f"""## Public Tests
```python
{test_code.strip()}
```

Use these tests as concrete examples of the required behavior. Satisfy all of them without hardcoding their inputs. The original task remains authoritative.

"""
        if not plan:
            if self.prompt_language == "zh-CN":
                user_prompt = f"""{context_block}{instruction_block}{tests_block}严格按照说明实现以下 Python 任务。

## 原始任务
{problem_statement}

## 实现规则
- 将原始任务视为最高优先级的规范。
- 返回代码前，逐项检查任务明确要求的输出字段、聚合依据、边界情况和并列处理规则。
- 如果任务规定了返回结构，只返回这些字段及其规定的值结构，不要在公开结果中加入内部辅助数据。
- 如果任务规定了并列处理规则，必须在选择键或排序键中明确实现，不能依赖字典或输入的插入顺序。
- 对于“按数值总和选择最高分组”的要求，应按分组累计该数值，例如 `scores[group] = scores.get(group, 0) + record[value_field]`；出现次数是不同的指标。若并列时选择字典序最小的分组，应使用 `min(scores, key=lambda group: (-scores[group], group))` 或完全等价的比较。普通 `max`、按次数选择或按首次出现选择都不符合该契约。
- 不要自行增加任务未要求的校验规则、异常、返回字段、数据结构或行为。
- 保留指定的函数名、类名和签名。
- 输出前检查每个最优项选择表达式。`max(..., key=lambda item: (score, item))` 会选择并列项中字典序最大的项；当任务要求最小项时必须替换。
- 只返回完整的 Python 实现。
- 不要包含测试、Markdown 代码围栏、使用示例或解释。
"""
            else:
                user_prompt = f"""{context_block}{instruction_block}{tests_block}Implement the following Python task exactly as specified.

## Original Task
{problem_statement}

## Implementation Rules
- Treat the original task as the authoritative specification.
- Account for every explicitly requested output field, aggregation basis, edge case, and tie-breaking rule before returning code.
- If the task specifies a return schema, return exactly those fields and value shapes; do not add helper data to the public result.
- When a tie-breaking rule is specified, encode it explicitly in the selection or sorting key; never rely on dictionary or input insertion order to break the tie.
- For a "top group by total numeric value" requirement, accumulate that numeric value per group (`scores[group] = scores.get(group, 0) + record[value_field]`); occurrence counts are a different metric. If ties choose the lexicographically smallest group, select it with `min(scores, key=lambda group: (-scores[group], group))` or an exactly equivalent comparison. A plain `max`, count-based selection, or first-seen selection does not satisfy that contract.
- Do not invent validation rules, exceptions, return fields, data structures, or behaviors that the task does not require.
- Preserve the requested function or class names and signatures.
- Before responding, inspect each winner-selection expression. `max(..., key=lambda item: (score, item))` chooses the lexicographically largest tied item and must be replaced when the contract requires the smallest tied item.
- Return only the complete Python implementation.
- Do not include tests, markdown fences, usage examples, or explanations.
"""
        else:
            failed_code = current_code.strip() or "(not provided)"
            failure_block = self._build_failure_block(evaluation)
            if self.prompt_language == "zh-CN":
                user_prompt=f"""{context_block}{instruction_block}{tests_block}根据已确认的修复计划，修改当前失败的 Python 实现。

## 原始任务
{problem_statement}

## 当前失败代码
```python
{failed_code}
```

## 最近一次失败
{failure_block}

## 已确认的修复计划
{plan}

## 修改规则
- 原始任务是最高优先级的依据；修复计划只提供建议，不能覆盖原始任务。
- 对照替换代码，重新检查任务明确要求的每个输出字段、聚合依据、边界情况和并列处理规则。
- 如果任务规定了返回结构，只返回这些字段及其规定的值结构，不要把内部辅助数据放入公开结果。
- 使用明确的次级选择键或排序键实现并列规则，不能依赖字典或输入的插入顺序。
- 对于“按数值总和选择最高分组”的要求，应按分组累计该数值，例如 `scores[group] = scores.get(group, 0) + record[value_field]`；出现次数是不同的指标。若并列时选择字典序最小的分组，应使用 `min(scores, key=lambda group: (-scores[group], group))` 或完全等价的比较。不要保留普通 `max`、按次数选择或按首次出现选择。
- 保留已经正确的行为，只修改解决当前失败所必需的部分。
- 不要自行增加任务未要求的校验规则、异常、返回字段、数据结构或行为。
- 保留指定的函数名、类名和签名。
- 输出前检查每个最优项选择表达式。`max(..., key=lambda item: (score, item))` 会选择并列项中字典序最大的项；当任务要求最小项时必须替换。
- 只返回完整的替换实现。
- 不要包含测试、Markdown 代码围栏、使用示例或解释。
"""
            else:
                user_prompt=f"""{context_block}{instruction_block}{tests_block}Revise the current failed Python implementation according to the approved repair plan.

## Original Task
{problem_statement}

## Current Failed Code
```python
{failed_code}
```

## Latest Failure
{failure_block}

## Approved Repair Plan
{plan}

## Revision Rules
- Treat the original task as authoritative. The repair plan is advisory and must not override it.
- Recheck every explicitly requested output field, aggregation basis, edge case, and tie-breaking rule against the replacement code.
- If the task specifies a return schema, return exactly those fields and value shapes; keep internal bookkeeping out of the public result.
- Implement specified tie-breaking rules with an explicit secondary selection or sorting key, independent of dictionary and input insertion order.
- For a "top group by total numeric value" requirement, accumulate that numeric value per group (`scores[group] = scores.get(group, 0) + record[value_field]`); occurrence counts are a different metric. If ties choose the lexicographically smallest group, select it with `min(scores, key=lambda group: (-scores[group], group))` or an exactly equivalent comparison. Do not preserve a plain `max`, count-based selection, or first-seen selection when that rule applies.
- Preserve behavior that is already correct and change only what is necessary to address the failure.
- Do not invent validation rules, exceptions, return fields, data structures, or behaviors that the task does not require.
- Preserve the requested function or class names and signatures.
- Before responding, inspect each winner-selection expression. `max(..., key=lambda item: (score, item))` chooses the lexicographically largest tied item and must be replaced when the contract requires the smallest tied item.
- Return only the complete replacement Python implementation.
- Do not include tests, markdown fences, usage examples, or explanations.
"""
        trytime=4
        attempts=0
        code=""
        last_error = ""
        raw_response = ""
        generations: list[dict[str, Any]] = []
        while trytime>0:
            trytime-=1
            attempts+=1
            try:
                retry_prompt = user_prompt
                if raw_response:
                    if self.prompt_language == "zh-CN":
                        retry_prompt += f"""

## 必须修正
你上一次的回答无法使用，原因是：{last_error}。
只返回替换后的 Python 代码，不要解释。

上一次回答：
{raw_response[:4000]}
"""
                    else:
                        retry_prompt += f"""

## Correction Required
Your previous response could not be used because {last_error}.
Return replacement Python code only, with no explanation.

Previous response:
{raw_response[:4000]}
"""
                res=self.llmrouter.generate(user_prompt=retry_prompt)
                raw_response = res
                generations.append(self.llmrouter.generation_info())
                # Extract code from the model response; execution happens in evaluation.
                code=preprocess(res)
                if code:
                    try:
                        compile(code, "<generated-code>", "exec")
                    except SyntaxError:
                        code = ""
                if not code:
                    last_error = diagnose_code_output(res)
            except Exception as e:
                last_error = format_llm_error(e)
                generations.append(self.llmrouter.generation_info())
                code=""
            if code:
                break

        duration_ms = sum(int(item.get("duration_ms", 0) or 0) for item in generations)
        input_tokens = sum(int((item.get("usage") or {}).get("input_tokens", 0) or 0) for item in generations)
        output_tokens = sum(int((item.get("usage") or {}).get("output_tokens", 0) or 0) for item in generations)
        return {
            "code": code,
            "attempts": attempts,
            "prompt": user_prompt,
            "ok": bool(code),
            "error": "" if code else (last_error or "Model response did not contain runnable Python code."),
            "raw_response": raw_response,
            "generation": {
                "attempts": generations,
                "duration_ms": duration_ms,
                "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": input_tokens + output_tokens},
            },
        }

    def generate_test_code(
        self,
        problem_statement: str = "",
        test_description: str = "",
        additional_instruction: str = "",
        context_entries: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        if not problem_statement:
            raise RuntimeError("Input cannot be empty.")

        context_block = self._build_context_block(context_entries)
        instruction_block = self._build_additional_instruction_block(additional_instruction)
        cleaned_test_description = test_description.strip()
        test_description_block = ""
        if cleaned_test_description:
            if self.prompt_language == "zh-CN":
                test_description_block = f"""## 测试生成目标
{cleaned_test_description}

使用这些目标选择测试用例，同时保留任务说明中的全部约束。

"""
            else:
                test_description_block = f"""## Test Generation Goals
{cleaned_test_description}

Use these goals to choose test cases while preserving all constraints in the task description.

"""
        target_symbols = self._extract_target_symbols(problem_statement)
        target_block = ""
        if target_symbols:
            joined = "\n".join(f"- {symbol}" for symbol in target_symbols)
            if self.prompt_language == "zh-CN":
                target_block = f"""
## 必需符号
候选解答应当已经定义并公开以下符号。
测试必须调用这些符号，禁止重新定义。
{joined}
"""
            else:
                target_block = f"""
## Required Symbols
The candidate solution is expected to define and expose these symbols already.
You must call them in the tests and must NOT redefine them.
{joined}
"""

        if self.prompt_language == "zh-CN":
            user_prompt = f"""{context_block}{instruction_block}{test_description_block}为以下任务编写可运行的 Python 测试代码。

## 任务说明
{problem_statement}
{target_block}

## 输出规则
- 只输出 Python 测试代码。
- 不要使用 Markdown 代码围栏。
- 候选解答已经在同一命名空间中执行。
- 不要实现或重新定义候选解答。
- 不要再次定义必需的函数或类。
- 只使用普通的顶层 `assert` 语句。
- 不要使用 `unittest`、`pytest` 或自定义测试框架。
- 如需辅助函数，应保持简短，并在末尾使用直接的顶层 `assert` 检查。
- 每个有效回答必须至少包含一个 `assert`。
- 直接从任务说明推导有代表性的正常、边界和特殊情况。
- 只测试任务说明明确要求的行为。
- 不要自行增加异常行为、类型校验、返回字段或约束。
- 优先生成 5 至 10 个不重复的断言，每个断言覆盖不同的需求或边界。
- 实现错误时，测试代码必须明确失败。
"""
        else:
            user_prompt = f"""{context_block}{instruction_block}{test_description_block}Write runnable Python test code for the task below.

## Task Description
{problem_statement}
{target_block}

## Output Rules
- Output ONLY Python test code.
- Do not wrap the answer in markdown fences.
- The candidate solution has already been executed into the same namespace.
- Do NOT implement or redefine the candidate solution.
- Do NOT define the required functions or classes again.
- Use plain top-level `assert` statements only.
- Do NOT use `unittest`, `pytest`, or custom test frameworks.
- If helper functions are needed, keep them small and still end with direct top-level `assert` checks.
- Every valid answer must contain at least one `assert`.
- Infer representative normal, boundary, and edge cases directly from the task description.
- Test only behavior explicitly required by the task description.
- Do not invent exception behavior, type validation, return fields, or constraints.
- Prefer 5 to 10 non-redundant assertions; every assertion should cover a distinct requirement or boundary.
- The test code should fail loudly when the implementation is wrong.
"""

        trytime = 4
        attempts = 0
        test_code = ""
        last_error = ""
        previous_response = ""
        generations: list[dict[str, Any]] = []
        diagnostics: list[dict[str, Any]] = []
        last_diagnostic: dict[str, Any] = {}
        while trytime > 0:
            trytime -= 1
            attempts += 1
            try:
                retry_prompt = user_prompt
                if previous_response:
                    if self.prompt_language == "zh-CN":
                        retry_prompt += f"""

## 必须修正
你上一次的回答被拒绝，原因是：{last_error}。
请返回替换结果，不要解释。结果必须是有效的 Python，包含直接的顶层 `assert`，并且不能定义候选解答。

上一次回答：
{previous_response[:4000]}
"""
                    else:
                        retry_prompt += f"""

## Correction Required
Your previous response was rejected because {last_error}.
Return a replacement, not an explanation. It must be valid Python containing direct top-level `assert` statements and must not define the candidate solution.

Previous response:
{previous_response[:4000]}
"""
                res = self.llmrouter.generate(user_prompt=retry_prompt)
                generations.append(self.llmrouter.generation_info())
                normalized = normalize_test_output(res, target_symbols=target_symbols)
                test_code = normalized.code
                if not test_code:
                    previous_response = res
                    last_error = normalized.message
                    last_diagnostic = normalized.diagnostic()
                    diagnostics.append({"attempt": attempts, **last_diagnostic})
            except Exception as e:
                last_error = format_llm_error(e)
                last_diagnostic = {
                    "reason_code": "llm_error",
                    "message": last_error,
                    "line": None,
                    "column": None,
                    "candidate_count": 0,
                }
                diagnostics.append({"attempt": attempts, **last_diagnostic})
                generations.append(self.llmrouter.generation_info())
                test_code = ""
            if test_code:
                break

        duration_ms = sum(int(item.get("duration_ms", 0) or 0) for item in generations)
        input_tokens = sum(int((item.get("usage") or {}).get("input_tokens", 0) or 0) for item in generations)
        output_tokens = sum(int((item.get("usage") or {}).get("output_tokens", 0) or 0) for item in generations)
        return {
            "test_code": test_code,
            "attempts": attempts,
            "prompt": user_prompt,
            "ok": bool(test_code),
            "error": "" if test_code else (last_error or "Model response did not contain top-level assert tests."),
            "raw_response": previous_response,
            "diagnostic": last_diagnostic,
            "diagnostics": diagnostics,
            "generation": {
                "attempts": generations,
                "duration_ms": duration_ms,
                "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": input_tokens + output_tokens},
            },
        }

    def evaluate_code(self,code: str, test_code: str)->dict:
        namespace = {}

        try:
            # Check whether the candidate code compiles.
            compile(code, "<coder>", "exec")
        except Exception as e:
            return {
                "passed": False,
                "stage": "compile",
                "error_type":type(e).__name__,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }

        try:
            # Execute candidate code so functions and variables share one namespace.
            exec(code, namespace, namespace)
        except Exception as e:
            return {
                "passed": False,
                "stage": "exec_code",
                "error_type":type(e).__name__,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }

        cleaned_test_code = test_code.strip()
        if not cleaned_test_code:
            return {
                "passed": False,
                "stage": "prepare_tests",
                "error_type": "ValueError",
                "error": "No test code was provided.",
                "traceback": None,
            }

        try:
            test_tree = ast.parse(cleaned_test_code, "<tests>", "exec")
            compiled_tests = compile(test_tree, "<tests>", "exec")
        except Exception as e:
            return {
                "passed": False,
                "stage": "compile_tests",
                "error_type":type(e).__name__,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }

        def failure_result(e: Exception) -> dict[str, Any]:
            traceback_cursor = e.__traceback__
            test_line = None
            while traceback_cursor:
                if traceback_cursor.tb_frame.f_code.co_filename == "<tests>":
                    test_line = traceback_cursor.tb_lineno
                traceback_cursor = traceback_cursor.tb_next
            test_lines = cleaned_test_code.splitlines()
            failed_test = (
                test_lines[test_line - 1].strip()
                if test_line and 0 < test_line <= len(test_lines)
                else ""
            )
            error = str(e)
            if isinstance(e, AssertionError) and failed_test:
                error = f"Assertion failed at test line {test_line}: {failed_test}"
            return {
                "passed": False,
                "stage": "exec_tests",
                "error_type":type(e).__name__,
                "error": error,
                "traceback": traceback.format_exc(),
                "failed_test": failed_test,
                "test_line": test_line,
            }

        direct_assertions = [node for node in test_tree.body if isinstance(node, ast.Assert)]
        has_future_import = any(
            isinstance(node, ast.ImportFrom) and node.module == "__future__"
            for node in test_tree.body
        )
        if direct_assertions and not has_future_import:
            failed_assertions: list[dict[str, Any]] = []
            test_results: list[dict[str, Any]] = []
            for statement in test_tree.body:
                statement_module = ast.Module(body=[statement], type_ignores=[])
                try:
                    exec(compile(statement_module, "<tests>", "exec"), namespace, namespace)
                    if isinstance(statement, ast.Assert):
                        source = ast.get_source_segment(cleaned_test_code, statement) or ""
                        test_results.append(
                            {
                                "index": len(test_results) + 1,
                                "line": statement.lineno,
                                "source": source.strip(),
                                "passed": True,
                                "message": "",
                            }
                        )
                except Exception as exc:
                    if not isinstance(statement, ast.Assert):
                        return failure_result(exc)
                    source = ast.get_source_segment(cleaned_test_code, statement) or ""
                    test_result = {
                        "index": len(test_results) + 1,
                        "line": statement.lineno,
                        "source": source.strip(),
                        "passed": False,
                        "message": str(exc),
                        "error_type": type(exc).__name__,
                        "traceback": traceback.format_exc(),
                    }
                    test_results.append(test_result)
                    failed_assertions.append(test_result)

            passed_count = sum(item["passed"] for item in test_results)
            test_summary = {
                "total": len(test_results),
                "passed": passed_count,
                "failed": len(test_results) - passed_count,
                "pass_rate": passed_count / len(test_results),
            }
            if failed_assertions:
                failure_lines = [
                    f"line {item['line']}: {item['source']}"
                    + (f" ({item['error_type']}: {item['message']})" if item["message"] else f" ({item['error_type']})")
                    for item in failed_assertions
                ]
                first_failure = failed_assertions[0]
                return {
                    "passed": False,
                    "stage": "exec_tests",
                    "error_type": first_failure["error_type"],
                    "error": f"{len(failed_assertions)} public test(s) failed:\n- " + "\n- ".join(failure_lines),
                    "traceback": first_failure["traceback"],
                    "failed_test": first_failure["source"],
                    "failed_tests": failed_assertions,
                    "test_line": first_failure["line"],
                    "test_summary": test_summary,
                    "test_results": test_results,
                }
            return {
                "passed": True,
                "stage": "pass",
                "error_type": None,
                "error": None,
                "traceback": None,
                "test_summary": test_summary,
                "test_results": test_results,
            }
        else:
            try:
                # Preserve normal execution for tests wrapped in helpers or control flow.
                exec(compiled_tests, namespace, namespace)
            except Exception as exc:
                return failure_result(exc)

        return {
            "passed": True,
            "stage": "pass",
            "error_type":None,
            "error": None,
            "traceback": None,
        }
    
    def execute_planner(
        self,
        problem_statement:str="",
        relat_err_dict:dict | None = None,
        additional_instruction: str = "",
        context_entries: list[dict[str, Any]] | None = None,
        use_error_feedback: bool = True,
        current_code: str = "",
        test_code: str = "",
    )->dict[str, Any]:
        if not problem_statement:
            raise(RuntimeError("Input cannot be empty."))
        relat_err_dict = relat_err_dict or {}
        context_block = self._build_context_block(context_entries)
        instruction_block = self._build_additional_instruction_block(additional_instruction)
        if use_error_feedback:
            feedback_title = "## 最近一次失败" if self.prompt_language == "zh-CN" else "## Latest Failure"
            feedback_block = f"""{feedback_title}
{self._build_failure_block(relat_err_dict)}"""
        else:
            feedback_block = """## 最近一次失败
本次规划按要求不使用运行和测试反馈。
请根据原始任务和当前实现状态制定计划。""" if self.prompt_language == "zh-CN" else """## Latest Failure
Runtime and test feedback was intentionally disabled for this planning request.
Build the plan from the original task and current implementation state."""

        code_block = current_code.strip() or "(not provided)"
        tests_block = test_code.strip() or "(not provided)"

        if self.prompt_language == "zh-CN":
            user_prompt=f"""{context_block}{instruction_block}为当前失败的实现制定一份简洁的修复计划。

## 原始任务
{problem_statement}

## 当前候选代码
```python
{code_block}
```

## 使用的公开测试
```python
{tests_block}
```

{feedback_block}

## 规划规则
- 将原始任务视为最高优先级的规范。
- 代码、测试、最近失败和用户补充要求只用于识别根本原因和必要修改。
- 不要自行增加任务未要求的校验规则、异常、返回字段、数据结构或边界行为。
- 先指出失败证据支持的根本原因，再给出准确的代码修改；只有确有必要时才增加独立的验证步骤。
- 使用完成修复所需的最少步骤，最多 5 步；每步只写一句简短、具体且可执行的话。
- 不要重述题目、测试或错误输出，不要换一种说法重复同一项修改。
- 保留已经正确的行为，不要罗列与当前失败无关的边界情况或重构建议。
- 只按下面的 Markdown 格式输出计划，不要输出实现代码或计划之外的解释。

## 计划
1. <根本原因和准确修改>
2. <仅在必要时写针对性验证>
"""
        else:
            user_prompt=f"""{context_block}{instruction_block}Produce a concise repair plan for the current failed implementation.

## Original Task
{problem_statement}

## Current Candidate Code
```python
{code_block}
```

## Public Tests Used
```python
{tests_block}
```

{feedback_block}

## Planning Rules
- Treat the original task as the authoritative specification.
- Use the code, tests, latest failure, and user instruction only to identify the root cause and necessary changes.
- Do not invent validation rules, exceptions, return fields, data structures, or edge-case behavior that the task does not require.
- State the root cause supported by the failure evidence, then the exact code change; add a separate verification step only when it is necessary.
- Use the fewest steps needed and never more than 5. Each step must be one short, concrete, actionable sentence.
- Do not restate the task, tests, or error output, and do not repeat the same change in different words.
- Preserve behavior that is already correct. Omit unrelated edge cases and refactoring suggestions.
- Output only the plan in the markdown format below. Do not output implementation code or an explanation outside the plan.

## Plan
1. <root cause and exact change>
2. <focused verification only if needed>
"""
        trytime=4
        attempts=0
        plan=""
        raw_response = ""
        last_error = ""
        while trytime>0:
            trytime-=1
            attempts+=1
            try:
                raw_response = self.llmrouter.generate(user_prompt=user_prompt)
                plan = normalize_repair_plan(raw_response, self.prompt_language)
            except Exception as e:
                last_error = format_llm_error(e)
                plan=""
            if plan:
                break

        return {
            "plan": plan.strip(),
            "raw_response": raw_response,
            "plan_processing": "whitespace_only",
            "attempts": attempts,
            "prompt": user_prompt,
            "ok": bool(plan.strip()),
            "used_error_feedback": use_error_feedback,
            "error": "" if plan.strip() else (last_error or "Model response did not contain a plan."),
        }
        
