# 🎓 Personalized Learning Path Recommender

An AI-powered recommendation system that suggests the **Top 10 personalized learning paths** based on a user's course review. The project uses Natural Language Processing (NLP) and semantic similarity techniques to recommend the most relevant learning paths from a large collection of course reviews.


---

## 🚀 Project Overview

Online learning platforms such as Coursera, Udemy, and edX contain thousands of courses. Finding an optimal, structured path from beginner to advanced can be overwhelming.

This project delivers:
1. **Conversational AI Guidance**: Ask any learning question or describe what you want to achieve, powered by **your own AI with your API key**.
2. **Personalized Top 10 Courses**: Retrieves the most relevant courses from the training dataset using TF-IDF vectorization and NearestNeighbors similarity.
3. **Structured Roadmaps**: Breaks complex topics into 3 achievable milestones with estimated completion times and topic tags.
4. **Interactive Dashboard**: Chat history, progress checklists, provider switcher, and API key management in a single interface.

---

## 📂 Project Structure

```
Personalized-Learning-Path-Recommender/
│
├── data/
│   ├── train.csv                     # Training reviews dataset (Reviews, Course)
│   ├── test.csv                      # Test reviews dataset (Reviews)
│   ├── sample_submission.csv
│   └── users.json                    # Persistent registered user store
│
├── frontend/                         # React 19 + TypeScript (Vite) UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIConfigModal.tsx      # Modal to add your own AI API keys
│   │   │   ├── AIModelSelector.tsx    # Model & provider switcher dropdown
│   │   │   ├── AuthPage.tsx           # Login / Register authentication page
│   │   │   ├── ChatInput.tsx          # Query input with quick submission
│   │   │   ├── ChatWindow.tsx         # Conversation view with auto-scroll
│   │   │   ├── MessageBubble.tsx      # Markdown bubble with course cards & roadmaps
│   │   │   ├── RecommendationCard.tsx # Visual course recommendation card
│   │   │   ├── RoadmapVisualizer.tsx  # 3-stage interactive roadmap with checkboxes
│   │   │   ├── Sidebar.tsx            # Session history and quick topic starters
│   │   │   └── SuggestedPrompts.tsx   # Dynamic next-step chip buttons
│   │   ├── services/                  # API client & auth tokens
│   │   ├── types/                     # TypeScript interfaces
│   │   ├── App.tsx                    # Main application router and state
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── models/
│   └── best_model.pkl                # Serialized TF-IDF + NN + classifier bundle
│
├── noteBooks/                        # EDA and experimental notebooks
│
├── outputs/
│   └── submission.csv                # Generated benchmark predictions
│
├── src/
│   ├── api.py                        # FastAPI backend (Auth, AI Chat, Recommend)
│   ├── ai_service.py                 # Multi-LLM provider client & fallback generator
│   ├── data_preprocessing.py         # Text normalization & cleaning
│   ├── train.py                      # TF-IDF + NearestNeighbors training pipeline
│   ├── predict.py                    # Batch inference for test set
│   └── utils.py                      # Model persistence & submission builder
│
├── start_backend.ps1                 # Launch FastAPI with Uvicorn
├── start_frontend.ps1                # Launch Vite dev server
├── .env.example                      # Environment variables template
├── requirements.txt                  # Python dependencies
├── README.md                         # Documentation
└── .gitignore
```

---

## 🤖 Use Your Own AI with Your API Key

The platform gives you total control over the underlying AI intelligence: **bring your own AI with your API key** from any of the leading free-tier providers:

