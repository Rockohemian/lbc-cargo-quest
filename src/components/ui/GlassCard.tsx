import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  glow?: boolean
  onClick?: () => void
  delay?: number
}

export function GlassCard({ children, className = '', glow = false, onClick, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onClick={onClick}
      className={[
        'relative overflow-hidden rounded-[26px]',
        'bg-[linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.03))] backdrop-blur-xl border border-white/10',
        glow ? 'shadow-[0_0_32px_rgba(26,126,52,.3)] animate-pulse-glow' : 'shadow-[0_18px_40px_rgba(0,0,0,.28)]',
        onClick ? 'cursor-pointer hover:bg-white/8 active:scale-[.98] transition-all' : '',
        className,
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none" />
      <div className="absolute inset-[1px] rounded-[25px] border border-white/6 pointer-events-none" />
      {children}
    </motion.div>
  )
}
