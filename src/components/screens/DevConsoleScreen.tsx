import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { CARGO_TYPES, RARITY_COLORS } from '../../data/cargoTypes'
import { TRUCK_PARTS, PART_RARITY_COLORS, PART_RARITY_LABELS, CATEGORY_LABELS } from '../../data/garageParts'
import { CURRENT_EVENT } from '../../data/events'
import { generateCargoItems, generateEventCargoField, getDistanceMeters } from '../../utils/cargoGenerator'
import type { GameScreen, LatLng } from '../../types'

// Byt lösenord här vid behov. Enkel klient-sida-gate — sifferkod räcker för mässan.
const ADMIN_CODE = 'lbc2026'
const AUTH_KEY = 'lcq-dev-authed'

const SCREEN_LABELS: Record<GameScreen, string> = {
  splash: 'Startsida',
  map: 'Karta',
  collect: 'Insamling',
  loading: 'Lastning',
  delivery: 'Transport',
  result: 'Resultat',
  profile: 'Profil',
  garage: 'Garage',
  leaderboard: 'Topplista',
  admin: 'Admin (topplista)',
  dev: 'Dev-konsol',
}

export function DevConsoleScreen() {
  const {
    player, playerPosition, cargoItems, inventory, garage, testMode, eventMode,
    setScreen, setTestMode, setEventMode, setPlayerName, setPlayerPosition,
    setCargoItems, collectCargo, resetRound, awardXP, addInventory,
    clearInventory, unlockAllGarageParts, resetPlayerProfile, resetEverything,
    testUnlockGarage,
  } = useGameStore()

  const [authed, setAuthed] = useState<boolean>(() => sessionStorage.getItem(AUTH_KEY) === '1')
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (codeInput.trim() === ADMIN_CODE) {
      sessionStorage.setItem(AUTH_KEY, '1')
      setAuthed(true)
      setCodeError(false)
    } else {
      setCodeError(true)
    }
  }

  // ─── Simuleringar ───────────────────────────────────────
  const collectNearest = () => {
    const uncollected = cargoItems
      .filter((i) => !i.collected)
      .map((i) => ({ ...i, dist: getDistanceMeters(playerPosition, i.position) }))
      .sort((a, b) => a.dist - b.dist)
    if (uncollected.length === 0) { showToast('Inga gods att samla'); return }
    collectCargo(uncollected[0].id)
    showToast(`Samlade ${uncollected[0].type.emoji} ${uncollected[0].type.name}`)
  }

  const collectAll = () => {
    const uncollected = cargoItems.filter((i) => !i.collected)
    uncollected.forEach((i) => collectCargo(i.id))
    showToast(`Samlade ${uncollected.length} kolli`)
  }

  const fillInventoryTo10 = () => {
    const needed = Math.max(0, 10 - inventory.length)
    if (needed === 0) { showToast('Lasten är redan full'); return }
    const picks = Array.from({ length: needed }, () => CARGO_TYPES[Math.floor(Math.random() * CARGO_TYPES.length)])
    addInventory(picks)
    showToast(`+${needed} kolli i lasten`)
  }

  const respawnCargo = (mode: 'here' | 'event') => {
    const items = mode === 'event'
      ? generateEventCargoField(CURRENT_EVENT)
      : generateCargoItems(playerPosition)
    setCargoItems(items)
    showToast(`Genererade ${items.length} nya gods`)
  }

  const teleport = (pos: LatLng, label: string) => {
    setPlayerPosition(pos)
    showToast(`Teleporterade till ${label}`)
  }

  const gotoScreen = (s: GameScreen) => {
    setScreen(s)
    showToast(`Öppnade: ${SCREEN_LABELS[s]}`)
  }

  const stats = useMemo(() => ({
    kolli: cargoItems.filter((i) => !i.collected).length,
    tot: cargoItems.length,
    inv: inventory.length,
    parts: garage.ownedPartIds.length,
    allParts: TRUCK_PARTS.length,
  }), [cargoItems, inventory, garage.ownedPartIds])

  // ─── Login-vy ───────────────────────────────────────────
  if (!authed) {
    return (
      <div
        className="fixed inset-0 bg-[#f6f4ef] text-[#0a0a0a] flex flex-col"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
      >
        <div
          className="flex items-center justify-between px-5 h-12 border-b border-black/8"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <span className="text-[15px] font-black tracking-tight">LBC<span className="text-[#1a7e34]">frakt</span></span>
          <button onClick={() => setScreen('splash')} className="text-[10px] font-black uppercase tracking-[0.22em] text-black/55">
            Avbryt ✕
          </button>
        </div>

        <form onSubmit={handleLogin} className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-[#1a7e34] mb-3">— Behörighet krävs</div>
          <h1 className="text-[42px] font-black leading-none tracking-tight text-center mb-1">Dev-konsol<span className="text-[#1a7e34]">.</span></h1>
          <p className="text-[13px] text-black/55 text-center mb-6 max-w-xs">
            Ange adminkod för att styra spelet utan att fysiskt gå och samla gods.
          </p>
          <input
            type="password"
            value={codeInput}
            onChange={(e) => { setCodeInput(e.target.value); setCodeError(false) }}
            placeholder="Adminkod"
            autoFocus
            className={
              'w-full h-12 px-4 bg-white border text-[16px] font-bold placeholder-black/25 focus:outline-none transition-colors ' +
              (codeError ? 'border-red-500' : 'border-black/15 focus:border-[#1a7e34]')
            }
          />
          {codeError && <div className="mt-2 text-[11px] text-red-700 font-bold uppercase tracking-widest">Fel kod</div>}
          <button
            type="submit"
            className="mt-4 w-full h-12 bg-[#0a0a0a] text-white text-[12px] font-black uppercase tracking-[0.22em] active:bg-[#1a7e34]"
          >
            Logga in →
          </button>
        </form>
      </div>
    )
  }

  // ─── Konsol-vy ──────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-[#f6f4ef] text-[#0a0a0a] overflow-y-auto"
      style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
      data-scroll
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[9999] bg-[#0a0a0a] text-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] shadow-lg">
          {toast}
        </div>
      )}

      {/* Top rail */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-5 h-12 border-b border-black/8 bg-[#f6f4ef]/95 backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-black tracking-tight">LBC<span className="text-[#1a7e34]">frakt</span></span>
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45">Dev-konsol</span>
        </div>
        <button onClick={() => setScreen('splash')} className="text-[10px] font-black uppercase tracking-[0.22em] text-black/55 active:text-[#0a0a0a]">
          Stäng ✕
        </button>
      </div>

      <div className="max-w-md mx-auto">

        {/* Hero */}
        <section className="px-5 pt-8 pb-6 border-b border-black/8">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-[#1a7e34] mb-3">— Adminvy</div>
          <h1 className="text-[44px] font-black leading-[0.9] tracking-tight">Testa hela<br/>spelet<span className="text-[#1a7e34]">.</span></h1>
          <p className="mt-3 text-[13px] text-black/60">Styr spelet utan att lämna kontoret — samla gods, jumpa mellan skärmar, lås upp allt.</p>
        </section>

        {/* Live-stats */}
        <section className="grid grid-cols-4 border-b border-black/8">
          <StatCell label="Gods" value={String(stats.kolli)} />
          <StatCell label="Last" value={`${stats.inv}/10`} accent />
          <StatCell label="Nivå" value={String(player.level)} />
          <StatCell label="Delar" value={`${stats.parts}/${stats.allParts}`} last />
        </section>

        {/* Simulera insamling */}
        <Section title="Simulera insamling">
          <Row label="Samla närmaste" onClick={collectNearest} enabled={stats.kolli > 0} />
          <Row label="Samla ALLA" onClick={collectAll} enabled={stats.kolli > 0} />
          <Row label="Fyll lasten till 10 kolli" onClick={fillInventoryTo10} />
          <Row label="Rensa lasten" onClick={() => { clearInventory(); showToast('Lasten tömd') }} enabled={inventory.length > 0} />
          <Row label="Generera nya gods (nuvarande position)" onClick={() => respawnCargo('here')} />
          <Row label="Generera nya gods (Färjestad)" onClick={() => respawnCargo('event')} />
        </Section>

        {/* Navigera */}
        <Section title="Hoppa till skärm">
          {(['splash','map','loading','delivery','result','profile','garage','leaderboard','admin'] as GameScreen[]).map((s) => (
            <Row key={s} label={SCREEN_LABELS[s]} onClick={() => gotoScreen(s)} />
          ))}
        </Section>

        {/* Spelare */}
        <Section title="Spelare & progression">
          <Row label="Byt namn" onClick={() => {
            const n = window.prompt('Nytt namn?', player.name)
            if (n && n.trim()) { setPlayerName(n.trim()); showToast(`Namn: ${n.trim()}`) }
          }} />
          <Row label="+100 XP" onClick={() => { awardXP(100); showToast('+100 XP') }} />
          <Row label="+500 XP" onClick={() => { awardXP(500); showToast('+500 XP') }} />
          <Row label="+en nivå (500 XP)" onClick={() => { awardXP(player.xpToNext - player.xp); showToast('Nivå upp!') }} />
          <Row label="Nollställ spelarprofil" onClick={() => {
            if (window.confirm('Verkligen nollställa profil, garage och last?')) {
              resetPlayerProfile(); showToast('Profil nollställd')
            }
          }} danger />
        </Section>

        {/* Garage */}
        <Section title="Garage & delar">
          <Row label={garage.unlocked ? 'Garage är upplåst ✓' : 'Lås upp garaget'} onClick={() => { testUnlockGarage(); showToast('Garage upplåst + låda tillagd') }} />
          <Row label="Lås upp ALLA lastbilsdelar" onClick={() => { unlockAllGarageParts(); showToast(`${TRUCK_PARTS.length} delar upplåsta`) }} />
        </Section>

        {/* Position */}
        <Section title="Position & GPS">
          <Row label="Teleport → LBC HQ (Karlstad)" onClick={() => teleport({ lat: 59.3793, lng: 13.5036 }, 'LBC HQ')} />
          <Row label="Teleport → Färjestad Travbana" onClick={() => teleport(CURRENT_EVENT.center, CURRENT_EVENT.name)} />
          <Row label="Teleport → egna koordinater…" onClick={() => {
            const input = window.prompt('Ange koordinater "lat, lng"', `${playerPosition.lat.toFixed(5)}, ${playerPosition.lng.toFixed(5)}`)
            if (!input) return
            const [latStr, lngStr] = input.split(',').map((s) => s.trim())
            const lat = Number(latStr), lng = Number(lngStr)
            if (Number.isFinite(lat) && Number.isFinite(lng)) teleport({ lat, lng }, `${lat}, ${lng}`)
            else showToast('Ogiltiga koordinater')
          }} />
        </Section>

        {/* Lägen */}
        <Section title="Lägen">
          <ToggleRow label="Testläge (tätare gods)" enabled={testMode} onClick={() => { setTestMode(!testMode); showToast(`Testläge: ${!testMode ? 'PÅ' : 'AV'}`) }} />
          <ToggleRow label="Mässläge (bounded spawn)" enabled={eventMode} onClick={() => { setEventMode(!eventMode); showToast(`Mässläge: ${!eventMode ? 'PÅ' : 'AV'}`) }} />
        </Section>

        {/* Katalog: cargo-typer */}
        <details className="border-b border-black/8">
          <summary className="px-5 py-4 cursor-pointer text-[10px] font-black uppercase tracking-[0.28em] text-black/55 list-none flex items-center justify-between">
            <span>— Katalog: {CARGO_TYPES.length} godstyper</span>
            <span className="text-black/40">▾</span>
          </summary>
          <div className="border-t border-black/8 divide-y divide-black/8">
            {CARGO_TYPES.map((c) => (
              <div key={c.id} className="grid grid-cols-[40px_1fr_auto] gap-3 items-center px-5 py-2.5">
                <span className="text-xl">{c.emoji}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-black leading-tight truncate">{c.name}</div>
                  <div className="text-[10px] text-black/50 truncate">{c.weight}kg · {c.value}kr · +{c.xpReward}XP</div>
                </div>
                <span
                  className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                  style={{ color: RARITY_COLORS[c.rarity], background: RARITY_COLORS[c.rarity] + '18' }}
                >
                  {c.rarity}
                </span>
              </div>
            ))}
          </div>
        </details>

        {/* Katalog: lastbilsdelar */}
        <details className="border-b border-black/8">
          <summary className="px-5 py-4 cursor-pointer text-[10px] font-black uppercase tracking-[0.28em] text-black/55 list-none flex items-center justify-between">
            <span>— Katalog: {TRUCK_PARTS.length} lastbilsdelar</span>
            <span className="text-black/40">▾</span>
          </summary>
          <div className="border-t border-black/8 divide-y divide-black/8">
            {TRUCK_PARTS.map((p) => {
              const owned = garage.ownedPartIds.includes(p.id)
              return (
                <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] font-black leading-tight truncate">{p.name}</div>
                    <div className="text-[10px] text-black/50 truncate">{CATEGORY_LABELS[p.category]}</div>
                  </div>
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                    style={{ color: PART_RARITY_COLORS[p.rarity], background: PART_RARITY_COLORS[p.rarity] + '18' }}
                  >
                    {PART_RARITY_LABELS[p.rarity]}
                  </span>
                  <span className={'text-[10px] font-black uppercase tracking-widest ' + (owned ? 'text-[#1a7e34]' : 'text-black/30')}>
                    {owned ? '✓ Äger' : '— Låst'}
                  </span>
                </div>
              )
            })}
          </div>
        </details>

        {/* Farliga aktioner */}
        <Section title="Rensa & återställ">
          <Row label="Rensa nuvarande omgång" onClick={() => { resetRound(); showToast('Omgång nollställd') }} />
          <Row label="Nollställ HELA spelet" onClick={() => {
            if (window.confirm('Verkligen nollställa allt (profil, garage, tillstånd)?')) {
              resetEverything(); showToast('Allt återställt')
            }
          }} danger />
          <Row label="Logga ut från dev-konsol" onClick={() => {
            sessionStorage.removeItem(AUTH_KEY)
            setAuthed(false)
            setScreen('splash')
          }} danger />
        </Section>

        <div className="py-6 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-black/30">
          Dev-konsol · LBC Cargo Quest
        </div>
      </div>
    </div>
  )
}

