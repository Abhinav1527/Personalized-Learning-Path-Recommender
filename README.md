# 🎓 Personalized Learning Path Recommender

An AI-powered recommendation system that suggests the **Top 10 personalized learning paths** based on a user's course review. The project uses Natural Language Processing (NLP) and semantic similarity techniques to recommend the most relevant learning paths from a large collection of course reviews.


---

## 🚀 Project Overview

Online learning platforms such as Coursera, Udemy, and edX contain thousands of courses. Choosing the right learning path can be challenging for learners.

This project recommends the **Top 10 most relevant learning paths** for a given review by analyzing semantic similarity between course reviews.

The system processes review text, generates embeddings, computes similarity scores, and returns the indices of the most relevant learning paths.

---

## 📂 Project Structure

```
Personalized-Learning-Path-Recommender/
│
├── data/
│   ├── train.csv
│   ├── test.csv
│   └── sample_submission.csv
│
├── models/
│   └── embeddings.pkl
│
├── outputs/
│   └── submission.csv
│
├── src/
│   ├── data_preprocessing.py
│   ├── embeddings.py
│   ├── train.py
│   ├── predict.py
│   ├── generate_submission.py
│   └── utils.py
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

## 📊 Dataset

### Training Dataset

| Column | Description |
|----------|-------------|
| Index | Unique identifier |
| Reviews | Course review text |
| Course | Course name |

### Test Dataset

| Column | Description |
|----------|-------------|
| Index | Unique identifier |
| Reviews | Course review text |

### Submission Format

| Column | Description |
|----------|-------------|
| Index | Test sample ID |
| Index_list | List of Top 10 recommended indices |

---

## 🧠 Machine Learning Pipeline

```
Training Reviews
        │
        ▼
Text Preprocessing
        │
        ▼
Sentence Embeddings
        │
        ▼
Vector Database
        │
        ▼
Cosine Similarity Search
        │
        ▼
Top 10 Similar Reviews
        │
        ▼
submission.csv
```

---

## ⚙️ Technologies Used

- Python
- Pandas
- NumPy
- Scikit-learn
- Sentence Transformers
- Cosine Similarity
- FAISS (optional)
- Matplotlib

---

## 🔥 Features

- NLP-based recommendation system
- Text preprocessing
- Semantic similarity search
- Top-10 learning path recommendation
- Fast vector retrieval
- Modular project structure
- Easy to extend and improve

---

## 📈 Model Workflow

### Step 1

Load training and testing datasets.

### Step 2

Clean review text.

- Lowercasing
- Remove punctuation
- Remove special characters
- Remove extra spaces

### Step 3

Convert reviews into vector embeddings.

### Step 4

Calculate similarity between test reviews and all training reviews.

### Step 5

Retrieve Top 10 most similar learning paths.

### Step 6

Generate the final submission file.

---

## 📦 Installation

Clone the repository

```bash
git clone https://github.com/yourusername/Personalized-Learning-Path-Recommender.git
```

Move into the project

```bash
cd Personalized-Learning-Path-Recommender
```

Create virtual environment

```bash
python -m venv venv
```

Activate environment

### Windows

```bash
venv\Scripts\activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

## ▶️ Run

Train

```bash
python src/train.py
```

Predict

```bash
python src/predict.py
```

Generate submission

```bash
python src/generate_submission.py
```

---

## 📁 Output

The generated file will be

```
outputs/
    submission.csv
```

with the format

```
Index,Index_list
109776,"[1234,4567,....]"
109777,"[...]"
...
```

---

## 📊 Evaluation

The competition evaluates the recommendation quality using **Recall@10**.

The objective is to recommend the **Top 10 most relevant learning paths** for each test review.

---

## 📌 Future Improvements

- Better text preprocessing
- Fine-tuned Sentence Transformers
- FAISS indexing
- Hybrid retrieval (TF-IDF + Embeddings)
- Cross-Encoder reranking
- Personalized ranking
- Learning history integration


---

## 👨‍💻 Author

**Abhinav Somasani**
