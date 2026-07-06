import { useMemo, useState } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import {
  TRUCK_PARTS, PART_BY_ID, PART_RARITY_COLORS, PART_RARITY_LABELS,
  CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_ORDER,
  CRATES, CRATE_ORDER, ACHIEVEMENTS,
} from '../../data/garageParts'
import type { PartCategory, CrateTier, PartRarity } from '../../types'
import { TruckPreview } from '../game/TruckPreview'
import { CrateOpenModal } from '../garage/CrateOpenModal'
import { Button } from '../ui/Button'

type View = 'side' | 'front' | 'back'
const VIEWS: View[] = ['front', 'side', 'back']
const VIEW_LABELS: Record<View, string> = { side: 'Sida', front: 'Front', back: 'Bak' }

export function GarageScreen() {
  const garage = useGameStore(s => s.garage)
  const player = useGameStore(s => s.player)
  const equipPart = useGameStore(s => s.equipPart)
  const unequipPart = useGameStore(s => s.unequipPart)
  const setScreen = useGameStore(s => s.setScreen)

  const [view, setView] = useState<View>('side')
  const [zoom, setZoom] = useState(1)
  const [tab, setTab] = useState<PartCategory>('front')
  const [openingCrate, setOpeningCrate] = useState<CrateTier | null>(null)

  const owned = useMemo(() => new Set(garage.ownedPartIds), [garage.ownedPartIds])

  const rotate = (dir: -1 | 1) => {
    const idx = VIEWS.indexOf(view)
    setView(VIEWS[(idx + dir + VIEWS.length) % VIEWS.length])
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) rotate(1)
    else if (info.offset.x > 60) rotate(-1)
  }

  // crate counts grouped by tier
  const crateCounts = useMemo(() => {
    const c: Partial<Record<CrateTier, number>> = {}
    for (const t of garage.pendingCrates) c[t] = (c[t] ?? 0) + 1
    return c
  }, [garage.pendingCrates])

  const partsForTab = TRUCK_PARTS.filter(p => p.category === tab)

  const achStat = (metric: string) =>
    metric === 'level' ? player.level
    : metric === 'damageFreeDeliveries' ? garage.stats.damageFreeDeliveries
    : metric === 'ecoPointsTotal' ? garage.stats.ecoPointsTotal
    : garage.stats.highSecuringCount

  return (
    <div className="fixed inset-0 bg-surface-900 overflow-y-auto scrollbar-hide">
      {/* workshop backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(39,163,73,.12), transparent 60%),' +
            'radial-gradient(80% 50% at 50% 120%, rgba(42,138,224,.10), transparent 60%),' +
            'repeating-linear-gradient(90deg, rgba(255,255,255,.02) 0 1px, transparent 1px 60px)',
        }}
      />

      <div className="relative min-h-full flex flex-col px-4 pt-14 pb-10" data-scroll>
        {/* header */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setScreen('profile')} className="text-white/60 text-sm font-bold flex items-center gap-1">
            ← Tillbaka
          </button>
          <h1 className="text-lg font-black text-white tracking-wide">🔧 LBC GARAGE</h1>
          <div className="w-16" />
        </div>

        {/* ── Truck stage ─────────────────────────────────────────── */}
        <div className="relative rounded-[28px] overflow-hidden mb-4 border border-white/10"
          style={{ background: 'linear-gradient(180deg, #0a1410 0%, #06100b 60%, #040a07 100%)' }}>
          {/* spotlights */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,.10), transparent 70%)' }} />

          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            className="relative h-56 flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ scale: zoom, transformPerspective: 800 }}
                className="w-[88%]"
              >
                <TruckPreview equipped={garage.equipped} view={view} className="w-full drop-shadow-[0_18px_30px_rgba(0,0,0,.6)]" />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* view controls */}
          <div className="flex items-center justify-between px-4 pb-3">
            <button onClick={() => rotate(-1)} className="w-9 h-9 rounded-full bg-white/10 text-white text-lg active:scale-90 transition">↶</button>
            <div className="flex gap-1.5">
              {VIEWS.map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${view === v ? 'bg-lbc-green text-white' : 'bg-white/10 text-white/60'}`}>
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
            <button onClick={() => rotate(1)} className="w-9 h-9 rounded-full bg-white/10 text-white text-lg active:scale-90 transition">↷</button>
          </div>

          {/* zoom */}
          <div className="flex items-center gap-3 px-4 pb-4">
            <span className="text-white/40 text-xs">🔍</span>
            <input type="range" min={0.8} max={1.6} step={0.05} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-lbc-green" />
            <span className="text-white/40 text-xs w-8 text-right">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* ── Pending crates ──────────────────────────────────────── */}
        {garage.pendingCrates.length > 0 && (
          <div className="mb-4">
            <h2 className="text-white/70 text-sm font-black uppercase tracking-wider mb-2">📦 Oöppnade lådor</h2>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {CRATE_ORDER.filter(t => crateCounts[t]).map(t => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setOpeningCrate(t)}
                  className="relative shrink-0 w-24 rounded-2xl p-3 border text-center"
                  style={{ background: `${CRATES[t].color}1a`, borderColor: `${CRATES[t].color}55` }}
                >
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}
                    className="text-3xl" style={{ filter: `drop-shadow(0 0 8px ${CRATES[t].glow})` }}>
                    {CRATES[t].icon}
                  </motion.div>
                  <div className="text-[10px] font-bold text-white mt-1 leading-tight">{CRATES[t].name}</div>
                  <span className="absolute -top-1.5 -right-1.5 bg-lbc-green text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {crateCounts[t]}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── Category tabs ───────────────────────────────────────── */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3">
          {CATEGORY_ORDER.map(c => (
            <button key={c} onClick={() => setTab(c)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${tab === c ? 'bg-lbc-green text-white' : 'bg-white/8 text-white/55'}`}>
              <span>{CATEGORY_ICONS[c]}</span>{CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {/* ── Parts grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {partsForTab.map(part => {
            const isOwned = owned.has(part.id)
            const isEquipped = garage.equipped[tab] === part.id
            const color = PART_RARITY_COLORS[part.rarity]
            return (
              <button
                key={part.id}
                disabled={!isOwned}
                onClick={() => isEquipped ? unequipPart(tab) : equipPart(tab, part.id)}
                className="relative text-left rounded-2xl p-3 border transition active:scale-[.98]"
                style={{
                  background: isEquipped ? `${color}22` : 'rgba(255,255,255,.04)',
                  borderColor: isEquipped ? color : isOwned ? `${color}44` : 'rgba(255,255,255,.06)',
                  opacity: isOwned ? 1 : 0.5,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="text-2xl" style={{ filter: isOwned ? 'none' : 'grayscale(1)' }}>{part.icon}</div>
                  {!isOwned && <span className="text-white/40 text-sm">🔒</span>}
                  {isEquipped && <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ background: color }}>PÅ</span>}
                </div>
                <div className="text-xs font-bold text-white mt-1.5 leading-tight">{part.name}</div>
                <RarityTag rarity={part.rarity} color={color} />
                {!isOwned && (
                  <div className="text-[10px] text-white/40 mt-1 leading-tight">{part.unlockHint}</div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Achievements ────────────────────────────────────────── */}
        <h2 className="text-white/70 text-sm font-black uppercase tracking-wider mb-2">🏆 Prestationer</h2>
        <div className="space-y-2 mb-4">
          {ACHIEVEMENTS.map(a => {
            const done = garage.achievementsUnlocked.includes(a.id)
            const cur = Math.min(achStat(a.metric), a.goal)
            const pct = Math.round((cur / a.goal) * 100)
            const reward = PART_BY_ID[a.rewardPartId]
            return (
              <div key={a.id} className="rounded-2xl p-3 border"
                style={{ background: done ? 'rgba(39,163,73,.12)' : 'rgba(255,255,255,.04)', borderColor: done ? '#00a34c55' : 'rgba(255,255,255,.07)' }}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">{a.title}</div>
                      {done && <span className="text-lbc-green text-xs font-black">✓ KLAR</span>}
                    </div>
                    <div className="text-[11px] text-white/45 leading-tight">{a.description}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? '#00a34c' : '#2a8ae0' }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-white/40">{cur} / {a.goal}</span>
                      {reward && <span className="text-[10px]" style={{ color: PART_RARITY_COLORS[reward.rarity] }}>🎁 {reward.name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Button fullWidth variant="ghost" onClick={() => setScreen('profile')}>Tillbaka till profilen</Button>
      </div>

      {/* crate opening overlay */}
      <AnimatePresence>
        {openingCrate && (
          <CrateOpenModal tier={openingCrate} onClose={() => setOpeningCrate(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function RarityTag({ rarity, color }: { rarity: PartRarity; color: string }) {
  return (
    <span className="inline-block text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-md"
      style={{ background: `${color}22`, color }}>
      {PART_RARITY_LABELS[rarity]}
    </span>
  )
}
