# Change Log

All notable changes to the "AdaAssist" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.0.0] - 2026-10-20

First officially distributed AdaAssist VSIX release (GitHub Releases).

- Provide Interactive and Auto workflows for Python code generation, public testing, visible error feedback, reviewable repair plans, and iterative fixes.
- Support independent top-level `assert` tests and `unittest.TestCase` cases with per-test reporting.
- Add compact task composer controls, in-workflow mode switching at pause points, and recoverable session history.
- Import paired `task.py` and `public_tests.py` files from the current workspace, scanning at most two directory levels.
- Remember a selected Python interpreter across VS Code restarts by persisting its executable path and launch arguments.
- Localize Python environment diagnostics and execution errors; improve narrow-sidebar wrapping of user-entered tasks.
- Support provider/model profiles and optional Python inline completion with independently configured endpoints.
- Package the VS Code extension, Webview assets, and bundled FastAPI backend source as an installable VSIX.

**Requirements:** VS Code 1.110.0+, Python 3.12+ with backend dependencies, and access to a configured model API. Python runtimes, API keys, and model weights are not bundled. This is a research-oriented release; public-test passes do not guarantee correctness.

## [0.0.14]

- Adapt code backgrounds and syntax highlighting to VS Code light, dark, and high-contrast themes, including generated code, Tests, and repair-plan Markdown.
- Apply theme changes without rerendering the conversation or interrupting code edits.
- Match native form controls to the VS Code theme instead of the operating system color preference.

## [0.0.10]

- Replace the boxed timeline with a compact conversation stream.
- Keep the user request visible while removing model, provider, endpoint, context, and internal stage badges from the conversation.
- Hide the redundant test-ready prompt and move diagnostics, test inputs, model metrics, and raw responses into collapsed details.
- Present tests in a bounded, independently scrolling sheet; keep generation options collapsed and the composer visually separate.
- Prevent code blocks, toolbars, and grid children from widening the conversation beyond a narrow sidebar.
- Replace code action text buttons with compact, accessible icons in the code block toolbar.
- Expose Interactive and Auto as explicit choices in the user-study task launcher.
- Float the current workflow state above the composer and expand its complete progress history on demand.
- Restyle workflow progress as a unified Codex-like goal panel with a compact two-line current stage.
- Replace task-status icons with a tucked-under-composer, single-line Git Graph progress track.
- Color Git Graph nodes, connecting segments, and status labels by workflow state.
- Ground code generation in public tests, exact return contracts, and actionable failed-assert diagnostics.
- Match workflow system, code, test, and planning prompts to the Webview's Chinese or English language setting.
- Default new Webviews to English and condense the header actions into a native-style icon toolbar.
- Keep task and generated tests collapsed until requested, generate missing tests automatically, and present test review as a conversational step.
- Shorten and compact result and composer actions while hiding controls that do not apply to the current workflow state.
- Preserve workflow history while the test editor is open.
- Persist user-study events and complete session snapshots in each participant workspace, including test artifacts and participant/task/condition identity.

## [0.0.9]

- Ground planning, code repair, and test generation prompts in the original task contract.
- Give the planner the current candidate, reviewed tests, and complete failure details.
- Give plan-guided regeneration the failed candidate and latest evaluation result.
- Keep Interactive guidance cumulative and deduplicated across workflow stages.
- Limit plans to concise, non-redundant repair steps while preserving the full displayed response.
- Isolate stage-specific LLM settings and cap planner/test output lengths.

## [0.0.8]

- Restore `Ċ` and `Ġ` tokenizer display markers in generated plans while preserving the complete model response.

## [0.0.7]

- Align Interactive and Auto execution with the user-study definitions.
- Add mid-workflow guidance and test-generation goals to Interactive sessions.
- Embed the shared test editor in the workflow page with selection append/replace.
- Add visible running, saved, failed, and retry feedback for workflow operations.
- Normalize right-click and workflow-generated tests through one parser.

## [0.0.6]

- Initial release.
