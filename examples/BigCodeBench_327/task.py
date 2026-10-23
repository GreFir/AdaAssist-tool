import csv
import re
from collections import Counter

def task_func(file_path, regex_pattern=r'\(.+?\)|\w+|[\W_]+'):
    """Count regex token occurrences across the contents of a CSV file.

    Parenthesized text must be captured as a single token by default.
    Return a dictionary mapping each matched token to its frequency.
    Respect the optional custom regex_pattern argument.
    """
    raise NotImplementedError
