# 论文实验配置与复现材料

[仓库首页](../README.md) · [完整英文配置说明](README.md) · [差异与待补材料](DISCREPANCIES.md)

本目录按提供的最新四页论文 **AdaAssist: Progressive Agentic Code Generation for Small Language Models** 的 III-A 至 III-D、表 I 至表 IV 整理，核对日期为 2026-10-24。原论文和本地压缩包的文件身份见 [sources.json](sources.json)。

**配置入口是 `reproduction/configs/`。** JSON 文件描述实验条件，不是插件可以直接导入的 Profile，也不是批量实验运行器。配置结合论文、原始记录和作者补充；不设时限时以 `null` 配合明确的无限时说明表示。

## 配置路径

| 论文位置 | 实验 | 配置文件 | 当前材料状态 |
| --- | --- | --- | --- |
| III-A / 表 I | DeepSeek-Coder-Instruct 1.3B、6.7B、33B，五种方法 | [deepseek.json](configs/deepseek.json)、[81 个运行块索引](configs/deepseek-run-index.json) | 完整模型名称、Codex 命名与统一后端设置已确认 |
| III-B / 表 II | Qwen3-Coder 三框架、完整轨迹与限制预算 | [qwen.json](configs/qwen.json) | 有实际采样、服务、续跑、重跑选择与成本审计记录 |
| III-C / 表 III | 9 人、20 题、三类受控干预 | [intervention.json](configs/intervention.json)、[操作流程](STUDY_PROTOCOLS.md) | 每题重新开始完整流程，沿用后端配置，无任务总时限 |
| III-D / 表 IV | 15 人、三工具、8 题用户研究 | [user-study.json](configs/user-study.json)、[操作流程](STUDY_PROTOCOLS.md) | 每组固定一个工具，完成全部任务后整体评分 |
| III-A/B | 数据版本、任务名单、公私测试与评测 | [datasets.json](configs/datasets.json) | HE/BCB 身份明确；MBPP 的一公开、其余隐藏、seed42 协议已确认 |

目录结构：

```text
reproduction/
  configs/                 按当前论文整理的实验配置
  artifacts/datasets/      固定任务 ID、BCB 逐题公私测试方法名单
  artifacts/environment/   依赖快照、模型文件哈希、vLLM 参数
  artifacts/prompts/       英文阶段提示词、原生代理指令和工具 schema
  artifacts/provenance/    原始运行配置、结果合并与成本审计来源
  DISCREPANCIES.md          当前论文与原包的差异、待确认和缺失项
  sources.json             复制文件与原压缩包成员的对应关系
  SHA256SUMS.txt            本目录文件校验值
  verify.py                离线完整性核验入口
```

原包中的 `S1` Qwen 全量和 `S2` 预算分析已纳入 III-B 的主实验配置。旧 20 人 Auto/Interactive 研究、API 评审模型干预、T6/Continue 案例、PublicSplit50 及其他变体未作为当前正文实验导出。文档、配置、提示词标题和结果方法标签统一为 Codex；三个调整显示名称的支持文件同时记录原始与整理后哈希，其余支持文件保留原字节。来源路径和运行 ID 保留原记录以便核验，适用范围以 `configs/` 为准。

## 后端实验的明确参数

共同任务规模为 **HumanEval 164、MBPP 500、BigCodeBench Random150**。固定任务清单保存在 [artifacts/datasets/](artifacts/datasets/)，演示用 `examples/` 不能代替正式套件。

DeepSeek 的可核验设置：

| 规模 | 完整模型名称与下载入口 |
| --- | --- |
| 1.3B | [deepseek-ai/deepseek-coder-1.3b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-instruct) |
| 6.7B | [deepseek-ai/deepseek-coder-6.7b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct) |
| 33B | [deepseek-ai/deepseek-coder-33b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct) |

