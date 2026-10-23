import time
import threading

def task_func(delay_time: float = 1.0, num_threads: int = 5):
    """Run num_threads delays and return completion messages in index order.

    Each worker sleeps delay_time seconds and produces the string
    'Delay in thread x completed' for its zero-based index x.
    Delays should accumulate sequentially rather than run concurrently.
    With zero threads, return an empty list.
    """
    raise NotImplementedError
