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
      <div className="h-12 bg-[#f6f4ef]/95 backdrop-blur-md border-b border-black/8 px-4 flex items-center gap-3 max-w-full">

        {/* Level badge → profil */}
        <button
          onClick={() => setScreen('profile')}
          className="flex-shrink-0 w-8 h-8 rounded-none bg-[#0a0a0a] text-white flex items-center justify-center font-black text-xs active:bg-[#1a7e34] transition-colors"
          aria-label="Min profil"
        >
          {player.level}
        </button>

        {/* Rang + XP-stapel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-[3px]">
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-black/55 truncate">
              {player.rank}
            </span>
            <span className="text-[9px] font-bold text-black/30 flex-shrink-0">
              {xpPct}%
            </span>
          </div>
          <div className="h-[3px] bg-black/8 overflow-hidden">
            <div
              className="h-full bg-[#1a7e34] transition-all duration-700"
              style={{ width: xpPct + '%' }}
            />
          </div>
        </div>

        {/* Antal kolli — bara på karta */}
        {screen === 'map' && (
          <div className="flex-shrink-0 text-right leading-none">
            <span className="text-[15px] font-black text-[#0a0a0a] tabular-nums">{inventory.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40"> Kolli</span>
          </div>
        )}

        {/* Avsluta → startsida */}
        <button
          onClick={handleExit}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-black/40 active:text-[#1a7e34] text-base transition-colors"
          aria-label="Gå till startsidan"
        >
          ✕
        </button>
      </div>
    </div>
  )
}