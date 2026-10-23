import csv
import re
from collections import Counter

def task_func(file_path, regex_pattern=r'\(.+?\)|\w+|[\W_]+'):
    """Read CSV at file_path and count regex matches in cell content.

    Use regex_pattern, whose default groups parenthesized content,
    words, and consecutive non-word characters. Return a dict.
    """
    raise NotImplementedError
