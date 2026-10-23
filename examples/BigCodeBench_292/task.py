import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

def task_func(df):
    """Scale 'age' and 'income' to [0, 1] separately for each 'id'.

    Return (scaled DataFrame, histogram data for scaled 'income').
    Preserve row order and the id values.
    """
    raise NotImplementedError
