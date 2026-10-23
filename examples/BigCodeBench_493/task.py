from datetime import datetime
import random
import matplotlib.pyplot as plt

def task_func(epoch_milliseconds, teams=['Team1', 'Team2', 'Team3', 'Team4', 'Team5'], random_seed=0):
    """Simulate daily team performance from the given timestamp until today.

    Return (performance_data, fig): a dictionary mapping each team to a
    sequence of floats in [0.1, 1.0], plus a matplotlib Figure containing
    one line per team. X axis: days since the start date; Y axis: Performance.
    The random_seed argument makes outputs reproducible.
    """
    raise NotImplementedError
