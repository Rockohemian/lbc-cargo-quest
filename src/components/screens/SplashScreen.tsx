import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { generateCargoItems } from '../../utils/cargoGenerator'
import { CURRENT_EVENT } from '../../data/events'

type Step = 'intro' | 'name' | 'ready' | 'mission'

export function SplashScreen() {
  const { setScreen, setPlayerName, player, setCargoItems, playerPosition, eventMode, setEventMode } = useGameStore()
  const [step, setStep] = useState<Step>(player.name ? 'ready' : 'intro')
  const [name, setName] = useState(player.name)

  const handleSaveName = () => {
    if (!name.trim()) return
    setPlayerName(name.trim())
    setStep('ready')
  }

  const handlePlay = () => {
    setCargoItems(generateCargoItems(playerPosition))
    setScreen('map')
  }

  return (
    <div className="fixed inset-0 bg-surface-900 flex flex-col overflow-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] h-[26rem] bg-lbc-green/15 rounded-full blur-3xl" />
        <div className="absolute top-[18%] left-[16%] w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-lbc-blue/10 rounded-full blur-3xl" />
      </div>

      <div data-scroll className="relative flex-1 flex flex-col items-center justify-start px-6 gap-5 overflow-y-auto scrollbar-hide pt-8 pb-6" style={{ overscrollBehavior: 'contain' }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white/45 mb-6">
            <span className="h-2 w-2 rounded-full bg-lbc-green shadow-[0_0_12px_rgba(39,163,73,.9)]" />
            Fleet Online
          </div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl mb-3 drop-shadow-[0_0_24px_rgba(39,163,73,.25)]"
          >
            🚛
          </motion.div>
          <div className="text-white/35 text-xs font-black tracking-[0.45em] uppercase mb-2 font-display">
            LBC FRAKT
          </div>
          <h1 className="text-5xl font-black text-white leading-none tracking-tight font-display sm:text-6xl">
            CARGO<br />
            <span className="bg-[linear-gradient(180deg,#56d67b,#1a7e34)] bg-clip-text text-transparent">QUEST</span>
          </h1>
          <p className="mt-4 text-white/42 text-sm font-medium max-w-[18rem] mx-auto leading-relaxed">
            Sveriges smartaste transportäventyr
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/28">
            <span>GPS</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Eco Score</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Live Cargo</span>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="w-full max-w-sm space-y-4"
            >
              <GlassCard className="p-5">
                <div className="grid grid-cols-2 gap-2 mb-4 text-left">
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">Räckvidd</div>
                    <div className="mt-1 text-lg text-white font-black font-display">25m</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">Drivning</div>
                    <div className="mt-1 text-lg text-lbc-green font-black font-display">EV</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: '🗺️', text: 'Hitta gods i verkligheten med GPS' },
                    { icon: '📦', text: 'Lasta och balansera lastbilen' },
                    { icon: '🛡️', text: 'Leverera säkert och klok' },
                    { icon: '⚡', text: 'Eldriven lastbil – noll utsläpp' },
                  ].map((row, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-2xl">{row.icon}</span>
                      <span className="text-sm text-white/80 font-medium leading-snug">{row.text}</span>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
              <Button fullWidth size="lg" onClick={() => setStep('name')}>
                Börja äventyret →
              </Button>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="w-full max-w-sm space-y-4"
            >
              <GlassCard className="p-6">
                <p className="text-white/55 text-sm mb-4 text-center">Vad ska vi kalla dig?</p>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  placeholder="Ditt namn..."
                  maxLength={20}
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/25 text-center text-lg font-bold focus:outline-none focus:border-lbc-green transition-colors"
                />
              </GlassCard>
              <Button fullWidth size="lg" disabled={!name.trim()} onClick={handleSaveName}>
                Kör igång! 🚛
              </Button>
            </motion.div>
          )}

          {step === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="w-full max-w-sm space-y-4"
            >
              <GlassCard className="p-6 text-center" glow>
                <div className="text-4xl mb-2">👋</div>
                <p className="text-xl font-black text-white font-display">Välkommen, {player.name}!</p>
                <p className="text-white/45 text-sm mt-1">Nivå {player.level} · {player.rank}</p>
                <div className="mt-4 flex justify-center gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-black text-lbc-green">{player.totalDeliveries}</div>
                    <div className="text-xs text-white/40 mt-0.5">Leveranser</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-lbc-blue">{player.xp}</div>
                    <div className="text-xs text-white/40 mt-0.5">XP</div>
                  </div>
                </div>
              </GlassCard>

              {/* Mässläge-toggle */}
              <GlassCard className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-black text-white text-sm">🏙️ Mässläge</div>
                    <div className="text-white/45 text-xs mt-0.5">{CURRENT_EVENT.name}</div>
                  </div>
                  <button
                    onClick={() => setEventMode(!eventMode)}
                    className={'w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ' + (eventMode ? 'bg-lbc-green' : 'bg-white/20')}
                    aria-label="Toggäla mässläge"
                  >
                    <div className={'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ' + (eventMode ? 'left-7' : 'left-1')} />
                  </button>
                </div>
                {eventMode && (
                  <div className="mt-3 text-xs text-lbc-green/85 bg-lbc-green/8 rounded-xl px-3 py-2 flex items-center gap-2">
                    <span>✓</span> Gods placeras inom travbaneområdet — du behöver inte gå ut i trafiken
                  </div>
                )}
              </GlassCard>
              <Button fullWidth size="xl" onClick={() => setStep('mission')}>
                🗺️ Hitta gods nu
              </Button>
              <Button fullWidth size="md" variant="ghost" onClick={() => setStep('name')}>
                Byt namn
              </Button>
            </motion.div>
          )}
          {step === 'mission' && (
            <motion.div
              key="mission"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm space-y-4"
            >
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-lbc-green/30 bg-lbc-green/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-lbc-green mb-4">
                  📡 Uppdrag mottaget
                </div>
              </div>
              <GlassCard className="p-6" glow>
                <div className="text-4xl mb-4 text-center">🚛</div>
                <p className="text-white font-bold text-base leading-relaxed text-center">
                  Du har ett uppdrag.
                </p>
                <p className="text-white/70 text-sm leading-relaxed text-center mt-3">
                  Hitta godset före dina konkurrenter och se till att det levereras{' '}
                  <span className="text-white font-semibold">säkert</span> och{' '}
                  <span className="text-lbc-green font-semibold">hållbart</span> till kunden.
                </p>
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
                  <span className="text-lbc-green text-lg">●</span>
                  <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Lycka till, {player.name}!</span>
                </div>
              </GlassCard>
              <Button fullWidth size="xl" onClick={handlePlay}>
                Starta uppdrag →
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative text-center pb-8 text-white/20 text-xs">
        LBC Frakt i Värmland AB · På god väg
      </div>
    </div>
  )
}
