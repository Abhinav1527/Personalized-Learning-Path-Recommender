import { useState } from 'react'
import type { RoadmapStage } from '../types'
import { CheckCircle2, Circle, Compass, Clock, Target, Sparkles, BookOpen, Check } from 'lucide-react'

interface Props {
  stages: RoadmapStage[]
  topic?: string
}

export default function RoadmapVisualizer({ stages, topic }: Props) {
  const [completed, setCompleted] = useState<{ [index: number]: boolean }>({})
  const [checkedTopics, setCheckedTopics] = useState<{ [key: string]: boolean }>({})

  // Toggle individual topic tick box
  const toggleTopic = (stageIdx: number, topicIdx: number) => {
    const key = `${stageIdx}-${topicIdx}`
    const willBeChecked = !checkedTopics[key]

    setCheckedTopics((prev) => {
      const next = { ...prev, [key]: willBeChecked }
      // Check if all topics in this stage are now checked
      const stageTopics = stages[stageIdx]?.topics || []
      const allChecked = stageTopics.length > 0 && stageTopics.every((_, tI) =>
        tI === topicIdx ? willBeChecked : Boolean(next[`${stageIdx}-${tI}`])
      )
      if (allChecked) {
        setCompleted((c) => ({ ...c, [stageIdx]: true }))
      } else if (!willBeChecked && completed[stageIdx]) {
        setCompleted((c) => ({ ...c, [stageIdx]: false }))
      }
      return next
    })
  }

  // Toggle stage completion (and toggle all its topics)
  const toggleComplete = (idx: number) => {
    const isCurrentlyDone = Boolean(completed[idx])
    const newDone = !isCurrentlyDone
    setCompleted((prev) => ({ ...prev, [idx]: newDone }))

    // Sync all topics in this stage
    const stageTopics = stages[idx]?.topics || []
    if (stageTopics.length > 0) {
      setCheckedTopics((prev) => {
        const next = { ...prev }
        stageTopics.forEach((_, tIdx) => {
          next[`${idx}-${tIdx}`] = newDone
        })
        return next
      })
    }
  }

  // Calculate total topic progress
  let totalTopics = 0
  let totalCheckedTopics = 0
  stages.forEach((s, sIdx) => {
    const count = (s.topics || []).length
    totalTopics += count
    for (let t = 0; t < count; t++) {
      if (checkedTopics[`${sIdx}-${t}`]) {
        totalCheckedTopics++
      }
    }
  })

  const progressPct =
    totalTopics > 0
      ? Math.round((totalCheckedTopics / totalTopics) * 100)
      : stages.length > 0
      ? Math.round((Object.values(completed).filter(Boolean).length / stages.length) * 100)
      : 0

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#16161c] via-[#121217] to-[#181822] p-5 shadow-xl text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292934] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Compass size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Personalized Learning Roadmap</h3>
              <span className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300 border border-purple-500/20">
                <Sparkles size={10} /> AI Curated
              </span>
            </div>
            {topic && (
              <p className="text-xs text-[#8c8c9e]">
                Mastering <strong className="text-[#c5b5f8]">{topic}</strong> step-by-step
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-purple-300">{progressPct}%</span>
            <span className="text-[10px] text-[#717182] block">
              {totalTopics > 0 ? `${totalCheckedTopics}/${totalTopics} Topics` : 'Completed'}
            </span>
          </div>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#272732]">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stages Grid */}
      <div
        className={`mt-4 grid grid-cols-1 gap-3 ${
          stages.length === 2
            ? 'sm:grid-cols-2'
            : stages.length === 4
            ? 'sm:grid-cols-2 lg:grid-cols-4'
            : 'sm:grid-cols-2 md:grid-cols-3'
        }`}
      >
        {stages.map((stage, idx) => {
          const isDone = Boolean(completed[idx])
          const stageTopics = stage.topics || []
          const checkedInStage = stageTopics.filter((_, tIdx) => Boolean(checkedTopics[`${idx}-${tIdx}`])).length

          const levelColor =
            stage.level.toLowerCase() === 'beginner'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : stage.level.toLowerCase() === 'intermediate'
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'

          return (
            <div
              key={idx}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                isDone
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : 'border-[#2a2a35] bg-[#191921] hover:border-purple-500/40 hover:bg-[#1d1d28]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">
                    {stage.phase}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${levelColor}`}>
                    {stage.level}
                  </span>
                </div>

                <h4 className="mt-2 text-sm font-semibold text-white">{stage.title}</h4>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8e8ea2]">
                  <Clock size={12} className="text-[#a0a0b8]" />
                  <span>{stage.estimated_time}</span>
                </div>

                <div className="mt-3 text-xs leading-relaxed text-[#b4b4c4]">
                  {stage.focus}
                </div>

                {/* Topics to Learn with Interactive Tick Boxes */}
                {stageTopics.length > 0 && (
                  <div className="mt-3.5 rounded-xl border border-purple-500/20 bg-purple-950/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
                        <BookOpen size={12} className="text-purple-400" /> Topics to Learn:
                      </span>
                      <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/30">
                        {checkedInStage}/{stageTopics.length}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {stageTopics.map((item, tIdx) => {
                        const isTopicChecked = Boolean(checkedTopics[`${idx}-${tIdx}`])
                        return (
                          <li
                            key={tIdx}
                            onClick={() => toggleTopic(idx, tIdx)}
                            className={`group flex items-start gap-2 rounded-lg p-1.5 text-xs transition-all cursor-pointer border ${
                              isTopicChecked
                                ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200'
                                : 'border-transparent bg-[#14141c]/60 hover:border-purple-500/30 hover:bg-[#1a1a24] text-[#cfcfe2]'
                            }`}
                          >
                            {/* Tick box */}
                            <button
                              type="button"
                              aria-label={isTopicChecked ? 'Uncheck topic' : 'Check topic'}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleTopic(idx, tIdx)
                              }}
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                                isTopicChecked
                                  ? 'border-emerald-400 bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                  : 'border-[#4a4a5e] bg-[#16161f] group-hover:border-purple-400 text-transparent'
                              }`}
                            >
                              <Check size={11} strokeWidth={3} className={isTopicChecked ? 'opacity-100' : 'opacity-0'} />
                            </button>
                            <span className={`leading-snug select-none ${isTopicChecked ? 'text-emerald-200 font-medium' : 'text-[#cfcfe2]'}`}>
                              {item}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-[#292938] pt-3">
                <div className="flex items-start gap-1.5 text-[11px] text-[#8d8d9f]">
                  <Target size={12} className="shrink-0 text-purple-400 mt-0.5" />
                  <span className="italic leading-tight">{stage.milestone}</span>
                </div>

                <button
                  onClick={() => toggleComplete(idx)}
                  className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'border border-[#323240] bg-[#22222d] text-[#b0b0c2] hover:bg-[#2c2c3a] hover:text-white'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>Phase Completed</span>
                    </>
                  ) : (
                    <>
                      <Circle size={13} className="text-[#777]" />
                      <span>Mark as Complete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
