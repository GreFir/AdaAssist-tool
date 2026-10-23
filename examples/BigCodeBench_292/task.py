import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler

def task_func(df):
    """Scale 'age' and 'income' to [0, 1] independently within each id group.

    Input columns: id, age, income. Return (scaled_df, income_hist), where
    scaled_df preserves the records and income_hist is histogram data for
    the scaled income values. Use numpy.histogram-compatible output.
    """
    raise NotImplementedError
