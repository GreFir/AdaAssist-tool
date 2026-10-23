from datetime import datetime, timedelta
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

start = datetime.now() - timedelta(days=2)
data, fig = task_func(int(start.timestamp() * 1000), teams=['Alpha','Beta'], random_seed=4)
assert isinstance(fig, plt.Figure)
assert set(data) == {'Alpha', 'Beta'}
assert len(fig.axes) == 1 and len(fig.axes[0].lines) == 2
assert all(0.1 <= x <= 1.0 for points in data.values() for x in points)
assert fig.axes[0].get_ylabel() == 'Performance'
plt.close(fig)
