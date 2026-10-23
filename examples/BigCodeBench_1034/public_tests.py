import numpy as np
import pandas as pd

s1 = pd.Series([250, 120, 340, 410, 220], index=CATEGORIES)
s2 = pd.Series([260, 390, 360, 430, 230], index=CATEGORIES)
ax, distance = task_func(s1, s2)
assert ax is not None
assert ax.get_title() == 'Sales Comparison Above Threshold in Categories'
assert np.isclose(distance, np.linalg.norm([10, 20, 20, 10]))
empty_ax, empty_distance = task_func(s1 * 0, s2 * 0)
assert empty_ax is None
assert empty_distance == 0.0
