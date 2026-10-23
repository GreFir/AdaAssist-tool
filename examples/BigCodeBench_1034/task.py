import pandas as pd
import numpy as np

CATEGORIES = ['Electronics', 'Clothing', 'Home Decor', 'Automotive', 'Books']

def task_func(s1, s2):
    """Compare sales for two pandas Series indexed by CATEGORIES.

    Keep only categories where both values exceed 200. Return a tuple
    (ax, distance), where ax is a matplotlib Axes with a grouped bar chart
    titled 'Sales Comparison Above Threshold in Categories' and distance
    is the Euclidean distance between the retained sales values.
    Return (None, 0.0) when no category qualifies.
    """
    raise NotImplementedError
