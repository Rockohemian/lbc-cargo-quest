import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENT_BY_ID, PART_BY_ID, PART_RARITY_COLORS, PART_RARITY_LABELS } from '../../data/garageParts'
import { Button } from '../ui/Button'

/**
 * Full-screen celebratory overlay that drains the garage unlock queue:
 * garage unlock + achievement rewards, one at a time.
 */
export function GarageUnlockOverlay() {
  const queue = useGameStore(s => s.garage.unlockQueue)
  const dismiss = useGameStore(s => s.dismissUnlockNotice)
  const setScreen = useGameStore(s => s.setScreen)
  const notice = queue[0]

  const rays = Array.from({ length: 14 }, (_, i) => i)

  let content: {
    badge: string
    title: string
    subtitle: string
    accent: string
    rarity?: string
    cta?: () => void
    ctaLabel?: string
  } | null = null

  if (notice?.kind === 'garage') {
    content = {
      badge: '🔧',
      title: 'Grattis! Du har låst upp LBC Garage.',
      subtitle: 'Anpassa din lastbil med delar, öppna cargo-lådor och visa upp din samling.',
      accent: '#00a34c',
      cta: () => { dismiss(); setScreen('garage') },
      ctaLabel: 'Öppna garaget',
    }
  } else if (notice?.kind === 'achievement') {
    const a = ACHIEVEMENT_BY_ID[notice.id]
    const part = a ? PART_BY_ID[a.rewardPartId] : undefined
    const color = part ? PART_RARITY_COLORS[part.rarity] : '#f5a623'
    content = {
      badge: a?.icon ?? '🏆',
      title: `Prestation upplåst: ${a?.title ?? ''}`,
      subtitle: part ? `Belöning: ${part.name}` : (a?.description ?? ''),
      accent: color,
      rarity: part ? PART_RARITY_LABELS[part.rarity] : undefined,
    }
  }

  return (
    <AnimatePresence mode="wait">
      {notice && content && (
        <motion.div
          key={`${notice.kind}-${notice.kind === 'achievement' ? notice.id : 'garage'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2100] flex items-center justify-center px-6"
          style={{ background: 'radial-gradient(circle at center, rgba(8,16,10,.93), rgba(3,6,4,.98))' }}
        >
          {/* rotating rays */}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[520px] h-[520px] pointer-events-none"
          >
            {rays.map(i => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-top"
                style={{
                  width: 3, height: 260,
                  background: `linear-gradient(${content!.accent}55, transparent)`,
                  transform: `translate(-50%, 0) rotate(${(360 / rays.length) * i}deg)`,
                }}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.45, duration: 0.7 }}
            className="relative z-10 w-full max-w-xs text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="mx-auto w-32 h-32 rounded-[32px] flex items-center justify-center text-[68px] border"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${content.accent}44, rgba(8,16,10,.6))`,
                borderColor: `${content.accent}88`,
                boxShadow: `0 0 60px ${content.accent}66`,
              }}
            >
              {content.badge}
            </motion.div>

            {content.rarity && (
              <div className="mt-4 text-xs font-black uppercase tracking-[0.3em]" style={{ color: content.accent }}>
                {content.rarity}
              </div>
            )}
            <h2 className="mt-3 text-2xl font-black text-white leading-tight">{content.title}</h2>
            <p className="mt-3 text-white/55 text-sm leading-relaxed">{content.subtitle}</p>

            <div className="mt-7 space-y-2">
              {content.cta && (
                <Button fullWidth size="lg" onClick={content.cta}>{content.ctaLabel}</Button>
              )}
              <Button fullWidth variant={content.cta ? 'ghost' : 'primary'} size={content.cta ? 'md' : 'lg'} onClick={dismiss}>
                {content.cta ? 'Senare' : 'Fortsätt'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
