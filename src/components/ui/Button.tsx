import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'eco'
type Size    = 'sm' | 'md' | 'lg' | 'xl'

const V: Record<Variant, string> = {
  primary:   'bg-lbc-green  hover:bg-lbc-green-l  text-white border border-lbc-green-d shadow-[0_4px_15px_rgba(26,126,52,.45)]',
  secondary: 'bg-white/10   hover:bg-white/15      text-white border border-white/20',
  danger:    'bg-red-600    hover:bg-red-500       text-white border border-red-700',
  ghost:     'bg-transparent hover:bg-white/5      text-white/60 hover:text-white border border-transparent',
  eco:       'bg-emerald-700 hover:bg-emerald-600  text-white border border-emerald-800 shadow-[0_4px_15px_rgba(16,185,129,.35)]',
}
const S: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2',
  xl: 'px-8 py-5 text-lg gap-2.5',
}

interface Props {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  disabled?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  className?: string
}

export function Button({ children, onClick, variant='primary', size='md', disabled=false, fullWidth=false, icon, className='' }: Props) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={disabled ? undefined : onClick}
      className={[
        'relative isolate overflow-hidden inline-flex items-center justify-center rounded-xl transition-all duration-150',
        'font-extrabold tracking-[-0.02em] shadow-[0_10px_30px_rgba(0,0,0,.22)]',
        V[variant], S[size],
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-[1px]',
        className,
      ].join(' ')}
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.18),transparent_45%,rgba(0,0,0,.12))]" />
      <span className="pointer-events-none absolute inset-[1px] rounded-[11px] border border-white/10" />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {icon && <span>{icon}</span>}
        {children}
      </span>
    </motion.button>
  )
}
