# Paper/archive alignment and unresolved inputs

[Experiment guide](README.md) · [中文入口](README.zh-CN.md)

Checked against the supplied manuscript on 2026-10-24 and supplemented by [author confirmations](author-confirmations.json). Paper-reported designs and confirmed protocols are recorded in `configs/`. Codex display names are normalized in the curated files; [sources.json](sources.json) records original and curated hashes for transformed files, with original run IDs/source paths retained.

The current update prioritizes describing experimental settings and procedures. [STUDY_PROTOCOLS.md](STUDY_PROTOCOLS.md) supports a fresh implementation of the two frontend designs; additional operational conventions are labelled explicitly. Questionnaire attachments, raw responses and participant logs are deferred, rather than prerequisites for publishing these protocol descriptions. Historical details below distinguish an independent replication from exact reconstruction of the original results.

| Item | Current manuscript | Local export | Treatment in this directory |
| --- | --- | --- | --- |
| Experiment scope | Qwen comparison and limited-budget rows are in III-B / Table II | Qwen full run is S1, budget audit S2, labelled supplementary | Include both as support for III-B; exclude unrelated sensitivity variants and T6/Continue case |
| DeepSeek Codex baseline — naming confirmed | Table I and author identify the method as Codex | Original run records use older internal identifiers | Use Codex consistently in curated documentation, manifests and run-index method labels; original run identifiers remain source provenance |
| DeepSeek DSH | Table I uses DSH | context_adapter: adapter chooses tools, 1024 tokens, up to 10 model calls | State this protocol explicitly; do not substitute the native Qwen DSH agent or imply equal budgets |
| AdaAssist / MapCoder setup — confirmed | Table I includes pass rates; author confirms use of the corresponding backend evaluation setup | Older export described historical results without complete per-run settings | Use author-confirmed T=0.2, top-p=0.9, 512 tokens, seeds 42/43/44; inherit each method's backend repair limits, prompts and source configuration. Do not classify the shared setup as missing |
| MBPP test split — resolved at protocol level | III-A says one randomly visible test, remaining tests held out | Older export says provided-tests-only; author confirms original task IDs 11-510, one randomly chosen public test per task using seed 42, all others hidden | Apply the author-confirmed protocol. Hidden means held-out original tests, not a separately authored suite. A historical per-task index manifest is not claimed |
| Native Qwen limited budget | Text says up to six repair cycles, matching AdaAssist | S2 truncates trajectories at seven candidate-edit responses; failed edits count; not AdaAssist's repair-cycle unit | Record cutoff and cost boundary; require author confirmation of paper wording; do not describe as prospectively matched cycles |
| Qwen result version | Our BCB 57.11%, average 78.70% | Original six-round BCB 251/450; later selected repeats 257/450, seed42 rerun chosen after observing outcomes | Retain both versions and source hashes; identify the selected version matching the paper; no independent superiority inference from the selection |
| Qwen timing | Table II gives time/calls | Base run, 108 writable-workspace replacements and sixth-round continuation; appended segment gets its own 300 s | Preserve merged timing; do not call it a uniform 300 s total limit; raw trajectory/cost recomputation needs missing run artifacts |
| Controlled intervention | III-C: 9 human students, 3 groups, 20 residual failures; C1/C2/C3 success 35.0/46.7/50.0% | E3: 3 API reviewer models, 220 branches; I3/I2/I1 success 28/60, 34/60, 36/60 | Exclude E3 from current human-study evidence; capture only the paper's human protocol in intervention.json |
| Intervention start/settings — confirmed | Reuse the earlier 20-task list; author confirms a fresh complete workflow per participant-task session | Earlier API-reviewer batches use distinct starting states and settings | Start afresh; inherit the Section III-B backend settings and evaluator; no study-task time limit. Keep prior task-selection history separately |
| Intervention restrictions and edit counting — confirmed | Three assigned intervention channels; author clarifies actual counting | Original API-reviewer decisions are distinct from participant edits | Each group adheres to its channel; count submitted/applied participant edits, excluding auxiliary actions such as rerunning tests |
| User study — assignment and ratings confirmed | III-D: 15 people, one tool per group, 8 tasks, overall -2..2 ratings after all tasks | E2 is an older 20-person DeepSeek Auto/Interactive study with 1..5 ratings | Use the author-confirmed three-group design and post-study tool ratings; keep the older study's measurements separate |
| Current implementation | Demo tool backend and UI evolve | Qwen Auto records a different head plus file hashes; E3 uses frozen v0.0.13 | Do not equate the current demo with frozen experiment source; manifests are not directly imported into the extension |
| DeepSeek model identity — confirmed | Author supplies deepseek-ai/deepseek-coder-{1.3b,6.7b,33b}-instruct repository IDs | Older local-checkpoint labels provide less detail; supplementary hashes are retained | Full public repository IDs identify the models. Exact download revision/weight hashes are optional extra provenance, not a missing model identity |
| Environment separation | Experiment and current demo have different runtime requirements | Inference/evaluation dependency versions differ | Separate evaluation Python 3.11 from demo Python 3.12+ and the inference environment |

## Author-confirmed frontend procedures

- Section III-C reuses the earlier 20 BCB task IDs. Every participant-task session starts a new complete workflow, inherits backend generation/repair/evaluation settings and has no overall time limit. Each group adheres to its assigned intervention. Applied participant edits count; auxiliary test reruns do not.
- Section III-D assigns one tool to each of three groups, with five participants per group. Participants use their assigned tool throughout all eight tasks, then provide overall tool ratings. Each tool/dimension has five participant ratings. Perceived efficiency is a questionnaire measure, not measured execution speed.

## Deferred validation materials

Original questionnaire forms, exact historical item wording, raw ratings, anonymized edit events and final participant candidates can be added later. They are not requested as part of this configuration/protocol update. They would be needed for exact reanalysis of the reported tables; a new study can implement the documented design using its own explicitly recorded questionnaire and operational conventions.

## Excluded archival material

The original ZIP remains a local source. The following are not promoted into active paper configurations: standalone Instruct and the separate 1024-token Codex variant, old partial Qwen designs, PublicSplit50/stratified variants, API-reviewer intervention runtime protocols/prompts/results, the old 20-person study and T6/Continue case. The reused 20-task list and its selection provenance are included based on author confirmation; API-reviewer outcomes remain separate from participant outcomes. The filtered DeepSeek index includes Direct, Codex and DSH-context-adapter, with original run IDs retained for traceability.

Original experiment scripts, frozen source snapshots, candidates, full tests, model weights and raw participant records were not included in the ZIP. Their hashes identify sources but do not make those sources available. This material supports configuration reconstruction to the extent stated above; it does not certify exact replay of the reported results.
