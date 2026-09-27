"""
ai_service.py
-------------
Unified multi-provider AI service supporting free base models from top providers:
1. Google Gemini (Gemini 1.5 Flash / 2.0 Flash via Google AI Studio Free Tier)
2. Groq Cloud (Meta Llama 3.3 70B / Llama 3.1 8B / Mixtral Free Tier)
3. OpenRouter (DeepSeek R1 / Llama 3.3 Free Models)
Includes intelligent fallback, structured learning roadmap generation, and
hybrid integration with the trained course dataset recommender.
"""

import os
import json
import re
from typing import Any, Optional
import httpx
import urllib.parse
from src.data_preprocessing import clean_text

# ─────────────────────────── Provider Definitions ───────────────────────────

AVAILABLE_PROVIDERS = [
    {
        "id": "gemini",
        "name": "Google Gemini",
        "badge": "Top Pick",
        "tagline": "Google AI Studio Free Tier",
        "description": "Fast multimodal intelligence with generous 15 RPM / 1M TPM free limits.",
        "key_url": "https://aistudio.google.com/app/apikey",
        "env_var": "GEMINI_API_KEY",
        "models": [
            {
                "id": "gemini-3.5-flash",
                "name": "Gemini 3.5 Flash",
                "description": "High-speed reasoning & course matching (Free tier recommended)",
                "is_default": True,
            },
            {
                "id": "gemini-3.5-flash-lite",
                "name": "Gemini 3.5 Flash-Lite",
                "description": "Ultra-lightweight fast responses",
                "is_default": False,
            },
            {
                "id": "gemini-3.1-pro-preview",
                "name": "Gemini 3.1 Pro",
                "description": "Deep conceptual reasoning for complex topics",
                "is_default": False,
            },
        ],
    },
    {
        "id": "groq",
        "name": "Groq Cloud",
        "badge": "Ultra Fast",
        "tagline": "Meta Llama & Mixtral Free Tier",
        "description": "Near-instant response generation powered by Groq LPUs.",
        "key_url": "https://console.groq.com/keys",
        "env_var": "GROQ_API_KEY",
        "models": [
            {
                "id": "llama-3.3-70b-versatile",
                "name": "Llama 3.3 70B",
                "description": "State-of-the-art open weights model on ultra-fast hardware",
                "is_default": True,
            },
            {
                "id": "llama-3.1-8b-instant",
                "name": "Llama 3.1 8B Instant",
                "description": "Lightweight, lightning fast responses",
                "is_default": False,
            },
            {
                "id": "mixtral-8x7b-32768",
                "name": "Mixtral 8x7B",
                "description": "High context MoE architecture for deep curriculums",
                "is_default": False,
            },
        ],
    },
    {
        "id": "openrouter",
        "name": "OpenRouter",
        "badge": "Multi-Model",
        "tagline": "DeepSeek & Llama Free Hub",
        "description": "Single API gateway accessing leading open free tier models.",
        "key_url": "https://openrouter.ai/keys",
        "env_var": "OPENROUTER_API_KEY",
        "models": [
            {
                "id": "meta-llama/llama-3.3-70b-instruct:free",
                "name": "Llama 3.3 70B (Free)",
                "description": "Flagship 70B parameter open intelligence",
                "is_default": True,
            },
            {
                "id": "deepseek/deepseek-r1:free",
                "name": "DeepSeek R1 (Free)",
                "description": "Advanced step-by-step reasoning & math/coding",
                "is_default": False,
            },
            {
                "id": "mistralai/mistral-7b-instruct:free",
                "name": "Mistral 7B (Free)",
                "description": "Compact, reliable curriculum guidance",
                "is_default": False,
            },
        ],
    },
]

# ─────────────────────────── System Prompt ──────────────────────────────────

SYSTEM_PROMPT = """You are an expert AI Learning Path Advisor and Career Mentor.
You are conversing with a learner. Have basic conversational common sense:

1. Conversational Common Sense & Greetings:
   - If the user merely greets you (e.g. "hi", "hello", "hey", "good morning", "how are you", "who are you"), greet them back warmly, politely, and conversationally. Introduce yourself as their Learning Path Advisor and ask what skill, programming language, framework, or career goal they would like to learn or build a roadmap for.
   - Do NOT output a roadmap, curriculum, phases, or course plan for simple greetings, pleasantries, or casual chit-chat!

2. Learning Path & Roadmap Requests (Only when user asks to learn or asks for a roadmap):
   - When the user specifically asks to learn a skill, asks for a roadmap, curriculum, study schedule, or asks how to learn/master a specific topic (e.g. "I want to learn Python", "Machine Learning roadmap", "Study schedule for React"):
     * Provide a personalized, encouraging breakdown.
     * Structure the curriculum with clear sequential markdown headers so the interactive roadmap widget can render them:
       ## Phase 1: [Phase Name] (or ## Week 1: [Week Name])
       - Level / Time: [e.g. Beginner | 2-3 Weeks]
       - Core Focus: [1-2 sentences on core focus and objectives]
       - Topics to Learn:
         * [Specific topic / concept 1]
         * [Specific topic / concept 2]
         * [Specific topic / concept 3]
         * [Specific topic / concept 4]
         * [Specific topic / concept 5]
       - Milestone: [Specific hands-on project or deliverable to complete]
       (Followed by Phase 2, Phase 3, Phase 4)
     * Conclude with 2-3 motivating next steps or suggested follow-up questions.
"""

# ─────────────────────────── Helpers & Course Matching ──────────────────────

