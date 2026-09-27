"""
predict.py
----------
Load the trained model bundle, run course-aware re-ranking on the test set,
and write outputs/submission.csv.

Usage:
    python src/predict.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.data_preprocessing import load_data, preprocess_dataframe
from src.utils import load_model, build_submission


# ──────────────────────────── Configuration ───────────────────────────────

MODEL_PATH  = "models/best_model.pkl"
OUTPUT_PATH = "outputs/submission.csv"
TOP_K       = 10    # final recommendations per test query
CANDIDATES  = 50    # must match NN_PARAMS['n_neighbors'] in train.py


# ─────────────────────────────── Pipeline ─────────────────────────────────

def predict():
    print("=" * 60)
    print("  Personalized Learning Path Recommender — Prediction")
    print("=" * 60)

    # 1. Load data
    print("\n[1/4] Loading data...")
    _, test_df, _ = load_data()
    print(f"      test shape: {test_df.shape}")

    print("\n[2/4] Preprocessing test reviews...")
    test_df = preprocess_dataframe(test_df, text_col="Reviews")

    # 2. Load model bundle
    print("\n[3/4] Loading model bundle...")
    bundle   = load_model(MODEL_PATH)
    tfidf    = bundle["tfidf"]
    nn       = bundle["nn"]
    clf      = bundle["clf"]
    encoder  = bundle["encoder"]
    train_df = bundle["train_df"]

    # 3. Vectorise test set
    test_vectors = tfidf.transform(test_df["Reviews"])

    # 4. Nearest-neighbour candidate retrieval
    print("\n[4/4] Retrieving candidates + course-aware re-ranking...")
    _, candidate_indices = nn.kneighbors(test_vectors)   # shape (n_test, 50)

    # Predict likely course for each test review
    predicted_labels  = clf.predict(test_vectors)
    predicted_courses = encoder.inverse_transform(predicted_labels)

    recommended = []
    for i in range(len(test_df)):
        predicted_course = predicted_courses[i]
        candidates       = candidate_indices[i]          # 50 train-row positions

        candidate_df = train_df.iloc[candidates].copy()

        # Prefer candidates from the same predicted course
        same_course = candidate_df[candidate_df["Course"] == predicted_course]

        if len(same_course) >= TOP_K:
            top = same_course.head(TOP_K)
        else:
            top = candidate_df.head(TOP_K)

        recommended.append(top["Index"].tolist())

    # 5. Write submission
    submission = build_submission(test_df["Index"], recommended, OUTPUT_PATH)

    print("\n[Done] Prediction complete.")
    print(f"   Output: {OUTPUT_PATH}\n")
    print(submission.head(5).to_string(index=False))


if __name__ == "__main__":
    predict()
