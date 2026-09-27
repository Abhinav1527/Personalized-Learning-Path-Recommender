import { useState, useRef, useEffect } from 'react'
import type { AIProvider } from '../types'
import { Sparkles, Zap, Globe, ChevronDown, Settings, Check } from 'lucide-react'

interface Props {
  providers: AIProvider[]
  activeProviderId: string
  onProviderChange: (id: string) => void
  activeModelId: string
  onModelChange: (modelId: string) => void
  onOpenSettings: () => void
}

export default function AIModelSelector({
  providers,
  activeProviderId,
  onProviderChange,
  activeModelId,
  onModelChange,
  onOpenSettings,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeProvider = providers.find((p) => p.id === activeProviderId) || providers[0]
  const activeModel =
    activeProvider?.models.find((m) => m.id === activeModelId) ||
    activeProvider?.models[0]

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'gemini':
        return <Sparkles className="text-amber-400" size={14} />
      case 'groq':
        return <Zap className="text-orange-400" size={14} />
      case 'openrouter':
        return <Globe className="text-cyan-400" size={14} />
      default:
        return <Sparkles className="text-purple-400" size={14} />
    }
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div className="flex items-center gap-1.5 rounded-xl border border-[#2e2e34] bg-[#17171a] p-1 shadow-sm">
        {/* Main Selector Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#e4e4eb] hover:bg-[#232328] transition-colors"
        >
          <span className="flex items-center justify-center">
            {getProviderIcon(activeProvider?.id ?? 'gemini')}
          </span>
          <span className="font-semibold text-white">{activeProvider?.name ?? 'Gemini'}</span>
          <span className="hidden sm:inline text-[#7a7a88]">/</span>
          <span className="hidden sm:inline text-[#a6a6b8]">{activeModel?.name ?? '1.5 Flash'}</span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
            Free
          </span>
          <ChevronDown size={13} className={`text-[#888] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Quick Settings Gear */}
        <button
          onClick={onOpenSettings}
          title="Configure API Keys & Models"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#858595] hover:bg-[#232328] hover:text-white transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-72 origin-top-right rounded-2xl border border-[#2e2e36] bg-[#161619] p-2 shadow-2xl backdrop-blur-md">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#737382]">
            Select Free AI Model
          </div>

          <div className="space-y-1">
            {providers.map((p) => {
              const isProviderActive = p.id === activeProviderId
              return (
                <div key={p.id} className="rounded-xl p-1.5 hover:bg-[#1f1f24] transition-colors">
                  <div
                    onClick={() => {
                      onProviderChange(p.id)
                      const def = p.models.find((m) => m.is_default) || p.models[0]
                      if (def) onModelChange(def.id)
                      setIsOpen(false)
                    }}
                    className="flex cursor-pointer items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold text-white"
                  >
                    <div className="flex items-center gap-2">
                      {getProviderIcon(p.id)}
                      <span>{p.name}</span>
                    </div>
                    <span className="text-[10px] text-[#808092]">{p.badge}</span>
                  </div>

                  {/* Sub-models for this provider */}
                  {isProviderActive && (
                    <div className="mt-1 space-y-0.5 pl-6 pr-1">
                      {p.models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onModelChange(m.id)
                            setIsOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors ${
                            activeModelId === m.id
                              ? 'bg-purple-500/20 text-purple-300 font-medium'
                              : 'text-[#9c9cb0] hover:bg-[#272730] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{m.name}</span>
                          {activeModelId === m.id && <Check size={12} className="text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-2 border-t border-[#26262d] pt-2">
            <button
              onClick={() => {
                setIsOpen(false)
                onOpenSettings()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#222228] px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-[#2c2c34] transition-colors"
            >
              <Settings size={13} />
              <span>Configure API Keys</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
