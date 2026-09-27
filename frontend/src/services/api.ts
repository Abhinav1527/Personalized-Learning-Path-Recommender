import type { AuthUser, RecommendResponse } from '../types'

// ─── Auth ─────────────────────────────────────────────────────────────────

export async function register(username: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
}

export async function login(username: string, password: string): Promise<AuthUser> {
  // OAuth2PasswordRequestForm expects form-encoded body
  const body = new URLSearchParams({ username, password })
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  const data = await res.json()
  return { username, token: data.access_token }
}

// ─── Recommendations ──────────────────────────────────────────────────────

export async function getRecommendations(
  review: string,
  token: string,
): Promise<RecommendResponse> {
  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ review }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<RecommendResponse>
}

// ─── AI Providers & Multi-Model Chat ──────────────────────────────────────

export async function getAIProviders(): Promise<{ providers: import('../types').AIProvider[] }> {
  const res = await fetch('/api/ai/providers')
  if (!res.ok) {
    throw new Error('Failed to load AI providers')
  }
  return res.json()
}

export interface SendAIChatParams {
  messages: { role: string; content: string }[]
  provider: string
  model?: string
  apiKey?: string
  topic?: string
  token: string
}

export async function sendAIChat(
  params: SendAIChatParams,
): Promise<import('../types').AIChatResponse> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      messages: params.messages,
      provider: params.provider,
      model: params.model,
      api_key: params.apiKey,
      topic: params.topic,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to communicate with AI service' }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<import('../types').AIChatResponse>
}
