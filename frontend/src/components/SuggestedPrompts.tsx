import { ArrowRight, Lightbulb } from 'lucide-react'

interface Props {
  prompts: string[]
  onSelectPrompt: (prompt: string) => void
}

export default function SuggestedPrompts({ prompts, onSelectPrompt }: Props) {
  if (!prompts || prompts.length === 0) return null

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7c7c8f]">
        <Lightbulb size={12} className="text-amber-400" />
        <span>Suggested Next Steps:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(p)}
            className="group flex items-center gap-1.5 rounded-full border border-[#2d2d38] bg-[#1a1a22] px-3 py-1.5 text-xs text-[#b8b8cc] transition-all hover:border-purple-500/50 hover:bg-purple-950/20 hover:text-white"
          >
            <span>{p}</span>
            <ArrowRight size={11} className="text-[#666] transition-transform group-hover:translate-x-0.5 group-hover:text-purple-300" />
          </button>
        ))}
      </div>
    </div>
  )
}
