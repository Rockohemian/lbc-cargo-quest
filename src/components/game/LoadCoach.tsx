import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { buildCoachTips, type CoachTone } from '../../data/loadSchool'
import type { LoadMetrics } from '../../types'
import type { WeightProfile } from '../../utils/loadEngine'

const TONE: Record<CoachTone | 'critical' | 'major' | 'minor', { border: string; bg: string; text: string; label: string }> = {
  critical: { border: 'border-red-300',   bg: 'bg-red-50',    text: 'text-red-700',    label: 'Allvarligt' },
  major:    { border: 'border-amber-300', bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Anmärkning' },
  minor:    { border: 'border-black/12',  bg: 'bg-white',     text: 'text-black/50',   label: 'Noterat' },
  bad:      { border: 'border-red-300',   bg: 'bg-red-50',    text: 'text-red-700',    label: 'Åtgärda' },
  warn:     { border: 'border-amber-300', bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Förbättra' },
  good:     { border: 'border-[#00843e]/30', bg: 'bg-[#00843e]/[0.06]', text: 'text-[#00843e]', label: 'Godkänt' },
}

interface Props {
  metrics: LoadMetrics
  profile: WeightProfile
  hasItems: boolean
  /** Öppnar lastskolan. */
  onOpenSchool: () => void
}

/**
 * Lastkoll — säger inte bara att lasten är fel, utan vad spelaren gör åt det.
 *
 * Regelbrotten kommer från regelmotorn och har en konkret åtgärd kopplad till
 * sig. Coachningstipsen fångar det som är lagligt men dåligt: snedfördelad
 * vikt, hög tyngdpunkt, för få band. Panelen fälls ut automatiskt så fort
 * något är allvarligt fel.
 */
export function LoadCoach({ metrics, profile, hasItems, onOpenSchool }: Props) {
  const violations = metrics.violations ?? []
  const tips = hasItems ? buildCoachTips(metrics, profile) : []
  const criticals = violations.filter(v => v.severity === 'critical').length
  const [open, setOpen] = useState(false)

  const total = violations.length + tips.filter(t => t.tone !== 'good').length
  const expanded = open || criticals > 0

  if (!hasItems) {
    return (
      <div className="px-4 py-2 text-[11px] text-black/45 font-bold">
        Dra in gods i trailern. Tungt underst, tight mot framstammen.
      </div>
    )
  }

  const headTone = criticals > 0 ? 'critical' : total > 0 ? 'major' : 'good'
  const head = TONE[headTone]

  return (
    <div className="px-4">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 h-9 border ${head.border} ${head.bg}`}
      >
        <span className={`text-[9px] font-black uppercase tracking-[0.22em] ${head.text}`}>— Lastkoll</span>
        <span className="flex-1 text-left text-[11px] font-black text-[#0a0a0a] truncate">
          {total === 0
            ? 'Lasten följer reglerna'
            : `${total} ${total === 1 ? 'sak' : 'saker'} att rätta till`}
        </span>
        <span className="text-[10px] font-black text-black/40">{expanded ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1.5">
              {violations.map(v => {
                const t = TONE[v.severity]
                return (
                  <div key={v.id} className={`border ${t.border} ${t.bg} px-3 py-2`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-[0.22em] ${t.text}`}>{t.label}</span>
                      <span className="text-[12px] font-black text-[#0a0a0a]">{v.title}</span>
                      {v.count > 1 && (
                        <span className="text-[10px] font-black text-black/45 tabular-nums">×{v.count}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-black/60 leading-snug mt-1">{v.detail}</p>
                    <p className="text-[11px] text-[#0a0a0a] leading-snug mt-1.5">
                      <span className="font-black">Gör så här: </span>{v.fix}
                    </p>
                  </div>
                )
              })}

              {tips.map(tip => {
                const t = TONE[tip.tone]
                return (
                  <div key={tip.id} className={`border ${t.border} ${t.bg} px-3 py-2`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-[0.22em] ${t.text}`}>{t.label}</span>
                      <span className="text-[12px] font-black text-[#0a0a0a] truncate">{tip.title}</span>
                    </div>
                    <p className="text-[11px] text-black/65 leading-snug mt-1">{tip.fix}</p>
                  </div>
                )
              })}

              <button
                onClick={onOpenSchool}
                className="w-full h-9 border border-black/15 text-[10px] font-black uppercase tracking-[0.22em] text-black/60 active:bg-black/[0.03]"
              >
                📖 Öppna lastskolan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
