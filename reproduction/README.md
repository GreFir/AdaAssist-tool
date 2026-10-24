# Paper experiment settings

[Repository README](../README.md) · [中文说明](README.zh-CN.md) · [Paper/archive discrepancies](DISCREPANCIES.md)

This directory documents **Section III, Tables I-IV** of *AdaAssist: Progressive Agentic Code Generation for Small Language Models*, checked against the supplied four-page manuscript on 2026-10-24. The paper and original local ZIP are identified by SHA-256 in [sources.json](sources.json); neither is needed to read these settings.

**Start with the manifests in `configs/`.** They are declarative records for implementing the experiments, not VS Code profiles or executable experiment runners. Field notes distinguish unavailable values from unlimited settings; the intervention study explicitly uses `null` for no task time limit. This release includes configurations, prompt text, task IDs, test-method splits and environment records. Historical runners, candidates, model weights and participant records are not included, so it cannot replay every reported number end to end.

## Experiment map

| Paper | Experiment and scope | Configuration | Evidence status |
| --- | --- | --- | --- |
| III-A / Table I | DeepSeek-Coder-Instruct 1.3B, 6.7B, 33B; Direct, MapCoder, Codex, DSH, AdaAssist | [deepseek.json](configs/deepseek.json), [81-block run index](configs/deepseek-run-index.json) | Full model IDs, Codex method name and shared backend setup author-confirmed |
| III-B / Table II | Qwen3-Coder-30B-A3B-Instruct; AdaAssist, Codex, DSH; full and limited native trajectories | [qwen.json](configs/qwen.json) | Sampling/serving records available; continuation, selected rerun and retrospective budget rules must be preserved |
| III-C / Table III | 9 human participants, 20 residual BCB failures, three intervention groups | [intervention.json](configs/intervention.json), [procedure](STUDY_PROTOCOLS.md#iii-c-controlled-intervention-on-residual-failures) | Fresh full workflows; backend settings; no task time limit; edit-counting rule confirmed |
| III-D / Table IV | 15 participants, three tools, eight tasks, five-point ratings from -2 to 2 | [user-study.json](configs/user-study.json), [procedure](STUDY_PROTOCOLS.md#iii-d-three-tool-usability-study) | One tool per group; overall ratings after all eight tasks |
| III-A/B | Frozen benchmark identities, visible/final-test policy and evaluator | [datasets.json](configs/datasets.json) | MBPP split protocol author-confirmed; HE/BCB identities exported |

The archive's Qwen `S1` and budget analysis `S2` now support main-paper Section III-B. Its API-reviewer `E3` and 20-person `E2` study do **not** establish the current human studies. See [DISCREPANCIES.md](DISCREPANCIES.md) before using these materials for a paper claim.

## Directory and file roles

```text
reproduction/
  README.md / README.zh-CN.md    experiment setup and execution order
  DISCREPANCIES.md               paper/archive conflicts and missing inputs
  author-confirmations.json     protocol clarifications supplied by the author
  configs/                      paper-aligned declarative manifests
  artifacts/
    datasets/                   exact task IDs and BCB test-method split
    environment/                frozen dependencies, model hashes, vLLM settings
    prompts/                    archived templates and native agent tool schemas
    provenance/                 original run settings, merge and cost audit records
  requirements-evaluation.txt   portable subset of recorded evaluation dependencies
  sources.json                  source identities and hashes of copied artifacts
  SHA256SUMS.txt                checksums for this curated directory
  verify.py                     offline integrity and dataset consistency checks
```

Documentation, manifests, prompt headings and result method labels use the author-confirmed Codex name. Most supporting files preserve the original bytes; [sources.json](sources.json) records both original and curated hashes for the three files with renamed display labels. Original run IDs and source paths retain their recorded identities for traceability. The local `.gitattributes` disables line-ending conversion so checksums survive Windows/Unix checkouts. The full baseline export also contains Instruct and a separate 1024-token Codex variant, excluded from the current Table I manifest and filtered run index. `${PROJECT_ROOT}` and `${CHECKPOINT_ROOT}` identify original project/model roots. Prompt files are experiment inputs, not repository maintenance instructions.

## Datasets and test visibility

| Dataset | Frozen tasks | Model-visible tests | Final evaluation |
| --- | --- | --- | --- |
| HumanEval | All 164, `Python/0`-`Python/163` | Existing public examples | Hidden tests |
| MBPP | 500 consecutive original task IDs, `MBPP/11`-`MBPP/510` | One randomly selected original provided test per task, seed **42** | All remaining original provided tests, held out from generation and repair |
| BigCodeBench | Random150 from 1,140 v0.1.4 tasks, sampling seed 42 | Exactly one official `test_*` method per task | Remaining official test methods |

Use the [task IDs](artifacts/datasets/) rather than drawing a new sample or substituting BigCodeBench-Hard. BCB's dataset revision is `b74c0d0bf70d2c0bc459be537895cca163007f1a`; the MBPP source commit is `2f9fd85927c669dae3c0fbb2d607274023af243e`. Source filenames, hashes and links are in [datasets.json](configs/datasets.json).

The author confirmed MBPP's task range and seed-42 public/hidden partition in [author-confirmations.json](author-confirmations.json). The hidden tests are the held-out remainder of MBPP's original tests, not a separately authored suite. The clarification supplements the older export's `provided-tests-only` description. A per-task selected-index manifest has not been reconstructed; the clarification does not specify a historical PRNG API or reset policy.

For BCB, enumerate methods in source order, calculate SHA-256 of `bigcodebench-random150-public-split-v1:42:<task_id>`, interpret the full digest as a big-endian integer and take it modulo the number of methods. The exported [150 per-task method lists](artifacts/datasets/bigcodebench150_split_methods.jsonl) are the frozen split. Preserve imports, helpers, setup/teardown and mock patch targets when building public and final modules. Do not pass reference solutions or final tests to generation or repair.

HumanEval tasks 38, 41, 50, 83, 84 and 160 have no public examples. Qwen Auto and the DeepSeek DSH adapter generate once and stop without reporting an empty suite as a pass; native agents retain their own stopping logic. All tasks, including failures, timeouts and missing candidates, remain in the denominator.

## DeepSeek backend: Table I

The author identifies the models by their full Hugging Face repositories:

| Scale | Model repository |
| --- | --- |
| 1.3B | [deepseek-ai/deepseek-coder-1.3b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-instruct) |
| 6.7B | [deepseek-ai/deepseek-coder-6.7b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct) |
| 33B | [deepseek-ai/deepseek-coder-33b-instruct](https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct) |

AdaAssist and MapCoder use the corresponding backend evaluation setup, as [confirmed by the author](author-confirmations.json): T=0.2, top-p=0.9, 512 output tokens and seeds 42/43/44; repair limits, prompts and source versions follow each method's backend protocol. These are not separate configurations requiring reconstruction from the older export. The full model repository IDs provide model identity for this guide; exact weight revisions/hashes are optional extra provenance.

| Paper method | Temperature / top-p | Output tokens per call | Recorded budget | Seeds |
| --- | --- | --- | --- | --- |
| Direct | 0.2 / 0.9 | 512 | One completion request, no repair | 42, 43, 44 |
| MapCoder | 0.2 / 0.9 | 512 | Corresponding backend method's repair/prompt/source protocol | 42, 43, 44 |
| Codex | 0.2 / 0.9 | 512 | Up to 5 model calls and 5 public evaluations; 300 s checked at loop boundaries | 42, 43, 44 |
| DSH context adapter | 0.2 / 0.9 | 1024 | Up to 10 model calls and 10 public evaluations; 600 s plus exit overhead | 42, 43, 44 |
| AdaAssist Auto | 0.2 / 0.9 | 512 | Corresponding backend progressive-repair/prompt/source protocol | 42, 43, 44 |

These rows do not share equal token, call or time budgets. The DeepSeek baseline is named Codex throughout the curated materials, as confirmed by the author; its recorded loop rebuilds the task/public-test/last-feedback prompt. For DSH, a context adapter chooses read/write/test operations and the model returns a Python module; it is different from the native Qwen DSH agent.

DSH uses a 16,384-token context and concurrency 8 for 1.3B or 4 for 6.7B/33B. Its table values use the 2026-10-13 normalization of frozen candidates: remove only top-level `task` self-imports and AST-identical public-test echoes, without regenerating code or consulting final scores. The [normalization provenance](artifacts/provenance/harness_normalized_result_provenance.json) records this separately from original generation. Hardware varies by run; DeepSeek's full repository IDs above identify the models, with additional checkpoint records retained as provenance.

## Qwen backend: Table II

The recorded common settings are **T=0.2, top-p=0.9, 512 output tokens per upstream call, 16,384 context tokens, concurrency 16, seeds 42/43/44**. There are 27 base experiment blocks and 7,326 task runs across three frameworks and three datasets. Planning and history-compaction calls count toward model requests.

AdaAssist uses English prompts, manually supplied frozen public tests, `context_enabled=false`, and at most six outer repair rounds after the first generation. Its coder/planner stages can each make up to four internal format/syntax attempts; a repair round is not one model call. The source snapshot identifies head `2666e92582c546b7f670d336f71d1a33c68657b1` plus [individual file hashes](artifacts/provenance/qwen_three_framework_actual.json).

Native Codex uses CLI 0.144.1 with a Responses custom/freeform bridge and auto-compaction at 12,000 tokens. Native DSH uses 0.2.0-rc.2 with compaction enabled. Full native runs have no extra model-call/public-test-count cap; each task segment has a 300-second deadline. The bridge does not choose or repair tool calls. Workspaces permit fixture/output writes while keeping instructions and frozen tests read-only.

**The limited rows need a precise budget definition.** Archived `<=6 repairs` results are retrospective prefixes capped at seven candidate-edit responses: an initial modification attempt plus six later attempts. Failed modifications count, and multiple modifications in one response count once. The cutoff is before the request containing the eighth edit response; earlier reads, tests, planning and compaction still contribute to time/calls. This is not the same unit as an AdaAssist repair round. See the [cost audit](artifacts/provenance/cost_audit_settings.json): 408 of 4,884 native trajectories cross the boundary, with 274 changed candidates rescored and two missing candidates.

Historical results combine the base runs, 108 replacements after correcting workspace write permissions, and a fifth-to-sixth-round Auto continuation. Each appended segment has its own 300-second allowance, so merged task time can exceed 300 seconds. The original Auto BCB merge passed 251/450; the paper's **57.11%** matches the later selected rerun version, **257/450** (86, 85, 86 by seed), with seed 42 selected after rerunning. Preserve this distinction in any comparison; a fresh six-round run is a separate result. Original and selected source identities are in [merge provenance](artifacts/provenance/qwen_six_round_merge.json) and [selected sources](artifacts/provenance/qwen_selected_result_sources.json).

## Inference and evaluation environments

The historical experiment orchestrator/evaluator uses **Python 3.11** (some manifests record 3.11.16). The current demo backend requires **Python 3.12+**. Use separate environments and preserve the historical source snapshot for benchmark work; current UI defaults do not establish historical experimental settings.

The recorded Qwen inference deployment uses vLLM **0.21.0 (cu129 wheel)**, PyTorch **2.11.0+cu128**, Transformers **5.8.1**, tokenizers **0.22.2**, TP=4, BF16, context=16,384, max sequences=16 and GPU memory utilization=0.78. GPU IDs 4-7 are machine-specific. The device snapshot reports RTX 4090 cards with **49,140 MiB each**; preserve the reported value. The `nvidia-smi` CUDA support version 13.2 is not the PyTorch CUDA runtime version. This deployment is not a common hardware configuration for all DeepSeek experiments.

For an equivalent Qwen service on Linux, point `QWEN_CHECKPOINT` to the frozen, hash-verified local checkpoint and adapt GPU IDs to your machine:

```bash
export QWEN_CHECKPOINT=/absolute/path/to/Qwen3-Coder-30B-A3B-Instruct
CUDA_DEVICE_ORDER=PCI_BUS_ID CUDA_VISIBLE_DEVICES=4,5,6,7 \
  vllm serve "$QWEN_CHECKPOINT" \
  --served-model-name Qwen3-Coder-30B-A3B-Instruct \
  --host 127.0.0.1 --port 8003 \
  --tensor-parallel-size 4 --dtype bfloat16 \
  --max-model-len 16384 --max-num-seqs 16 \
  --gpu-memory-utilization 0.78 --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder --generation-config vllm \
  --disable-custom-all-reduce
```

The bind address/port are local choices; the recorded bridge endpoint is loopback port 8003. Set T/top-p/output budgets on **every upstream request**, including planner/compaction stages. Serving flags alone do not enforce those budgets.

For a separate evaluation environment:

```bash
python3.11 -m venv .venv-evaluation
.venv-evaluation/bin/python -m pip install -r reproduction/requirements-evaluation.txt
```

On Windows the interpreter is `.venv-evaluation/Scripts/python.exe`; historical Bubblewrap isolation requires Linux. [requirements-evaluation.txt](requirements-evaluation.txt) is a portable subset of recorded evaluation dependencies, not a complete lockfile. Full [evaluation](artifacts/environment/adaassist_environment.txt) and [inference](artifacts/environment/vllm_environment.txt) snapshots include Conda build-machine `file://` references and should be consulted as provenance rather than installed blindly. Offline NLTK resources and complete source/test files must be acquired separately.

HE/MBPP base test subprocesses use 10 seconds. BCB uses `bigcodebench==0.1.8` `untrusted_check` with `min_time_limit=0.1`, `gt_time_limit=10`; native final evaluation has an outer 90-second deadline. These library limits are not a universal ten-second task timeout. Freeze candidates before independent final evaluation, preserve the candidate/test hashes, and report model/tool failures in the fixed denominator.

## Current human studies: Tables III-IV

Section III-C specifies nine graduate students, three participants per intervention, completing the same [20 BCB tasks](artifacts/datasets/task_ids_intervention_main20.json) selected from prior backend failures. Each participant-task session starts a fresh complete workflow. Other settings inherit Section III-B (T=0.2, top-p=0.9, 512 tokens, at most six repairs), with no task time limit. C1 adds tests, C2 edits plans, C3 provides guidance. Count actual submitted/applied edits; auxiliary actions such as rerunning tests do not count. The paper reports 35.0% / 46.7% / 50.0% success and 14/20 union coverage. The [manifest](configs/intervention.json) records these paper-reported anchors; API-reviewer outcomes remain separate.

Section III-D specifies 15 participants (six developers, nine master's students), three groups each with two developers and three students, Qwen3-Coder, and T1-T8 (four basic, four advanced). Each group uses one tool throughout: AdaAssist, DSH or Codex; participants do not rotate tools. AdaAssist participants can freely choose Auto/Interactive. After all eight tasks are completed, each participant rates their assigned tool overall for usefulness, understandability and perceived efficiency on -2..2. The [manifest](configs/user-study.json) records this design. The old 20-person DeepSeek study's allocation, questionnaire and results remain separate.

The [frontend study procedures](STUDY_PROTOCOLS.md) explain task preparation, participant grouping, allowed operations, endpoint evaluation and aggregation using manuscript and author-confirmed settings. Questionnaire forms and raw responses are deferred from the current documentation scope; reconstructing the original table values would require the corresponding measurements.

## Reproduction order and verification

1. Select the paper section and result version in `configs/`; resolve the relevant items in [DISCREPANCIES.md](DISCREPANCIES.md).
2. Obtain datasets/models from the listed repositories, using fixed revisions and hashes where supplied, and reconstruct the frozen public/final suites. DeepSeek model repositories are specified above; download revision/hash recording is optional additional provenance. Do not substitute the simplified `examples/` tests.
3. Restore the archived framework source/runtime identities, build separate inference/evaluation environments, and prepare offline resources. Current demo source is not a byte-identical experiment snapshot.
4. Reconstruct requests from the [prompt templates and tool schemas](artifacts/prompts/). Preserve dynamic-field/history rules and record actual sampling parameters for every stage.
5. Validate input visibility, real tool execution, candidate persistence, timeouts and empty-test behavior on a separate preflight sample. Run the frozen matrix while retaining raw requests, responses, public feedback, all candidate versions, timing, usage and stop reasons.
6. Freeze the last saved candidate, evaluate independently, and aggregate per seed and dataset. Keep infrastructure reruns, normalization, workspace replacements and post-hoc selected reruns separately traceable.

Verify this material from the repository root using Python 3.11+:

```bash
python reproduction/verify.py
```

The command checks curated checksums, copied-source hashes, JSON/JSONL parsing, 164/500/150 unique task IDs, the 150 disjoint BCB splits, the reused 20-task intervention list against its archived selection and the filtered 81-run index. It runs no model, candidate or participant experiment. Passing verifies artifact integrity, not the paper's outcomes or completeness of missing study materials.
