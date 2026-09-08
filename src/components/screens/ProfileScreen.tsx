import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { RANKS } from '../../data/cargoTypes'
import { GARAGE_UNLOCK_POINTS } from '../../data/garageParts'
import { TruckPreview } from '../game/TruckPreview'
import { generateCargoItems } from '../../utils/cargoGenerator'
import { ScrollHint } from '../ui/ScrollHint'

export function ProfileScreen() {
  const { player, garage, resetRound, setCargoItems, playerPosition, setScreen, setEventMode } = useGameStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // En sparad profil kan bära en rang som inte längre finns i listan. Då ger
  // indexOf -1, och utan golvet hamnar man på "steg 0" med tom nästa rang.
  const rankIdx = Math.max(0, RANKS.indexOf(player.rank))
  const nextRank = RANKS[Math.min(rankIdx + 1, RANKS.length - 1)]
  const xpPct = player.xpToNext > 0
    ? Math.min(100, Math.round((player.xp / player.xpToNext) * 100))
    : 100
  const garagePct = Math.min(100, Math.round((garage.stats.lifetimePoints / GARAGE_UNLOCK_POINTS) * 100))

  const handleNewRound = () => {
    resetRound()
    setCargoItems(generateCargoItems(playerPosition))
    setScreen('map')
  }

  const handleExitToSplash = () => {
    resetRound()
    setEventMode(false)
    setScreen('splash')
  }

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 bg-[#f6f4ef] text-[#0a0a0a] overflow-y-auto"
      style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
      data-scroll
    >
      {/* Top rail */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-5 h-12 border-b border-black/8 bg-[#f6f4ef]/95 backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          onClick={() => setScreen('map')}
          className="text-[10px] font-black uppercase tracking-[0.22em] text-black/55 active:text-[#0a0a0a] inline-flex items-center gap-1"
        >
          ← Kartan
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/45">— Profil</span>
        <button
          onClick={handleExitToSplash}
          className="text-[10px] font-black uppercase tracking-[0.22em] text-black/55 active:text-[#00843e]"
        >
          Avsluta ✕
        </button>
      </div>

      <div className="max-w-md mx-auto">

        {/* Hero */}
        <section className="px-5 pt-8 pb-6 border-b border-black/8 profile-hero">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-[#00843e] mb-3">— Min profil</div>
          <h1 className="font-black leading-[0.9] tracking-tight text-[48px] profile-title">{player.name || '—'}<span className="text-[#00843e]">.</span></h1>
          <p className="mt-3 text-[13px] text-black/60 profile-lead">
            {player.rank} · Nivå {player.level} · {player.company}
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 border-b border-black/8">
          <StatCell label="Leveranser" value={String(player.totalDeliveries)} />
          <StatCell label="XP" value={String(player.xp)} accent />
          <StatCell label="Poäng" value={garage.stats.lifetimePoints.toLocaleString('sv-SE')} last />
        </section>

        {/* Läget på rangstegen. XP-mätaren och stegen sa tidigare samma sak i
            två separata sektioner — hopslagna här så knapparna får plats. */}
        <section className="px-5 py-5 border-b border-black/8 profile-section">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/50">Nästa rang</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45 tabular-nums">{xpPct}%</span>
          </div>
          <div className="h-[3px] bg-black/8 mb-2">
            <div className="h-full bg-[#00843e] transition-all duration-700" style={{ width: xpPct + '%' }} />
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[13px] font-black">{nextRank}</span>
            <span className="text-[11px] text-black/50">{player.xpToNext - player.xp} XP kvar</span>
          </div>
          <ol className="flex items-end gap-1">
            {RANKS.map((rank, i) => {
              const isCurrent = i === rankIdx
              const isPast = i < rankIdx
              return (
                <li key={rank} className="flex-1 flex flex-col items-center gap-1" title={rank}>
                  <span className={
                    'text-[9px] font-black tabular-nums leading-none ' +
                    (isCurrent ? 'text-[#00843e]' : isPast ? 'text-black/40' : 'text-black/20')
                  }>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="w-full"
                    style={{
                      height: isCurrent ? 12 : 5,
                      background: isCurrent ? '#00843e' : isPast ? 'rgba(0,132,62,.35)' : 'rgba(0,0,0,.1)',
                    }}
                  />
                </li>
              )
            })}
          </ol>
        </section>

        {/* Lastbil / Garage */}
        <section className="px-5 py-5 border-b border-black/8 profile-section">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/50">Din lastbil</span>
            {garage.unlocked
              ? <span className="text-[10px] font-bold uppercase tracking-widest text-[#00843e]">{garage.ownedPartIds.length} delar</span>
              : <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Låst</span>}
          </div>
          <div className="bg-white border border-black/10 mb-3 mx-auto profile-truck">
            <TruckPreview equipped={garage.equipped} className="w-full" />
          </div>

          {garage.unlocked ? (
            <button
              onClick={() => setScreen('garage')}
              className="w-full h-12 bg-[#0a0a0a] text-white flex items-center justify-between px-5 active:bg-[#00843e] transition-colors"
            >
              <span className="text-[12px] font-black uppercase tracking-[0.22em]">Anpassa i garaget</span>
              <span className="text-lg">→</span>
            </button>
          ) : (
            <>
              <div className="h-[3px] bg-black/8 mb-2">
                <div className="h-full bg-[#0a0a0a] transition-all duration-700" style={{ width: garagePct + '%' }} />
              </div>
              <p className="text-[11px] text-black/55">
                {Math.max(0, GARAGE_UNLOCK_POINTS - garage.stats.lifetimePoints).toLocaleString('sv-SE')} poäng kvar för att låsa upp garaget
              </p>
            </>
          )}
        </section>

        {/* Åtgärder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border-b border-black/8"
        >
          <button
            onClick={() => setScreen('map')}
            className="w-full h-14 bg-[#0a0a0a] text-white flex items-center justify-between px-5 active:bg-[#00843e] transition-colors"
          >
            <span className="text-[12px] font-black uppercase tracking-[0.22em]">Tillbaka till kartan</span>
            <span className="text-lg">→</span>
          </button>
          <div className="grid grid-cols-2 border-t border-black/8">
            <button
              onClick={handleNewRound}
              className="h-12 bg-white flex items-center justify-between px-4 border-r border-black/8 active:bg-black/[0.03]"
            >
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0a0a0a]">Ny omgång</span>
              <span className="text-black/40">↻</span>
            </button>
            <button
              onClick={() => setScreen('leaderboard')}
              className="h-12 bg-white flex items-center justify-between px-4 active:bg-black/[0.03]"
            >
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0a0a0a]">Topplista</span>
              <span className="text-black/40">↗</span>
            </button>
          </div>
        </motion.div>

        <div className="py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-black/35">
          LBC Frakt i Värmland AB · På god väg
        </div>

      </div>
      <ScrollHint targetRef={scrollRef} bottomOffset={20} />
    </div>
  )
}

function StatCell({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div className={'px-5 py-4 profile-stat ' + (last ? '' : 'border-r border-black/8')}>
      <div className="text-[9px] font-black uppercase tracking-[0.28em] text-black/45 mb-1 truncate">{label}</div>
      <div className={'text-[20px] font-black leading-none tracking-tight tabular-nums ' + (accent ? 'text-[#00843e]' : 'text-[#0a0a0a]')}>
        {value}
      </div>
    </div>
  )
}