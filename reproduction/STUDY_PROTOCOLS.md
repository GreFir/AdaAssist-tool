# Frontend study reproduction procedures

[Experiment guide](README.md) · [中文说明](README.zh-CN.md)

This document describes how to implement the frontend study designs in Sections III-C and III-D. Participant counts and study conditions follow the manuscript and [author confirmations](author-confirmations.json). The controlled intervention study restarts the complete workflow on the reused 20 tasks, inherits backend settings and has no task time limit. The usability study assigns one tool to each group and collects overall ratings after all tasks are completed.

Questionnaire forms, original responses and participant logs are deferred from the current documentation scope. Their absence does not prevent describing or independently implementing the design. Recomputing the original table values would require the corresponding measurements.

## III-C: controlled intervention on residual failures

**Design.** Use Qwen3-Coder-30B-A3B-Instruct as the generator. Recruit nine senior software engineering graduate students with at least five years of programming experience. Randomly assign three people to each of three conditions. Each participant completes all 20 selected BigCodeBench tasks, giving 60 participant-task observations per condition.

| Condition | Interface | Allowed intervention | Subsequent execution |
| --- | --- | --- | --- |
| C1 | Test Card | Add tests | Save the augmented working suite, test the current code and use failure feedback for repair |
| C2 | Plan Card | Directly edit the repair plan | Save the plan and regenerate from that saved plan |
| C3 | Test Feedback Card / guidance input | Clarify the plan through natural-language guidance | Save guidance, let the planner refine the plan, then regenerate |

1. Use the same [20 BigCodeBench task IDs](artifacts/datasets/task_ids_intervention_main20.json) as the earlier controlled intervention experiment. Preserve the [original selection provenance](artifacts/provenance/intervention_main_selection.json); no new sample is drawn for the nine participants.
2. Start a new session and the full generation workflow for every participant-task pair. Supply the original task and frozen public tests, generate initial code afresh, and proceed through testing and repair. Do not resume the historical failed code or clone a failed checkpoint into the session. The historical failure determines task selection, not the new workflow's initial candidate.
3. Inherit the [Section III-B backend configuration](configs/qwen.json): Qwen3-Coder-30B-A3B-Instruct, T=0.2, top-p=0.9, 512 output tokens, the backend seed protocol, English prompts, context reuse disabled, and at most six repair rounds after initial generation. There is no participant-task wall-clock limit. Backend stage retry and test-execution settings otherwise apply; a technical request/test timeout is not a total study-task time allowance.
4. Explain the interface and assigned control. Participants adhere to their assigned intervention channel; cross-channel edits are not performed. Auxiliary interactions such as rerunning tests are permitted and do not count as edits. Keep reference implementations, final tests and final-test diagnostics outside the participant/model workspace. Frozen original public tests remain available throughout.
5. Save the edited artifact before continuing the workflow. Repeat generation, public testing and the assigned intervention under the inherited backend repair limit, with no overall task time limit. Record the final stop reason and preserve session artifacts.
6. Freeze the final saved candidate at the end of each session. Run the original public and final test suites independently using the frozen evaluator. Additional C1 tests guide repair; retain original suites to make endpoint scoring comparable across conditions.
7. **Author-confirmed counting rule:** count each participant edit actually submitted and incorporated into the assigned artifact or guidance as one edit operation. Do not count auxiliary interactions such as rerunning tests. This is a count of applied participant edits, not total UI interactions or model calls; record auxiliary actions separately when collecting logs.
8. Report each participant's solved count out of 20, each condition's average pass rate and average accepted edits per task, and task-ID union coverage. With three participants per condition, average pass rate is total successes divided by 60. Count a task once in union coverage even if multiple participants solve it. Preserve the endpoint scoring rule and edit-count definition alongside the results.

The author confirmed the task list, fresh workflow start, inherited backend settings and unlimited task time. Earlier API-reviewer results remain separate from human-participant results.

## III-D: three-tool usability study

**Design.** Use Qwen3-Coder as the common base model. Recruit 15 participants: six professional developers with 3-7 years of industry experience and nine third-year software engineering master's students with at least five years of programming experience and 3-5 months of internship experience. These participants do not overlap with III-C. Randomly create three groups, each with two developers and three students.

1. Prepare eight fixed Python coding tasks, T1-T8, comprising four basic and four advanced tasks. Use the same task requirements and public tests across the three tool groups.
2. Configure AdaAssist, DSH and Codex to use the common Qwen3-Coder model. Record tool builds, effective generation parameters, available tests and task budgets. Use the paper backend settings as a declared replication baseline where appropriate; preserve any study-specific changes.
3. Randomly assign participants to three balanced groups. Assign one tool to each group: AdaAssist, DSH or Codex. Each group contains two developers and three students. Each participant uses only their assigned tool throughout; there is no tool rotation or crossover.
4. Introduce the assigned tool and common model setup, then have each participant perform all eight tasks with that tool. In the AdaAssist group, allow participants to choose Auto or Interactive mode freely.
5. After all eight tasks are completed, collect one overall assigned-tool rating per participant for usefulness, understandability and perceived efficiency on the five-point -2..2 scale. These are post-study tool ratings rather than task-by-task ratings.
6. Compute the mean of the five participant ratings separately for each tool and dimension. Report the equally weighted mean of the three dimensions as the overall tool rating. Perceived efficiency is a subjective rating, not measured runtime.

The paper-reported ratings are transcribed in [user-study.json](configs/user-study.json) as reference values. They are not derived from the archived 20-person DeepSeek Auto/Interactive study or by rescaling its 1..5 responses.

## What belongs in the paper and repository

The manuscript should state the participants, task selection, grouping, intervention/tool conditions, main procedure and outcome measures, with a link to these detailed repository protocols. Full questionnaire forms and individual responses need not occupy the short tool-demo paper. Reanalysis of the historical tables is a separate step from independently implementing this protocol.
