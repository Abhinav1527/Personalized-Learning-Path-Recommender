"""
utils.py
--------
Shared helpers: model persistence and submission formatting.
"""

import os
import pickle
import pandas as pd


# ─────────────────────────────── Model I/O ────────────────────────────────

def save_model(obj, path: str) -> None:
    """Pickle *obj* to *path*, creating parent directories as needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        pickle.dump(obj, f)
    print(f"[utils] Saved model  ->  {path}")


def load_model(path: str):
    """Load and return a pickled object from *path*."""
    with open(path, "rb") as f:
        obj = pickle.load(f)
    print(f"[utils] Loaded model <-  {path}")
    return obj


# ─────────────────────────────── Submission ───────────────────────────────

def format_index_list(indices: list[int]) -> str:
    """
    Convert a list of integer indices to the competition submission format.

    Example:
        [1234, 4567, 8910] → "[1234, 4567, 8910]"
    """
    return str(indices)


def build_submission(
    test_indices: "pd.Series",
    recommended: list[list[int]],
    output_path: str = "outputs/submission.csv",
) -> pd.DataFrame:
    """
    Build and save the submission CSV.

    Parameters
    ----------
    test_indices   : pd.Series of test `Index` values.
    recommended    : list of lists — for each test row, the 10 recommended
                     train `Index` values.
    output_path    : where to write the CSV.

    Returns
    -------
    submission DataFrame.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    submission = pd.DataFrame(
        {
            "Index": test_indices.values,
            "Index_list": [format_index_list(r) for r in recommended],
        }
    )
    submission.to_csv(output_path, index=False)
    print(f"[utils] Submission saved -> {output_path}  ({len(submission)} rows)")
    return submission
