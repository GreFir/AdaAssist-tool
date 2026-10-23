import numpy as np
import pandas as pd

df = pd.DataFrame({'id':[1,1,2,2], 'age':[25,30,40,60], 'income':[100,200,300,500]})
scaled, histogram = task_func(df.copy())
assert isinstance(scaled, pd.DataFrame)
assert list(scaled['id']) == [1,1,2,2]
assert np.allclose(scaled['age'], [0,1,0,1])
assert np.allclose(scaled['income'], [0,1,0,1])
assert histogram is not None
