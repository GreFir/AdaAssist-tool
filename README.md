# AdaAssist

<p align="center">
  <strong>Interactive code generation, visible tests, and guided repair — inside VS Code.</strong>
</p>

<p align="center">
  <a href="#-quick-install-vsix">Install VSIX</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-features">Features</a> ·
  <a href="#paper-experiment-settings">Paper experiments</a> ·
  <a href="docs/README.zh-CN.md">简体中文</a> ·
  <a href="https://github.com/GreFir/AdaAssist-tool/releases">Releases</a>
</p>

AdaAssist is a **research-oriented VS Code extension for Python coding tasks**. It makes the generation → public testing → feedback → repair workflow visible and lets users review intermediate results instead of working with an opaque agent loop. It supports **Interactive** and **Auto** execution, editable tests and plans, multiple task sessions, historical workflow inspection, and Python inline completion.

> **Research status:** This is a research prototype, not a guarantee of program correctness. Passing the provided public tests does not prove that hidden or untested edge cases pass. The paper link and related publication information will be added after public release.

## Paper experiment settings

**Configurations and reproduction instructions: [`reproduction/`](reproduction/README.md)** · [中文实验说明](reproduction/README.zh-CN.md)

| Paper | Final experiment design | Configuration |
| --- | --- | --- |
| III-A / Table I | DeepSeek-Coder-Instruct 1.3B / 6.7B / 33B; Direct, MapCoder, Codex, DSH and AdaAssist | [deepseek.json](reproduction/configs/deepseek.json) |
| III-B / Table II | Qwen3-Coder-30B-A3B-Instruct; AdaAssist, Codex and DSH; default and limited execution settings | [qwen.json](reproduction/configs/qwen.json) |
| III-C / Table III | 9 participants, 20 BCB tasks, three intervention groups; fresh workflows, no task time limit | [intervention.json](reproduction/configs/intervention.json) |
| III-D / Table IV | 15 participants, one tool per group, 8 tasks; overall tool ratings after all tasks | [user-study.json](reproduction/configs/user-study.json) |

**Backend generation:** all methods use **T=0.2, top-p=0.9, maximum output 512 tokens**, with **seeds 42/43/44**. Retry handling uses **each tool's default settings**.

**Datasets:** HumanEval **164**, MBPP **500** (original task IDs 11-510), BigCodeBench **Random150**. MBPP uses one randomly selected public test per task with seed 42; the remaining tests are hidden. Fixed task lists and BCB test-method splits are in [reproduction/artifacts/datasets/](reproduction/artifacts/datasets/). See [dataset settings](reproduction/configs/datasets.json) and [study procedures](reproduction/STUDY_PROTOCOLS.md).

Table II reports AdaAssist's final BCB pass rate as **57.11%** and average pass rate as **78.70%**. All final tables are recorded in the experiment manifests.

```bash
python reproduction/verify.py
```

## 🚀 Quick install (VSIX)

**For everyday use, you do not need to clone this repository or install Node.js.**

