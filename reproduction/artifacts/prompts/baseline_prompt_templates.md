# Direct、Codex、Instruct及Harness适配器文字模板

花括号为动态字段；按实际数据逐题替换。模板是文本，不是实验实现。

## Direct和Codex首轮

~~~~text
## Task Description
{generation_prompt}
~~~~

## Codex后续轮

~~~~text
## Task Description
{generation_prompt}

## Public Tests
{public_tests}
## Previous Public-Test Feedback
{feedback}

Continue with a corrected, indented body for `{entry_point}` only. Do not repeat the function signature and do not explain the code.
~~~~

feedback格式依次为return code、stdout和stderr。没有显式上轮完整代码或累积对话。

## 官方HumanEval及BCB风格模板

~~~~text
Please continue to complete the function. You are not allowed to modify the given code and do the completion only. Please return all completed function in a codeblock. Here is the given code to do completion:
```python
{question.strip()}
```
~~~~

## 官方MBPP模板

完整官方mbpp.jsonl按索引1、2、3构造示例（不是test-only文件的前三题）。每个示例结构如下；示例代码本次不导出，必须从固定版本源数据取回：

~~~~text
- Example {index}:
>>> Problem:
{example.text.strip()}
>>> Test Cases:
{test_list joined with newline}

>>> Code:
```python
{example.code; CR removed, TAB replaced by four spaces}
```
~~~~

整个请求结构：

~~~~text
Please refer the given examples and generate a python function for my problem.
Examples are listed as follows:
{three rendered shots joined with two newlines}

Here is my problem:
>>> Problem:
{target.text.strip()}
>>> Test Cases:
{target.test_list joined with newline}
~~~~

目标范围为完整源数据索引10:510；chat模板由固定tokenizer提供，add_generation_prompt=true，EOS/stop为<|EOT|>。

## DeepSeek Harness context adapter

~~~~text
## Task requirement
{requirement}

## Current task.py
{current}

## Public tests
{public}

## Previous public test output
{feedback[-12000:]}

Implement or correct the target function. Return the complete Python code for task.py in one Python code block. Include necessary imports. Do not include tests or explanations.
~~~~

Previous public test output段仅在已有feedback时添加。外部适配器决定read/write/bash；此模板不是Qwen原生Harness的系统prompt。
