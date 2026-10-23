import time
import threading

def task_func(delay_time: float = 1.0, num_threads: int = 5):
    """Delay in separate threads, then return completion messages.

    Expected message format: 'Delay in thread x completed'.
    Return one message per thread in ascending index order.
    """
    raise NotImplementedError
