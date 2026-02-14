import { cn } from "@/lib/utils"

interface ApyBadgeProps {
  apy: string | number
  size?: "sm" | "md" | "lg"
}

export function ApyBadge({ apy, size = "md" }: ApyBadgeProps) {
  const val = typeof apy === "string" ? parseFloat(apy) : apy

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold border",
        val >= 10
          ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
          : val >= 5
          ? "bg-blue-400/10 text-blue-400 border-blue-400/20"
          : "bg-slate-400/10 text-slate-400 border-slate-400/20",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm"
      )}
    >
      <svg className={cn("shrink-0", size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22" />
      </svg>
      {typeof val === "number" && !isNaN(val) ? `${val.toFixed(1)}%` : `${apy}%`} APY
    </span>
  )
}