| Provider | Supported Models | Highlights | Where to Get Free API Key |
|---|---|---|---|
| **Google Gemini** | `gemini-1.5-flash`<br>`gemini-2.0-flash`<br>`gemini-1.5-pro` | Multimodal reasoning, fast inference, 15 RPM free tier | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **Groq Cloud** | `llama-3.3-70b-versatile`<br>`llama-3.1-8b-instant`<br>`mixtral-8x7b-32768` | Ultra-fast LPU inference, open weights, high tokens/sec | [Groq Console](https://console.groq.com/keys) |
| **OpenRouter** | `deepseek/deepseek-r1:free`<br>`meta-llama/llama-3.3-70b-instruct:free`<br>`mistralai/mistral-7b-instruct:free` | Unified gateway, access to DeepSeek-R1 reasoning models | [OpenRouter Keys](https://openrouter.ai/keys) |

### How to Configure Your API Key:

#### Option A: In the Web Interface (Recommended)
1. Launch the web app and log in.
2. Click the **"API Keys"** button in the top navigation bar.
3. Paste your API key under the chosen provider (Gemini, Groq, or OpenRouter).
4. Click **Save Keys**. Your key is stored locally in your browser's `localStorage` and sent encrypted with your requests.

#### Option B: In the `.env` File (Global / Server-Side)
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Insert your key(s):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```
3. Restart the backend.

> 💡 **No API key? No problem!** The application includes a built-in intelligent fallback mode that provides structured recommendations and mock roadmaps out of the box.

---

## 🧠 Machine Learning Pipeline

```
Training Reviews (train.csv)
        │
        ▼
Text Preprocessing (clean_text)
        │
        ▼
TF-IDF Vectorisation (100k features, 1–3 n-grams)
        │
        ├─────────────────────────────┐
        ▼                             ▼
NearestNeighbors Index          LogisticRegression Classifier
(cosine distance, brute, k=50)  (predicts target course category)
        │                             │
        └──────────────┬──────────────┘
                       ▼
         Course-Aware Candidate Re-Ranking (Top 10)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
 outputs/submission.csv      FastAPI /ai/chat & /recommend
```

---

## ⚙️ Technologies Used

### Backend
* **Python 3.10+**
* **FastAPI**: Asynchronous web API framework
* **Uvicorn**: High-performance ASGI server
* **Scikit-learn**: TF-IDF Vectorizer, NearestNeighbors, LogisticRegression, LabelEncoder
* **HTTPX**: Asynchronous HTTP client for multi-provider LLM API calls
* **Passlib (bcrypt)** & **python-jose**: Password hashing and JWT security
* **Pandas & NumPy**: Data processing and matrix operations

### Frontend
* **React 19 + TypeScript**: Modern UI framework
* **Vite 8**: Ultra-fast frontend bundler
* **Tailwind CSS v4**: Utility-first styling with glassmorphism design
* **Lucide React**: Vector icons

---

## 📦 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/Personalized-Learning-Path-Recommender.git
cd Personalized-Learning-Path-Recommender
```

### 2. Set up the Python virtual environment

```bash
python -m venv venv

# Windows (PowerShell / CMD)
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Configure environment variables (optional)

```bash
copy .env.example .env     # Windows
cp .env.example .env       # Linux / macOS
```

---

## ▶️ Running the Application

### Method 1: Using PowerShell Helper Scripts (Windows)

Open two terminal windows:

* **Terminal 1 (Backend)**:
  ```powershell
  .\start_backend.ps1
  ```
* **Terminal 2 (Frontend)**:
  ```powershell
  .\start_frontend.ps1
  ```

### Method 2: Manual Commands

* **Start Backend**:
  ```bash
  uvicorn src.api:app --host 127.0.0.1 --port 8000 --reload
  ```
* **Start Frontend**:
  ```bash
  cd frontend
  npm run dev
  ```

### Method 3: Run Live on Replit ⚡

1. Go to [Replit](https://replit.com) and click **"+ Create Repl"** → **"Import from GitHub"**.
2. Paste this repository URL and import.
3. In Replit's **Secrets (Tools → Secrets)**, optionally add your AI keys:
   * `GEMINI_API_KEY`: *(Your Google AI Studio Key)*
   * `GROQ_API_KEY`: *(Optional)*
   * `OPENROUTER_API_KEY`: *(Optional)*
4. Click the green **"▶ Run"** button!
   * Replit automatically builds the frontend and serves the full application live on your public `*.replit.dev` or `*.replit.app` URL with an interactive WebView.

Access the application in your browser:
* **Frontend Web App**: [http://localhost:5173](http://localhost:5173) (Local) or your Replit Webview URL (Live)
* **Backend API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **API Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 🏋️ Model Training & Batch Prediction

### Train the ML Model
Fits the TF-IDF vectorizer, NearestNeighbors index, and LogisticRegression classifier on `data/train.csv` and packages them into `models/best_model.pkl`:

```bash
python src/train.py
```

### Run Batch Predictions
Generates top-10 recommendations for all test reviews in `data/test.csv` and outputs `outputs/submission.csv`:

```bash
python src/predict.py
```

---

## 🌐 API Reference

### Authentication Endpoints

#### `POST /auth/register`
Create a new user account.
* **Request**: `{ "username": "alice", "password": "securepassword" }`
* **Response**: `201 Created` — `{ "message": "Account created. You can now log in." }`

#### `POST /auth/login`
Authenticate and obtain a Bearer JWT token.
* **Request**: Form data with `username` and `password`
* **Response**: `{ "access_token": "...", "token_type": "bearer" }`

---

### AI & Recommendation Endpoints

#### `GET /health`
Returns service status and whether the ML model bundle is loaded.
```json
{ "status": "ok", "model_loaded": true }
```

#### `GET /ai/providers`
Returns available LLM providers, supported model lists, and whether server-side keys are configured.

#### `POST /ai/chat` *(Requires Bearer Token)*
Interact with your chosen AI model (Gemini, Groq, OpenRouter), enriched with dataset recommendations and 3-phase roadmaps.
* **Request**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "I want to learn Deep Learning with PyTorch." }
    ],
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "api_key": "YOUR_OPTIONAL_API_KEY",
    "topic": "Machine Learning"
  }
  ```
* **Response**:
  ```json
  {
    "reply": "Here is a structured plan to master Deep Learning...",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "used_fallback": false,
    "predicted_course": "Deep Learning Specialization",
    "recommendations": [
      {
        "index": 1042,
        "course": "Deep Learning Specialization",
        "review_snippet": "Outstanding coverage of neural networks, CNNs, and backprop..."
      }
    ],
    "roadmap": [
      {
        "phase": "Phase 1: Foundations",
        "title": "Python & Linear Algebra Fundamentals",
        "level": "Beginner",
        "estimated_time": "3-4 Weeks",
        "focus": "Core programming and math prerequisites",
        "milestone": "Implement a simple perceptron from scratch in NumPy",
        "topics": ["Python", "NumPy", "Calculus & Matrix Math"]
      }
    ],
    "suggested_prompts": [
      "What are the best hands-on projects for beginner PyTorch learners?",
      "How does CNN architecture work in computer vision?"
    ]
  }
  ```

#### `POST /recommend` *(Requires Bearer Token)*
Pure ML recommendation endpoint without LLM chat.
* **Request**: `{ "review": "Loved the Python data structures course." }`
* **Response**: Returns predicted course and top 10 recommended course items.

---

## 📊 Evaluation & Metrics

The recommendation pipeline evaluates precision using **Recall@10**: the proportion of relevant course reviews surfaced within the top 10 ranked recommendations for each query.

---

## 📜 License

This project is developed for educational and research purposes.

---

## 👨‍💻 Author

**Abhinav Somasani**