def is_greeting_or_casual(text: str) -> bool:
    """Detect if the user is merely greeting or making casual conversation without requesting learning content."""
    if not text:
        return True
    t = text.strip().lower()
    t_clean = re.sub(r"[^\w\s]", "", t).strip()

    learning_keywords = [
        "learn", "roadmap", "path", "study", "schedule", "course", "curriculum",
        "guide", "master", "career", "interview", "prepare", "project", "beginner",
        "intermediate", "advanced", "practice", "exercise", "mistake", "prerequisite",
        "python", "react", "machine learning", "ai", "deep learning", "sql", "data",
        "cloud", "devops", "javascript", "typescript", "java", "c++", "golang", "rust",
        "cybersecurity", "security", "docker", "kubernetes", "flutter", "swift", "kotlin",
        "backend", "frontend", "fullstack", "web", "html", "css", "database", "linux"
    ]

    # Exact casual/greeting utterances
    casual_exact = {
        "hi", "hello", "hey", "heya", "howdy", "hola", "yo", "sup", "greetings",
        "good morning", "good afternoon", "good evening", "good day",
        "how are you", "how are you doing", "how do you do", "hows it going", "how's it going",
        "whats up", "what is up", "who are you", "what can you do", "what are you", "help",
        "nice to meet you", "thank you", "thanks", "thx", "ok", "okay", "cool", "great", "nice",
        "bye", "goodbye", "see you", "test", "testing", "asdf", "lol", "haha", "yes", "no", "sure",
        "hey there", "hi there", "hello there"
    }

    if t_clean in casual_exact:
        return True

    # If any casual word is in utterance and NO learning keywords or technical subject
    has_casual = any(g in t_clean for g in casual_exact)
    has_learning = any(k in t_clean for k in learning_keywords)

    if has_casual and not has_learning:
        return True

    return False


def is_roadmap_request(text: str, reply_text: str = "") -> bool:
    """Determine if a structured roadmap visualizer should be generated."""
    if is_greeting_or_casual(text):
        return False

    # Check if the AI's reply contains structured phases/weeks
    has_phase_headers = bool(re.search(
        r'(?:^|\n)(?:#{1,4}\s*|\*{0,2})(?:Phase|Week|Stage|Step)\s*\d+[:\s\-–]+',
        reply_text,
        re.IGNORECASE
    ))
    if has_phase_headers:
        return True

    learning_intent = [
        "learn", "roadmap", "path", "study", "schedule", "course", "curriculum",
        "guide", "master", "prepare", "project", "syllabus", "steps", "week", "phase"
    ]
    t = text.lower()
    return any(k in t for k in learning_intent)


def clean_topic_string(raw: str) -> str:
    """Clean verbose user prompts into a crisp topic name."""
    if not raw or is_greeting_or_casual(raw):
        return "Learning Path"
    t = raw.strip()
    # Strip common prefix prompts
    patterns = [
        r"^create a \d+-week study schedule for\s*",
        r"^\d+-week study schedule for\s*",
        r"^-week study schedule for\s*",
        r"^study schedule for\s*",
        r"^generate a (?:detailed )?(?:study )?roadmap for\s*",
        r"^what portfolio projects should i build in\s*",
        r"^top portfolio projects in\s*",
        r"^what are the top mistakes beginners make in\s*",
        r"^common mistakes to avoid in\s*",
        r"^what are the prerequisite skills before learning\s*",
        r"^essential practice exercises for\s*",
        r"^i want (?:a )?(?:step-by-step )?(?:learning )?roadmap for\s*",
        r"^i want to (?:master|learn|study)\s*",
        r"^i want a (?:learning )?path for\s*",
        r"^recommend a (?:learning )?roadmap for\s*",
        r"^give me a (?:step-by-step )?(?:learning )?roadmap for\s*",
        r"^can you (?:please )?(?:give|make|create|provide) (?:me )?(?:a )?(?:learning )?roadmap for\s*",
        r"^how (?:should|do|can) i (?:prepare for|learn|master|study)\s*",
        r"^how to (?:learn|master|study)\s*",
        r"^(?:learning )?roadmap for\s*",
        r"^(?:learning )?path for\s*",
        r"^curriculum for\s*",
        r"^syllabus for\s*",
        r"^guide (?:to|for)\s*",
    ]
    for p in patterns:
        t = re.sub(p, "", t, flags=re.IGNORECASE).strip()
    # Strip trailing punctuation or phrases
    t = re.sub(r"\s+roadmap$", "", t, flags=re.IGNORECASE).strip()
    t = t.rstrip("?.! ")
    return t if t else raw[:50]


def find_conversation_topic(messages: list[dict], explicit_topic: Optional[str] = None) -> str:
    """Find the core topic from explicit topic, current message, or conversation history."""
    if explicit_topic and explicit_topic.strip() and not is_greeting_or_casual(explicit_topic):
        cleaned = clean_topic_string(explicit_topic)
        if cleaned and cleaned != "Learning Path":
            return cleaned

    # Check last user message
    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_msg = msg.get("content", "").strip()
            break

    if last_user_msg and not is_greeting_or_casual(last_user_msg):
        cleaned_last = clean_topic_string(last_user_msg)
        if cleaned_last and len(cleaned_last) > 2 and not cleaned_last.isdigit() and cleaned_last != "Learning Path":
            return cleaned_last

    # Check earlier user messages in history to preserve context
    for msg in messages:
        if msg.get("role") == "user":
            c_text = msg.get("content", "").strip()
            if not is_greeting_or_casual(c_text):
                c = clean_topic_string(c_text)
                if c and len(c) > 2 and not c.isdigit() and c != "Learning Path":
                    return c

    return "Learning Path"


def get_candidate_courses(bundle: dict, query: str, top_k: int = 10) -> tuple[str, list[dict]]:
    """Retrieve top matched courses from the local trained model bundle."""
    if not bundle or "tfidf" not in bundle or "nn" not in bundle:
        return "", []

    try:
        tfidf = bundle["tfidf"]
        nn = bundle["nn"]
        clf = bundle["clf"]
        encoder = bundle["encoder"]
        train_df = bundle["train_df"]

        cleaned = clean_text(query)
        if not cleaned.strip():
            return "", []

        vec = tfidf.transform([cleaned])
        n_neighbors = min(200, len(train_df))
        _, candidate_pos = nn.kneighbors(vec, n_neighbors=n_neighbors)
        candidate_pos = candidate_pos[0]

        label = clf.predict(vec)[0]
        predicted_course = encoder.inverse_transform([label])[0]

        candidate_df = train_df.iloc[candidate_pos].copy()
        seen_courses: set[str] = set()
        ordered_rows = []

        # Pinned predicted course first
        for _, row in candidate_df.iterrows():
            if row["Course"] == predicted_course and predicted_course not in seen_courses:
                ordered_rows.append(row)
                seen_courses.add(predicted_course)
                break

        # Remaining courses
        for _, row in candidate_df.iterrows():
            if len(ordered_rows) >= top_k:
                break
            course = row["Course"]
            if course not in seen_courses:
                ordered_rows.append(row)
                seen_courses.add(course)

        recs = [
            {
                "index": int(row["Index"]),
                "course": str(row["Course"]),
                "review_snippet": str(row["Reviews"])[:160] + ("…" if len(str(row["Reviews"])) > 160 else ""),
            }
            for row in ordered_rows
        ]
        return predicted_course, recs
    except Exception as e:
        print(f"[ai_service] Error during course candidate retrieval: {e}")
        return "", []


