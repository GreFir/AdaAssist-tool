# Paper experiment settings

[Repository README](../README.md) · [中文说明](README.zh-CN.md)

This directory provides the final experiment design, configurations and reported results for Section III and Tables I-IV of *AdaAssist: Progressive Agentic Code Generation for Small Language Models*.

## Configuration paths

| Paper | Experiment | Configuration |
| --- | --- | --- |
| III-A / Table I | DeepSeek backend comparison | [deepseek.json](configs/deepseek.json) |
| III-B / Table II | Qwen backend comparison | [qwen.json](configs/qwen.json) |
| III-C / Table III | Nine-person controlled intervention | [intervention.json](configs/intervention.json) |
| III-D / Table IV | Fifteen-person three-tool study | [user-study.json](configs/user-study.json) |
| III-A/B | Datasets, public/hidden split and evaluator | [datasets.json](configs/datasets.json) |

All manifest paths are relative to `reproduction/`. These JSON files describe experiments; they are not automatically imported by the extension.

## Backend settings

| Setting | DeepSeek comparison | Qwen comparison |
| --- | --- | --- |
| Model | DeepSeek-Coder-Instruct 1.3B / 6.7B / 33B | Qwen3-Coder-30B-A3B-Instruct |
| Methods | Direct, MapCoder, Codex, DSH, AdaAssist | Codex, DSH, AdaAssist |
| Temperature / top-p | 0.2 / 0.9 | 0.2 / 0.9 |
| Maximum output per model request | **512 tokens for every method** | **512 tokens for every method** |
| Seeds | 42, 43, 44 | 42, 43, 44 |
| Retry settings | Tool defaults | Tool defaults |

| Tool | Version / commit |
| --- | --- |
| MapCoder | [c87e6d9](https://github.com/Md-Ashraful-Pramanik/MapCoder/commit/c87e6d914d196e12fa2b144882122459a4b98007) (2025-02-12) |
| Codex | `0.144.1` |
| DSH | `0.2.0-rc.2` |
| AdaAssist | `v1.0` |

MapCoder uses its **official default configuration**, including its default stopping and retry rules. AdaAssist uses the **backend Auto default workflow**: generate, run public tests, apply rule-based fixes, and plan/regenerate for persistent failures. Auto finishes when public tests pass or the configured repair-round limit is reached, and pauses on user interruption. These method settings are recorded in [deepseek.json](configs/deepseek.json).

DeepSeek model repositories:

- [deepseek-ai/deepseek-coder-1.3b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-instruct)
- [deepseek-ai/deepseek-coder-6.7b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct)
- [deepseek-ai/deepseek-coder-33b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct)

Qwen uses [Qwen/Qwen3-Coder-30B-A3B-Instruct](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct), a 16,384-token context and concurrency 16. AdaAssist runs in Auto mode with English prompts, supplied public tests, context reuse disabled and at most six repair rounds after initial generation. Codex and DSH are evaluated with their default execution settings and the Table II ≤6 repairs setting. Retry handling follows each tool's defaults. Versions and deployment parameters are in [qwen.json](configs/qwen.json) and [qwen_serving_settings.json](artifacts/environment/qwen_serving_settings.json).

Table II final results:

| Method | HE (%) | MBPP (%) | BCB (%) | Average (%) | Time (s) | Calls |
| --- | --- | --- | --- | --- | --- | --- |
| Codex (≤6 repairs) | 71.75 | 77.87 | 39.33 | 62.98 | 83.07 | 18.24 |
| DSH (≤6 repairs) | 91.26 | 83.60 | 56.67 | 77.18 | 67.63 | 12.11 |
| Codex | 80.69 | 80.20 | 48.44 | 69.78 | 97.53 | 21.45 |
| DSH | 91.67 | 84.13 | 59.33 | 78.38 | 76.10 | 14.40 |
| AdaAssist | 94.11 | 84.87 | **57.11** | **78.70** | 13.76 | 2.43 |

## Datasets and evaluation

| Dataset | Tasks | Public tests | Hidden evaluation |
| --- | --- | --- | --- |
| HumanEval | All 164 | Provided public examples | Hidden tests |
| MBPP | Consecutive original task IDs 11-510, 500 tasks | One original test randomly selected per task, seed 42 | All remaining original tests |
| BigCodeBench | Fixed Random150 subset | One official test method per task, split seed 42 | Remaining official test methods |

Exact task IDs and BCB method splits are in [artifacts/datasets/](artifacts/datasets/). Source versions, split rules and evaluator parameters are in [datasets.json](configs/datasets.json). Only public tests are available during generation and repair. Final candidates are evaluated on the fixed final suites. Compute pass rates per seed and dataset, then average seeds; average benchmark scores give each benchmark equal weight.

## Frontend studies

The controlled intervention study uses nine graduate students, three per condition, on the fixed [20 BCB tasks](artifacts/datasets/task_ids_intervention_main20.json). Each participant-task session starts a fresh complete workflow with the backend generation settings and no overall task time limit. C1 adds tests, C2 edits plans and C3 provides guidance. Count submitted/applied edits; auxiliary test reruns do not count.

The usability study uses 15 participants: six developers and nine master's students. Each of three groups contains two developers and three students and uses one tool throughout: AdaAssist, DSH or Codex. Participants complete eight tasks, then rate the assigned tool overall for usefulness, understandability and perceived efficiency on a five-point -2..2 scale. See [STUDY_PROTOCOLS.md](STUDY_PROTOCOLS.md) for the procedures; final results are in the study manifests.

The fixed [eight-task manifest](artifacts/datasets/task_ids_user_study8.json) contains:

| Tasks | Difficulty | Dataset | Task IDs |
| --- | --- | --- | --- |
| T1–T4 | Basic | HumanEval | `Python/11`, `Python/62`, `Python/43`, `Python/76` |
| T5–T8 | Advanced | BigCodeBench | `BigCodeBench/61`, `BigCodeBench/327`, `BigCodeBench/493`, `BigCodeBench/821` |

## Setup and verification

Use the repository installation instructions for the tool backend. The benchmark evaluation environment uses Python 3.11:

```bash
python3.11 -m venv .venv-evaluation
.venv-evaluation/bin/python -m pip install -r reproduction/requirements-evaluation.txt
```

Deploy Qwen with the values in [qwen_serving_settings.json](artifacts/environment/qwen_serving_settings.json), configure all methods to use the specified 512-token output limit, and use tool-default retry settings. AdaAssist's English [stage](artifacts/prompts/qwen_auto_stage_templates.md) and [system](artifacts/prompts/qwen_auto_system_templates.md) prompt templates are included. Prepare benchmark test dependencies and NLTK resources before evaluation, then run the task lists and compute the metrics defined above.

Check material integrity from the repository root:

```bash
python reproduction/verify.py
```
