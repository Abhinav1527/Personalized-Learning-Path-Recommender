import { useRef, useEffect } from 'react'
import type { ChatMessage } from '../types'
import MessageBubble from './MessageBubble'
import { Loader2, Sparkles, Compass, Layers, Bot } from 'lucide-react'

interface Props {
  messages: ChatMessage[]
  loading: boolean
  onSelectPrompt: (prompt: string) => void
  onOpenSettings: () => void
}

const EXAMPLE_TOPICS = [
  { label: '🤖 Machine Learning & AI', prompt: 'I want to master Machine Learning and Deep Learning' },
  { label: '⚛️ React & Modern Frontend', prompt: 'I want a learning path for React, TypeScript, and Next.js' },
  { label: '🐍 Python for Data Science', prompt: 'I want to learn Python for Data Science and Analytics' },
  { label: '🗄️ SQL & Data Engineering', prompt: 'Recommend a roadmap for SQL, databases, and data pipelines' },
  { label: '☁️ Cloud Architecture & DevOps', prompt: 'I want to learn Cloud Architecture and Docker / Kubernetes' },
  { label: '💼 Tech Interview Preparation', prompt: 'How should I prepare for software engineering technical interviews?' },
]

export default function ChatWindow({
  messages,
  loading,
  onSelectPrompt,
  onOpenSettings,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'assistant') {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages, loading])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center overflow-y-auto">
        {/* Hero */}
        <div className="max-w-xl">

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Personalized Learning Path Recommender
          </h2>
          <p className="mt-3 text-sm text-[#9e9eb2] leading-relaxed">
            Get dynamic step-by-step learning roadmaps, curriculum guidance, and hand-picked course recommendations from our catalog.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-[#2a2a34] bg-[#16161d] p-3.5 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 mb-2">
              <Bot size={15} />
            </div>
            <h4 className="text-xs font-semibold text-white">Top Free AI Models</h4>
            <p className="mt-1 text-[11px] text-[#8c8c9e] leading-snug">
              Seamlessly switch between Gemini 2.5 Flash, Groq Llama 3.3, and OpenRouter.
            </p>
          </div>

          <div className="rounded-xl border border-[#2a2a34] bg-[#16161d] p-3.5 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 mb-2">
              <Compass size={15} />
            </div>
            <h4 className="text-xs font-semibold text-white">Interactive Roadmaps</h4>
            <p className="mt-1 text-[11px] text-[#8c8c9e] leading-snug">
              Phase-by-phase roadmaps from beginner fundamentals to production capstones.
            </p>
          </div>

          <div className="rounded-xl border border-[#2a2a34] bg-[#16161d] p-3.5 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 mb-2">
              <Layers size={15} />
            </div>
            <h4 className="text-xs font-semibold text-white">Curated Course Match</h4>
            <p className="mt-1 text-[11px] text-[#8c8c9e] leading-snug">
              Machine-learned course ranking matched against student reviews and topics.
            </p>
          </div>
        </div>

        {/* Topic chips */}
        <div className="w-full max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#69697a]">
            Select an inspiration topic or ask anything below
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_TOPICS.map(({ label, prompt }) => (
              <button
                key={label}
                className="rounded-full border border-[#2c2c36] bg-[#1a1a22] px-3.5 py-1.5 text-xs text-[#a8a8bd] transition-all hover:border-purple-500/50 hover:bg-purple-950/20 hover:text-white"
                onClick={() => onSelectPrompt(prompt)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick config note */}
        <div className="flex items-center gap-2 text-xs text-[#707080]">
          <span>Want to customize API keys or models?</span>
          <button
            onClick={onOpenSettings}
            className="text-purple-400 hover:text-purple-300 underline font-medium"
          >
            Open Model Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl flex-1 py-4">
        {messages.map((m, idx) => {
          const isLatest = idx === messages.length - 1
          return (
            <div key={m.id} ref={isLatest ? lastMessageRef : undefined}>
              <MessageBubble
                message={m}
                onSelectPrompt={isLatest ? onSelectPrompt : undefined}
                onOpenSettings={onOpenSettings}
              />
            </div>
          )
        })}

        {loading && (
          <div className="flex gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <Loader2 size={15} className="animate-spin" />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#9c9cb0]">
              <Sparkles size={13} className="text-amber-400 animate-pulse" />
              <span>Formulating your roadmap and matching top courses…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
