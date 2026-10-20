# AdaAssist

AdaAssist is a VS Code extension for interactive Python code-generation workflows. It combines a TypeScript VS Code extension, a Webview UI, and a local FastAPI backend. The workflow can generate code, run top-level Python `assert` tests, produce repair plans, regenerate code from those plans, and let the user decide when to continue.

Version 0.0.10 presents workflow history as a compact conversation. The request and generated content stay visible; model configuration and internal status fields are omitted from the conversation, while diagnostics and execution details remain available in collapsed sections.

## Project Structure

```text
.
├── src/extension.ts          # VS Code extension host and backend orchestration
├── media/webview.js          # Webview frontend behavior
├── media/webview.css         # Webview styling
├── backend/main.py           # FastAPI backend entrypoint
├── backend/bridge.py         # Legacy stdin/stdout bridge
├── backend/src/              # LLM routing, workflow session, executor logic
├── package.json              # Extension package, commands, settings, scripts
└── .vscode/                  # Local launch/tasks/settings/profile examples
```

## Requirements

- VS Code `1.110.0` or newer.
- Node.js with npm.
- Python `3.12` or newer for the backend.
- An LLM endpoint:
  - OpenAI-compatible API.
  - OpenAI official API.
  - Claude.
  - Ollama OpenAI-compatible endpoint.
  - vLLM OpenAI-compatible endpoint.

## Environment Setup

Install the extension frontend dependencies from the project root:

```bash
npm install
npm run compile
```

Create the backend Python environment:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

On Windows, activate the virtual environment with:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If you use `uv`, the backend also contains `pyproject.toml` and `uv.lock`:

```bash
cd backend
uv sync
```

## Run In VS Code

1. Open this repository folder in VS Code.
2. Run `npm run compile` once, or let the launch task run `npm run watch`.
3. Press `F5` and choose `Run Extension`.
4. A new Extension Development Host window opens.
5. Open the AdaAssist activity bar item, or run `AdaAssist: Open Chat` from the Command Palette.

The extension normally starts the backend automatically using:

- `adaassist.pythonPath`
- `adaassist.backendPath`
- `adaassist.backendHost`
- `adaassist.backendPort`

For backend debugging, you can also start it manually:

```bash
cd backend
source .venv/bin/activate
python main.py --host 127.0.0.1 --port 8765
```

Then keep the same host and port in VS Code settings.

## LLM Profile Configuration

LLM profiles can be configured from the AdaAssist UI:

1. Click `Profiles`.
2. Create or edit a profile.
3. Set provider, base URL, model, and API key.
4. Click `Save Profile`.

Profiles are stored in `.vscode/adaassist-profiles.json` by default. You can open this file with `AdaAssist: Open Profile Config File` or the `Open Config` button.

Example:

```json
{
  "version": 1,
  "activeProfileId": "ollama-local",
  "profiles": [
    {
      "id": "ollama-local",
      "name": "Ollama Local",
      "provider": "ollama",
      "baseUrl": "http://localhost:11434/v1",
      "model": "qwen2.5-coder:7b"
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "provider": "openai",
      "baseUrl": "",
      "model": "gpt-5.4",
      "apiKeyEnv": "OPENAI_API_KEY"
    }
  ]
}
```

Notes:

- `provider` supports `other`, `openai`, `claude`, `ollama`, and `vllm`.
- `other`, `ollama`, and `vllm` require an OpenAI-compatible `baseUrl`.
- OpenAI and Claude can use their default official endpoints when `baseUrl` is empty.
- API keys entered in the UI are stored in VS Code Secret Storage.
- For file-based configuration, prefer `apiKeyEnv` instead of writing real API keys into JSON.
- 用户研究服务器默认使用 vLLM 的 OpenAI 兼容接口 `http://127.0.0.1:8003/v1`，模型名为 `deepseek-coder-33b-instruct`。如服务器地址不同，请在 profile 中替换；不要把 API key 写入仓库。

## Python Environment Discovery

