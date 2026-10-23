# Plugin-ready examples

These seven beginner-friendly task stubs are adapted from sample BigCodeBench task descriptions. They include **simplified public tests for interactive exploration** rather than the complete original public or hidden benchmark tests. They do not reproduce reported experimental outcomes.

## Import into AdaAssist

1. Open this repository as your VS Code workspace.
2. Install and configure AdaAssist, including its Python environment and model endpoint.
3. In the task composer, select **Import example from workspace**.
4. Choose an example directory. The extension loads its `task.py` into the requirement composer and its `public_tests.py` into the editable test card.
5. Review the content, select **Auto** or **Interactive**, and press **Send**.

Each folder is under `examples/` (two levels below the workspace root), within the extension's scan limit. Files are named exactly `task.py` and `public_tests.py`. No example runs automatically on import.

| Directory | Task | Extra Python packages |
| --- | --- | --- |
| `BigCodeBench_1034` | Sales comparison chart and Euclidean distance | numpy, pandas, matplotlib |
| `BigCodeBench_1086` | Randomly generated structured DataFrame | numpy, pandas |
| `BigCodeBench_175` | Video like-ratio bar chart | pandas, matplotlib |
| `BigCodeBench_292` | Groupwise feature scaling and histogram | numpy, pandas, scikit-learn |
| `BigCodeBench_327` | CSV regular-expression token counts | Python standard library |
| `BigCodeBench_493` | Daily team performance line chart | matplotlib |
| `BigCodeBench_821` | Thread delays and ordered completion messages | Python standard library |

Install additional libraries in the Python environment used by the backend, for example:

```bash
python -m pip install numpy pandas matplotlib scikit-learn
```

These are coding tasks: the provided `task.py` files intentionally raise `NotImplementedError`, and the tests are expected to fail before a solution is generated. The tests are not exhaustive; passing them does not establish full correctness. Some tasks generate matplotlib figures, which may require a headless plotting backend in automated environments.

[Watch the tool demonstration](https://www.youtube.com/watch?v=YfQ5a4ThXE4) · [Back to main README](../README.md)
