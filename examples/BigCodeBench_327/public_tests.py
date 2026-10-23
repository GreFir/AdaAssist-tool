import csv
import os
import tempfile

with tempfile.TemporaryDirectory() as folder:
    path = os.path.join(folder, 'tokens.csv')
    with open(path, 'w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        writer.writerow(['apple', 'apple', '(pear)'])
    counts = task_func(path)
    assert isinstance(counts, dict)
    assert counts.get('apple', 0) >= 2
    assert counts.get('(pear)', 0) >= 1
