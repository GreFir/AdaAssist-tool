import time

start = time.monotonic()
result = task_func(delay_time=0.02, num_threads=3)
elapsed = time.monotonic() - start
assert result == ['Delay in thread 0 completed', 'Delay in thread 1 completed', 'Delay in thread 2 completed']
assert elapsed >= 0.02
assert task_func(delay_time=0, num_threads=0) == []
