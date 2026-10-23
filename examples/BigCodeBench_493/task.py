from datetime import datetime
import random
import matplotlib.pyplot as plt

def task_func(epoch_milliseconds, teams=['Team1','Team2','Team3','Team4','Team5'], random_seed=0):
    """Return (dict of daily performance values, matplotlib Figure).

    For every day from epoch_milliseconds to the current day, generate
    random performance floats in [0.1, 1.0] per team, seeded by
    random_seed. Plot a labeled line for each team.
    """
    raise NotImplementedError
