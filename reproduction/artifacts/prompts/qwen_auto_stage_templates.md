# 原始提示词文本模板

来源标识：runs/qwen3_full_512_c16_compact_20261015_103727/source_snapshot/AdaAssist-main/backend/src/executor/AdacoderExe.py
来源SHA-256：66e0aa3defa6fba2b5778269bb743be591de607cccc6ab8f376430b9722de775

双花括号表示动态字段，不是模板中的额外文字。只导出英语运行分支的文字常量／f-string内容，不包含函数实现。相同变量在不同分支出现时分别保留；必要的中文运行模板不作为本英语实验配置。

## execute_coder / tests_block / 原行198

~~~~text
## Public Tests
```python
{{test_code.strip()}}
```

Use these tests as concrete examples of the required behavior. Satisfy all of them without hardcoding their inputs. The original task remains authoritative.


~~~~

## execute_coder / user_prompt / 原行226

~~~~text
{{context_block}}{{instruction_block}}{{tests_block}}Implement the following Python task exactly as specified.

## Original Task
{{problem_statement}}

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

~~~~

## execute_coder / user_prompt / 原行277

~~~~text
{{context_block}}{{instruction_block}}{{tests_block}}Revise the current failed Python implementation according to the approved repair plan.

## Original Task
{{problem_statement}}

## Current Failed Code
```python
{{failed_code}}
```

## Latest Failure
{{failure_block}}

## Approved Repair Plan
{{plan}}

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

~~~~

## execute_coder / retry_prompt / 原行329

~~~~text


## Correction Required
Your previous response could not be used because {{last_error}}.
Return replacement Python code only, with no explanation.

Previous response:
{{raw_response[:4000]}}

~~~~

## generate_test_code / user_prompt / 原行446

~~~~text
{{context_block}}{{instruction_block}}{{test_description_block}}Write runnable Python test code for the task below.

## Task Description
{{problem_statement}}
{{target_block}}

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

~~~~

## generate_test_code / retry_prompt / 原行494

~~~~text


## Correction Required
Your previous response was rejected because {{last_error}}.
Return a replacement, not an explanation. It must be valid Python containing direct top-level `assert` statements and must not define the candidate solution.

Previous response:
{{previous_response[:4000]}}

~~~~

## execute_planner / feedback_block / 原行727

~~~~text
{{feedback_title}}
{{self._build_failure_block(relat_err_dict)}}
~~~~

## execute_planner / feedback_block / 原行730

~~~~text
## Latest Failure
Runtime and test feedback was intentionally disabled for this planning request.
Build the plan from the original task and current implementation state.
~~~~

## execute_planner / user_prompt / 原行772

~~~~text
{{context_block}}{{instruction_block}}Produce a concise repair plan for the current failed implementation.

## Original Task
{{problem_statement}}

## Current Candidate Code
```python
{{code_block}}
```

## Public Tests Used
```python
{{tests_block}}
```

{{feedback_block}}

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

~~~~