1. **[Download the latest AdaAssist VSIX from GitHub Releases](https://github.com/GreFir/AdaAssist-tool/releases)** (open a release, then download its `adaassist-*.vsix` asset under **Assets**).
2. Open **VS Code → Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`), select the **···** menu → **Install from VSIX…**, and choose the downloaded file.
3. Reload VS Code if prompted. Select the **AdaAssist** icon in the Activity Bar.

**Alternative, if the `code` command is available:**

```bash
code --install-extension adaassist-1.0.0.vsix
```

Replace the filename with the VSIX you downloaded. A VSIX installation is local; **VS Code does not automatically update manually installed VSIX extensions**. Download a newer VSIX to upgrade.

> **Trouble downloading from Releases?** The [VSIX packaging workflow](https://github.com/GreFir/AdaAssist-tool/actions/workflows/package-vsix.yml) also provides installable files under **Artifacts** after a successful build. Download and unzip `adaassist-vsix` (GitHub sign-in may be required), or [build locally](#-build-from-source).

### One-time runtime setup

The VSIX **includes AdaAssist's Python backend source**, but **not** a Python interpreter, Python packages, model weights, or an API key. To actually generate and test code, you need:

| Requirement | Needed for |
| --- | --- |
| VS Code **1.110.0+** | Extension host and Webview |
| Python **3.12+** with backend packages | Local test and workflow backend |
| An accessible LLM API endpoint | Code, tests, and plan generation |
| Python Environments VS Code extension | Interpreter discovery (VS Code may request installation) |

If your chosen Python environment does not already have the backend packages, install them **once in that same environment**:

```bash
python -m pip install fastapi uvicorn openai requests anthropic google-genai
```

On Windows, `py -3.12 -m pip install ...` is an alternative if `python` does not point to Python 3.12+. On Linux/macOS with an externally managed Python, use a virtual environment; see [Python setup](docs/INSTALLATION.md#python-runtime-setup). In **AdaAssist → Settings → Environment**, select the Python interpreter where you installed these packages and run **Check Environment**. AdaAssist saves the selected interpreter's executable path and any launch arguments in VS Code settings for the current workspace, so restarting VS Code does not require selecting it again. Use **Auto-detect Python** to follow the active VS Code workspace interpreter instead. Older `env:` selections are migrated to stable paths when they can be resolved; genuinely deleted or moved interpreters must be selected again.

The extension starts the bundled FastAPI service automatically when needed; **you do not normally need to launch `backend/main.py` yourself**.

## ⚡ Quick start

1. **Models:** Open **AdaAssist → Settings → Models** and configure your provider, model ID, optional Base URL, and API key. **No model endpoint or model ID is preconfigured.** For Ollama or vLLM, use your own service URL. Save the profile.
2. **Mode:** Pick **Interactive** or **Auto** in the compact menu beside the Send button (or under **Settings → Workflow**).
3. **Requirement:** Describe a Python function and its expected behavior. Optionally open **Tests** to provide executable top-level `assert` checks; otherwise AdaAssist can suggest tests.
4. **Run:** Send the task. In **Interactive**, review tests, generated code, and repair plans at checkpoints. In **Auto**, the workflow proceeds through generation, testing, and repair automatically.
5. **Continue:** Passing public tests offers an opportunity to confirm completion or keep refining. Create a new task when you want a separate requirement; history stays accessible.

An example task to paste into AdaAssist:

```text
Implement def unique_sorted(values: list[int]) -> list[int]:
Return a sorted list of unique integers. Handle empty inputs and duplicates.
```

Optional public tests:

```python
assert unique_sorted([]) == []
assert unique_sorted([3, 1, 3, 2]) == [1, 2, 3]
assert unique_sorted([-1, -1, 0]) == [-1, 0]
```

Tests can use top-level Python `assert` statements or `unittest.TestCase` suites (including an explicit `TextTestRunner`); AdaAssist reports per-test results for both. Generated tests use top-level assertions and should be reviewed before relying on them. `pytest` is not a supported test runner.


### Import an example from the current workspace

Use the **Import example from workspace** folder icon beneath the task input to load a task and its public tests without copying them manually.

```text
your-workspace/
  examples/
    example-01/
      task.py
      public_tests.py
    example-02/
      task.py
      public_tests.py
```

AdaAssist searches the **workspace root and at most two levels of subdirectories** for `task.py` paired with `public_tests.py` **in the same folder**. For example, `examples/example-01/` is included, while `examples/category/example-01/` is too deep and is not scanned. It automatically loads the only match or shows a directory picker if multiple examples exist. Contents of `task.py` are placed in the requirement input; the paired file goes into the editable **Tests** card as manual Python tests. The import does **not** execute code or submit the task. Review both inputs, select a model and execution mode, then press **Send**.

If a task is already open or either input contains a draft, AdaAssist asks for confirmation before replacing it; a previous session is archived when starting a new task. Import is unavailable while a workflow is running. Each file is limited to 256 KiB, and the scanner skips common dependency/build directories.

### Task composer controls

The composer uses a single input frame, with icon-only **Use Selection** and **New Task** controls. The compact **Interactive / Auto** menu beside **Send** stays synchronized with **Settings → Workflow**. Mode switching is disabled while a model stage is running. After Auto is paused, select **Interactive** to review and edit the current code, tests, feedback, or plan. While Interactive is at a review checkpoint, select **Auto** and press **Continue** to resume autonomous repair from the same session. Save draft edits before switching modes; saved artifacts and repair counts are retained. Use **New Task** only to start a separate requirement.

## ✨ Features

| Capability | Description |
| --- | --- |
| **Transparent stages** | Inspect generation, evaluation, feedback, and repair in a readable workflow timeline |
| **Interactive / Auto** | Review intermediate artifacts or run the autonomous workflow |
| **Public-test feedback** | Edit Python `assert` tests, rerun candidates, and see evaluation results |
| **Repair with a plan** | Inspect, edit, and reuse a plan informed by failures and the current code |
| **Task history** | Keep independent tasks within the UI; inspect past sessions in **Logs** |
| **Session recovery** | Reopen restorable historical sessions from complete saved snapshots |
| **Python inline completion** | Configurable model, idle debounce, and manual triggering independent of the workflow model |

**Workflow sketch**

```text
Requirement → Tests (provided or generated) → Generate → Validate
                                               │
                             Pass ──────────────┤
                                               └── Fail → Plan / Repair → Regenerate → Validate
```

AdaAssist records the **public-test result**, not a claim that every conceivable input is correct.

## 🛠 Configuration

The four Settings sections intentionally have separate responsibilities:

- **Workflow** — interactive/auto execution, context reuse, and current workflow model.
- **Models** — provider, endpoint, credentials, and **Max Output Tokens** (128–32768, default 1024 for an old profile).
- **Completion** — independent Python inline-completion model, trigger mode, debounce, and token budget.
- **Environment** — local Python interpreter and backend dependency check.

Model profiles live in `.vscode/adaassist-profiles.json` by default. The corrected v1.0.0 VSIX does not erase existing saved profiles; to clear an old endpoint, edit the saved profile or the legacy `adaassist.baseUrl` setting. Inline completion starts disabled until separately configured. UI-entered API keys are stored in VS Code Secret Storage; do **not** commit real keys. See [Configuration and troubleshooting](docs/INSTALLATION.md#model-configuration) for Ollama/vLLM, hosted APIs, and common problems.

## 📦 Build from source

Developers can build and package the VSIX without publishing to the Marketplace:

```bash
git clone https://github.com/GreFir/AdaAssist-tool.git
cd AdaAssist-tool
npm ci
npm run package:vsix
```

The command compiles the extension and creates `adaassist-<version>.vsix` in the repository root. To debug the extension, run `npm run compile` and press **F5** in VS Code. Node.js **22** is used by the CI build. See [Developer guide](docs/DEVELOPMENT.md).

**For maintainers:** The [GitHub Actions VSIX workflow](.github/workflows/package-vsix.yml) packages and checks a VSIX on pull requests, pushes to `main`, and manual runs. A matching version tag (for example `v1.0.0`) publishes the VSIX plus a SHA-256 checksum to GitHub Releases. A `main` push marked `[publish-vsix]` also publishes the current package version after successful packaging; ordinary pushes never publish automatically.

## 🔬 Research and reproducibility

AdaAssist is intended for **code generation under explicit public tests and user intervention**. For paper settings, fixed benchmark identities, prompt/environment records and reproduction steps, start at [Paper experiment settings](#paper-experiment-settings) and the [`reproduction/` guide](reproduction/README.md). For session recording and recovery, see [Research and artifacts](docs/RESEARCH.md).

The software and configuration can evolve; for experimental comparisons, **record the exact commit/VSIX version, model identifier, endpoint, output-token settings, and test suite**. A paper link and BibTeX will be added once the manuscript is public.

## 🎬 Video demonstration

[Watch the AdaAssist tool demonstration on YouTube](https://www.youtube.com/watch?v=YfQ5a4ThXE4).

## 🧪 Try example tasks

The [importable examples](examples/README.md) include seven English-language Python tasks with public tests. Open this repository as a VS Code workspace, then use **Import example from workspace** in AdaAssist to select a task. Every example has a paired `task.py` and `public_tests.py` file, so the importer can load both together. Example tests are simplified for hands-on use and are not the original benchmark evaluation suite.

## 📚 Documentation

- [安装指南（中文）](docs/README.zh-CN.md)
- [Installation, model setup, troubleshooting](docs/INSTALLATION.md)
- [Development, testing, VSIX packaging](docs/DEVELOPMENT.md)
- [Research artifacts, session logs, recovery](docs/RESEARCH.md)
- [Paper experiment configurations and reproduction instructions](reproduction/README.md)

## ⚠️ Important notes

- AdaAssist executes user-supplied or model-generated Python in a local test environment. **Do not run untrusted code in a sensitive environment.** Use a sandbox or isolated environment for untrusted tasks.
- Installing the VSIX does not install model weights or grant access to a paid API.
- Some old entries in the **Logs** page are only diagnostic summaries and cannot be fully restored without a corresponding session snapshot.
- This repository currently does not include a standalone `LICENSE` file. A public distribution license should be chosen before wider redistribution.

For bugs or feature requests, please open a [GitHub Issue](https://github.com/GreFir/AdaAssist-tool/issues).
