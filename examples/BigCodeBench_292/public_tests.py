import numpy as np
import pandas as pd

source = pd.DataFrame({'id':[1,1,2,2], 'age':[20,30,50,70], 'income':[100,200,400,800]})
scaled, histogram = task_func(source)
assert isinstance(scaled, pd.DataFrame)
assert len(scaled) == len(source)
assert np.allclose(scaled['age'], [0,1,0,1])
assert np.allclose(scaled['income'], [0,1,0,1])
assert isinstance(histogram, tuple) and len(histogram) == 2
assert sum(histogram[0]) == len(source)
