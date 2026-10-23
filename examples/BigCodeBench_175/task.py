import re
import matplotlib.pyplot as plt

def task_func(df):
    """Plot like-to-view ratios for videos with 'how' or 'what' in the title.

    Input is a pandas DataFrame with Title, Views, and Likes columns.
    Search titles case-insensitively and return a matplotlib Axes containing
    the matching ratios as bars. For empty, missing-column, or nonmatching
    input, return an empty Axes.
    """
    raise NotImplementedError
