"""Regression tests for structured unittest evaluation."""
import ast
import unittest

from src.executor.unittest_adapter import evaluate_unittest_tests


class AdapterTests(unittest.TestCase):
    def evaluate(self, source, implementation="def solve(x):\n    return x"):
        namespace = {}
        exec(implementation, namespace, namespace)
        tree = ast.parse(source)
        classes = [node.name for node in tree.body if isinstance(node, ast.ClassDef)]
        return evaluate_unittest_tests(compile(tree, "<tests>", "exec"), namespace, classes)

    def test_explicit_runner_with_failure_wrapper(self):
        script = """
import unittest
import io
class Tests(unittest.TestCase):
    def test_pass(self):
        self.assertEqual(solve(1), 1)
    def test_fail(self):
        self.assertEqual(solve(2), 3)
stream = io.StringIO()
result = unittest.TextTestRunner(stream=stream).run(
    unittest.defaultTestLoader.loadTestsFromTestCase(Tests))
if not result.wasSuccessful():
    raise RuntimeError(stream.getvalue())
"""
        result = self.evaluate(script)
        self.assertFalse(result["passed"])
        self.assertEqual(result["test_summary"]["total"], 2)
        self.assertEqual(result["test_summary"]["passed"], 1)
        self.assertEqual(len(result["test_results"]), 2)
        self.assertTrue(any(row["source"] == "Tests.test_fail" for row in result["failed_tests"]))

    def test_declarative_testcase_without_runner(self):
        script = """
import unittest
class Cases(unittest.TestCase):
    def setUp(self):
        self.value = solve(4)
    def test_one(self):
        self.assertEqual(self.value, 4)
    def test_two(self):
        self.assertTrue(self.value > 0)
"""
        result = self.evaluate(script)
        self.assertTrue(result["passed"])
        self.assertEqual(result["test_summary"]["passed"], 2)

    def test_setup_error_reported_per_case(self):
        script = """
import unittest
class Cases(unittest.TestCase):
    def setUp(self):
        raise ValueError("broken fixture")
    def test_one(self):
        pass
    def test_two(self):
        pass
"""
        result = self.evaluate(script)
        self.assertEqual(result["test_summary"]["failed"], 2)
        self.assertEqual({row["error_type"] for row in result["failed_tests"]}, {"ValueError"})

    def test_no_cases_raises(self):
        with self.assertRaises(ValueError):
            self.evaluate("class Other:\n    pass")


if __name__ == "__main__":
    unittest.main()
