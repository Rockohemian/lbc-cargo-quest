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
    <div
      className="fixed inset-0 bg-[#f6f4ef] text-[#0a0a0a] flex flex-col overflow-hidden"
      style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
    >
      {/* ── Header (LBC-style) ── */}
      <div
        className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-black/8 flex-shrink-0"
        style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => setScreen('profile')}
          className="text-[10px] font-black uppercase tracking-[0.22em] text-black/55 active:text-[#0a0a0a] flex items-center gap-1"
        >
          ← Tillbaka
        </button>
        <div className="text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#00843e]">— Garage</div>
          <h1 className="text-[15px] font-black leading-none tracking-tight">LBC verkstad<span className="text-[#00843e]">.</span></h1>
        </div>
        <div className="w-14" />
      </div>

      {/* ── Scrollbart innehåll ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" data-scroll>
        {/* ── Truck stage (vit, LBC-ren) ── */}
        <div className="px-4 pt-3">
          <div className="border border-black/12 bg-white overflow-hidden">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              className="relative flex items-center justify-center cursor-grab active:cursor-grabbing"
              style={{ aspectRatio: '16/9', touchAction: 'pan-y' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full"
                >
                  <TruckPreview equipped={garage.equipped} view={view} className="w-full h-full" />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* View-kontroller — LBC-tegel */}
            <div className="grid grid-cols-3 border-t border-black/12">
              {VIEWS.map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={
                    'h-10 text-[11px] font-black uppercase tracking-[0.22em] transition-colors border-r border-black/12 last:border-r-0 ' +
                    (view === v ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black/60 active:bg-black/[0.04]')
                  }
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Oöppnade lådor ── */}
        {garage.pendingCrates.length > 0 && (
          <div className="px-4 mt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e] mb-2">— Oöppnade lådor</div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ touchAction: 'pan-x' }}>
              {CRATE_ORDER.filter(t => crateCounts[t]).map(t => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setOpeningCrate(t)}
                  className="relative shrink-0 w-24 border border-black/12 bg-white p-2 text-center active:bg-black/[0.04]"
                >
                  <div className="text-2xl">{CRATES[t].icon}</div>
                  <div className="text-[10px] font-black uppercase tracking-tight text-[#0a0a0a] mt-1 leading-tight">{CRATES[t].name}</div>
                  <span className="absolute -top-1.5 -right-1.5 bg-[#00843e] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center">
                    {crateCounts[t]}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── Kategori-flikar ── */}
        <div className="px-4 mt-4">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e] mb-2">— Delar</div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" style={{ touchAction: 'pan-x' }}>
            {CATEGORY_ORDER.map(c => (
              <button
                key={c}
                onClick={() => setTab(c)}
                className={
                  'shrink-0 h-9 px-3 text-[11px] font-black uppercase tracking-[0.18em] flex items-center gap-1.5 border transition-colors ' +
                  (tab === c
                    ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                    : 'bg-white text-black/60 border-black/12 active:bg-black/[0.04]')
                }
              >
                <span>{CATEGORY_ICONS[c]}</span>{CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Parts-grid ── */}
        <div className="px-4 mt-3 grid grid-cols-2 gap-2">
          {partsForTab.map(part => {
            const isOwned = owned.has(part.id)
            const isEquipped = garage.equipped[tab] === part.id
            const color = PART_RARITY_COLORS[part.rarity]
            return (
              <button
                key={part.id}
                disabled={!isOwned}
                onClick={() => isEquipped ? unequipPart(tab) : equipPart(tab, part.id)}
                className={
                  'relative text-left p-3 border transition-colors active:bg-black/[0.04] ' +
                  (isEquipped
                    ? 'bg-white border-[#0a0a0a]'
                    : 'bg-white border-black/12 ' + (isOwned ? '' : 'opacity-50'))
                }
              >
                <div className="flex items-start justify-between">
                  <div className="text-2xl" style={{ filter: isOwned ? 'none' : 'grayscale(1)' }}>{part.icon}</div>
                  {!isOwned && <span className="text-black/40 text-sm">🔒</span>}
                  {isEquipped && (
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white bg-[#00843e] px-1.5 py-0.5">PÅ</span>
                  )}
                </div>
                <div className="text-[12px] font-black text-[#0a0a0a] mt-1.5 leading-tight">{part.name}</div>
                <RarityTag rarity={part.rarity} color={color} />
                {!isOwned && (
                  <div className="text-[10px] text-black/45 mt-1 leading-tight">{part.unlockHint}</div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Prestationer ── */}
        <div className="px-4 mt-5">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e] mb-2">— Prestationer</div>
          <div className="space-y-2">
            {ACHIEVEMENTS.map(a => {
              const done = garage.achievementsUnlocked.includes(a.id)
              const cur = Math.min(achStat(a.metric), a.goal)
              const pct = Math.round((cur / a.goal) * 100)
              const reward = PART_BY_ID[a.rewardPartId]
              return (
                <div
                  key={a.id}
                  className={'p-3 border ' + (done ? 'bg-[#00843e]/[0.08] border-[#00843e]/40' : 'bg-white border-black/12')}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-black text-[#0a0a0a]">{a.title}</div>
                        {done && <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00843e]">✓ Klar</span>}
                      </div>
                      <div className="text-[10px] text-black/55 leading-tight mt-0.5">{a.description}</div>
                      <div className="mt-1.5 h-[3px] bg-black/8 overflow-hidden">
                        <div className="h-full" style={{ width: `${pct}%`, background: done ? '#00843e' : '#0a0a0a' }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-bold text-black/50 tabular-nums">{cur} / {a.goal}</span>
                        {reward && <span className="text-[10px] font-bold" style={{ color: PART_RARITY_COLORS[reward.rarity] }}>🎁 {reward.name}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottenmarginal så innehåll inte fastnar under CTA */}
        <div className="h-24" />
      </div>

      {/* ── Sticky CTA ── */}
      <div
        className="border-t border-black/8 bg-[#f6f4ef] px-4 pt-3 pb-3 flex-shrink-0"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setScreen('profile')}
          className="w-full h-12 flex items-center justify-between px-5 text-[11px] font-black uppercase tracking-[0.22em] bg-[#0a0a0a] text-white active:bg-[#00843e] transition-colors"
        >
          <span>Tillbaka till profilen</span>
          <span className="text-base">→</span>
        </button>
      </div>

      {/* Crate-opening overlay */}
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
    <span
      className="inline-block text-[9px] font-black uppercase tracking-[0.18em] mt-1 px-1.5 py-0.5"
      style={{ background: `${color}22`, color }}
    >
      {PART_RARITY_LABELS[rarity]}
    </span>
  )
}