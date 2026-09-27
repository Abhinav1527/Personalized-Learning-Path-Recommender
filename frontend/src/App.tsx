import { useState, useCallback, useEffect } from 'react'
import type { AuthUser, Conversation, ChatMessage, AIProvider } from './types'
import { getAIProviders, sendAIChat } from './services/api'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import AuthPage from './components/AuthPage'
import AIModelSelector from './components/AIModelSelector'
import AIConfigModal from './components/AIConfigModal'
import { Sparkles } from 'lucide-react'

function uid() {
  return Math.random().toString(36).slice(2)
}

const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Top Pick',
    tagline: 'Google AI Studio Free Tier',
    description: 'Fast multimodal intelligence with generous free limits on Google AI Studio.',
    key_url: 'https://aistudio.google.com/app/apikey',
    env_var: 'GEMINI_API_KEY',
    models: [
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Fast, high-quality reasoning', is_default: true },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', description: 'Ultra-lightweight fast responses', is_default: false },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Deep conceptual reasoning', is_default: false },
    ],
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    badge: 'Ultra Fast',
    tagline: 'Meta Llama & Mixtral Free Tier',
    description: 'Near-instant response generation powered by Groq LPUs.',
    key_url: 'https://console.groq.com/keys',
    env_var: 'GROQ_API_KEY',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Flagship 70B open weights model', is_default: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Super snappy responses', is_default: false },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'High context MoE architecture', is_default: false },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Multi-Model',
    tagline: 'DeepSeek & Llama Free Hub',
    description: 'Single API gateway accessing leading free tier models.',
    key_url: 'https://openrouter.ai/keys',
    env_var: 'OPENROUTER_API_KEY',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', description: 'Flagship 70B parameter open model', is_default: true },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', description: 'Advanced step-by-step reasoning', is_default: false },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', description: 'Balanced and efficient', is_default: false },
    ],
  },
]

function newConversation(): Conversation {
  return {
    id: uid(),
    title: 'New chat',
    messages: [],
    createdAt: new Date(),
    state: 'idle',
    context: {},
  }
}