| 方法 | T / top-p | 单次输出上限 | 调用与执行预算 | seeds |
| --- | --- | --- | --- | --- |
| Direct | 0.2 / 0.9 | 512 | 单次 completion，不修复 | 42/43/44 |
| Codex | 0.2 / 0.9 | 512 | 至多 5 次调用、5 次公开评测，循环边界检查 300 秒 | 42/43/44 |
| DSH context adapter | 0.2 / 0.9 | 1024 | 至多 10 次调用、10 次公开评测，600 秒加退出开销 | 42/43/44 |
| MapCoder / AdaAssist Auto | 0.2 / 0.9 | 512 | 沿用对应方法的后端实验修复上限、提示词和源码配置 | 42/43/44 |

DeepSeek 后端基线已按作者确认统一命名为 **Codex**。DeepSeek DSH 由适配器选择工具，模型输出完整 Python 模块；Qwen DSH 使用原生代理。各方法的 token、调用数和执行预算按表中对应设置记录。

**作者已确认 AdaAssist / MapCoder 使用同一后端实验设置**：T=0.2、top-p=0.9、单次输出上限 512、seeds 42/43/44；修复上限、提示词和源码版本沿用各自对应的后端方法配置，不另设一套实验条件。完整 Hugging Face 名称已明确模型身份，revision 或权重哈希属于可选的精确版本记录，不再作为当前复现说明的缺失项。补充依据记录在 [author-confirmations.json](author-confirmations.json)；原始归档文件中较早的“信息不完整”文字保留原样，以当前配置和作者补充为准。

Qwen 使用 **Qwen/Qwen3-Coder-30B-A3B-Instruct**，revision `b2cff646eb4bb1d68355c01b18ae02e7cf42d120`。实际共同配置为：

| 项目 | 设置 |
| --- | --- |
| 采样 | 每次上游请求 T=0.2、top-p=0.9、输出上限 512；含规划和压缩请求 |
| 上下文 / 并发 | 16,384 / 16，不能沿用旧方案的并发 4 |
| 重复 | seeds 42/43/44；三框架 × 三数据集 × 三 seed，共 27 块、7,326 次任务运行 |
| AdaAssist | Auto、英文、手动加载冻结公开测试、`context_enabled=false`，初次生成之后最多 6 轮修复 |
| 内部尝试 | coder/planner 阶段最多 4 次格式或语法尝试；一轮修复不等于一次模型调用 |
| Codex / DSH | CLI 0.144.1 / 0.2.0-rc.2；启用原生历史压缩，Codex 阈值 12,000 |
| 完整原生执行 | 不额外限制模型请求或公开测试次数；每段任务 300 秒，保留实际停止和退出记录 |
| 推理服务 | TP=4、BF16、最大序列 16、显存比例 0.78、parser=`qwen3_coder` |

服务启动命令、评测环境准备命令、测试超时和完整步骤见 [英文说明](README.md)。实验编排/评测用 Python 3.11，与当前工具后端要求的 Python 3.12+ 分开。推理环境和评测环境的完整包快照都在 `artifacts/environment/`，其中含构建机器本地引用，不能直接当作可移植锁文件安装；[requirements-evaluation.txt](requirements-evaluation.txt) 仅提供已记录的评测依赖子集。

## 测试划分与结果版本

HumanEval 使用给定公开示例修复、隐藏测试最终评测。6 道没有公开示例的题保留在分母，不能把空测试当作通过。

BCB 在固定 revision 的 1,140 题中用 `random.Random(42)` 抽取 150 题。公开方法由 `bigcodebench-random150-public-split-v1:42:<task_id>` 的 SHA-256 整数对方法数取模选择；以[逐题冻结名单](artifacts/datasets/bigcodebench150_split_methods.jsonl)为准，保留导入、辅助函数和 setup/teardown。其余方法用于最终评测。

**MBPP 已经作者确认：使用原始 `task_id=11—510` 的连续 500 题，每题从原始测试中随机挑选 1 条作为公开测试，随机种子为 42，其余测试作为隐藏测试。** 生成和修复只使用公开测试；隐藏测试在最终评测时使用。这些隐藏测试来自原始测试的留出部分，并非额外构建的独立套件。该补充说明见 [author-confirmations.json](author-confirmations.json)，不再把划分协议列为未确认项；逐题选择索引未随原包导出，暂不声称已经恢复完全相同的索引清单。

