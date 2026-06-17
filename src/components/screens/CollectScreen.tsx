import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { RARITY_COLORS, RARITY_LABELS } from '../../data/cargoTypes'

export function CollectScreen() {
  const { selectedCargo, collectCargo, setScreen, inventory } = useGameStore()

  useEffect(() => {
    if (!selectedCargo) setScreen('map')
  }, [selectedCargo, setScreen])

  if (!selectedCargo) return null
  const { type } = selectedCargo

  const handleCollect = () => {
    collectCargo(selectedCargo.id)
    setScreen('map')
  }

  return (
    <div className="fixed inset-0 bg-surface-900/95 backdrop-blur-xl flex flex-col items-center justify-center px-6">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-30"
          style={{ background: type.color }}
        />
      </div>

      {/* Emoji burst */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
        className="relative text-[7rem] mb-2 select-none"
      >
        {type.emoji}
        {/* Sparkles */}
        {['✨','⭐','💫'].map((s, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: [-30 + i*30, -60 + i*60], y: [-20, -60] }}
            transition={{ delay: 0.3 + i*0.1, duration: 0.8 }}
            className="absolute text-2xl"
            style={{ top: '10%', left: '50%' }}
          >
            {s}
          </motion.span>
        ))}
      </motion.div>

      {/* Rarity pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <span
          className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
          style={{ background: RARITY_COLORS[type.rarity] + '33', color: RARITY_COLORS[type.rarity], border: `1.5px solid ${RARITY_COLORS[type.rarity]}` }}
        >
          {RARITY_LABELS[type.rarity]}
        </span>
      </motion.div>

      {/* Info card */}
      <GlassCard className="w-full max-w-sm p-5 mb-6" delay={0.15}>
        <h2 className="text-2xl font-black text-white mb-1">{type.name}</h2>
        <p className="text-white/55 text-sm mb-4">{type.description}</p>

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div className="bg-white/5 rounded-xl p-2">
            <div className="text-lg font-black text-white">{type.weight}kg</div>
            <div className="text-xs text-white/40">Vikt</div>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <div className="text-lg font-black text-lbc-green">+{type.xpReward}</div>
            <div className="text-xs text-white/40">XP</div>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <div className="text-lg font-black text-white">{(type.volume * 100).toFixed(0)}%</div>
            <div className="text-xs text-white/40">Volym</div>
          </div>
        </div>

        <div className="bg-lbc-green/10 border border-lbc-green/30 rounded-xl p-3">
          <div className="text-xs font-bold text-lbc-green mb-1">💡 Lasttips</div>
          <div className="text-xs text-white/70">{type.loadingTip}</div>
        </div>
      </GlassCard>

      {/* Inventory preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-center gap-1.5 mb-6"
      >
        {[...inventory, type].slice(-6).map((c, i) => (
          <span key={i} className="text-2xl">{c.emoji}</span>
        ))}
        <span className="text-white/30 text-sm ml-1">+1</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-2"
      >
        <Button fullWidth size="xl" onClick={handleCollect}>
          ✅ Hämta gods
        </Button>
        <Button fullWidth size="md" variant="ghost" onClick={() => setScreen('map')}>
          Lämna kvar
        </Button>
      </motion.div>
    </div>
  )
}
