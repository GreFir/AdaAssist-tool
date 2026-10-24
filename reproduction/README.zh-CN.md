# 论文实验配置与复现

[仓库首页](../README.md) · [English](README.md)

本目录提供论文 III-A 至 III-D、表 I 至表 IV 的最终实验设计、配置和结果。

## 配置入口

| 论文位置 | 实验 | 配置 |
| --- | --- | --- |
| III-A / 表 I | DeepSeek 后端对比 | [deepseek.json](configs/deepseek.json) |
| III-B / 表 II | Qwen 后端对比 | [qwen.json](configs/qwen.json) |
| III-C / 表 III | 9 人受控干预 | [intervention.json](configs/intervention.json) |
| III-D / 表 IV | 15 人三工具用户研究 | [user-study.json](configs/user-study.json) |
| III-A/B | 数据版本、测试划分与评测 | [datasets.json](configs/datasets.json) |

配置文件中的路径均相对于 `reproduction/`。JSON 用于描述实验条件，插件不会自动导入。

## 后端实验

| 项目 | DeepSeek 对比 | Qwen 对比 |
| --- | --- | --- |
| 模型 | DeepSeek-Coder-Instruct 1.3B / 6.7B / 33B | Qwen3-Coder-30B-A3B-Instruct |
| 方法 | Direct、MapCoder、Codex、DSH、AdaAssist | Codex、DSH、AdaAssist |
| 温度 / top-p | 0.2 / 0.9 | 0.2 / 0.9 |
| 每次模型请求的最大输出 | **所有方法均为 512 tokens** | **所有方法均为 512 tokens** |
| seeds | 42 / 43 / 44 | 42 / 43 / 44 |
| 重试设置 | **各工具默认设置** | **各工具默认设置** |

DeepSeek 模型名称为：

- [deepseek-ai/deepseek-coder-1.3b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-instruct)
- [deepseek-ai/deepseek-coder-6.7b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct)
- [deepseek-ai/deepseek-coder-33b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct)

Qwen 上下文为 16,384、并发 16；AdaAssist 使用 Auto、英文提示词、给定公开测试、关闭上下文复用，初次生成后最多 6 轮修复。Codex 和 DSH 比较工具默认执行配置与表 II 的 ≤6 repairs 设置。模型部署参数见 [qwen_serving_settings.json](artifacts/environment/qwen_serving_settings.json)。

表 II 最终结果：

| 方法 | HE (%) | MBPP (%) | BCB (%) | 平均 (%) | 时间 (s) | 模型调用 |
| --- | --- | --- | --- | --- | --- | --- |
| Codex（≤6 repairs） | 71.75 | 77.87 | 39.33 | 62.98 | 83.07 | 18.24 |
| DSH（≤6 repairs） | 91.26 | 83.60 | 56.67 | 77.18 | 67.63 | 12.11 |
| Codex | 80.69 | 80.20 | 48.44 | 69.78 | 97.53 | 21.45 |
| DSH | 91.67 | 84.13 | 59.33 | 78.38 | 76.10 | 14.40 |
| AdaAssist | 94.11 | 84.87 | **57.11** | **78.70** | 13.76 | 2.43 |

## 数据与评测

- **HumanEval：164 题**，给定公开示例用于生成和修复，隐藏测试用于最终评测。
- **MBPP：原始 task_id 11—510 的连续 500 题**；每题随机选择 1 条原始测试公开，seed 42，其余作为隐藏测试。
- **BigCodeBench：固定 Random150**；每题 1 个官方测试方法公开，划分 seed 42，其余方法用于隐藏评测。

固定任务 ID 与 BCB 公私测试方法名单见 [artifacts/datasets/](artifacts/datasets/)，数据版本、具体划分规则和评测参数见 [datasets.json](configs/datasets.json)。生成和修复只接收公开测试。固定最终候选后运行评测，分别计算各 seed、各数据集通过率，再对 seed 求均值；跨数据集平均值采用等权平均。

## 前端研究

**9 人受控干预：**每组 3 人，每人完成固定 [20 题 BCB](artifacts/datasets/task_ids_intervention_main20.json)。每题新建会话并重新开始生成、测试、修复流程；其他配置沿用后端，**无任务总时限**。C1 补充测试、C2 修改计划、C3 提供自然语言指导，各组遵守指定干预。实际提交并纳入产物或指导的编辑计数，重跑测试等辅助操作不计。

**15 人用户研究：**6 名开发者、9 名硕士生，随机分为三组，每组 2 名开发者加 3 名学生，固定使用 AdaAssist、DSH 或 Codex 中的一种工具。完成 8 题后，对所用工具的有用性、可理解性、感知效率进行 -2 至 2 的整体评分。详细步骤见 [STUDY_PROTOCOLS.md](STUDY_PROTOCOLS.md)，最终结果见对应配置文件。

## 复现步骤

1. 按配置文件获取指定模型、数据和固定任务名单，构建公开/隐藏测试。
2. 按仓库安装说明准备工具后端，按部署配置启动模型服务；评测依赖见 [requirements-evaluation.txt](requirements-evaluation.txt)。
3. 各方法统一设置 T=0.2、top-p=0.9、最大输出 512 tokens 和 seeds 42/43/44，重试使用工具默认设置。
4. 按对应实验协议运行，保存最终候选，独立评测并统计最终指标。

材料完整性校验：

```powershell
python reproduction/verify.py
```