// ─── Presentational helpers ────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-black/8">
      <div className="px-5 pt-5 pb-2 text-[10px] font-black uppercase tracking-[0.28em] text-black/55">— {title}</div>
      <div className="border-t border-black/8 divide-y divide-black/8">{children}</div>
    </section>
  )
}

function Row({ label, onClick, enabled = true, danger = false }: { label: string; onClick: () => void; enabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={
        'w-full text-left px-5 h-12 flex items-center justify-between transition-colors ' +
        (!enabled
          ? 'text-black/30 cursor-not-allowed'
          : danger
            ? 'text-red-700 active:bg-red-50'
            : 'text-[#0a0a0a] active:bg-black/[0.04]')
      }
    >
      <span className="text-[13px] font-bold">{label}</span>
      <span className={enabled ? (danger ? 'text-red-600' : 'text-black/40') : 'text-black/20'}>→</span>
    </button>
  )
}

function ToggleRow({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-5 h-12 flex items-center justify-between active:bg-black/[0.04]">
      <span className="text-[13px] font-bold text-[#0a0a0a]">{label}</span>
      <div
        className={
          'w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ' +
          (enabled ? 'bg-[#1a7e34]' : 'bg-black/15')
        }
      >
        <div
          className={
            'absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full shadow transition-all ' +
            (enabled ? 'left-[19px]' : 'left-[3px]')
          }
        />
      </div>
    </button>
  )
}

function StatCell({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div className={'px-3 py-4 text-center ' + (last ? '' : 'border-r border-black/8')}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45 mb-1 truncate">{label}</div>
      <div className={'text-[18px] font-black leading-none tracking-tight tabular-nums ' + (accent ? 'text-[#1a7e34]' : 'text-[#0a0a0a]')}>
        {value}
      </div>
    </div>
  )
}