import csv
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / 'sample.csv'
    with path.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.writer(stream)
        writer.writerow(['alpha'])
        writer.writerow(['beta'])
        writer.writerow(['alpha'])
    result = task_func(str(path))
    assert isinstance(result, dict)
    assert result.get('alpha', 0) >= 2
    assert result.get('beta', 0) >= 1
