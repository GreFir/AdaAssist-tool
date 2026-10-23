from datetime import datetime, timedelta
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

start = datetime.now() - timedelta(days=3)
teams = ['Alpha','Beta']
a, fig = task_func(int(start.timestamp()*1000), teams=teams, random_seed=42)
b, fig2 = task_func(int(start.timestamp()*1000), teams=teams, random_seed=42)
assert list(a) == teams
assert a == b
assert isinstance(fig, plt.Figure)
assert len(fig.axes[0].lines) == 2
assert all(0.1 <= x <= 1.0 for series in a.values() for x in series)
plt.close('all')
