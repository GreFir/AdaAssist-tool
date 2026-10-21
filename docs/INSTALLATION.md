# Installation, configuration & troubleshooting

[← Back to README](../README.md) · [中文快速安装](README.zh-CN.md)

## VSIX installation (recommended)

1. Download the `adaassist-<version>.vsix` asset from a published [GitHub Release](https://github.com/GreFir/AdaAssist-tool/releases).
2. In VS Code 1.110.0+, open **Extensions → ··· → Install from VSIX…**, choose the file and reload when requested.
3. Look for **AdaAssist** in the Activity Bar, or use the Command Palette → `AdaAssist: Open Chat`.

Alternatively, run `code --install-extension /path/to/adaassist-<version>.vsix`.

If there is not yet a published release, use a successful build from the [VSIX Actions workflow](https://github.com/GreFir/AdaAssist-tool/actions/workflows/package-vsix.yml) (download and unzip its artifact), or [build locally](DEVELOPMENT.md#package-the-vsix-locally).

The VSIX packages the TypeScript extension, its Webview assets, the Python backend **source**, and necessary runtime JavaScript packages. It does **not** install an OS-level Python runtime, Python dependencies, a GPU model, or a hosted API subscription. The Microsoft **Python Environments** extension is listed as an extension dependency; an offline VSIX install may need that extension installed separately.

## Python runtime setup

AdaAssist starts its FastAPI backend using the interpreter selected in **Settings → Environment → Select Python Interpreter**. The **same interpreter** must have the packages required by the backend.

### Quick setup in an existing Python 3.12+ environment

If you already have a Python or Conda environment for the project, activate it, then run:

```bash
python -m pip install fastapi uvicorn openai requests anthropic google-genai
```

This minimal command installs the application-level runtime dependencies for its supported model clients. For **exact repository-pinned versions** during development or an experiment, use the bundled `backend/requirements.txt` from a source checkout instead.

### Dedicated virtual environment (optional, recommended)

**Windows PowerShell:**

```powershell
py -3.12 -m venv "$env:USERPROFILE\.adaassist-venv"
& "$env:USERPROFILE\.adaassist-venv\Scripts\python.exe" -m pip install fastapi uvicorn openai requests anthropic google-genai
```

In Settings → Environment, select `%USERPROFILE%\.adaassist-venv\Scripts\python.exe` (or browse to its actual location).

**Linux/macOS:**

```bash
python3.12 -m venv ~/.adaassist-venv
~/.adaassist-venv/bin/python -m pip install fastapi uvicorn openai requests anthropic google-genai
```

Then select `~/.adaassist-venv/bin/python` in the interpreter picker.

Alternatively, use an existing Conda environment. For an externally managed system Python, use a virtual environment rather than modifying system packages.

After choosing the interpreter, click **Check Environment**. AdaAssist starts the bundled FastAPI backend on `127.0.0.1:8765` when required. This port can be configured through VS Code settings, but should usually be left at its default.

> **Important:** Selecting a Python interpreter in AdaAssist does not necessarily change the interpreter active in your VS Code terminal. Verify the interpreter path when checking or installing packages.

## Model configuration

Open **AdaAssist → Settings → Models**, then create or edit an LLM Profile.

| Provider | Base URL | Model | API Key |
| --- | --- | --- | --- |
| `openai` | Optional for official API | Model ID available to your account | Required |
| `claude` | Optional for official API | Claude model ID | Required |
| `ollama` | Typically `http://localhost:11434/v1` | Your pulled model name | Typically not needed |
| `vllm` | Your vLLM server's OpenAI-compatible `/v1` | Model ID served by vLLM | Depends on deployment |
| `other` | A compatible API URL | Provider-specific model ID | May be required |

The URLs above are **examples**, not working endpoints supplied by the project. AdaAssist does not host a model for you.

Set **Max Output Tokens** to control generation length across the workflow. It accepts 128–32768, with existing profiles defaulting to 1024. The limit cannot override your model or service's actual capabilities. Changes to a matching idle session can update the budget, but requests already running keep their prior settings.

Profile metadata is saved to `.vscode/adaassist-profiles.json` by default. API keys entered in the UI are stored in **VS Code Secret Storage**, not written into this file; for manually edited JSON use `apiKeyEnv` instead of putting a secret in source control.

**Inline completions are disabled by default and configured separately:** Settings → Completion controls the smaller Python suggestion model, automatic/manual triggering, debounce delay, and suggestion token limit. To manually trigger, use `Ctrl+Alt+Space` (macOS: `Cmd+Option+Space`) or `AdaAssist: Trigger Inline Completion`.

## Test format and code safety

Tests are Python code containing top-level `assert` statements:

```python
assert solve(1) == 2
assert solve(0) == 1
```

Do not paste pytest or unittest suites expecting their runners to be invoked. AdaAssist executes candidate Python code and tests **locally**. Do not run untrusted code with access to passwords, SSH keys, production data, or sensitive workspace files; use isolation for untrusted tasks.

## Common problems

### VSIX installed, but the backend does not start

- Confirm Python 3.12+ is installed and selected under **Settings → Environment**.
- Install packages into that interpreter, not a different global Python.
- Click **Check Environment** and open **AdaAssist → Logs → Open VS Code Output** for details.
- Check whether port **8765** is occupied by a stale backend and stop only the verified old process.
- If `adaassist.backendPath` was previously set manually, remove an invalid override so the bundled `backend/main.py` can be discovered.

### VS Code asks for Python Environments

The extension declares `ms-python.vscode-python-envs` as a dependency. Install it from the VS Code Marketplace if VS Code did not resolve it. An offline VSIX install does not automatically bundle that third-party extension.

### Model request fails or output is truncated

- Check the active Profile's provider, base URL, model, and API key.
- For Ollama/vLLM, start the model server before trying a workflow.
- A `OutputTokenLimitError` can indicate a model response exceeded `Max Output Tokens`; increase the Profile budget if the model supports it. The model's **context window** is separate from its output budget.
- If an old FastAPI process remains on port 8765, your new extension code may connect to the outdated backend.

### Tests cannot continue

In Interactive mode, generated tests can require review/confirmation before code generation. If a test editor is empty, supply top-level assertions or generate new tests and confirm them.

### Session restore is unavailable

The Logs view may contain a historical diagnostic entry without a full session JSON snapshot. Such an entry can be inspected but may not be recoverable. Restore full sessions from available snapshots; do not confuse diagnostic history with full workflow state.

### Updating an installed VSIX

Manually installed VSIX packages **do not automatically update by default**. Download a later release and install it again. VS Code normally retains extension settings and workspace files, but **back up important experiments** independently.

## Configuration reference

| Setting | Default | Notes |
| --- | --- | --- |
| `adaassist.pythonPath` | `auto` | Follow selected workspace Python or choose Conda/venv |
| `adaassist.backendPath` | `backend/main.py` | Bundled Python backend path |
| `adaassist.backendHost` | `127.0.0.1` | Local bind address |
| `adaassist.backendPort` | `8765` | FastAPI port |
| `adaassist.profileConfigPath` | `.vscode/adaassist-profiles.json` | Workspace model profile file |
| `adaassist.inlineCompletion.enabled` | `true` | Inline Python suggestions |
| `adaassist.inlineCompletion.triggerMode` | `automatic` | Or `manual` |
| `adaassist.inlineCompletion.debounceMs` | `700` | Typing idle debounce |
| `adaassist.inlineCompletion.maxTokens` | `192` | Output limit per inline suggestion |

See `package.json` for the full list of supported settings.