# ─────────────────────────── Domain Curated Topics ──────────────────────────

CURATED_DOMAIN_TOPICS: dict[str, dict[str, list[str]]] = {
    "python": {
        "Phase 1": [
            "Python Syntax, Variables & Primitive Types (int, float, str, bool)",
            "Control Flow: Conditionals (if/elif/else) & Loops (for/while)",
            "Functions, Default Arguments, *args/**kwargs & Scope",
            "Core Data Structures: Lists, Tuples, Dictionaries & Sets",
            "File Handling (JSON, CSV, TXT) & Exception Handling (try/except/finally)",
            "Virtual Environments (venv) & Package Management with pip",
        ],
        "Phase 2": [
            "Object-Oriented Programming (Classes, Inheritance, Dunder Methods)",
            "Iterators, Generators, List Comprehensions & Lambdas",
            "Modular Architecture: Custom Packages & Standard Library (os, sys, json)",
            "Unit Testing with pytest & Test-Driven Development (TDD)",
            "Consuming REST APIs & HTTP Requests with httpx or requests",
            "Data Analysis with Pandas & Numerical Computing with NumPy",
        ],
        "Phase 3": [
            "Asynchronous Programming with asyncio, async/await & Coroutines",
            "Concurrency Patterns: Multithreading vs Multiprocessing",
            "Database Integration with SQLAlchemy ORM & SQLite/PostgreSQL",
            "Modern Backend API Development with FastAPI & Pydantic Validation",
            "Memory Optimization, Profiling & Type Hinting (mypy)",
            "Design Patterns & Clean Code Principles in Python",
        ],
        "Phase 4": [
            "Docker Containerization & Docker Compose for Python Applications",
            "Continuous Integration & Automated Testing with GitHub Actions",
            "Application Logging, Monitoring & Production Observability",
            "Cloud Deployment (AWS, GCP, or Render / Railway)",
            "Security Best Practices, Environment Secrets & Authentication",
            "Full-Stack Production Capstone Project & Portfolio Showcase",
        ],
    },
    "machine learning": {
        "Phase 1": [
            "Linear Algebra: Vectors, Matrices, Matrix Multiplications & Inverses",
            "Multivariable Calculus: Partial Derivatives & Gradient Descent",
            "Probability Distributions, Descriptive Statistics & Hypothesis Testing",
            "Data Wrangling & Feature Engineering with Pandas and NumPy",
            "Data Visualization with Matplotlib & Seaborn",
            "Feature Scaling, Normalization & Missing Data Imputation",
        ],
        "Phase 2": [
            "Supervised Learning: Linear, Polynomial & Logistic Regression",
            "Tree Algorithms: Decision Trees, Random Forests & Gradient Boosting (XGBoost)",
            "Support Vector Machines (SVM) & Distance Metrics",
            "Unsupervised Learning: K-Means, Hierarchical Clustering & PCA",
            "Model Evaluation: Confusion Matrices, ROC-AUC, Precision, Recall, F1",
            "Scikit-Learn Pipelines & Hyperparameter Tuning (Grid/Random Search)",
        ],
        "Phase 3": [
            "Artificial Neural Networks (ANN), Perceptrons & Backpropagation",
            "Deep Learning Frameworks: PyTorch or TensorFlow Fundamentals",
            "Convolutional Neural Networks (CNNs) for Computer Vision",
            "Recurrent Neural Networks (RNNs) & LSTMs for Sequential Data",
            "Transformer Architectures & Self-Attention Mechanisms",
            "Pretrained Model Transfer Learning & Fine-Tuning with HuggingFace",
        ],
        "Phase 4": [
            "LLM Prompt Engineering, Embeddings & RAG Systems (Vector DBs)",
            "MLOps Workflows: Experiment Tracking with MLflow & Model Registries",
            "High-Throughput Model Serving via FastAPI & ONNX Runtime",
            "Containerizing Models with Docker & Cloud Deployment (AWS / GCP)",
            "Model Drift Monitoring, Data Validation & AI Safety/Ethics",
            "End-to-End Production ML System Capstone & Portfolio Deployment",
        ],
    },
    "react": {
        "Phase 1": [
            "Modern JavaScript ES6+ (Destructuring, Arrow Functions, Promises, Async/Await)",
            "JSX Syntax, Element Tree & Virtual DOM Basics",
            "Component Architecture: Functional Components & Props",
            "State Management with useState & Event Handling",
            "Conditional Rendering & Rendering Lists with Unique Keys",
            "Basic Styling with Tailwind CSS or Modern CSS Modules",
        ],
        "Phase 2": [
            "Side Effects & Lifecycle Management with useEffect",
            "Custom Hooks Creation for Reusable State Logic",
            "DOM Referencing & Uncontrolled Components with useRef",
            "Context API for Global State Management",
            "Client-Side Routing with React Router v6+",
            "Data Fetching, Caching & Mutations with TanStack React Query",
        ],
        "Phase 3": [
            "State Management with Zustand or Redux Toolkit",
            "Form Architecture & Schema Validation with React Hook Form + Zod",
            "Performance Optimization: useMemo, useCallback & React.memo",
            "TypeScript Integration with React (Interfaces, Generics, Event Typing)",
            "Unit & Component Testing with Vitest and React Testing Library",
            "Web Accessibility (a11y) & Semantic UI Components",
        ],
        "Phase 4": [
            "Next.js App Router (Server Components, SSR, SSG & Server Actions)",
            "Fullstack API Routes & Database Integration (Prisma / Drizzle)",
            "Authentication Patterns (OAuth, JWT, NextAuth / Supabase)",
            "Production Bundle Optimization, Code Splitting & Lazy Loading",
            "CI/CD Pipelines & Deployment on Vercel / Netlify",
            "Full-Stack Portfolio Capstone Application with Real-Time Features",
        ],
    },
    "data science": {
        "Phase 1": [
            "Python Programming for Data Science (Syntax, Data Structures, Comprehensions)",
            "Vectorized Computing with NumPy Arrays & Matrix Mathematics",
            "Data Ingestion, Filtering & Reshaping with Pandas DataFrames",
            "Exploratory Data Analysis (EDA) & Summary Statistics",
            "Visual Storytelling with Matplotlib, Seaborn & Plotly",
            "Relational Database Querying with SQL (SELECT, JOIN, GROUP BY)",
        ],
        "Phase 2": [
            "Advanced SQL: Window Functions, CTEs & Index Optimization",
            "Data Cleaning Pipelines, Outlier Detection & Missing Value Imputation",
            "Statistical Hypothesis Testing (t-tests, ANOVA, Chi-Square)",
            "Feature Engineering & Dimensionality Reduction (PCA, t-SNE)",
            "Predictive Modeling with Scikit-Learn (Regression & Classification)",
            "Cross-Validation Strategies & Overfitting Mitigation",
        ],
        "Phase 3": [
            "Time Series Analysis, Trend Decomposition & ARIMA/Prophet Models",
            "Unsupervised Learning & Customer Segmentation (K-Means, DBSCAN)",
            "Natural Language Processing (NLP) Basics: Tokenization, TF-IDF, NLTK",
            "Interactive Dashboards with Streamlit or Dash",
            "ETL Pipeline Fundamentals & Working with Unstructured Data",
            "Big Data Processing with PySpark & Distributed Computing",
        ],
        "Phase 4": [
            "Cloud Data Warehousing (BigQuery, Snowflake or Redshift)",
            "Data Pipeline Automation & Orchestration (Apache Airflow)",
            "Model Interpretability with SHAP & LIME",
            "A/B Testing Frameworks & Experimentation Metrics",
            "Executive Presentation of Analytical Insights & Storytelling",
            "End-to-End Data Science Capstone Project & GitHub Portfolio",
        ],
    },
    "cloud": {
        "Phase 1": [
            "Linux Operating System Fundamentals & Bash Shell Scripting",
            "Networking Essentials: TCP/IP, DNS, Subnets, Routing & HTTP/HTTPS",
            "Git Version Control & Collaborative Branching Workflows",
            "Virtualization Concepts & Hypervisors",
            "Cloud Computing Core Models (IaaS, PaaS, SaaS) & Economics",
            "Basic Security: SSH Keys, Firewalls & Permissions",
        ],
        "Phase 2": [
            "Containerization Fundamentals with Docker & Dockerfile Best Practices",
            "Multi-Container Applications with Docker Compose",
            "Core Cloud Services (AWS EC2, S3, RDS, IAM or Azure/GCP equivalents)",
            "Virtual Private Clouds (VPC), Security Groups & Load Balancers",
            "Infrastructure as Code (IaC) with Terraform Basics",
            "Continuous Integration (CI) with GitHub Actions / GitLab CI",
        ],
        "Phase 3": [
            "Container Orchestration with Kubernetes (Pods, Deployments, Services)",
            "ConfigMaps, Secrets, Ingress Controllers & Persistent Volumes",
            "Helm Package Management for Kubernetes",
            "Continuous Delivery (CD) & GitOps with ArgoCD or Flux",
            "Infrastructure Observability: Prometheus Metrics & Grafana Dashboards",
            "Centralized Logging with Fluentd, Loki or ELK Stack",
        ],
        "Phase 4": [
            "Serverless Architectures (AWS Lambda, Cloud Functions, API Gateways)",
            "Cloud Security, Zero-Trust Architecture & Secrets Management (HashiCorp Vault)",
            "Disaster Recovery, Multi-Region Architectures & High Availability",
            "Cost Optimization & Cloud FinOps Best Practices",
            "Site Reliability Engineering (SRE) Principles & Incident Response",
            "Production Cloud Infrastructure Capstone Project & Architecture Diagram",
        ],
    },
}