AdaAssist's **Select Python Interpreter** command now lists local environments discovered
by the Microsoft **Python Environments** VS Code extension (including Conda,
virtual environments and installed Python versions). Use **Refresh Python
Environments** in the picker after installing a new interpreter. A manual
executable chooser remains available for environments not found by the provider.

- **Auto** follows the active interpreter selected in the VS Code workspace.
  If VS Code has none selected, AdaAssist falls back to local `.venv`
  candidates and then Python on `PATH`.
- Choosing an environment from the list saves its environment identity in
  `adaassist.pythonPath` so that reopening VS Code resolves it again.
- A manually selected executable path overrides automatic discovery.
- Selected interpreters must be able to import AdaAssist's backend requirements:
  `fastapi`, `uvicorn`, and `openai`. The settings **Check Environment**
  action reports missing packages and backend startup errors.

**Note:** The selected Python is currently used to launch AdaAssist's own
FastAPI backend. The selection does not change VS Code's Python interpreter,
and it is not yet a separate code-execution environment setting.

## VS Code Settings

Important settings:

| Setting | Purpose | Default |
| --- | --- | --- |
| `adaassist.pythonPath` | Python executable used to start the backend. Supports `${workspaceFolder}` and `${extensionPath}`. | `python3` |
| `adaassist.backendPath` | FastAPI backend entry file. | `backend/main.py` |
| `adaassist.backendHost` | Backend host. | `127.0.0.1` |
| `adaassist.backendPort` | Backend port. | `8765` |
| `adaassist.profileConfigPath` | LLM profile JSON file path. | `.vscode/adaassist-profiles.json` |
| `adaassist.baseUrl` | Legacy default base URL used when creating the first profile. | `http://127.0.0.1:8003/v1` |
| `adaassist.model` | Legacy default model used when creating the first profile. | `deepseek-coder-33b-instruct` |
| `adaassist.inlineCompletion.enabled` | Enables Python inline completion. | `true` |
| `adaassist.inlineCompletion.triggerMode` | `automatic` waits briefly after typing; `manual` only responds to a command or shortcut. | `automatic` |
| `adaassist.inlineCompletion.baseUrl` | Dedicated inline-completion endpoint, separate from the workflow profile. | `http://127.0.0.1:8004/v1` |
| `adaassist.inlineCompletion.model` | Dedicated small model for inline completion. | `deepseek-coder-6.7b-instruct` |
| `adaassist.inlineCompletion.debounceMs` | Delay before an automatic request; edits supersede stale requests. | `700` |
| `adaassist.inlineCompletion.maxTokens` | Maximum generated tokens for each inline suggestion. | `192` |

Set `adaassist.pythonPath` to your backend Python environment if automatic detection does not find it.

Inline completion uses a separate model configuration from the chat/workflow profile. Configure the workflow and inline-completion endpoints separately for your environment. When `adaassist.inlineCompletion.triggerMode` is `manual`, trigger a suggestion with `Ctrl+Alt+Space` (`Cmd+Option+Space` on macOS), the editor context menu, or `AdaAssist: Trigger Inline Completion` in the Command Palette. The status bar reports generation progress and completion metadata; results are discarded if the document or cursor changes before the request returns.

## Using AdaAssist

Open the AdaAssist chat view. The main workflow page contains:

- `Mode`: `Interactive Continue` or `Auto Full Workflow`.
- `LLM Profile`: the active model profile.
- `Startup Context`: whether future model calls reuse saved workflow context.

The header icons provide access to configuration and tests:

- `Profiles`: configure LLM provider, base URL, model, and API key.
- `Tests`: expand the single current Python test suite inline without leaving the workflow.

The test suite must be runnable Python code with top-level `assert` checks. The backend executes every top-level assertion independently, reports the pass rate and per-assertion status, and stores those results with the session. Assertions hidden inside helper functions follow normal Python behavior and stop at the first uncaught failure. Do not use `pytest`, `unittest`, or redefine the candidate solution inside the tests.

Basic usage:

