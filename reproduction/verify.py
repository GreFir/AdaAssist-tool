"""Offline integrity checks for the curated paper material; Python 3.11+, stdlib only."""

import hashlib
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    manifest = ROOT / "SHA256SUMS.txt"
    checked = set()
    for line in manifest.read_text(encoding="utf-8").splitlines():
        expected, name = line.split("  ", 1)
        path = (ROOT / name).resolve()
        require(path.is_relative_to(ROOT), f"Path outside reproduction directory: {name}")
        require(name not in checked, f"Duplicate checksum entry: {name}")
        require(hashlib.sha256(path.read_bytes()).hexdigest() == expected, f"Checksum mismatch: {name}")
        checked.add(name)
    actual = {
        p.relative_to(ROOT).as_posix()
        for p in ROOT.rglob("*")
        if p.is_file() and p != manifest and "__pycache__" not in p.parts
    }
    require(actual == checked, f"Checksum coverage mismatch: {sorted(actual ^ checked)}")
    print(f"OK: {len(checked)} curated file checksums")

    for path in ROOT.rglob("*.json"):
        read_json(path)
    for path in ROOT.rglob("*.jsonl"):
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            if line.strip():
                json.loads(line)
    print("OK: JSON/JSONL syntax")

    datasets = ROOT / "artifacts/datasets"
    expected_ids = {
        "humaneval": {f"Python/{i}" for i in range(164)},
        "mbpp": {f"MBPP/{i}" for i in range(11, 511)},
    }
    bcb_ids = None
    for name, count in (("humaneval", 164), ("mbpp", 500), ("bigcodebench150", 150)):
        data = read_json(datasets / f"task_ids_{name}.json")
        ids = data["task_ids"]
        require(data["count"] == len(ids) == len(set(ids)) == count, f"Invalid task count: {name}")
        if name in expected_ids:
            require(set(ids) == expected_ids[name], f"Unexpected task IDs: {name}")
        else:
            bcb_ids = set(ids)
    splits = [json.loads(line) for line in (datasets / "bigcodebench150_split_methods.jsonl").read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    require(len(splits) == 150 and {row["task_id"] for row in splits} == bcb_ids, "BCB split task IDs mismatch")
    for row in splits:
        public = row["public_test_methods"]
        hidden = row["hidden_test_methods"]
        require(len(public) == 1 and len(hidden) > 0, f"Invalid split: {row['task_id']}")
        require(len(hidden) == len(set(hidden)), f"Duplicate hidden methods: {row['task_id']}")
        require(not set(public) & set(hidden), f"Overlapping split: {row['task_id']}")
    print("OK: 164/500/150 unique task IDs and 150 disjoint BCB method splits")

    intervention = read_json(ROOT / "configs/intervention.json")
    reused_tasks = read_json(ROOT / intervention["task_ids"])
    reused_ids = reused_tasks["task_ids"]
    require(reused_tasks["count"] == len(reused_ids) == len(set(reused_ids)) == 20, "Invalid reused intervention task count")
    require(set(reused_ids) <= bcb_ids, "Intervention tasks outside the frozen BCB sample")
    print("OK: 20 intervention tasks belong to the fixed BCB sample")

    deepseek = read_json(ROOT / "configs/deepseek.json")
    qwen = read_json(ROOT / "configs/qwen.json")
    require(deepseek["sampling"]["max_output_tokens"] == qwen["sampling"]["max_output_tokens"] == 512, "Backend output budgets must be 512")
    require(all(method["max_output_tokens"] == 512 for method in deepseek["methods"]), "DeepSeek methods must all use 512 output tokens")
    require(len(deepseek["reported_results"]) == 15, "Expected five methods across three DeepSeek models")
    print("OK: final backend output budgets and result matrix")
    print("Integrity checks passed. This checks configuration artifacts; it does not run experiments or recompute paper results.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
