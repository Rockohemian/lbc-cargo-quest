import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { generateCargoItems } from '../../utils/cargoGenerator'
import { CURRENT_EVENT } from '../../data/events'

type Step = 'name' | 'ready' | 'mission'

export function SplashScreen() {
  const { setScreen, setPlayerName, player, setCargoItems, playerPosition, eventMode, setEventMode } = useGameStore()
  const [step, setStep] = useState<Step>(player.name ? 'ready' : 'name')
  const [name, setName] = useState(player.name)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const clock = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })

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
    <div
      className="fixed inset-0 flex flex-col bg-[#f6f4ef] text-[#0a0a0a] overflow-hidden"
      style={{ overscrollBehavior: 'none', fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
    >
      {/* ─── Top rail ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 h-12 border-b border-black/8 bg-white/60 backdrop-blur-sm flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-black tracking-tight leading-none">LBC<span className="text-[#1a7e34]">frakt</span></span>
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-black/45 leading-none">Sedan 1994</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1a7e34]" />
          Karlstad · {clock}
        </div>
      </div>

      {/* ─── Main scroll area ────────────────────────────────── */}
      <div data-scroll className="flex-1 overflow-y-auto scrollbar-hide" style={{ overscrollBehavior: 'contain' }}>

        {/* Hero */}
        <div className="px-5 pt-8 pb-6 border-b border-black/8">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-[#1a7e34] mb-4">— LBC Cargo Quest</div>
          <h1 className="font-black leading-[0.88] tracking-[-0.02em] text-[64px] sm:text-[76px]">
            PÅ GOD<br />VÄG<span className="text-[#1a7e34]">.</span>
          </h1>
          <p className="mt-5 text-[13px] text-black/60 leading-relaxed max-w-[24rem]">
            Sveriges smartaste transportäventyr — hitta gods i verkligheten, lasta smart, leverera hållbart.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border-b border-black/8">
          <StatCell label="Spelare" value={player.name || '—'} />
          <StatCell label="Nivå" value={String(player.level)} accent />
          <StatCell label="XP" value={String(player.xp)} last />
        </div>

        {/* Tiles grid */}
        <div className="grid grid-cols-2 border-b border-black/8">
          <button
            onClick={() => setEventMode(!eventMode)}
            className="text-left px-5 py-5 border-r border-black/8 active:bg-black/[0.03] transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">Mässläge</span>
              <div
                className={
                  'w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ' +
                  (eventMode ? 'bg-[#1a7e34]' : 'bg-black/15')
                }
              >
                <div
                  className={
                    'absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full shadow transition-all ' +
                    (eventMode ? 'left-[19px]' : 'left-[3px]')
                  }
                />
              </div>
            </div>
            <div className="text-[14px] font-black leading-tight">
              {eventMode ? 'Aktivt' : 'Avstängt'}
            </div>
            <div className="text-[11px] text-black/50 mt-0.5">{CURRENT_EVENT.name}</div>
          </button>

          <button
            onClick={() => setStep('name')}
            className="text-left px-5 py-5 active:bg-black/[0.03] transition-colors flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">Profil</span>
              <span className="text-black/30">↗</span>
            </div>
            <div>
              <div className="text-[14px] font-black leading-tight">Byt namn</div>
              <div className="text-[11px] text-black/50 mt-0.5">Nuvarande: {player.name || 'Ej valt'}</div>
            </div>
          </button>
        </div>

        {/* Mission brief tile */}
        <div className="px-5 py-6 border-b border-black/8">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50 mb-3">Uppdrag</div>
          <ul className="space-y-2.5 text-[13px] text-black/75">
            <MissionRow n="01" t="Hitta gods i verkligheten med GPS" />
            <MissionRow n="02" t="Lasta smart och balansera lastbilen" />
            <MissionRow n="03" t="Leverera säkert och hållbart" />
          </ul>
        </div>

      </div>

      {/* ─── Footer CTA ─────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-black/8 bg-white/70 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <button
          onClick={handlePlay}
          disabled={!player.name}
          className="w-full px-5 h-14 bg-[#0a0a0a] text-white flex items-center justify-between active:bg-[#1a7e34] transition-colors disabled:bg-black/30 disabled:cursor-not-allowed"
        >
          <span className="text-[13px] font-black uppercase tracking-[0.24em]">
            {player.name ? 'Hitta gods nu' : 'Ange namn för att starta'}
          </span>
          <span className="text-xl">→</span>
        </button>
        <div className="text-center py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-black/35">
          LBC Frakt i Värmland AB · På god väg
        </div>
      </div>

      {/* ─── Name overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {step === 'name' && (
          <motion.div
            key="name-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => player.name && setStep('ready')}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-[#f6f4ef] rounded-t-3xl sm:rounded-3xl border-t sm:border border-black/10 p-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#1a7e34] mb-2">— Registrering</div>
              <h2 className="text-[28px] font-black leading-none tracking-tight mb-1">Vad ska vi kalla dig?</h2>
              <p className="text-[13px] text-black/55 mb-5">Ditt namn visas på topplistan när du levererar.</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder="Skriv namn…"
                maxLength={20}
                autoFocus
                className="w-full bg-white border border-black/15 rounded-none px-4 h-12 text-[16px] font-bold placeholder-black/25 focus:outline-none focus:border-[#1a7e34] transition-colors"
              />
              <div className="mt-4 flex gap-2">
                {player.name && (
                  <button
                    onClick={() => setStep('ready')}
                    className="flex-1 h-12 border border-black/15 text-[12px] font-black uppercase tracking-[0.22em] text-black/60 active:bg-black/[0.04]"
                  >
                    Avbryt
                  </button>
                )}
                <button
                  onClick={handleSaveName}
                  disabled={!name.trim()}
                  className="flex-1 h-12 bg-[#0a0a0a] text-white text-[12px] font-black uppercase tracking-[0.22em] active:bg-[#1a7e34] disabled:bg-black/25"
                >
                  Spara →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCell({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div className={'px-5 py-4 ' + (last ? '' : 'border-r border-black/8')}>
      <div className="text-[9px] font-black uppercase tracking-[0.28em] text-black/45 mb-1">{label}</div>
      <div className={'text-[22px] font-black leading-none tracking-tight truncate ' + (accent ? 'text-[#1a7e34]' : '')}>
        {value}
      </div>
    </div>
  )
}

function MissionRow({ n, t }: { n: string; t: string }) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="text-[10px] font-black tracking-widest text-black/35 w-6 flex-shrink-0">{n}</span>
      <span className="leading-snug">{t}</span>
    </li>
  )
}