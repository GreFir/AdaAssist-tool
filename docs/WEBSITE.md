# AdaAssist research website

Source repository: https://github.com/GreFir/AdaAssist-tool
Expected site URL: https://grefir.github.io/AdaAssist-tool/

## Publish

1. Merge the website pull request into main.
2. Open repository Settings > Pages and set Build and deployment > Source to GitHub Actions.
3. Run the Deploy AdaAssist research website workflow (or wait for the automatic push-triggered run).
4. Once deployment succeeds, open the expected URL above.

Repository Settings may require administrative access; committing the workflow does not automatically activate Pages.

## Preview locally

From the repository root, run: `python -m http.server 8000 --directory docs`
Then open http://localhost:8000/

## Before public release

- Link an intentionally released, verified paper PDF or DOI when available.
- Link the finalized demonstration video only when it is published and verified.
- Publish a VSIX Release if a direct installer is desired.
- Recheck the experimental results against the final manuscript before changing claims.
- Replace the labeled illustrative interface concept with an actual approved screenshot if desired.

The Auto/Interactive webpage toggle is an illustrative, non-executable preview. It does not run the VS Code backend or execute tests.

Project documents: [README](../README.md), [installation](INSTALLATION.md), [research notes](RESEARCH.md).
