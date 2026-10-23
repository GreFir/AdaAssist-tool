import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

rows = pd.DataFrame({'Title':['How to code?','What is Python?','Other video'], 'Views':[100,200,50], 'Likes':[50,50,25]})
ax = task_func(rows)
assert isinstance(ax, matplotlib.axes.Axes)
assert [round(bar.get_height(), 4) for bar in ax.patches] == [0.5, 0.25]
empty = task_func(pd.DataFrame(columns=['Title','Views','Likes']))
assert isinstance(empty, matplotlib.axes.Axes)
assert len(empty.patches) == 0
plt.close('all')
