# Developer guide

[← README](../README.md) · [VSIX installation](INSTALLATION.md) · [Research artifacts](RESEARCH.md)

## Repository structure

```text
src/extension.ts             Extension host, commands, backend orchestration
src/pythonEnvironments.ts    Python interpreter discovery
src/sessionSnapshots.ts      Saved Session state
media/                      Webview HTML/CSS/JS assets
backend/main.py              Local FastAPI backend
backend/src/                 LLM routing, generation, testing, repair
backend/requirements.txt     Pinned Python backend dependencies
.github/workflows/           VSIX build and release automation
```

## Local development

Requirements: Node.js 22, npm, VS Code 1.110.0+, and Python 3.12+.

```bash
git clone https://github.com/GreFir/AdaAssist-tool.git
cd AdaAssist-tool
npm ci
npm run compile
npm run lint
```

Open the repository folder in VS Code and press **F5** to start the Extension Development Host. Fix compiler errors before debugging extension activation.

Prepare an optional pinned Python backend environment.

**Linux / macOS:**

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

**Windows PowerShell:**

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Normally the extension starts the FastAPI backend automatically. To troubleshoot manually from the backend directory, run `python main.py --host 127.0.0.1 --port 8765`. Its health route is `http://127.0.0.1:8765/health`.

## Package a VSIX locally

From the root directory:

```bash
npm ci
npm run package:vsix
```

This builds the TypeScript host and runs the VS Code extension packager. It produces a versioned file such as `adaassist-1.0.0.vsix`, based on the current version in `package.json`.

Install it with the VS Code Extensions menu, or:

```bash
code --install-extension adaassist-1.0.0.vsix
```

Replace the filename with your actual package name.

The VSIX contains compiled extension JavaScript, media assets, production JavaScript libraries, and bundled Python **source**. It does NOT ship platform-specific Python virtual environments, a Python interpreter, or model weights. Do not exclude backend files or production JavaScript dependencies in `.vscodeignore`.

## CI and tagged releases

The [VSIX workflow](../.github/workflows/package-vsix.yml) builds on pull requests, main-branch pushes, version-tag pushes, and manual runs:

1. Install JavaScript dependencies with `npm ci`, check Python backend syntax, lint TypeScript, and package the VSIX.
2. Inspect the VSIX archive for required runtime JS, Python backend, and media assets.
3. Upload an Actions artifact named `adaassist-vsix` plus `SHA256SUMS.txt`.
4. Publish a GitHub Release **only** on a matching version tag or on an explicitly marked `main` commit containing `[publish-vsix]`, once the package job passes. The release job uses `package.json` to resolve the tag, and will skip an already published version.

There is no requirement to publish to VS Code Marketplace.

To publish normally, first merge all intended code into `main`, update both `package.json` and `package-lock.json`, and add a matching `CHANGELOG.md` entry. Then create and push the new version tag:

```bash
git switch main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

Alternatively, a **maintainer-authorized release merge** with `[publish-vsix]` in the resulting `main` commit message publishes and creates the version tag automatically (used for the initial v1.0.0 release). Do not add the marker to ordinary commits.

Always verify the publish workflow succeeded and that `adaassist-<version>.vsix` and `SHA256SUMS.txt` appear in the release Assets before announcing availability.

## Testing

```bash
npm run compile
npm run lint
npm test
```

For Python backend unit tests, install its requirements, then:

```bash
cd backend
python -m unittest discover -s tests -v
```

The VS Code extension test runner may need a desktop/display environment. CI packages and validates static assets but cannot replace manual **F5** testing of extension Webviews and LLM workflows.

Before releasing, test VSIX installation, Python interpreter discovery, model configuration, test generation/review, Auto/Interactive execution, token budgets, logging, and Session restoration.

## Notes

- Never commit API keys, secrets, large model files, or participant study records.
- Keep `backend/.venv/` excluded from packaging; it is platform-dependent.
- Keep `node_modules/markdown-it` and `node_modules/@highlightjs/cdn-assets` available in VSIX: the Webview loads those assets.
- Treat Python execution as code execution, not a sandbox for arbitrary untrusted code.