Qwen 的历史结果经过 108 条工作区可写修正、Auto 从五轮续到六轮以及后续 BCB seed42 的事后重跑选择。论文 BCB **57.11%** 对应后选版本 **257/450**，原六轮合并为 **251/450**。续跑段独立获得 300 秒，因此累计时间可能超过 300 秒。配置中保留两套来源，不将历史合并写成统一从头重跑。

论文“≤6 repairs”的原生代理结果来自事后轨迹截断：最多 **7 次含候选修改的模型响应**，即首次修改加 6 次后续尝试，在第 8 次修改对应请求开始前截断。失败修改计入，同一响应多次修改只算一次。该单位不等于 AdaAssist 的外层修复轮数，论文措辞需确认。

## 前端两项研究的复现流程

III-C 使用 9 名研究生、每组 3 人、每人 20 题，仅允许 C1 加测试、C2 改计划或 C3 自然语言指导。沿用早期受控干预的 [20 题 BCB 名单](artifacts/datasets/task_ids_intervention_main20.json)，**每个参与者的每道题都重新开始完整流程，重新生成初始代码**。其他设置沿用后端：Qwen3-Coder、T=0.2、top-p=0.9、512 tokens、最多 6 轮修复；**不设任务总时限**。各组遵守指定干预，每次实际提交并纳入产物或指导的编辑计 1 次，重跑测试等辅助操作不计。原包 API 评审实验的模型评分仍与真人结果分别记录。

III-D 使用 15 人（6 开发者、9 硕士生），随机分为三组，每组 2 开发者加 3 学生，分别固定使用 AdaAssist、DSH、Codex 中的一种工具，不轮换工具。三组均使用 Qwen3-Coder，完成 8 题（4 基础、4 高级）。**全部任务完成后，每名参与者对所用工具整体评分**，维度为有用性、可理解性、感知效率，范围 -2 至 2；每工具每维度有 5 个评分。AdaAssist 组可自由选择 Auto 或 Interactive。

详细流程见 [STUDY_PROTOCOLS.md](STUDY_PROTOCOLS.md)。受控干预按“加载固定 20 题 → 随机分三组 → 每题新建会话并重新生成 → 指定控件干预 → 保存最终候选 → 独立评测 → 统计通过率、编辑次数和覆盖并集”组织。三工具研究按“准备 8 题 → 配置共同 Qwen 模型 → 每组分配一个工具 → 完成全部任务 → 工具整体评分 → 按工具统计”组织。

上述起始方式、后端配置继承、无任务总时限、各组限制、编辑计数、每组单工具与结束后评分均已按作者补充更新，依据记录在 [author-confirmations.json](author-confirmations.json)。

问卷原文、原始评分和参与者日志先不作为本次文档补充的前提。当前先说明清楚实验设计与操作步骤；精确复算原表数值所需的原始记录以后再补。论文正文保留参与者、任务、分组、条件与指标，并引用仓库详细流程即可；无需把整份问卷放进短篇工具论文。其余历史细节见 [DISCREPANCIES.md](DISCREPANCIES.md)。

## 校验与使用顺序

在仓库根目录使用 Python 3.11+ 运行：

```powershell
python reproduction/verify.py
```

该命令只核对材料哈希、JSON/JSONL、固定任务数量、BCB 公私方法不相交、复用 20 题与原选择记录的一致性及 81 个运行块索引，不调用模型、不执行候选代码。校验通过不代表论文数值已复算。

实际复现应先选定实验与结果版本、解决对应差异，再从给定仓库获取数据/模型及方法源码，对已提供的 revision/哈希进行核对；DeepSeek 模型按上表完整名称获取，可选记录具体下载版本。随后分别搭建推理和评测环境；按导出的提示词和工具定义重建请求；冻结参数后运行完整矩阵，记录真实输入输出、公开反馈、候选版本和预算；最后独立评测冻结候选、按 seed 和数据集统计。基础设施重跑、候选规范化、工作区替换和事后选择需保留各自来源。
