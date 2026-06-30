import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { RANKS } from '../../data/cargoTypes'
import { GARAGE_UNLOCK_POINTS } from '../../data/garageParts'
import { GlassCard } from '../ui/GlassCard'
import { ProgressBar } from '../ui/ProgressBar'
import { Button } from '../ui/Button'
import { TruckPreview } from '../game/TruckPreview'
import { generateCargoItems } from '../../utils/cargoGenerator'

export function ProfileScreen() {
  const { player, garage, resetRound, setCargoItems, playerPosition, setScreen } = useGameStore()

  const rankIdx = RANKS.indexOf(player.rank)
  const nextRank = RANKS[Math.min(rankIdx + 1, RANKS.length - 1)]

  const handleNewRound = () => {
    resetRound()
    setCargoItems(generateCargoItems(playerPosition))
    setScreen('map')
  }

  return (
    <div className="fixed inset-0 bg-surface-900 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center px-4 pb-10" data-scroll>
        <div className="w-full max-w-sm space-y-4">

          {/* Top nav bar */}
          <div className="flex items-center justify-between pt-12 pb-2">
            <button
              onClick={() => setScreen('map')}
              className="flex items-center gap-1.5 text-white/50 text-sm font-bold active:text-white/80"
            >
              ← Kartan
            </button>
            <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Min Profil</span>
            <button
              onClick={() => setScreen('splash')}
              className="flex items-center gap-1 text-white/40 text-xs font-bold active:text-white/70"
            >
              ⚙️ Start
            </button>
          </div>

          {/* Avatar + name */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-lbc-green mx-auto flex items-center justify-center text-4xl mb-3 shadow-[0_0_32px_rgba(26,126,52,.4)]">
              🚛
            </div>
            <h1 className="text-2xl font-black text-white">{player.name}</h1>
            <p className="text-lbc-green font-bold text-sm">{player.rank}</p>
            <p className="text-white/35 text-xs">{player.company}</p>
          </motion.div>

          {/* Stats — 3 siffror */}
          <GlassCard className="p-5" delay={0.05}>
            <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest mb-3">Din statistik</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-3xl font-black text-white">{player.level}</div>
                <div className="text-xs text-white/40 mt-0.5">Nivå</div>
              </div>
              <div>
                <div className="text-3xl font-black text-lbc-green">{player.totalDeliveries}</div>
                <div className="text-xs text-white/40 mt-0.5">Leveranser</div>
              </div>
              <div>
                <div className="text-3xl font-black" style={{color:'#2a8ae0'}}>{player.xp}</div>
                <div className="text-xs text-white/40 mt-0.5">XP</div>
              </div>
            </div>
          </GlassCard>

          {/* XP progress */}
          <GlassCard className="p-5" delay={0.1}>
            <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest mb-3">Nästa rang</p>
            <ProgressBar
              value={player.xp}
              max={player.xpToNext}
              label={nextRank}
              showPct
              color="#1a7e34"
            />
            <p className="text-white/40 text-xs text-center mt-2">
              {player.xpToNext - player.xp} XP kvar till ”{nextRank}”
            </p>
          </GlassCard>

          {/* Din lastbil / Garage */}
          <GlassCard className="p-4" delay={0.15} glow>
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest">Din lastbil</p>
                <p className="text-xs text-white/45 mt-0.5">
                  {garage.unlocked
                    ? 'Anpassa lastbilen med delar du tjänat in'
                    : 'Lås upp garaget genom att spela fler omgångar'}
                </p>
              </div>
              {garage.unlocked && (
                <span className="text-xs text-lbc-green font-bold">{garage.ownedPartIds.length} delar</span>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden my-2" style={{ background: 'linear-gradient(180deg,#0a1410,#06100b)' }}>
              <TruckPreview equipped={garage.equipped} view="side" className="w-full" />
            </div>
            {garage.unlocked ? (
              <Button fullWidth size="md" onClick={() => setScreen('garage')}>
                🔧 Öppna garaget →
              </Button>
            ) : (
              <div className="mt-1">
                <ProgressBar
                  value={Math.min(garage.stats.lifetimePoints, GARAGE_UNLOCK_POINTS)}
                  max={GARAGE_UNLOCK_POINTS}
                  label="🔒 Garage låst"
                  showPct
                  color="#2a8ae0"
                />
                <p className="text-white/40 text-xs text-center mt-1.5">
                  {Math.max(0, GARAGE_UNLOCK_POINTS - garage.stats.lifetimePoints).toLocaleString('sv-SE')} poäng kvar
                </p>
              </div>
            )}
          </GlassCard>

          {/* Rang-stege */}
          <GlassCard className="p-5" delay={0.2}>
            <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest mb-3">Rangstegen — var befinner du dig?</p>
            <div className="space-y-2">
              {RANKS.map((rank, i) => {
                const isCurrentOrBelow = i <= rankIdx
                const isCurrent = i === rankIdx
                return (
                  <div key={rank} className="flex items-center gap-3">
                    <div
                      className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ' +
                        (isCurrent ? 'bg-lbc-green text-white' : isCurrentOrBelow ? 'bg-white/20 text-white/60' : 'bg-white/5 text-white/20')}
                    >
                      {i + 1}
                    </div>
                    <span className={'text-sm font-medium ' + (isCurrent ? 'text-white font-black' : isCurrentOrBelow ? 'text-white/60' : 'text-white/20')}>
                      {rank}
                    </span>
                    {isCurrent && <span className="ml-auto text-lbc-green text-xs font-bold">← Du</span>}
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* Knappar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2 pb-4"
          >
            <Button fullWidth size="lg" onClick={handleNewRound}>
              🗺️ Hitta gods
            </Button>
            <Button fullWidth size="md" variant="secondary" onClick={() => setScreen('leaderboard')}>
              🏆 Dagens topplista
            </Button>
            <Button fullWidth size="md" variant="ghost" onClick={() => setScreen('splash')}>
              ⚙️ Inställningar / Byt läge
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
