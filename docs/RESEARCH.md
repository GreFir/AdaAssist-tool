# Research artifacts & reproducibility

[← README](../README.md) · [Developer guide](DEVELOPMENT.md)

AdaAssist is a **research prototype for interactive Python code generation** with visible generation, public-test evaluation, human review, and plan-guided repair. Paper experiment settings and their evidence limits are documented in the [reproduction guide](../reproduction/README.md) ([中文](../reproduction/README.zh-CN.md)); this page describes software session artifacts.

## Paper experiment configurations

The versioned [`reproduction/`](../reproduction/README.md) directory maps Section III-A through III-D and Tables I-IV to [DeepSeek](../reproduction/configs/deepseek.json), [Qwen](../reproduction/configs/qwen.json), [controlled intervention](../reproduction/configs/intervention.json) and [user-study](../reproduction/configs/user-study.json) manifests. It includes fixed benchmark task IDs, the BCB public/final test-method split, archived prompt/tool definitions, environment snapshots and result provenance. Run `python reproduction/verify.py` from the repository root to check integrity without model access.

The [frontend study procedures](../reproduction/STUDY_PROTOCOLS.md) explain preparation, grouping, allowed interventions and analysis for the current 9-person and 15-person studies. Questionnaire forms and raw responses are deferred from this update. The [paper/archive alignment notes](../reproduction/DISCREPANCIES.md) retain unverified historical settings, method labels, test-split/budget definitions and result versions. The export's API-reviewer intervention and old 20-person Auto/Interactive study are not treated as participant evidence for the current studies.

## Workflow semantics

**Interactive:** Users can review generated or provided tests, initial candidate code, and repair plans before advancing. Additional guidance is recorded and can affect later model calls. Passing public tests is a checkpoint for user confirmation, not mathematical proof that the generated program is correct.

**Auto:** The configured workflow proceeds through code generation, evaluation, local repairs, plan creation, and regeneration without the same mid-stage human review. It can stop when tests pass, an interrupt is requested, or a configured limit is reached.

**Public tests:** The current demo accepts Python top-level `assert` statements and `unittest.TestCase` suites, including an explicit `TextTestRunner`; `pytest` is not a supported runner. Historical benchmark protocols use their frozen evaluators and splits. Public-test pass rates must not be represented as hidden-test correctness.

## Recording and recovering sessions

The extension exposes a Logs view with workflow stages, model timing/token metadata when reported by the backend, test feedback, and diagnostic messages.

- **Routine workspace snapshots:** Full workflow state can be stored under the VS Code extension's workspace storage area (not the Git repository).
- **Prepared participant study workspaces:** Research-specific records are written under `adaassist-study-logs/`, including an append-only `events.jsonl` and complete `sessions/*.json` snapshots.
- **Historical restoration:** A session can be reopened from a current backend session or a suitable full snapshot. Diagnostic summaries alone do not guarantee recoverability.
- **Task boundaries:** Independent tasks use separate Session identifiers and keep earlier events available for inspection.

Study records can contain code, task descriptions, test cases, and interactions. Review and anonymize any participant information before sharing files.

## What to preserve for a reproducible experiment

Record at minimum:

| Item | Why it matters |
| --- | --- |
| Repository commit and VSIX version | Workflow and UI behavior can change |
| Full model identifier and provider; served revision if recorded | Identifies the model; a recorded revision adds version precision |
| Endpoint configuration, decoding settings, output budget | Affects completions, truncated outputs, and cost |
| Public tests and benchmark task identifiers | Defines observed outcomes |
| Execution mode (Auto / Interactive) | Human intervention changes the protocol |
| Retry limits and interaction policy | Influences attempts and available feedback |
| Random seeds, repeated runs, hardware if relevant | Essential for statistical interpretation |
| Any human edits and exact test revisions | Needed to distinguish autonomous from assisted improvements |

If results use hidden tests, document the split and evaluation procedure explicitly; do not treat passed public tests as interchangeable with hidden tests.

## Availability

The project offers the implementation, installation workflow, session logging and the [curated experiment settings](../reproduction/README.md). The settings include SHA-256 identities and explicit availability limits. Historical benchmark runners, candidates, full test source, model weights and matching raw human-study materials are not included; the manifests alone do not provide an executable replay of every paper result.

Researchers should use a fixed Git commit and archive all required configurations for each reported result. GitHub Releases may provide installable VSIX binaries, but binary packaging alone is not an experimental artifact archive.

## Safety and disclosure

Generated Python and provided tests are executed locally, so experiments with untrusted tasks need a sandbox or controlled environment. Remove API secrets and identifying study data before uploading reproducibility materials.
