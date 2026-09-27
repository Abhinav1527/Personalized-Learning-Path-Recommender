import { useState, useEffect } from 'react'
import type { AIProvider } from '../types'
import { X, Key, ExternalLink, CheckCircle2, ShieldCheck, Sparkles, Zap, Globe, Eye, EyeOff } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  providers: AIProvider[]
  activeProviderId: string
  onProviderChange: (id: string) => void
  activeModelId: string
  onModelChange: (modelId: string) => void
}

export default function AIConfigModal({
  isOpen,
  onClose,
  providers,
  activeProviderId,
  onProviderChange,
  activeModelId,
  onModelChange,
}: Props) {
  const [keys, setKeys] = useState<{ [providerId: string]: string }>({
    gemini: '',
    groq: '',
    openrouter: '',
  })
  const [showKey, setShowKey] = useState<{ [providerId: string]: boolean }>({})
  const [savedStatus, setSavedStatus] = useState<string | null>(null)

  // Load saved keys from localStorage on mount
  useEffect(() => {
    try {
      const gKey = localStorage.getItem('api_key_gemini') || ''
      const qKey = localStorage.getItem('api_key_groq') || ''
      const oKey = localStorage.getItem('api_key_openrouter') || ''
      setKeys({
        gemini: gKey,
        groq: qKey,
        openrouter: oKey,
      })
    } catch {
      // ignore
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSaveKeys = () => {
    try {
      if (keys.gemini !== undefined) localStorage.setItem('api_key_gemini', keys.gemini.trim())
      if (keys.groq !== undefined) localStorage.setItem('api_key_groq', keys.groq.trim())
      if (keys.openrouter !== undefined) localStorage.setItem('api_key_openrouter', keys.openrouter.trim())
      setSavedStatus('Keys saved successfully!')
      setTimeout(() => setSavedStatus(null), 2500)
    } catch (e) {
      console.error(e)
    }
  }

  const activeProvider = providers.find((p) => p.id === activeProviderId) || providers[0]

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'gemini':
        return <Sparkles className="text-amber-400" size={18} />
      case 'groq':
        return <Zap className="text-orange-400" size={18} />
      case 'openrouter':
        return <Globe className="text-cyan-400" size={18} />
      default:
        return <Sparkles className="text-purple-400" size={18} />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#333] bg-[#141416] p-6 shadow-2xl text-[#e6e6e6]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282828] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Model & API Configuration</h2>
              <p className="text-xs text-[#8e8ea0]">
                Configure free base models from Google Gemini, Groq, or OpenRouter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#888] hover:bg-[#252528] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {providers.map((p) => {
            const isSelected = p.id === activeProviderId
            const hasLocalKey = Boolean(keys[p.id]?.trim())
            const isReady = hasLocalKey || p.has_server_key

            return (
              <button
                key={p.id}
                onClick={() => {
                  onProviderChange(p.id)
                  const defaultModel = p.models.find((m) => m.is_default) || p.models[0]
                  if (defaultModel) onModelChange(defaultModel.id)
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-purple-500/80 bg-purple-500/10 shadow-lg shadow-purple-950/30'
                    : 'border-[#262628] bg-[#1a1a1d] hover:border-[#38383c]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getProviderIcon(p.id)}
                    <span className="text-sm font-medium text-white">{p.name}</span>
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isReady ? 'bg-emerald-400' : 'bg-amber-500/80'
                    }`}
                    title={isReady ? 'Key configured' : 'Fallback simulation mode'}
                  />
                </div>
                <span className="text-[11px] text-[#8e8ea0]">{p.badge}</span>
              </button>
            )
          })}
        </div>

        {/* Selected Provider Details */}
        {activeProvider && (
          <div className="mt-5 space-y-4 rounded-xl border border-[#26262a] bg-[#19191d] p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{activeProvider.name}</h3>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    Free Tier Supported
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9a9aa5] leading-relaxed">
                  {activeProvider.description}
                </p>
              </div>
              <a
                href={activeProvider.key_url}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#383840] bg-[#222226] px-3 py-1.5 text-xs font-medium text-purple-300 hover:border-purple-500/50 hover:bg-purple-900/20 transition-all"
              >
                <span>Get Free Key</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-xs font-medium text-[#b0b0ba]">Choose Model</label>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeProvider.models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`flex flex-col rounded-lg border p-2.5 text-left text-xs transition-all ${
                      activeModelId === model.id
                        ? 'border-purple-500 bg-purple-500/15 text-white'
                        : 'border-[#2c2c32] bg-[#1e1e24] text-[#a0a0b0] hover:border-[#40404a]'
                    }`}
                  >
                    <span className="font-semibold text-white">{model.name}</span>
                    <span className="mt-1 text-[11px] text-[#7f7f90] leading-tight line-clamp-2">
                      {model.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#b0b0ba]">
                  {activeProvider.name} API Key
                </label>
                {activeProvider.has_server_key && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={12} /> Server default configured
                  </span>
                )}
              </div>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type={showKey[activeProvider.id] ? 'text' : 'password'}
                  placeholder={`Enter your ${activeProvider.name} API Key...`}
                  value={keys[activeProvider.id] || ''}
                  onChange={(e) =>
                    setKeys({
                      ...keys,
                      [activeProvider.id]: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#303038] bg-[#141418] px-3 py-2 pr-20 text-xs font-mono text-white placeholder-[#505058] focus:border-purple-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowKey({
                      ...showKey,
                      [activeProvider.id]: !showKey[activeProvider.id],
                    })
                  }
                  className="absolute right-2 text-[#70707c] hover:text-white transition-colors"
                >
                  {showKey[activeProvider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#6e6e78]">
                Your key is stored securely in your browser's <code className="text-[#888]">localStorage</code> and sent directly for inference.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-[#262628] pt-4">
          <div className="flex items-center gap-1.5 text-xs">
            {savedStatus ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium animate-pulse">
                <CheckCircle2 size={14} />
                {savedStatus}
              </span>
            ) : (
              <span className="text-[#6c6c76]">No API key? Fallback simulation active automatically.</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#333] bg-[#1f1f23] px-4 py-2 text-xs font-medium text-[#ccc] hover:bg-[#28282e] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleSaveKeys()
                onClose()
              }}
              className="rounded-lg bg-[#7c5cd8] px-4 py-2 text-xs font-medium text-white shadow-md hover:bg-[#906fe6] transition-all"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