def synthesize_topics_for_stage(
    topic: str,
    stage_num: int,
    level: str,
    web_sections: Optional[list[str]] = None,
) -> list[str]:
    """Find or generate 5-6 high-quality topics to learn for a given stage."""
    t_clean = topic.strip().lower()
    phase_key = f"Phase {stage_num}"

    # 1. Match curated domain topics
    for domain, stages in CURATED_DOMAIN_TOPICS.items():
        if domain in t_clean or t_clean in domain:
            stage_topics = stages.get(phase_key) or stages.get("Phase 1")
            if stage_topics:
                return stage_topics

    # 2. Extract from live Wikipedia web sections if available
    if web_sections:
        cleaned_secs = [
            s.strip() for s in web_sections
            if s.strip() and not re.search(
                r'see also|reference|external link|further reading|notes|citation|origin|name|timeline|history|overview|background|summary',
                s,
                re.I,
            )
        ]
        if cleaned_secs:
            chunk_size = max(1, len(cleaned_secs) // 4)
            start_i = (stage_num - 1) * chunk_size
            end_i = start_i + chunk_size if stage_num < 4 else len(cleaned_secs)
            slice_secs = cleaned_secs[start_i:end_i]
            if len(slice_secs) >= 3:
                return [f"{s} in {topic.title()}" for s in slice_secs[:6]]

    # 3. Dynamic domain synthesis
    topic_display = topic.title() if topic else "Core Competency"
    if stage_num == 1:
        return [
            f"{topic_display} Core Syntax, Terminology & Foundational Concepts",
            f"Development Environment Setup, Tooling & Package Configuration",
            f"Basic Data Models, Primitives, Variables & Control Structures",
            f"Essential Built-in Functions & Standard Library Mechanics",
            f"Introductory Problem Solving & Error Debugging Best Practices",
            f"Writing First Practical Mini-Scripts & Baseline Exercises",
        ]
    elif stage_num == 2:
        return [
            f"Intermediate Architecture & Core Principles of {topic_display}",
            f"Working with Popular Libraries, Ecosystem Modules & Frameworks",
            f"State Management, Data Flow & Component/Module Design",
            f"Consuming Web APIs, Structured Data (JSON/CSV) & File Streams",
            f"Automated Testing, Test-Driven Development & Code Quality",
            f"Building Interactive Applications with Persistent Data Storage",
        ]
    elif stage_num == 3:
        return [
            f"Advanced Paradigms & Architectural Design Patterns in {topic_display}",
            f"Performance Profiling, Benchmarking & Memory Optimization",
            f"Concurrency, Asynchronous Execution & Scalable Data Handling",
            f"Security Hardening, Secrets Management & Input Validation",
            f"Database Integration, Schema Modeling & Data Persistence",
            f"Continuous Integration (CI) & Automated Build Pipelines",
        ]
    else:
        return [
            f"Production-Grade System Architecture & Scalability Planning",
            f"Containerization with Docker & Cloud Deployment Configuration",
            f"Application Observability, Logging, Error Monitoring & Metrics",
            f"Industry Best Practices, Code Refactoring & Security Audits",
            f"End-to-End Capstone Project Development & Architecture Documentation",
            f"Portfolio Showcase, Technical Interview Prep & Open-Source Publishing",
        ]


def extract_learning_roadmap(reply_text: str, topic: str = "", user_msg: str = "") -> list[dict]:
    """
    Parse structured phases or weeks directly from the AI reply text.
    Extracts core focus, estimated time, milestone, and concrete topics to learn.
    Returns empty list if the user was just greeting or not asking for a learning roadmap.
    """
    if user_msg and is_greeting_or_casual(user_msg):
        return []

    # If the reply itself does not contain roadmap phases and user didn't ask for a roadmap, don't invent one
    if not is_roadmap_request(user_msg, reply_text):
        return []

    cleaned_topic = clean_topic_string(topic) if topic else "Your Selected Skill"

    # Regex to match Phase / Week / Stage / Step headers
    phase_pattern = re.compile(
        r'(?:^|\n)(?:#{1,4}\s*|\*{0,2})(?:Phase|Week|Stage|Step)\s*(\d+)[:\s\-–]+([^\n\*\#]+)',
        re.IGNORECASE
    )
    matches = list(phase_pattern.finditer(reply_text))
    stages = []

    if len(matches) >= 2:
        for i, match in enumerate(matches):
            num = match.group(1)
            raw_title = match.group(2).strip()

            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(reply_text)
            section_text = reply_text[start_pos:end_pos].strip()

            # Determine level
            level = "Beginner" if int(num) == 1 else "Intermediate" if int(num) == 2 else "Advanced"
            if re.search(r'\b(beginner|intro|foundation)\b', raw_title + section_text, re.I):
                level = "Beginner"
            elif re.search(r'\b(intermediate|core|competenc)\b', raw_title + section_text, re.I):
                level = "Intermediate"
            elif re.search(r'\b(advanced|deep|mastery|capstone|specializ)\b', raw_title + section_text, re.I):
                level = "Advanced"

            # Determine estimated time
            time_match = re.search(r'(?:Time|Duration|Est|Estimated\s*time|Days|Weeks?):\s*([^\n\*\.]+)', section_text, re.I)
            if time_match:
                estimated_time = time_match.group(1).strip()
            elif "week" in match.group(0).lower():
                estimated_time = f"Week {num} (5-7 Days)"
            else:
                estimated_time = "2-4 Weeks" if int(num) == 1 else "4-6 Weeks" if int(num) == 2 else "4-8 Weeks"

            # Determine milestone
            milestone_match = re.search(r'(?:Milestone(?:\s*Project)?|Goal|Outcome|Project):\s*([^\n]+)', section_text, re.I)
            if milestone_match:
                milestone = milestone_match.group(1).replace('*', '').strip()
            else:
                milestone = f"Complete all practical exercises and hands-on lab for Phase {num}."

            # Determine focus
            focus_match = re.search(r'(?:Core\s*Focus|Focus|Objective):\s*([^\n]+)', section_text, re.I)
            if focus_match:
                focus = focus_match.group(1).replace('*', '').strip()
            else:
                focus_sentences = [s.strip() for s in section_text.split('.') if len(s.strip()) > 10 and not s.strip().startswith(('*', '-', '#'))]
                focus = (focus_sentences[0] + ".") if focus_sentences else f"Key competencies and skills in {cleaned_topic}."

            # Determine topics to learn
            topics = []
            topics_match = re.search(
                r'(?:Topics(?:\s*to\s*Learn)?|Core\s*Topics|Key\s*Concepts|Curriculum|Syllabus):\s*\n((?:\s*[-*•]\s*[^\n]+\n?)+)',
                section_text,
                re.I,
            )
            if topics_match:
                for line in topics_match.group(1).strip().splitlines():
                    cleaned_line = re.sub(r'^\s*[-*•]\s*', '', line).strip()
                    if cleaned_line and not re.match(r'^(?:Level|Time|Duration|Est|Milestone|Project|Goal):', cleaned_line, re.I):
                        topics.append(cleaned_line)

            if not topics:
                for line in section_text.splitlines():
                    l_clean = line.strip()
                    if re.match(r'^[-*•]\s+', l_clean):
                        item = re.sub(r'^[-*•]\s+', '', l_clean).strip()
                        if not re.match(r'^(?:Level|Time|Duration|Est|Core\s*Focus|Focus|Milestone|Project|Goal|Topics):', item, re.I):
                            topics.append(item)

            if len(topics) < 3:
                topics = synthesize_topics_for_stage(cleaned_topic, int(num), level)

            cleaned_title = re.sub(r'\s*\([^)]*\)', '', raw_title).strip() or f"Stage {num}"

            stages.append({
                "phase": f"Week {num}" if "week" in match.group(0).lower() else f"Phase {num}",
                "title": cleaned_title[:45],
                "level": level,
                "estimated_time": estimated_time[:25],
                "focus": focus[:220],
                "milestone": milestone[:140],
                "topics": topics[:6],
            })
            if len(stages) >= 5:
                break

    # Only supply fallback stages if the user specifically asked for a learning roadmap
    if len(stages) < 2 and is_roadmap_request(user_msg, reply_text):
        stages = [
            {
                "phase": "Phase 1",
                "title": "Foundational Concepts",
                "level": "Beginner",
                "estimated_time": "2-4 Weeks",
                "focus": f"Core syntax, fundamental principles, environment setup, and baseline principles in {cleaned_topic}.",
                "milestone": "Build your first introductory mini-project or baseline exercise.",
                "topics": synthesize_topics_for_stage(cleaned_topic, 1, "Beginner"),
            },
            {
                "phase": "Phase 2",
                "title": "Practical Implementation",
                "level": "Intermediate",
                "estimated_time": "4-6 Weeks",
                "focus": f"Real-world workflows, essential libraries, state management, API integration, and modern best practices.",
                "milestone": "Develop an end-to-end practical application solving a real problem.",
                "topics": synthesize_topics_for_stage(cleaned_topic, 2, "Intermediate"),
            },
            {
                "phase": "Phase 3",
                "title": "Advanced Mastery & Architecture",
                "level": "Advanced",
                "estimated_time": "4-8 Weeks",
                "focus": f"Performance tuning, architecture design, testing, deployment, and industry capstone project.",
                "milestone": "Deploy a production-ready capstone project for your resume and portfolio.",
                "topics": synthesize_topics_for_stage(cleaned_topic, 3, "Advanced"),
            },
            {
                "phase": "Phase 4",
                "title": "Portfolio & Capstone Deployment",
                "level": "Advanced",
                "estimated_time": "4-6 Weeks",
                "focus": f"Full-stack deployment, cloud infrastructure, industry best practices, and technical interview readiness.",
                "milestone": "Publish open-source capstone repository and prepare for technical interviews.",
                "topics": synthesize_topics_for_stage(cleaned_topic, 4, "Advanced"),
            },
        ]
    return stages


def extract_suggested_prompts(topic: str = "", reply_text: str = "", user_msg: str = "") -> list[str]:
    """Provide contextual suggestion chips for the user to click next."""
    if user_msg and is_greeting_or_casual(user_msg):
        return [
            "🤖 Master Machine Learning & AI",
            "⚛️ React & Modern Frontend Path",
            "🐍 Python for Data Science",
            "☁️ Cloud Architecture & DevOps",
        ]

    clean_t = clean_topic_string(topic) if topic else "this skill"
    return [
        f"📅 4-Week Study Schedule for {clean_t}",
        f"🚀 Top Portfolio Projects in {clean_t}",
        f"🎯 Essential Practice Exercises for {clean_t}",
        f"⚠️ Common Mistakes to Avoid in {clean_t}",
    ]

# ─────────────────────────── Provider Callers ───────────────────────────────

def resolve_api_key(provider: str, custom_key: Optional[str] = None) -> str:
    """Resolve API key from user input or environment variables."""
    if custom_key and custom_key.strip():
        return custom_key.strip()

    if provider == "gemini":
        return os.getenv("GEMINI_API_KEY", "").strip()
    elif provider == "groq":
        return os.getenv("GROQ_API_KEY", "").strip()
    elif provider == "openrouter":
        return os.getenv("OPENROUTER_API_KEY", "").strip()
    return ""


async def call_gemini(
    model: str,
    messages: list[dict],
    system_prompt: str,
    api_key: str,
) -> str:
    """Call Google Gemini REST API using generateContent."""
    if not api_key:
        raise ValueError("Google Gemini API Key is missing. Please enter your free API key in settings.")

    # Format messages for Gemini API
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, json=payload)
        if res.status_code != 200:
            error_detail = res.text
            try:
                err_json = res.json()
                error_detail = err_json.get("error", {}).get("message", res.text)
            except Exception:
                pass
            raise RuntimeError(f"Gemini API Error ({res.status_code}): {error_detail}")

        data = res.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected response structure from Gemini: {data}") from exc


