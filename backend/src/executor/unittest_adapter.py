"""Run unittest.TestCase suites and return AdaAssist's per-test evaluation schema.

A test script can contain an explicit unittest runner (including the common
raise RuntimeError on failure wrapper) or only TestCase definitions. Keep the
original setup/teardown and assertion semantics, without modifying user tests.
"""
from __future__ import annotations

import io
import traceback
import unittest
from unittest.mock import patch
from typing import Any


def evaluate_unittest_tests(
    compiled_tests: Any,
    namespace: dict[str, Any],
    test_classes: list[str],
) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    original_make_result = unittest.TextTestRunner._makeResult

    def make_result(runner: unittest.TextTestRunner) -> unittest.TestResult:
        result = original_make_result(runner)
        active: dict[int, dict[str, Any]] = {}
        original_start = result.startTest
        original_stop = result.stopTest

        def start(test: unittest.TestCase) -> None:
            active[id(test)] = {
                "index": 0,
                "source": f"{type(test).__name__}.{test._testMethodName}",
                "passed": True,
                "message": "",
            }
            original_start(test)

        def mark_failure(test: unittest.TestCase, exc: tuple, error_type: str) -> None:
            item = active.get(id(test))
            if item is None:
                return
            item.update({
                "passed": False,
                "message": str(exc[1]),
                "error_type": type(exc[1]).__name__ if exc[1] else error_type,
                "traceback": "".join(traceback.format_exception(*exc)),
            })

        def wrap_failure(name: str, error_type: str) -> None:
            original = getattr(result, name, None)
            if original is None:
                return

            def report(test: unittest.TestCase, exc: tuple) -> None:
                mark_failure(test, exc, error_type)
                original(test, exc)

            setattr(result, name, report)

        def stop(test: unittest.TestCase) -> None:
            item = active.pop(id(test), None)
            if item is not None:
                item["index"] = len(records) + 1
                records.append(item)
            original_stop(test)

        result.startTest = start
        result.stopTest = stop
        wrap_failure("addFailure", "AssertionError")
        wrap_failure("addError", "TestError")
        wrap_failure("addExpectedFailure", "ExpectedFailure")

        original_skip = getattr(result, "addSkip", None)
        if original_skip is not None:
            def skip(test: unittest.TestCase, reason: str) -> None:
                item = active.get(id(test))
                if item is not None:
                    item.update(passed=False, message=str(reason), error_type="SkipTest")
                original_skip(test, reason)
            result.addSkip = skip

        original_unexpected = getattr(result, "addUnexpectedSuccess", None)
        if original_unexpected is not None:
            def unexpected(test: unittest.TestCase) -> None:
                item = active.get(id(test))
                if item is not None:
                    item.update(passed=False, message="Unexpected success", error_type="UnexpectedSuccess")
                original_unexpected(test)
            result.addUnexpectedSuccess = unexpected

        original_subtest = getattr(result, "addSubTest", None)
        if original_subtest is not None:
            def subtest(test: unittest.TestCase, sub: unittest.TestCase, exc: tuple | None) -> None:
                if exc is not None:
                    mark_failure(test, exc, "SubTestFailure")
                original_subtest(test, sub, exc)
            result.addSubTest = subtest
        return result

    # The patch affects only the duration of this evaluation and is restored
    # even if an imported test or its runner throws.
    with patch.object(unittest.TextTestRunner, "_makeResult", make_result):
        try:
            namespace.setdefault("__name__", "__adaassist_tests__")
            exec(compiled_tests, namespace, namespace)
        except (AssertionError, RuntimeError):
            # BigCodeBench-style wrappers deliberately raise after a failing
            # suite. Its recorded per-test outcomes are the real verdict.
            if not records or all(item["passed"] for item in records):
                raise

        if not records:
            # Plain TestCase definitions without an explicit runner.
            suite = unittest.TestSuite()
            for name in test_classes:
                candidate = namespace.get(name)
                if isinstance(candidate, type) and issubclass(candidate, unittest.TestCase):
                    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(candidate))
            if suite.countTestCases():
                unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(suite)

    if not records:
        raise ValueError("No unittest test cases were executed.")

    passed_count = sum(item["passed"] for item in records)
    failed = [item for item in records if not item["passed"]]
    total = len(records)
    summary = {
        "total": total,
        "passed": passed_count,
        "failed": len(failed),
        "pass_rate": passed_count / total,
    }
    if failed:
        first = failed[0]
        return {
            "passed": False,
            "stage": "exec_tests",
            "error_type": first.get("error_type", "TestFailure"),
            "error": f"{len(failed)} of {total} unittest test(s) failed: "
                     + "; ".join(f"{item['source']}: {item.get('message', '')}" for item in failed),
            "traceback": first.get("traceback"),
            "failed_test": first["source"],
            "failed_tests": failed,
            "test_summary": summary,
            "test_results": records,
        }
    return {
        "passed": True,
        "stage": "pass",
        "error_type": None,
        "error": None,
        "traceback": None,
        "test_summary": summary,
        "test_results": records,
    }
