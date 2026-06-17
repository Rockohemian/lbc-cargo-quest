import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CrateTier, TruckPart } from '../../types'
import { useGameStore } from '../../store/gameStore'
import { CRATES, PART_RARITY_COLORS, PART_RARITY_LABELS, CATEGORY_LABELS } from '../../data/garageParts'
import { Button } from '../ui/Button'

interface Props {
  tier: CrateTier
  onClose: () => void
}

type Phase = 'idle' | 'opening' | 'reveal'

export function CrateOpenModal({ tier, onClose }: Props) {
  const openCrate = useGameStore(s => s.openCrate)
  const [phase, setPhase] = useState<Phase>('idle')
  const [part, setPart] = useState<TruckPart | null>(null)
  const opened = useRef(false)
  const meta = CRATES[tier]

  const confetti = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      id: i,
      x: (Math.random() * 2 - 1) * 220,
      y: -(120 + Math.random() * 260),
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 0.18,
      color: ['#27a349', '#f5c518', '#2a8ae0', '#9b30f0', '#f5a623', '#ffffff'][i % 6],
      size: 6 + Math.random() * 8,
    })),
    [],
  )

  const handleOpen = () => {
    if (opened.current) return
    opened.current = true
    setPhase('opening')
    const result = openCrate(tier)
    setPart(result)
    window.setTimeout(() => setPhase('reveal'), 1150)
  }

  useEffect(() => {
    const t = window.setTimeout(handleOpen, 350)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rarityColor = part ? PART_RARITY_COLORS[part.rarity] : meta.color

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center px-6"
      style={{ background: 'radial-gradient(circle at center, rgba(8,16,10,.92), rgba(3,6,4,.97))' }}
    >
      {/* radial light burst */}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: phase === 'reveal' ? 2.4 : 1.1, opacity: phase === 'reveal' ? 0.55 : 0.3 }}
            transition={{ duration: 0.9 }}
            className="absolute w-72 h-72 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${meta.glow}, transparent 68%)` }}
          />
        )}
      </AnimatePresence>

      {/* rotating light rays on reveal */}
      {phase === 'reveal' && (
        <motion.div
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 360, opacity: 0.4 }}
          transition={{ rotate: { duration: 12, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.6 } }}
          className="absolute w-[420px] h-[420px] pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${rarityColor}33 20deg, transparent 40deg, ${rarityColor}33 60deg, transparent 80deg, ${rarityColor}33 100deg, transparent 120deg, ${rarityColor}33 140deg, transparent 160deg, ${rarityColor}33 180deg, transparent 200deg)`,
            maskImage: 'radial-gradient(circle, transparent 28%, black 30%, black 70%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 28%, black 30%, black 70%, transparent 72%)',
          }}
        />
      )}

      {/* confetti */}
      {phase === 'reveal' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map(c => (
            <motion.div
              key={c.id}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: c.x, y: c.y, opacity: 0, rotate: c.rot }}
              transition={{ duration: 1.4, delay: c.delay, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 rounded-[2px]"
              style={{ width: c.size, height: c.size * 0.6, background: c.color }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 w-full max-w-xs text-center">
        {/* crate */}
        {phase !== 'reveal' && (
          <motion.div
            animate={phase === 'opening'
              ? { rotate: [0, -6, 6, -8, 8, -4, 4, 0], scale: [1, 1.04, 1.04, 1.08, 1.08, 1.12], y: [0, -2, 2, -3, 3, 0] }
              : { y: [0, -6, 0] }}
            transition={phase === 'opening'
              ? { duration: 1.1, times: [0, .15, .3, .45, .6, .75, .9, 1] }
              : { duration: 1.6, repeat: Infinity }}
            className="mx-auto text-[120px] leading-none"
            style={{ filter: `drop-shadow(0 0 30px ${meta.glow})` }}
          >
            {meta.icon === '🟫' || meta.icon === '⬜' || meta.icon === '🟨' ? '📦' : meta.icon}
          </motion.div>
        )}

        {/* revealed part */}
        <AnimatePresence>
          {phase === 'reveal' && part && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', duration: 0.7, bounce: 0.45 }}
            >
              <div className="text-xs font-black uppercase tracking-[0.3em] mb-2" style={{ color: rarityColor }}>
                {PART_RARITY_LABELS[part.rarity]}
              </div>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.2, repeat: Infinity }}
                className="mx-auto w-40 h-40 rounded-[28px] flex items-center justify-center text-[78px] border"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${rarityColor}33, rgba(8,16,10,.6))`,
                  borderColor: `${rarityColor}77`,
                  boxShadow: `0 0 50px ${rarityColor}66`,
                }}
              >
                {part.icon}
              </motion.div>
              <h3 className="mt-4 text-2xl font-black text-white">{part.name}</h3>
              <p className="text-white/50 text-sm mt-1">{CATEGORY_LABELS[part.category]}</p>
              <p className="text-white/40 text-xs mt-2 leading-relaxed px-2">{part.description}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* crate name while opening */}
        {phase !== 'reveal' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <div className="text-lg font-black text-white">{meta.name}</div>
            <div className="text-white/40 text-sm mt-1">Öppnar...</div>
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-7"
          >
            <Button fullWidth size="lg" onClick={onClose}>Lägg i garaget</Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
