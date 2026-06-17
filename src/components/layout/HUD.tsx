import { useGameStore } from '../../store/gameStore'
import { ProgressBar } from '../ui/ProgressBar'

export function HUD() {
  const { player, screen, inventory, setScreen, testMode } = useGameStore()
  if (screen === 'splash') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 safe-area-top">
      <div className="mx-3 mt-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,10,.92),rgba(10,16,10,.72))] px-4 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,.34)] backdrop-blur-xl">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          {/* Level badge */}
          <button
            onClick={() => setScreen('profile')}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-[linear-gradient(180deg,#27a349,#14692b)] flex items-center justify-center text-white font-black text-sm border border-lbc-green/50 shadow-[0_0_24px_rgba(26,126,52,.35)] transition-colors"
          >
            {player.level}
          </button>

          {/* XP bar */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-0.5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/28">Cargo Quest</span>
              <span className="text-xs text-white/40">{player.xp}/{player.xpToNext} XP</span>
            </div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-bold text-white truncate font-display">{player.rank}</span>
              <span className="text-xs text-lbc-green/80 font-bold">LV {player.level}</span>
            </div>
            <ProgressBar value={player.xp} max={player.xpToNext} height={5} color="#1a7e34" />
          </div>

          {/* Cargo count on map */}
          {screen === 'map' && (
            <div className="flex-shrink-0 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/8 px-3 py-2">
              <span className="text-sm">📦</span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Last</div>
                <span className="text-sm font-bold text-white leading-none">{inventory.length}</span>
              </div>
            </div>
          )}

          {testMode && (
            <div className="flex-shrink-0 rounded-2xl border border-lbc-blue/25 bg-lbc-blue/10 px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-lbc-blue">
              Test
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