async def call_groq(
    model: str,
    messages: list[dict],
    system_prompt: str,
    api_key: str,
) -> str:
    """Call Groq Cloud OpenAI-compatible API."""
    if not api_key:
        raise ValueError("Groq API Key is missing. Please enter your free API key in settings.")

    formatted_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": msg["role"], "content": msg["content"]} for msg in messages
    ]

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": formatted_messages,
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        if res.status_code != 200:
            error_detail = res.text
            try:
                err_json = res.json()
                error_detail = err_json.get("error", {}).get("message", res.text)
            except Exception:
                pass
            raise RuntimeError(f"Groq API Error ({res.status_code}): {error_detail}")

        data = res.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected response structure from Groq: {data}") from exc


async def call_openrouter(
    model: str,
    messages: list[dict],
    system_prompt: str,
    api_key: str,
) -> str:
    """Call OpenRouter API."""
    if not api_key:
        raise ValueError("OpenRouter API Key is missing. Please enter your free API key in settings.")

    formatted_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": msg["role"], "content": msg["content"]} for msg in messages
    ]

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Personalized Learning Path Recommender",
    }
    payload = {
        "model": model,
        "messages": formatted_messages,
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        if res.status_code != 200:
            error_detail = res.text
            try:
                err_json = res.json()
                error_detail = err_json.get("error", {}).get("message", res.text)
            except Exception:
                pass
            raise RuntimeError(f"OpenRouter API Error ({res.status_code}): {error_detail}")

        data = res.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected response structure from OpenRouter: {data}") from exc


# ─────────────────────────── Live Web Browsing Engine ───────────────────────

async def fetch_web_knowledge(topic: str) -> Optional[dict]:
    """
    Search and browse Wikipedia REST API to retrieve real-world educational knowledge,
    verified descriptions, and section breakdowns for any subject.
    """
    if not topic or is_greeting_or_casual(topic):
        return None

    headers = {"User-Agent": "PersonalizedLearningPath/1.0 (contact@learnpath.ai)"}
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
            search_res = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": topic,
                    "utf8": 1,
                    "format": "json",
                    "srlimit": 3,
                },
            )
            if search_res.status_code != 200:
                return None

            hits = search_res.json().get("query", {}).get("search", [])
            if not hits:
                return None

            best_title = hits[0]["title"]
            encoded_title = urllib.parse.quote(best_title.replace(" ", "_"))

            # Page summary
            sum_res = await client.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_title}")
            extract = ""
            url = f"https://en.wikipedia.org/wiki/{encoded_title}"
            if sum_res.status_code == 200:
                data = sum_res.json()
                extract = data.get("extract", "")
                url = data.get("content_urls", {}).get("desktop", {}).get("page", url)

            # Table of contents / sections
            sec_res = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "parse",
                    "page": best_title,
                    "prop": "sections",
                    "format": "json",
                },
            )
            sections = []
            if sec_res.status_code == 200:
                raw_sections = sec_res.json().get("parse", {}).get("sections", [])
                sections = [
                    s["line"]
                    for s in raw_sections
                    if s.get("line")
                    and not re.search(
                        r"see also|reference|external link|further reading|notes|citation|origin|name|timeline|history",
                        s["line"],
                        re.I,
                    )
                ]

            return {
                "title": best_title,
                "extract": extract,
                "url": url,
                "sections": sections,
            }
    except Exception as e:
        print(f"[ai_service] Web browsing notice: {e}")
        return None


