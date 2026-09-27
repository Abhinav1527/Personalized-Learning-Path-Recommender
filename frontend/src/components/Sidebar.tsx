import type { Conversation, AuthUser } from '../types'
import { MessageSquarePlus, Trash2, GraduationCap, LogOut } from 'lucide-react'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  user?: AuthUser | null
  onSignOut: () => void
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  user,
  onSignOut,
}: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#26262d] bg-[#121215]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-[#26262d] px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-900/30">
          <GraduationCap size={18} />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight text-white block">LearnPath AI</span>
          <span className="text-[10px] text-[#78788a]">Course Recommender</span>
        </div>
      </div>

      {/* New chat */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2e2e38] bg-[#1a1a20] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:border-purple-500/40 hover:bg-purple-950/20"
        >
          <MessageSquarePlus size={15} className="text-purple-400" />
          <span>New Chat</span>
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-xs text-[#555]">No conversations yet</p>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                  conv.id === activeId
                    ? 'bg-[#22222a] font-medium text-white shadow-sm'
                    : 'text-[#9e9eb0] hover:bg-[#18181e] hover:text-white'
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <span className="truncate">{conv.title}</span>
                <button
                  className="ml-1 hidden shrink-0 text-[#666] hover:text-rose-400 group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conv.id)
                  }}
                  title="Delete chat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom User Account Area */}
      {user && (
        <div className="border-t border-[#26262d] p-3">
          <div className="flex items-center justify-between rounded-xl border border-[#272733] bg-[#17171d] p-2 transition-colors hover:border-[#383846]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/25 text-xs font-bold uppercase text-purple-300 border border-purple-500/30">
                {user.username.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{user.username}</p>
                <p className="text-[10px] text-[#717182]">Logged in</p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#8e8ea0] hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
            >
              <LogOut size={13} />
              <span className="text-[11px]">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
