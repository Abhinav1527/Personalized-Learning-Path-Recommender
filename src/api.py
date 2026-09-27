"""
api.py
------
FastAPI backend for the Personalized Learning Path Recommender.

Endpoints:
    POST /auth/register    -> create a new account
    POST /auth/login       -> obtain a JWT access token
    GET  /health           -> liveness check
    POST /recommend        -> top-10 course recommendations (requires JWT)

Usage:
    uvicorn src.api:app --reload --port 8000
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import ast
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from src.data_preprocessing import clean_text
from src.utils import load_model
from src.ai_service import (
    AVAILABLE_PROVIDERS,
    process_chat_request,
    get_candidate_courses,
)


import json

# ─────────────────────────────── Auth config ──────────────────────────────

SECRET_KEY  = os.getenv("SECRET_KEY", "change-me-in-production-32-chars!!")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24   # 24 hours

_pwd_ctx   = CryptContext(schemes=["bcrypt"], deprecated="auto")
_oauth2    = OAuth2PasswordBearer(tokenUrl="/auth/login")

USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "users.json")


def _load_users() -> dict[str, str]:
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_users(users: dict[str, str]) -> None:
    try:
        os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        print(f"[api] Error saving users: {e}")


# Persistent user store: { username: hashed_password }
_users: dict[str, str] = _load_users()


def _hash(password: str) -> str:
    return _pwd_ctx.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


def _create_token(username: str) -> str:
    expire  = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _get_current_user(token: Annotated[str, Depends(_oauth2)]) -> str:
    """Dependency: decode + validate JWT, return username."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise credentials_exc
        # Refresh in-memory cache if user registered in another worker/process
        if username not in _users:
            fresh = _load_users()
            if username in fresh:
                _users.update(fresh)
    except JWTError:
        raise credentials_exc
    return username


# ─────────────────────────────── Model state ──────────────────────────────

MODEL_PATH = "models/best_model.pkl"
TOP_K = 10
CANDIDATES = 200   # large pool so deduplication finds 10 distinct courses

_bundle: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model once on startup."""
    global _bundle
    print("[api] Loading model bundle...")
    _bundle = load_model(MODEL_PATH)
    print("[api] Model ready.")
    yield
    _bundle.clear()


# ─────────────────────────────── App ──────────────────────────────────────

app = FastAPI(
    title="Learning Path Recommender API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────── Schemas ──────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RecommendRequest(BaseModel):
    review: str


class CourseRecommendation(BaseModel):
    index: int
    course: str
    review_snippet: str


class RecommendResponse(BaseModel):
    predicted_course: str
    recommendations: list[CourseRecommendation]


class ChatMessagePayload(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    messages: list[ChatMessagePayload]
    provider: str = "gemini"
    model: str | None = None
    api_key: str | None = None
    topic: str | None = None


class RoadmapStage(BaseModel):
    phase: str
    title: str
    level: str
    estimated_time: str
    focus: str
    milestone: str
    topics: list[str] = []


class AIChatResponse(BaseModel):
    reply: str
    provider: str
    model: str
    used_fallback: bool
    error: str | None = None
    topic: str | None = None
    predicted_course: str | None = None
    recommendations: list[CourseRecommendation] = []
    roadmap: list[RoadmapStage] = []
    suggested_prompts: list[str] = []


# ─────────────────────────────── Routes ───────────────────────────────────

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest):
    if not req.username.strip() or not req.password:
        raise HTTPException(status_code=422, detail="Username and password are required")
    if req.username in _users:
        raise HTTPException(status_code=409, detail="Username already exists")
    _users[req.username] = _hash(req.password)
    _save_users(_users)
    return {"message": "Account created. You can now log in."}


@app.post("/auth/login", response_model=TokenResponse)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    hashed = _users.get(form.username)
    if not hashed or not _verify(form.password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(access_token=_create_token(form.username))


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": bool(_bundle)}


@app.get("/ai/providers")
def get_ai_providers():
    """Return available AI model providers and their current status."""
    providers_info = []
    for p in AVAILABLE_PROVIDERS:
        has_server_key = bool(os.getenv(p["env_var"], "").strip())
        providers_info.append({
            **p,
            "has_server_key": has_server_key,
        })
    return {"providers": providers_info}


@app.post("/ai/chat", response_model=AIChatResponse)
async def ai_chat(req: AIChatRequest, _user: Annotated[str, Depends(_get_current_user)]):
    """
    Conversational AI Recommender endpoint powered by Gemini, Groq, or OpenRouter free models.
    Enriched with course recommendations from the trained dataset and structured learning roadmaps.
    """
    raw_messages = [{"role": m.role, "content": m.content} for m in req.messages]
    result = await process_chat_request(
        messages=raw_messages,
        provider=req.provider,
        model=req.model,
        api_key=req.api_key,
        topic=req.topic,
        bundle=_bundle,
    )
    return AIChatResponse(**result)


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest, _user: Annotated[str, Depends(_get_current_user)]):
    if not _bundle:
        raise HTTPException(status_code=503, detail="Model not loaded")

    review = req.review.strip()
    if not review:
        raise HTTPException(status_code=422, detail="Review text is required")

    predicted_course, recs = get_candidate_courses(_bundle, review, top_k=TOP_K)

    return RecommendResponse(
        predicted_course=predicted_course,
        recommendations=[
            CourseRecommendation(
                index=r["index"],
                course=r["course"],
                review_snippet=r["review_snippet"],
            )
            for r in recs
        ],
    )
