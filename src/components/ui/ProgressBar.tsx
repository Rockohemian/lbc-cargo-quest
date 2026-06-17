import { motion } from 'framer-motion'

interface Props {
  value: number
  max?: number
  color?: string
  height?: number
  label?: string
  showPct?: boolean
  className?: string
}

export function ProgressBar({ value, max=100, color='#1a7e34', height=8, label, showPct=false, className='' }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={`w-full ${className}`}>
      {(label || showPct) && (
        <div className="flex justify-between items-center mb-1">
          {label   && <span className="text-xs text-white/55 font-medium">{label}</span>}
          {showPct && <span className="text-xs text-white/80 font-bold">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="w-full bg-white/10 rounded-full overflow-hidden" style={{ height }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}
