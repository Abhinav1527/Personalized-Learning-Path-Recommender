"""
data_preprocessing.py
---------------------
Text cleaning utilities for the Personalized Learning Path Recommender.
"""

import re
import pandas as pd


def clean_text(text: str) -> str:
    """
    Clean a single review string.

    Steps:
        1. Lowercase
        2. Remove URLs
        3. Remove punctuation / special characters (keep spaces)
        4. Collapse multiple spaces
        5. Strip leading / trailing whitespace
    """
    if not isinstance(text, str):
        text = str(text)

    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)          # remove URLs
    text = re.sub(r"[^a-z0-9\s]", " ", text)              # remove punctuation
    text = re.sub(r"\s+", " ", text).strip()               # collapse spaces
    return text


def preprocess_dataframe(df: pd.DataFrame, text_col: str = "Reviews") -> pd.DataFrame:
    """
    Apply clean_text to *text_col* in a DataFrame.
    Returns a copy with the column cleaned in-place.
    """
    df = df.copy()
    df[text_col] = df[text_col].fillna("").astype(str).apply(clean_text)
    return df


def load_data(
    train_path: str = "data/train.csv",
    test_path: str = "data/test.csv",
    sample_path: str = "data/sample_submission.csv",
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load train, test, and sample-submission CSVs.
    Returns (train, test, sample) DataFrames — no cleaning applied here.
    """
    train = pd.read_csv(train_path)
    test = pd.read_csv(test_path)
    sample = pd.read_csv(sample_path)
    return train, test, sample
