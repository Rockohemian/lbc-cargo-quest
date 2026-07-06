import { useGameStore } from '../../store/gameStore'

export function HUD() {
  const { player, screen, inventory, setScreen, resetRound, setEventMode } = useGameStore()
  if (screen === 'splash') return null

  const xpPct = Math.min(100, Math.round((player.xp / player.xpToNext) * 100))

  const handleExit = () => {
    resetRound()
    setEventMode(false)
    setScreen('splash')
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-11 bg-[#060d07]/96 backdrop-blur-md border-b border-white/[0.07] px-4 flex items-center gap-3 max-w-full">

        {/* Level badge → profil */}
        <button
          onClick={() => setScreen('profile')}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-lbc-green flex items-center justify-center text-white font-black text-xs active:opacity-70 transition-opacity"
          aria-label="Min profil"
        >
          {player.level}
        </button>

        {/* Rang + XP-stapel */}
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 block mb-[3px] truncate">
            {player.rank}
          </span>
          <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-lbc-green rounded-full transition-all duration-700"
              style={{ width: xpPct + '%' }}
            />
          </div>
        </div>

        {/* Antal kolli — visas bara på kartskärmen */}
        {screen === 'map' && (
          <div className="flex-shrink-0 text-right mr-1">
            <span className="text-sm font-black text-white leading-none">{inventory.length}</span>
            <span className="text-[11px] text-white/30 leading-none"> kolli</span>
          </div>
        )}

        {/* Avsluta → startsida */}
        <button
          onClick={handleExit}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/30 active:text-white/70 transition-colors text-base"
          aria-label="Gå till startsidan"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
