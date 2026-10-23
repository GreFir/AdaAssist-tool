import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

sample = pd.DataFrame({'Title':['How to code?', 'What is Python?', 'A tutorial'], 'Views':[100, 200, 50], 'Likes':[50, 50, 10]})
ax = task_func(sample)
assert isinstance(ax, matplotlib.axes.Axes)
assert len(ax.patches) == 2
assert [round(p.get_height(), 3) for p in ax.patches] == [0.5, 0.25]
assert len(task_func(pd.DataFrame()).patches) == 0
assert len(task_func(pd.DataFrame({'Title':['Other'], 'Views':[20], 'Likes':[5]})).patches) == 0
plt.close('all')