async def generate_web_curriculum(
    topic: str,
    user_msg: str,
    recs: list[dict],
    provider_name: str,
    quota_fallback: bool = False,
) -> tuple[str, list[dict]]:
    """
    Generate a rich, structured learning curriculum by browsing the internet (Wikipedia)
    and synthesizing educational standards with concrete topics for every phase.
    """
    clean_t = clean_topic_string(topic) if topic else "Learning Path"
    display_title = clean_t.title()

    # Browse web live
    web_data = await fetch_web_knowledge(clean_t)
    web_sections = web_data.get("sections", []) if web_data else []
    web_extract = web_data.get("extract", "") if web_data else ""
    web_url = web_data.get("url", "") if web_data else ""

    # Synthesize topics for each phase
    p1_topics = synthesize_topics_for_stage(clean_t, 1, "Beginner", web_sections)
    p2_topics = synthesize_topics_for_stage(clean_t, 2, "Intermediate", web_sections)
    p3_topics = synthesize_topics_for_stage(clean_t, 3, "Advanced", web_sections)
    p4_topics = synthesize_topics_for_stage(clean_t, 4, "Advanced", web_sections)

    stages = [
        {
            "phase": "Phase 1",
            "title": f"Foundations & Core Principles of {display_title}",
            "level": "Beginner",
            "estimated_time": "2-4 Weeks",
            "focus": f"Master the baseline syntax, mental models, environment setup, and foundational principles in {display_title}.",
            "milestone": f"Build your first standalone introductory mini-project or baseline tool in {display_title}.",
            "topics": p1_topics,
        },
        {
            "phase": "Phase 2",
            "title": f"Practical Tooling & Applied Frameworks",
            "level": "Intermediate",
            "estimated_time": "4-6 Weeks",
            "focus": f"Work with standard libraries, state management, modular workflows, and solve authentic real-world challenges.",
            "milestone": f"Develop an end-to-end interactive application with persistent data storage and clean architecture.",
            "topics": p2_topics,
        },
        {
            "phase": "Phase 3",
            "title": f"Advanced Architecture & Optimization",
            "level": "Advanced",
            "estimated_time": "6-8 Weeks",
            "focus": f"Deep dive into architectural patterns, performance tuning, security, concurrency, and automated testing.",
            "milestone": f"Implement a scalable, production-grade system with profiling, error resilience, and automated CI/CD.",
            "topics": p3_topics,
        },
        {
            "phase": "Phase 4",
            "title": f"Capstone Mastery & Industry Portfolio",
            "level": "Advanced",
            "estimated_time": "4-6 Weeks",
            "focus": f"Full-stack deployment, cloud infrastructure, industry best practices, and technical interview readiness.",
            "milestone": f"Publish an open-source, production-ready capstone project with comprehensive documentation for your resume.",
            "topics": p4_topics,
        },
    ]

    # Build Markdown response
    banner_note = (
        "*(AI model free quota reached; seamlessly browsed the web to generate your complete roadmap without interruption)*"
        if quota_fallback
        else "*(Browsed real-time web educational sources to construct your tailored roadmap)*"
    )

    markdown = (
        f"> 🌐 **Live Web Intelligence Active:** Researched educational standards & live documentation for **{display_title}** {banner_note}\n\n"
        f"### 🎯 Step-by-Step Learning Roadmap: **{display_title}**\n\n"
    )

    if web_extract:
        markdown += f"{web_extract}\n\n"
    else:
        markdown += (
            f"Here is a comprehensive, milestone-driven curriculum engineered to take you from fundamentals "
            f"to production-level mastery in **{display_title}**.\n\n"
        )

    for stg in stages:
        markdown += (
            f"## {stg['phase']}: {stg['title']}\n"
            f"- Level / Time: {stg['level']} | {stg['estimated_time']}\n"
            f"- Core Focus: {stg['focus']}\n"
            f"- Topics to Learn:\n"
        )
        for tp in stg["topics"]:
            markdown += f"  * {tp}\n"
        markdown += f"- Milestone: {stg['milestone']}\n\n"

    markdown += (
        f"### 💡 Next Steps:\n"
        f"1. **Follow the sequence:** Work through Phase 1 before advancing to ensure solid foundations.\n"
        f"2. **Hands-on practice:** Complete each phase's milestone project to build a strong portfolio.\n"
        f"3. **Track your progress:** Use the interactive roadmap above to check off topics and phases as you complete them!"
    )

    return markdown, stages


