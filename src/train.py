"""
train.py
--------
Fit the TF-IDF vectoriser + NearestNeighbors model on training data and
save the artefacts to models/best_model.pkl.

Usage:
    python src/train.py
"""

import sys
import os

# Allow imports from project root when running as a script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder

from src.data_preprocessing import load_data, preprocess_dataframe
from src.utils import save_model


# ──────────────────────────── Configuration ───────────────────────────────

MODEL_PATH = "models/best_model.pkl"

TFIDF_PARAMS = dict(
    max_features=100_000,
    ngram_range=(1, 3),
    min_df=2,
    max_df=0.95,
    sublinear_tf=True,
    lowercase=True,
    strip_accents="unicode",
    stop_words="english",
)

NN_PARAMS = dict(
    n_neighbors=50,   # retrieve 50 candidates; predict.py will rerank to top-10
    metric="cosine",
    algorithm="brute",
    n_jobs=-1,
)

CLF_PARAMS = dict(
    max_iter=1000,
    random_state=42,
)


# ─────────────────────────────── Pipeline ─────────────────────────────────

def train():
    print("=" * 60)
    print("  Personalized Learning Path Recommender — Training")
    print("=" * 60)

    # 1. Load & preprocess
    print("\n[1/5] Loading data...")
    train_df, _, _ = load_data()
    print(f"      train shape: {train_df.shape}")

    print("\n[2/5] Preprocessing text...")
    train_df = preprocess_dataframe(train_df, text_col="Reviews")

    # 2. TF-IDF vectorisation
    print("\n[3/5] Fitting TF-IDF vectoriser...")
    tfidf = TfidfVectorizer(**TFIDF_PARAMS)
    train_vectors = tfidf.fit_transform(train_df["Reviews"])
    print(f"      matrix shape: {train_vectors.shape}")

    # 3. Nearest-neighbour index
    print("\n[4/5] Fitting NearestNeighbors index...")
    nn = NearestNeighbors(**NN_PARAMS)
    nn.fit(train_vectors)

    # 4. Course classifier (used for course-aware re-ranking in predict.py)
    print("\n[5/5] Fitting course classifier...")
    encoder = LabelEncoder()
    y = encoder.fit_transform(train_df["Course"])
    clf = LogisticRegression(**CLF_PARAMS)
    clf.fit(train_vectors, y)
    print(f"      {len(encoder.classes_)} courses learned")

    # 5. Save everything as a single bundle
    bundle = {
        "tfidf": tfidf,
        "nn": nn,
        "clf": clf,
        "encoder": encoder,
        "train_df": train_df,          # needed in predict.py for reranking
    }
    save_model(bundle, MODEL_PATH)

    print("\n[Done] Training complete.")
    print(f"   Model saved to: {MODEL_PATH}\n")


if __name__ == "__main__":
    train()