1. Select the workflow mode and LLM profile.
2. Write the requirement in the prompt box.
3. Open `Tests` from the header icon, then paste tests or use `Generate Tests`.
4. Click `Send`.
5. In Interactive mode, review or generate the tests in the inline drawer, then continue.
6. In Auto mode, AdaAssist proceeds through the complete backend workflow without a review pause.

## Workflow Behavior

The selected mode is locked after a session starts to keep workflow behavior consistent throughout the task.

Interactive mode:

1. Confirm tests.
2. Generate and review the initial code before evaluation.
3. Edit code or tests at review points and retest the changed candidate.
4. Add a correction, constraint, or implementation direction in the composer; it is persisted and included in later code and plan prompts.
5. Provide an optional test-generation goal before generating tests.
6. If the run fails, choose `Next Step` to generate a repair plan, `Restart From Prompt`, or `End Here`.
7. Edit, save, or regenerate the plan before continuing to the next code attempt.

Repair planning is grounded in the original requirement, the current candidate code,
the reviewed test suite, and the complete latest failure (including its traceback).
The planner is instructed to produce 4–8 distinct implementation steps without
inventing validation rules or exhaustively listing unsupported edge cases. Plan-guided
regeneration receives the same failure state and the current failed code. Additional
directions sent during an Interactive session accumulate and are deduplicated.

Auto mode:

1. Use supplied tests, or generate a suite automatically when none was supplied.
2. Run code generation, evaluation, local lightweight fixes, planning, regeneration, and evaluation up to the configured retry limit without mid-step editing or guidance.
3. The main action button becomes `Stop` while the workflow is running and can request an operational interrupt after the current stage; resuming continues the same automatic condition.

## User-study records

When the open workspace is a prepared participant folder such as `AdaAssist-P01`, AdaAssist infers the participant ID and selected study task automatically. It writes durable research records under `adaassist-study-logs/` in that workspace:

- `events.jsonl` is an append-only stream of task lifecycle and submitted interaction events. Each record includes the participant, task, actual workflow condition, timestamp, artifact version, and the relevant code, test, plan, or instruction payload.
- `sessions/*.json` is the latest complete snapshot for each session. It retains workflow events, generated and edited tests, code, plans, evaluation results, iteration counts, and model timing/token metadata already returned by the backend.

`New Task` writes a final `task_end` event and session snapshot before deleting the in-memory backend session. If `记录表.csv` contains `Auto` or `Interactive` in its condition column, the assigned condition is also recorded and a mismatch produces a `protocol_deviation` event.

The header `Logs` button opens a separate visual diagnostic history. It keeps a redacted, workspace-scoped record of workflow stages, model timing and token totals, evaluation summaries, extension messages, and interaction event names across sessions. The history retains up to 1,000 entries for 30 days and never replaces or deletes the complete `adaassist-study-logs` research records. Use `Open VS Code Output` from that page for raw runtime output.

## Development Commands

```bash
npm run compile
npm run watch
npm run lint
npm test
```

Backend health check after the server starts:

```bash
curl http://127.0.0.1:8765/health
```

Expected response:

```json
{"ok":true}
```

## Troubleshooting

If `F5` does not open the Extension Development Host:

- Run `npm install`.
- Run `npm run compile` and fix TypeScript errors first.
- Make sure VS Code is opened at the repository root.
- Use the `Run Extension` launch configuration.

If the backend cannot start:

- Check that Python `3.12+` is available.
- Check that `backend/.venv` exists and dependencies are installed.
- Check `adaassist.pythonPath`.
- Check whether port `8765` is already in use.
- Open the `AdaAssist` output channel for backend logs.

If the LLM call fails with connection refused:

- Check the active profile base URL.
- For Ollama, make sure `ollama serve` is running.
- Make sure the model has been pulled, for example `ollama pull qwen2.5-coder:7b`.
- If using a proxy such as `localhost:8328`, make sure that proxy is running and exposes `/v1`.

If the workflow cannot continue after test review:

- The `Tests` editor cannot be empty.
- Paste manual tests or click `Generate Tests`.
- Generated tests must be reviewed and confirmed before code generation.