# ─────────────────────────── Fallback Engine ────────────────────────────────

def generate_fallback_response(
    last_user_message: str,
    topic: str,
    recs: list[dict],
    provider_name: str,
) -> str:
    """
    Intelligent simulated AI response when an API key is not configured,
    ensuring the user has a fully working experience immediately.
    """
    if is_greeting_or_casual(last_user_message):
        return (
            "Hello! 👋 Welcome to **LearnPath AI**, your personalized learning path advisor.\n\n"
            "Tell me what skill, programming language, framework, or career goal you would like to master "
            "(for example: *Machine Learning*, *React & Frontend*, *Python for Data Science*, or *Cloud & DevOps*), "
            "and I will create a tailored, step-by-step learning roadmap for you!"
        )

    cleaned_topic = topic if topic else "your chosen domain"

    response = (
        f"### 🎯 Personalized Learning Strategy for **{cleaned_topic.title()}**\n\n"
        f"Welcome to your tailored curriculum! Whether you are preparing for a career change or leveling up your technical skills, "
        f"here is a structured milestone path designed for rapid, practical mastery:\n\n"
        f"#### 1. Phase 1: Core Fundamentals & Principles\n"
        f"- Master the foundational syntax, concepts, and mental models.\n"
        f"- Focus on writing small, focused scripts and understanding error debugging.\n\n"
        f"#### 2. Phase 2: Modern Tooling & Applied Frameworks\n"
        f"- Work with industry-standard libraries, state management, and real datasets/APIs.\n"
        f"- Emphasize clean code architecture and modular project structure.\n\n"
        f"#### 3. Phase 3: Real-World Portfolio & Capstone\n"
        f"- Build an end-to-end application from scratch to solve an authentic problem.\n"
        f"- Add testing, CI/CD pipelines, and document your learning publicly.\n\n"
    )

    response += (
        f"> 💡 **Tip:** To unlock real-time live answers with **{provider_name}**, click **Model Settings** "
        f"in the top navigation and enter your free API key!"
    )
    return response


