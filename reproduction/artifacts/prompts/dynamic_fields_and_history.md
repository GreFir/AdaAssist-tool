# 动态提示字段与历史规则

Qwen Auto与E3共同初始生成均为英语、manual冻结测试、context_enabled=false；LLMRouter的is_history默认false。每次阶段请求以system和该阶段当前user prompt重新构造，不自动累积全部聊天；当前代码、测试、失败和指导按模板显式插入。评审者则每次显式重放其本分支previous_decisions。

上下文关闭时context_block为空。开启时仅取最近8条有效context_entries，逐条按“### 序号. 标题 (role)”加内容渲染，在“## Context / Reuse the following context when it is helpful, but prioritize the current task.”下用双换行连接。

有附加指导时instruction_block原文：

~~~~text
## Additional User Instruction
{additional_instruction.strip()}

Treat this as an additional constraint on the task. Do not ignore or replace the original task description.
~~~~

failure_block取实际公开evaluation中的stage、error_type、error和stdout/stderr，以及有记录时的逐测试结果和汇总；缺值为(not available)，不合成私有测试反馈。完整阶段模板中的tests_block是公开工作套件，不是隐藏测试。

生成尝试失败后retry_prompt是原user_prompt加Correction Required、真实last_error及最近raw_response的前4000字符。最多4次阶段内部尝试，规划失败也最多4次；它们不等于外层修复轮数。

E3 reviewer_contract.txt保留原始契约的“固定33B”历史措辞；实际生成器是experiment参数中的Qwen3。此继承措辞没有被事后修改，本包不把它作为真实生成器身份。I3还必须拼接reviewer_I3_contract_extension.txt。Max cap4096等变体可能另加简洁决策后缀，复现变体需对照其实际experiment记录，不能沿用主实验契约就认为完全相同。
