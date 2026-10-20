from __future__ import annotations

import unittest

from src.utils import normalize_test_output, preprocess_tests


class NormalizeTestOutputTests(unittest.TestCase):
    def test_accepts_markdown_and_function_wrapper(self) -> None:
        raw = """Here are the tests:
```python
def check(bubble_sort):
  value = "keeps  double spaces"
  assert value == "keeps  double spaces"
  assert bubble_sort([2, 1]) == [1, 2]
```
"""

        result = normalize_test_output(raw, target_symbols=["bubble_sort"])

        self.assertEqual(result.reason_code, "")
        self.assertNotIn("def check", result.code)
        self.assertIn("keeps  double spaces", result.code)
        self.assertIn("assert bubble_sort([2, 1]) == [1, 2]", result.code)
        compile(result.code, "<test>", "exec")

    def test_accepts_function_tags_and_multiple_test_functions(self) -> None:
        raw = """<FUNCTION>
def test_empty():
    assert normalize_whitespace("") == ""

def test_runs():
      assert normalize_whitespace("a   b") == "a b"
</FUNCTION>"""

        code = preprocess_tests(raw, target_symbols=["normalize_whitespace"])

        self.assertIn("assert normalize_whitespace('') == ''", code)
        self.assertIn("assert normalize_whitespace('a   b') == 'a b'", code)
        compile(code, "<test>", "exec")

    def test_removes_imports_main_guard_and_prints(self) -> None:
        raw = """from your_module import solve
assert solve(1) == 2
print("done")
if __name__ == "__main__":
    print("run")
"""

        code = preprocess_tests(raw, target_symbols=["solve"])

        self.assertEqual(code, "assert solve(1) == 2")

    def test_preserves_asserts_nested_in_top_level_control_flow(self) -> None:
        raw = """cases = [(1, 2)]
for actual, expected in cases:
    assert solve(actual) == expected
"""

        code = preprocess_tests(raw, target_symbols=["solve"])

        self.assertIn("for actual, expected in cases:", code)
        self.assertIn("assert solve(actual) == expected", code)
        compile(code, "<test>", "exec")

    def test_rejects_target_redefinition_with_structured_diagnostic(self) -> None:
        result = normalize_test_output(
            "def solve(value):\n    return value\nassert solve(1) == 1",
            target_symbols=["solve"],
        )

        self.assertEqual(result.code, "")
        self.assertEqual(result.reason_code, "redefined_target")
        self.assertIn("solve", result.message)

    def test_reports_syntax_location(self) -> None:
        result = normalize_test_output("assert solve(1) ==")

        self.assertEqual(result.code, "")
        self.assertEqual(result.reason_code, "invalid_syntax")
        self.assertEqual(result.line, 1)
        self.assertIsNotNone(result.column)

    def test_rejects_pytest_framework(self) -> None:
        result = normalize_test_output(
            "import pytest\nwith pytest.raises(ValueError):\n    solve(None)\nassert True"
        )

        self.assertEqual(result.reason_code, "unsupported_framework")


if __name__ == "__main__":
    unittest.main()
