import type { ChatMessage } from '../types'
import RoadmapVisualizer from './RoadmapVisualizer'
import SuggestedPrompts from './SuggestedPrompts'
import { Bot, User, Sparkles, Zap, Globe, AlertCircle } from 'lucide-react'

interface Props {
  message: ChatMessage
  onSelectPrompt?: (prompt: string) => void
  onOpenSettings?: () => void
}

/** Rich Markdown formatter for assistant responses */
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    // Heading 3 / 4
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} className="mt-3 mb-1.5 text-base font-bold text-white">
          {renderInline(line.replace('### ', ''))}
        </h3>
      )
    }
    if (line.startsWith('#### ')) {
      return (
        <h4 key={idx} className="mt-2.5 mb-1 text-sm font-semibold text-[#e1d9fc]">
          {renderInline(line.replace('#### ', ''))}
        </h4>
      )
    }
    // Blockquote
    if (line.startsWith('> ')) {
      return (
        <blockquote
          key={idx}
          className="my-2 border-l-2 border-purple-500/60 bg-purple-950/15 py-1.5 px-3 rounded-r-lg text-xs italic text-[#c8c5e6]"
        >
          {renderInline(line.replace('> ', ''))}
        </blockquote>
      )
    }
    // Bullet list item
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().replace(/^[-*]\s+/, '')
      return (
        <li key={idx} className="ml-4 list-disc text-xs text-[#cfcfdc] leading-relaxed my-0.5">
          {renderInline(content)}
        </li>
      )
    }
    // Numbered list item
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      return (
        <div key={idx} className="ml-2 flex items-start gap-2 my-1 text-xs text-[#cfcfdc] leading-relaxed">
          <span className="font-semibold text-purple-400">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      )
    }
    // Regular line
    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />
    }
    return (
      <p key={idx} className="text-xs sm:text-sm leading-relaxed text-[#d4d4e0] my-0.5">
        {renderInline(line)}
      </p>
    )
  })
}

function renderInline(text: string) {
  // Bold formatting **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export default function MessageBubble({ message, onSelectPrompt, onOpenSettings }: Props) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 px-4 py-3">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-gradient-to-r from-[#1e3456] to-[#172c4a] px-4 py-3 text-[#e6f1ff] shadow-md border border-cyan-800/30">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b3456] text-cyan-200 border border-cyan-700/40 shadow-sm">
          <User size={15} />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-950/60 border border-rose-800/50 text-rose-400">
          <Bot size={15} />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-rose-300">
          <p className="text-sm">{message.text}</p>
        </div>
      </div>
    )
  }

  // Assistant message
  const roadmap = message.roadmap

  // Clean message text: completely strip any "Recommended Courses from our Catalog" section
  const cleanedText = message.text
    .replace(/(?:^|\n)#{2,4}\s*(?:📚\s*)?(?:Recommended|Top Matched) Courses[^\n]*\n(?:(?:[-*•]\s*[^\n]*\n?)+|\n)*/gi, '\n')
    .trim()

  // Split content so Next Steps appears AFTER the roadmap
  let textBefore = cleanedText
  let textAfter = ''

  if (roadmap && roadmap.length > 0) {
    const splitMatch = cleanedText.search(/(?:^|\n)(?=#{2,4}\s*(?:💡\s*)?Next Steps)/i)
    if (splitMatch !== -1) {
      textBefore = cleanedText.slice(0, splitMatch).trim()
      textAfter = cleanedText.slice(splitMatch).trim()
    }
  }

  const getProviderBadge = () => {
    if (!message.provider) return null
    if (message.provider === 'gemini') {
      return (
        <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
          <Sparkles size={10} /> Google Gemini {message.model ? `(${message.model})` : ''}
        </span>
      )
    }
    if (message.provider === 'groq') {
      return (
        <span className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-300 border border-orange-500/20">
          <Zap size={10} /> Groq Cloud {message.model ? `(${message.model})` : ''}
        </span>
      )
    }
    if (message.provider === 'openrouter') {
      return (
        <span className="flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/20">
          <Globe size={10} /> OpenRouter {message.model ? `(${message.model})` : ''}
        </span>
      )
    }
    return null
  }

  return (
    <div className="flex gap-3 px-4 py-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-sm">
        <Bot size={15} />
      </div>

      <div className="min-w-0 flex-1">
        {/* Model Attribution Badge */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {getProviderBadge()}
          {message.used_fallback && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
            >
              <AlertCircle size={10} />
              <span>Simulated Mode (Click to add free key)</span>
            </button>
          )}
        </div>

        {/* 1. Main text (Introduction & Phase breakdown) */}
        {textBefore && <div className="space-y-1">{renderMarkdown(textBefore)}</div>}

        {/* 2. Structured Roadmap Visualizer */}
        {roadmap && roadmap.length > 0 && (
          <div className="my-4">
            <RoadmapVisualizer stages={roadmap} topic={message.topic} />
          </div>
        )}

        {/* 3. Recommended Courses and Next Steps - Rendered AFTER the Roadmap */}
        {textAfter && <div className="space-y-1 mt-4">{renderMarkdown(textAfter)}</div>}

        {/* 4. Suggested Prompts / Next Steps */}
        {message.suggested_prompts && onSelectPrompt && (
          <SuggestedPrompts
            prompts={message.suggested_prompts}
            onSelectPrompt={onSelectPrompt}
          />
        )}
      </div>
    </div>
  )
}
