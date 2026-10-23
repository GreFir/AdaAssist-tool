import random
import re
import pandas as pd

random.seed(3)
result = task_func()
assert isinstance(result, pd.DataFrame)
assert len(result) == NUM_SAMPLES
assert list(result.columns) == ['String Field', 'Float Field']
assert all(isinstance(x, str) and re.fullmatch(r'[A-Za-z]{10}', x) for x in result['String Field'])
assert all(isinstance(x, str) and re.fullmatch(r'\d{1,3}(?:,\d{3})*\.\d{2}', x) for x in result['Float Field'])
assert all(0 <= float(x.replace(',', '')) <= 10000 for x in result['Float Field'])
