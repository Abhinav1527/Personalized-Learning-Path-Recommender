// ─── Auth ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  username: string
  token: string
}

// ─── API ──────────────────────────────────────────────────────────────────

export interface CourseRecommendation {
  index: number
  course: string
  review_snippet: string
}

export interface RecommendResponse {
  predicted_course: string
  recommendations: CourseRecommendation[]
}

export interface RoadmapStage {
  phase: string
  title: string
  level: string
  estimated_time: string
  focus: string
  milestone: string
  topics?: string[]
}

export interface AIModel {
  id: string
  name: string
  description: string
  is_default?: boolean
}

export interface AIProvider {
  id: string
  name: string
  badge: string
  tagline: string
  description: string
  key_url: string
  env_var: string
  models: AIModel[]
  has_server_key?: boolean
}

export interface AIChatResponse {
  reply: string
  provider: string
  model: string
  used_fallback: boolean
  error?: string | null
  topic?: string | null
  predicted_course?: string | null
  recommendations?: CourseRecommendation[]
  roadmap?: RoadmapStage[]
  suggested_prompts?: string[]
}

// ─── Chat message types ────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  text: string
  data?: RecommendResponse
  roadmap?: RoadmapStage[]
  topic?: string
  suggested_prompts?: string[]
  provider?: string
  model?: string
  used_fallback?: boolean
  timestamp: Date
}

// ─── Conversation state machine ───────────────────────────────────────────
//
//  idle  ──►  gathering_topic  ──►  gathering_detail  ──►  recommending
//
//  idle            : fresh chat, bot will ask what the user wants to learn
//  gathering_topic : bot has asked for a topic, waiting for user's answer
//  gathering_detail: bot has the topic and asked a follow-up, waiting for details
//  recommending    : results shown, bot asks if they want to explore more
//

export type ConvState = 'idle' | 'gathering_topic' | 'gathering_detail' | 'recommending'

export interface ConvContext {
  topic?: string      // what the user wants to learn (e.g. "React", "machine learning")
  detail?: string     // skill level / goal / extra context from follow-up
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  state: ConvState
  context: ConvContext
}
