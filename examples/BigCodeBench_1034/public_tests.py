import pandas as pd

categories = ['Electronics', 'Clothing', 'Home Decor', 'Automotive', 'Books']
a = pd.Series([250, 100, 350, 450, 150], index=categories)
b = pd.Series([250, 300, 350, 450, 120], index=categories)
ax, distance = task_func(a, b)
assert ax is not None
assert ax.get_title() == 'Sales Comparison Above Threshold in Categories'
assert distance == 0.0
empty_ax, empty_distance = task_func(pd.Series([1]*5, index=categories), pd.Series([2]*5, index=categories))
assert empty_ax is None
assert empty_distance == 0.0
