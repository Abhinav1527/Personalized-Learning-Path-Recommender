import type { CourseRecommendation } from '../types'
import { courseColor, courseIcon } from '../utils/courseColors'

interface Props {
  rec: CourseRecommendation
  rank: number
}

export default function RecommendationCard({ rec, rank }: Props) {
  const colorCls = courseColor(rec.course)
  const icon     = courseIcon(rec.course)

  return (
    <div className="group flex gap-3 rounded-xl border border-[#2e2e2e] bg-[#1e1e1e] p-4 transition-colors hover:border-[#7c5cd8]/50 hover:bg-[#252525]">
      {/* Rank badge */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-xs font-semibold text-[#8e8ea0] group-hover:bg-[#7c5cd8]/20 group-hover:text-[#9f82e8]">
        {rank}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Course badge + title */}
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorCls}`}>
            {rec.course}
          </span>
        </div>

        {/* Review snippet */}
        <p className="text-sm leading-relaxed text-[#a0a0b0] line-clamp-3">
          {rec.review_snippet}
        </p>

        {/* Index */}
        <p className="mt-2 text-xs text-[#555]">
          Training index #{rec.index}
        </p>
      </div>
    </div>
  )
}
