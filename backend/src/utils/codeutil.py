import ast
import re
from dataclasses import dataclass
from typing import Any


def normalize_tokenizer_artifacts(text: str) -> str:
    """Restore byte-level BPE display markers without removing any content."""
    return (
        text
        .replace("Ġ", " ")
        .replace("Ċ", "\n")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
    )

def find_all_occurrences(text: str, sub: str):
    positions = []
    start = 0
    while True:
        idx = text.find(sub, start)
        if idx == -1:
            break
        positions.append(idx)
        start = idx + len(sub)
    return positions

def remove_last_row(code: str) -> str:
    lines = code.split("\n")
    if not lines:
        return code
    return "\n".join(lines[:-1])

def _normalize_indentation(code_block: str) -> str:
    """Normalize transport artifacts without changing Python indentation.

    Older versions rewrote every run of two, three, or four spaces. Besides
    changing string literals, that could turn six-space indentation into eight
    spaces and make otherwise valid model output fail to compile.
    """
    return normalize_tokenizer_artifacts(code_block)

def _trim_to_compilable(code_block: str) -> str:
    candidate = code_block.strip()
    while candidate:
        try:
            compile(candidate, "", "exec")
            return candidate
        except Exception:
            candidate = remove_last_row(candidate)
    return ""

def _extract_fenced_blocks(text: str) -> list[str]:
    if "```" not in text:
        return []

    blocks: list[str] = []
    split_list = find_all_occurrences(text, "```")
    for index in range(len(split_list) // 2):
        left = split_list[2 * index]
        right = split_list[2 * index + 1]
        code_block = text[left:right].strip()
        body = "\n".join(code_block.split("\n")[1:])
        if body.strip():
            blocks.append(body)

    if len(split_list) % 2 != 0:
        dangling = text[split_list[-1]:].strip()
        body = "\n".join(dangling.split("\n")[1:])
        if body.strip():
            blocks.append(body)

    return blocks

def ffilter(code_block: str) -> str:
    code_block = _normalize_indentation(code_block)

    code_block = code_block.split('if __name__ == "__main__":')[0]
    code_block = code_block.split("if __name__ == '__main__':")[0]

    lines = code_block.split("\n")
    new_lines = []
    for line in lines:
        s = line.strip()
        if not (
            s.startswith("print")
            or s.startswith("input")
            or s.startswith("assert")
            or s.startswith("unittest")
        ):
            new_lines.append(line)

    return "\n".join(new_lines).strip()

def preprocess(code: str) -> str:
    code = code.replace("Ġ", " ").replace("Ċ", "\n")
    code_blocks = []

    if "```" in code:
        split_list = find_all_occurrences(code, "```")

        # Handle a def block that appears before the first code fence.
        first_fence = split_list[0]
        def_pos = code.find("def ")
        if def_pos != -1 and def_pos < first_fence:
            code_block = code[def_pos:first_fence].strip()
            code_block = ffilter(code_block)

            while code_block:
                try:
                    compile(code_block, "", "exec")
                    break
                except Exception:
                    code_block = remove_last_row(code_block)

            if code_block:
                code_blocks.append(code_block)

            rest_code = code[first_fence:].split("\n")
            if not (len(rest_code) >= 2 and rest_code[1].startswith("def")):
                split_list.pop(0)

        # Handle paired ```...``` fences.
        for i in range(len(split_list) // 2):
            left = split_list[2 * i]
            right = split_list[2 * i + 1]
            code_block = code[left:right].strip()
            code_block = "\n".join(code_block.split("\n")[1:])  # Remove ```python.
            code_block = ffilter(code_block)
            if code_block:
                code_blocks.append(code_block)

        # Handle an incomplete trailing fence.
        if len(split_list) % 2 != 0:
            code_block = code[split_list[-1]:].strip()
            code_block = "\n".join(code_block.split("\n")[1:])
            code_block = ffilter(code_block)
            if code_block:
                code_blocks.append(code_block)

        return "\n\n".join(code_blocks).strip()

    return ffilter(code).strip()


def diagnose_code_output(code: str) -> str:
    """Explain why a model response could not be used as runnable Python code."""
    raw = code.strip()
    if not raw:
        return "the model response was empty"
    cleaned = preprocess(raw)
    if not cleaned:
        if "```" in raw:
            return "the response contained a code fence, but no usable Python remained after extraction"
        return "the response contained prose or unsupported statements, but no usable Python code"
    try:
        ast.parse(cleaned)
    except SyntaxError as exc:
        return f"the extracted Python has invalid syntax ({exc.msg} on line {exc.lineno})"
    if not any(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) for node in ast.parse(cleaned).body):
        return "the response did not define a function or class for the requested task"
    return "the response could not be converted into runnable Python code"

@dataclass(frozen=True)
class TestCodeNormalization:
    """Result of converting a model response into runnable assert tests."""

    code: str = ""
    reason_code: str = ""
    message: str = ""
    line: int | None = None
    column: int | None = None
    candidate_count: int = 0

    def diagnostic(self) -> dict[str, Any]:
        return {
            "reason_code": self.reason_code,
            "message": self.message,
            "line": self.line,
            "column": self.column,
            "candidate_count": self.candidate_count,
        }


def _is_main_guard(node: ast.If) -> bool:
    if not isinstance(node.test, ast.Compare):
        return False
    try:
        expression = ast.unparse(node.test).replace(" ", "")
    except Exception:
        return False
    return expression in {'__name__=="__main__"', "__name__=='__main__'"}


def _test_candidates(code: str) -> list[str]:
    normalized = _normalize_indentation(code).strip()
    normalized = (
        normalized
        .replace("&lt;FUNCTION&gt;", "<FUNCTION>")
        .replace("&lt;/FUNCTION&gt;", "</FUNCTION>")
    )
    if not normalized:
        return []

    candidates: list[str] = []

    def add(candidate: str) -> None:
        cleaned = re.sub(r"^\s*</?FUNCTION>\s*$", "", candidate, flags=re.MULTILINE).strip()
        if cleaned and cleaned not in candidates:
            candidates.append(cleaned)

    # Prefer explicitly delimited sections, then try the complete response.
    for match in re.finditer(r"```(?:python|py)?\s*\n?([\s\S]*?)```", normalized, flags=re.IGNORECASE):
        add(match.group(1))
    for match in re.finditer(r"<FUNCTION>\s*([\s\S]*?)\s*</FUNCTION>", normalized, flags=re.IGNORECASE):
        add(match.group(1))
    add(normalized)

    statement_start = re.compile(
        r"^(?:async\s+def\s+|def\s+|class\s+|assert\s+|from\s+|import\s+|"
        r"with\s+|for\s+|try\s*:|[A-Za-z_][A-Za-z0-9_]*\s*=)"
    )
    for candidate in list(candidates):
        lines = candidate.splitlines()
        for index, line in enumerate(lines):
            if statement_start.match(line.strip()):
                add("\n".join(lines[index:]))
                break
    return candidates


def _without_unsupported_statements(statements: list[ast.stmt]) -> list[ast.stmt]:
    return [
        node
        for node in statements
        if not isinstance(node, (ast.Import, ast.ImportFrom, ast.Return, ast.Global, ast.Nonlocal))
        and not (isinstance(node, ast.If) and _is_main_guard(node))
        and not (
            isinstance(node, ast.Expr)
            and isinstance(node.value, ast.Call)
            and isinstance(node.value.func, ast.Name)
            and node.value.func.id in {"print", "input"}
        )
    ]


def _normalized_test_tree(tree: ast.Module, target_symbols: set[str]) -> tuple[str, str]:
    framework_names = {
        node.id
        for node in ast.walk(tree)
        if isinstance(node, ast.Name) and node.id in {"pytest", "unittest"}
    }
    if framework_names:
        return "", "it used a test framework instead of plain assert statements"

    definitions = {
        node.name
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
    }
    redefined = definitions & target_symbols
    if redefined:
        return "", "it redefined the candidate symbol(s): " + ", ".join(sorted(redefined))

    direct = _without_unsupported_statements(tree.body)
    assertion_functions = [
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name not in target_symbols
        and any(isinstance(child, ast.Assert) for child in ast.walk(node))
    ]
    if any(isinstance(node, ast.Assert) for node in direct):
        statements = direct
    elif assertion_functions:
        statements = []
        for function in assertion_functions:
            statements.extend(_without_unsupported_statements(function.body))
    elif any(isinstance(child, ast.Assert) for node in direct for child in ast.walk(node)):
        statements = direct
    else:
        statements = []

    if not statements or not any(isinstance(child, ast.Assert) for node in statements for child in ast.walk(node)):
        return "", "it did not contain executable assert statements"

    rendered = "\n".join(ast.unparse(node) for node in statements).strip()
    try:
        compile(rendered, "<generated-tests>", "exec")
    except SyntaxError as exc:
        return "", f"the normalized Python was not executable ({exc.msg})"
    return rendered, ""


def normalize_test_output(code: str, *, target_symbols: list[str] | None = None) -> TestCodeNormalization:
    """Extract runnable tests from prose, Markdown, or function-wrapped output."""
    candidates = _test_candidates(code)
    if not candidates:
        return TestCodeNormalization(
            reason_code="empty_response",
            message="the model response was empty",
            candidate_count=0,
        )

    target_set = set(target_symbols or [])
    first_syntax_error: SyntaxError | None = None
    semantic_errors: list[str] = []
    for candidate in candidates:
        compilable = _trim_to_compilable(candidate)
        if not compilable:
            try:
                ast.parse(candidate)
            except SyntaxError as exc:
                if first_syntax_error is None:
                    first_syntax_error = exc
            continue
        try:
            tree = ast.parse(compilable)
        except SyntaxError as exc:
            if first_syntax_error is None:
                first_syntax_error = exc
            continue
        normalized, error = _normalized_test_tree(tree, target_set)
        if normalized:
            return TestCodeNormalization(code=normalized, candidate_count=len(candidates))
        if error and error not in semantic_errors:
            semantic_errors.append(error)

    if semantic_errors:
        message = semantic_errors[0]
        if message.startswith("it redefined"):
            reason_code = "redefined_target"
        elif "test framework" in message:
            reason_code = "unsupported_framework"
        else:
            reason_code = "missing_assert"
        return TestCodeNormalization(
            reason_code=reason_code,
            message=message,
            candidate_count=len(candidates),
        )
    if first_syntax_error is not None:
        return TestCodeNormalization(
            reason_code="invalid_syntax",
            message=(
                "the generated Python was not valid syntax "
                f"({first_syntax_error.msg} on line {first_syntax_error.lineno})"
            ),
            line=first_syntax_error.lineno,
            column=first_syntax_error.offset,
            candidate_count=len(candidates),
        )
    return TestCodeNormalization(
        reason_code="unusable_output",
        message="the response was not usable Python test code",
        candidate_count=len(candidates),
    )


def preprocess_tests(code: str, *, target_symbols: list[str] | None = None) -> str:
    """Compatibility wrapper for callers expecting only normalized test code."""
    return normalize_test_output(code, target_symbols=target_symbols).code


def diagnose_test_output(code: str, *, target_symbols: list[str] | None = None) -> str:
    """Compatibility wrapper for callers expecting a diagnostic string."""
    return normalize_test_output(code, target_symbols=target_symbols).message
