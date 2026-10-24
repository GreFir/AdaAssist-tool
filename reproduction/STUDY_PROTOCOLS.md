# Frontend study procedures

[Experiment settings](README.md) · [中文说明](README.zh-CN.md)

## III-C: controlled intervention on residual failures

Recruit nine senior software engineering graduate students with at least five years of programming experience. Randomly assign three participants to each condition. Each participant completes the same [20 BigCodeBench tasks](artifacts/datasets/task_ids_intervention_main20.json).

| Condition | Interface | Intervention |
| --- | --- | --- |
| C1 | Test Card | Add tests |
| C2 | Plan Card | Edit the repair plan |
| C3 | Test Feedback Card / guidance input | Provide natural-language guidance to clarify the plan |

1. Start a new complete workflow for each participant-task session using the original requirement and public tests.
2. Use the [Qwen backend settings](configs/qwen.json): T=0.2, top-p=0.9, maximum output 512 tokens, English prompts, context reuse disabled and up to six repair rounds after initial generation. There is no overall task time limit; retry handling follows tool defaults.
3. Participants inspect public feedback and use only their assigned intervention. Save the edited artifact or guidance before continuing generation and testing. Hidden tests and reference solutions remain outside the participant/model workspace.
4. Count each submitted/applied participant edit once. Auxiliary interactions, including rerunning tests, do not count as edits.
5. Evaluate the final saved candidate using the fixed original public and hidden suites. Report each participant's solved count out of 20, average success and accepted edits per task, and task-ID union coverage. Each condition contains 60 participant-task observations; union coverage counts a task once.

Final results are in [intervention.json](configs/intervention.json).

## III-D: three-tool usability study

Recruit 15 participants: six professional developers with 3-7 years of industry experience and nine third-year software engineering master's students with at least five years of programming experience and 3-5 months of internships. Participants do not overlap with III-C.

1. Randomly form three groups, each containing two developers and three students. Assign one tool to each group: AdaAssist, DSH or Codex. Each participant uses only that tool throughout the study.
2. Configure all tools with Qwen3-Coder as the common model. Use eight tasks, T1-T8, with four basic and four advanced tasks, and provide the same task requirements and public tests to all groups.
3. Introduce the assigned tool, then have participants complete all eight tasks. AdaAssist participants may freely choose Auto or Interactive mode.
4. After all tasks are completed, collect an overall rating of the assigned tool for usefulness, understandability and perceived efficiency on a five-point -2..2 scale.
5. Compute each tool/dimension's mean from its five participant ratings. The overall tool rating is the equally weighted mean of the three dimensions.

Final results are in [user-study.json](configs/user-study.json).
