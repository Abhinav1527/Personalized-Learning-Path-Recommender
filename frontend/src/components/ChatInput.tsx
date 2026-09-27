import { useRef, type KeyboardEvent } from 'react'
import { SendHorizonal, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  loading: boolean
  disabled: boolean
  placeholder?: string
}

export default function ChatInput({ value, onChange, onSubmit, loading, disabled, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && value.trim()) onSubmit()
    }
  }

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  return (
    <div className="border-t border-[#2e2e2e] bg-[#0f0f0f] px-4 py-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-end gap-3 rounded-2xl border border-[#2e2e2e] bg-[#1e1e1e] px-4 py-3 focus-within:border-[#7c5cd8]/60 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => { onChange(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Type a message…'}
            disabled={disabled || loading}
            className="flex-1 resize-none bg-transparent text-sm text-[#ececec] placeholder-[#555] outline-none disabled:opacity-50"
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />

          <button
            onClick={onSubmit}
            disabled={disabled || loading || !value.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#7c5cd8] text-white transition-all hover:bg-[#9f82e8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <SendHorizonal size={15} />
            }
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-[#444]">
          Press <kbd className="rounded bg-[#2a2a2a] px-1.5 py-0.5 font-mono text-[#666]">Enter</kbd> to send,&nbsp;
          <kbd className="rounded bg-[#2a2a2a] px-1.5 py-0.5 font-mono text-[#666]">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}