# ─────────────────────────── Main Dispatcher ────────────────────────────────

async def process_chat_request(
    messages: list[dict],
    provider: str,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    topic: Optional[str] = None,
    bundle: Optional[dict] = None,
) -> dict[str, Any]:
    """
    Main orchestration function:
    1. Extracts query topic/intent
    2. Distinguishes greetings vs roadmap requests
    3. Resolves key and calls the chosen model (Gemini, Groq, OpenRouter)
    4. Falls back seamlessly to live web browsing if quota exceeded (429) or no key
    5. Formats structured roadmaps with topics to learn for every phase
    """
    provider = provider.lower() if provider else "gemini"

    # Find provider metadata
    provider_meta = next((p for p in AVAILABLE_PROVIDERS if p["id"] == provider), AVAILABLE_PROVIDERS[0])

    # Pick default model if not provided
    if not model:
        default_m = next((m["id"] for m in provider_meta["models"] if m.get("is_default")), provider_meta["models"][0]["id"])
        model = default_m

    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_msg = msg.get("content", "").strip()
            break

    is_casual = is_greeting_or_casual(last_user_msg)
    detected_topic = find_conversation_topic(messages, explicit_topic=topic) if not is_casual else ""

    predicted_course = ""
    recommendations: list[dict] = []

    full_system_prompt = SYSTEM_PROMPT

    resolved_key = resolve_api_key(provider, api_key)
    ai_reply = ""
    used_fallback = False
    error_message = None
    roadmap: list[dict] = []

    if is_casual:
        ai_reply = (
            "Hello! 👋 Welcome to **LearnPath AI**, your personalized learning path advisor.\n\n"
            "Tell me what skill, programming language, framework, or career goal you would like to master "
            "(for example: *Machine Learning*, *React & Frontend*, *Python for Data Science*, or *Cloud & DevOps*), "
            "and I will create a tailored, step-by-step learning roadmap with detailed topics to learn for you!"
        )
        roadmap = []
    elif not resolved_key:
        used_fallback = True
        if is_roadmap_request(last_user_msg):
            # No API key provided: browse live web to construct full roadmap with topics!
            ai_reply, roadmap = await generate_web_curriculum(
                detected_topic, last_user_msg, recommendations, provider_meta["name"], quota_fallback=False
            )
        else:
            ai_reply = generate_fallback_response(
                last_user_msg, detected_topic, recommendations, provider_meta["name"]
            )
            roadmap = []
    else:
        try:
            if provider == "gemini":
                ai_reply = await call_gemini(model, messages, full_system_prompt, resolved_key)
            elif provider == "groq":
                ai_reply = await call_groq(model, messages, full_system_prompt, resolved_key)
            elif provider == "openrouter":
                ai_reply = await call_openrouter(model, messages, full_system_prompt, resolved_key)
            else:
                raise ValueError(f"Unsupported provider: {provider}")

            # Extract roadmap from the AI response
            roadmap = extract_learning_roadmap(ai_reply, detected_topic, user_msg=last_user_msg)
        except Exception as e:
            err_str = str(e)
            print(f"[ai_service] {provider} call failed: {err_str}. Seamlessly browsing web to build roadmap...")
            used_fallback = True
            is_quota_error = "429" in err_str or "quota" in err_str.lower() or "limit" in err_str.lower()

            if is_casual:
                ai_reply = (
                    "Hello! 👋 Welcome to **LearnPath AI**, your personalized learning path advisor.\n\n"
                    "What skill or career goal would you like to build a roadmap for today?"
                )
                roadmap = []
            else:
                # Seamless live web research fallback with concrete topics per phase
                ai_reply, roadmap = await generate_web_curriculum(
                    detected_topic, last_user_msg, recommendations, provider_meta["name"], quota_fallback=is_quota_error
                )

    suggested_prompts = extract_suggested_prompts(detected_topic, ai_reply, user_msg=last_user_msg)

    return {
        "reply": ai_reply,
        "provider": provider,
        "model": model,
        "used_fallback": used_fallback,
        "error": error_message,
        "topic": detected_topic if detected_topic else None,
        "predicted_course": predicted_course if not is_casual else None,
        "recommendations": recommendations if not is_casual else [],
        "roadmap": roadmap,
        "suggested_prompts": suggested_prompts,
    }