const STORAGE_KEY = 'auth_user'

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser]                   = useState<AuthUser | null>(loadStoredUser)
  const [conversations, setConversations] = useState<Conversation[]>([newConversation()])
  const [activeId, setActiveId]           = useState<string>(conversations[0].id)
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)

  // AI Provider & Model selection state
  const [providers, setProviders]         = useState<AIProvider[]>(DEFAULT_PROVIDERS)
  const [activeProviderId, setActiveProviderId] = useState<string>(() => {
    return localStorage.getItem('ai_provider') || 'gemini'
  })
  const [activeModelId, setActiveModelId] = useState<string>(() => {
    return localStorage.getItem('ai_model') || 'gemini-3.5-flash'
  })
  const [isConfigOpen, setIsConfigOpen]   = useState(false)

  // Load available providers from backend
  useEffect(() => {
    getAIProviders()
      .then((data) => {
        if (data && data.providers && data.providers.length > 0) {
          setProviders(data.providers)
        }
      })
      .catch((err) => console.warn('Could not fetch remote providers, using defaults', err))
  }, [])

  const handleProviderChange = (newProviderId: string) => {
    setActiveProviderId(newProviderId)
    localStorage.setItem('ai_provider', newProviderId)

    const provider = providers.find((p) => p.id === newProviderId)
    const defaultModel = provider?.models.find((m) => m.is_default) || provider?.models[0]
    if (defaultModel) {
      setActiveModelId(defaultModel.id)
      localStorage.setItem('ai_model', defaultModel.id)
    }
  }

  const handleModelChange = (newModelId: string) => {
    setActiveModelId(newModelId)
    localStorage.setItem('ai_model', newModelId)
  }

  // Listen for example prompt clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setInput(text)
    }
    window.addEventListener('fill-prompt', handler)
    return () => window.removeEventListener('fill-prompt', handler)
  }, [])

  const updateConversation = useCallback(
    (id: string, updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)))
    },
    []
  )

  // Auth handlers
  const handleAuth = (u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
  }

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  if (!user) return <AuthPage onAuth={handleAuth} />

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const sendMessage = async (textToSend: string) => {
    const text = textToSend.trim()
    if (!text || loading) return

    const isFirst = active.messages.length === 0
    const userMsg: ChatMessage = { id: uid(), role: 'user', text, timestamp: new Date() }

    setInput('')

    // Append user message immediately
    updateConversation(activeId, (c) => ({
      ...c,
      title: isFirst ? text.slice(0, 36) + (text.length > 36 ? '…' : '') : c.title,
      messages: [...c.messages, userMsg],
    }))

    setLoading(true)

    try {
      // Gather previous messages for context
      const chatHistory = active.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.text }))

      chatHistory.push({ role: 'user', content: text })

      // Check for user-configured key in localStorage
      const customKey = localStorage.getItem(`api_key_${activeProviderId}`) || ''

      const res = await sendAIChat({
        messages: chatHistory,
        provider: activeProviderId,
        model: activeModelId,
        apiKey: customKey || undefined,
        topic: text.length < 60 ? text : undefined,
        token: user.token,
      })

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        text: res.reply,
        provider: res.provider,
        model: res.model,
        used_fallback: res.used_fallback,
        roadmap: res.roadmap,
        topic: res.topic || undefined,
        suggested_prompts: res.suggested_prompts,
        data:
          res.recommendations && res.recommendations.length > 0
            ? {
                predicted_course: res.predicted_course || res.topic || 'Recommended Path',
                recommendations: res.recommendations,
              }
            : undefined,
        timestamp: new Date(),
      }

      updateConversation(activeId, (c) => ({
        ...c,
        messages: [...c.messages, assistantMsg],
      }))
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Please check backend server status and API configuration.'
      if (errText.includes('Could not validate credentials') || errText.includes('401')) {
        handleSignOut()
        return
      }

      const errMsg: ChatMessage = {
        id: uid(),
        role: 'error',
        text: `Error communicating with AI service: ${errText}`,
        timestamp: new Date(),
      }

      updateConversation(activeId, (c) => ({
        ...c,
        messages: [...c.messages, errMsg],
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    sendMessage(input)
  }

  const handleSelectPrompt = (prompt: string) => {
    const cleanPrompt = prompt.replace(/^[^\w\d\s]+/u, '').trim()
    sendMessage(cleanPrompt)
  }

  const handleNew = () => {
    const conv = newConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setInput('')
  }

  const handleDelete = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id)
      if (next.length === 0) {
        const fresh = newConversation()
        setActiveId(fresh.id)
        return [fresh]
      }
      if (activeId === id) setActiveId(next[0].id)
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0c0e] text-[#ececec] font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[#0e0e12]">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between border-b border-[#22222a] bg-[#121217] px-5 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">
              {active.title === 'New chat' ? 'New Learning Session' : active.title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-300 border border-purple-500/20">
              <Sparkles size={11} className="text-amber-400" /> AI Recommender Active
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {/* Model Switcher Dropdown */}
            <AIModelSelector
              providers={providers}
              activeProviderId={activeProviderId}
              onProviderChange={handleProviderChange}
              activeModelId={activeModelId}
              onModelChange={handleModelChange}
              onOpenSettings={() => setIsConfigOpen(true)}
            />
          </div>
        </header>

        {/* Chat Window with Messages */}
        <ChatWindow
          messages={active.messages}
          loading={loading}
          onSelectPrompt={handleSelectPrompt}
          onOpenSettings={() => setIsConfigOpen(true)}
        />

        {/* Input Bar */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          loading={loading}
          disabled={false}
          placeholder="Ask for recommendations on any skill, topic, or course…"
        />
      </main>

      {/* Model & API Configuration Modal */}
      <AIConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        providers={providers}
        activeProviderId={activeProviderId}
        onProviderChange={handleProviderChange}
        activeModelId={activeModelId}
        onModelChange={handleModelChange}
      />
    </div>
  )
}
