# AdaAssist

<p align="center">
  <strong>Interactive code generation, visible tests, and guided repair — inside VS Code.</strong>
</p>

<p align="center">
  <a href="#-quick-install-vsix">Install VSIX</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-features">Features</a> ·
  <a href="docs/README.zh-CN.md">简体中文</a> ·
  <a href="https://github.com/GreFir/AdaAssist-tool/releases">Releases</a>
</p>

AdaAssist is a **research-oriented VS Code extension for Python coding tasks**. It makes the generation → public testing → feedback → repair workflow visible and lets users review intermediate results instead of working with an opaque agent loop. It supports **Interactive** and **Auto** execution, editable tests and plans, multiple task sessions, historical workflow inspection, and Python inline completion.

> **Research status:** This is a research prototype, not a guarantee of program correctness. Passing the provided public tests does not prove that hidden or untested edge cases pass. Paper, video, and reproduction links will be added when available.

## 🚀 Quick install (VSIX)

**For everyday use, you do not need to clone this repository or install Node.js.**

1. **[Download the latest AdaAssist VSIX from GitHub Releases](https://github.com/GreFir/AdaAssist-tool/releases)** (open a release, then download its `adaassist-*.vsix` asset under **Assets**).
2. Open **VS Code → Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`), select the **···** menu → **Install from VSIX…**, and choose the downloaded file.
3. Reload VS Code if prompted. Select the **AdaAssist** icon in the Activity Bar.

**Alternative, if the `code` command is available:**

```bash
code --install-extension adaassist-0.0.14.vsix
```

Replace the filename with the VSIX you downloaded. A VSIX installation is local; **VS Code does not automatically update manually installed VSIX extensions**. Download a newer VSIX to upgrade.

> **No VSIX in Releases yet?** The [VSIX packaging workflow](https://github.com/GreFir/AdaAssist-tool/actions/workflows/package-vsix.yml) generates installable files under **Artifacts** after a successful build. GitHub may require you to sign in to download an Actions artifact, which is a ZIP containing the VSIX. Tagged releases will attach the VSIX directly to the release page. You can also [build a VSIX locally](#-build-from-source).

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

On Windows, `py -3.12 -m pip install ...` is an alternative if `python` does not point to Python 3.12+. On Linux/macOS with an externally managed Python, use a virtual environment; see [Python setup](docs/INSTALLATION.md#python-runtime-setup). In **AdaAssist → Settings → Environment**, select the Python interpreter where you installed these packages and run **Check Environment**.

The extension starts the bundled FastAPI service automatically when needed; **you do not normally need to launch `backend/main.py` yourself**.

## ⚡ Quick start

1. **Models:** Open **AdaAssist → Settings → Models**, create a profile and enter your provider, model ID, optional base URL, and API key. For Ollama or vLLM, point it to your running compatible service. Save the profile.
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

Model profiles live in `.vscode/adaassist-profiles.json` by default. UI-entered API keys are stored in VS Code Secret Storage; do **not** commit real keys. See [Configuration and troubleshooting](docs/INSTALLATION.md#model-configuration) for Ollama/vLLM, hosted APIs, and common problems.

## 📦 Build from source

Developers can build and package the VSIX without publishing to the Marketplace:

```bash
git clone https://github.com/GreFir/AdaAssist-tool.git
cd AdaAssist-tool
npm ci
npm run package:vsix
```

The command compiles the extension and creates `adaassist-<version>.vsix` in the repository root. To debug the extension, run `npm run compile` and press **F5** in VS Code. Node.js **22** is used by the CI build. See [Developer guide](docs/DEVELOPMENT.md).

**For maintainers:** The [GitHub Actions VSIX workflow](.github/workflows/package-vsix.yml) packages and checks a VSIX on pull requests, pushes to `main`, and manual runs. Pushing a version tag matching `package.json` (for example `v0.0.14`) creates a GitHub Release with the VSIX and a SHA-256 checksum. Publishing a release is a separate action; the presence of this workflow does not mean a release already exists.

## 🔬 Research and reproducibility

AdaAssist is intended for **code generation under explicit public tests and user intervention**. Historical workflow events and model timing/token metadata can be recorded, including in prepared user-study workspaces. To understand experiment data, setup, and limitations, see [Research and artifacts](docs/RESEARCH.md).

The software and configuration can evolve; for experimental comparisons, **record the exact commit/VSIX version, model identifier, endpoint, output-token settings, and test suite**. A paper link and BibTeX will be added once the manuscript is public.

## 📚 Documentation

- [安装指南（中文）](docs/README.zh-CN.md)
- [Installation, model setup, troubleshooting](docs/INSTALLATION.md)
- [Development, testing, VSIX packaging](docs/DEVELOPMENT.md)
- [Research artifacts, session logs, recovery](docs/RESEARCH.md)

## ⚠️ Important notes

- AdaAssist executes user-supplied or model-generated Python in a local test environment. **Do not run untrusted code in a sensitive environment.** Use a sandbox or isolated environment for untrusted tasks.
- Installing the VSIX does not install model weights or grant access to a paid API.
- Some old entries in the **Logs** page are only diagnostic summaries and cannot be fully restored without a corresponding session snapshot.
- This repository currently does not include a standalone `LICENSE` file. A public distribution license should be chosen before wider redistribution.

For bugs or feature requests, please open a [GitHub Issue](https://github.com/GreFir/AdaAssist-tool/issues).
