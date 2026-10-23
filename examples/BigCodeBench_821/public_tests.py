import time

start = time.perf_counter()
result = task_func(0.05, 3)
elapsed = time.perf_counter() - start
assert result == ['Delay in thread 0 completed', 'Delay in thread 1 completed', 'Delay in thread 2 completed']
assert 0.13 <= elapsed < 2.0, f'Expected approximately 0.15s, got {elapsed:.3f}s'
assert task_func(0.01, 0) == []
