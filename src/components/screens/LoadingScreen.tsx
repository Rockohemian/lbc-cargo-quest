import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { TrailerView, type GhostPreview } from '../game/TrailerView'
import {
  TRAILER_COLS, TRAILER_ROWS, settleRow, computeMetrics,
} from '../../utils/loadEngine'
import type { CargoType, PlacedItem, SecuringState } from '../../types'

let uidSeq = 0
const newUid = () => `p${++uidSeq}-${Math.random().toString(36).slice(2, 6)}`

interface QueueItem { qid: string; type: CargoType }
interface DragState {
  source: 'palette' | 'placed'
  qid?: string
  uid?: string
  type: CargoType
  cols: number
  rows: number
  rotated: boolean
}

const pctX = (c: number) => (c / TRAILER_COLS) * 100
const pctY = (r: number) => (r / TRAILER_ROWS) * 100

export function LoadingScreen() {
  const { inventory, setLoadPlan, setScreen } = useGameStore()

  const [phase, setPhase] = useState<'place' | 'secure'>('place')
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    inventory.map((type, i) => ({ qid: `q${i}-${type.id}`, type }))
  )
  const [placed, setPlaced] = useState<PlacedItem[]>([])
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [ghost, setGhost] = useState<GhostPreview | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  // Securing
  const [strapYs, setStrapYs] = useState<number[]>([])
  const [net, setNet] = useState(false)
  const [divider, setDivider] = useState(false)
  const [chocks, setChocks] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag

  const securing: SecuringState = useMemo(
    () => ({ straps: strapYs.length, net, divider, chocks }),
    [strapYs.length, net, divider, chocks]
  )
  const metrics = useMemo(() => computeMetrics(placed, securing), [placed, securing])

  // ─── Drag mapping ─────────────────────────────────────────────────────
  const computeGhost = useCallback((clientX: number, clientY: number, d: DragState): GhostPreview | null => {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    // Ignore if far outside the grid horizontally
    const cellW = rect.width / TRAILER_COLS
    const relX = clientX - rect.left
    let col = Math.round(relX / cellW - d.cols / 2)
    col = Math.max(0, Math.min(TRAILER_COLS - d.cols, col))
    const ignore = d.source === 'placed' ? d.uid : undefined
    const settled = settleRow(placed, col, d.cols, d.rows, ignore)
    if (settled === null) return { col, row: 0, cols: d.cols, rows: d.rows, valid: false }
    return { col, row: settled, cols: d.cols, rows: d.rows, valid: true }
  }, [placed])

  // Window listeners while dragging
  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      setPointer({ x: e.clientX, y: e.clientY })
      const d = dragRef.current
      if (d) setGhost(computeGhost(e.clientX, e.clientY, d))
    }
    const up = (e: PointerEvent) => {
      const d = dragRef.current
      if (d) {
        const g = computeGhost(e.clientX, e.clientY, d)
        if (g && g.valid) {
          if (d.source === 'palette') {
            setPlaced(prev => [...prev, {
              uid: newUid(), type: d.type, col: g.col, row: g.row,
              cols: d.cols, rows: d.rows, rotated: d.rotated,
            }])
            setQueue(prev => prev.filter(q => q.qid !== d.qid))
          } else if (d.uid) {
            const uid = d.uid
            setPlaced(prev => prev.map(p => p.uid === uid
              ? { ...p, col: g.col, row: g.row, cols: d.cols, rows: d.rows, rotated: d.rotated }
              : p))
          }
        }
      }
      setDrag(null)
      setGhost(null)
      setPointer(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag, computeGhost])

  const startPaletteDrag = (q: QueueItem, e: React.PointerEvent) => {
    e.preventDefault()
    setSelectedUid(null)
    setDrag({ source: 'palette', qid: q.qid, type: q.type, cols: q.type.load.cols, rows: q.type.load.rows, rotated: false })
    setPointer({ x: e.clientX, y: e.clientY })
  }

  const startPlacedDrag = (uid: string, e: React.PointerEvent) => {
    e.preventDefault()
    const item = placed.find(p => p.uid === uid)
    if (!item) return
    setSelectedUid(uid)
    setDrag({ source: 'placed', uid, type: item.type, cols: item.cols, rows: item.rows, rotated: item.rotated })
    setPointer({ x: e.clientX, y: e.clientY })
  }

  const rotateSelected = () => {
    if (!selectedUid) return
    setPlaced(prev => {
      const item = prev.find(p => p.uid === selectedUid)
      if (!item) return prev
      const nc = item.rows, nr = item.cols
      const settled = settleRow(prev, item.col, nc, nr, item.uid)
      const others = prev.filter(p => p.uid !== item.uid)
      if (settled !== null) {
        return [...others, { ...item, cols: nc, rows: nr, row: settled, rotated: !item.rotated }]
      }
      // try to find any column that fits rotated
      for (let c = 0; c <= TRAILER_COLS - nc; c++) {
        const s = settleRow(prev, c, nc, nr, item.uid)
        if (s !== null) return [...others, { ...item, cols: nc, rows: nr, col: c, row: s, rotated: !item.rotated }]
      }
      return prev
    })
  }

  const removeSelected = () => {
    if (!selectedUid) return
    setPlaced(prev => {
      const item = prev.find(p => p.uid === selectedUid)
      if (item) setQueue(q => [...q, { qid: `q-${item.uid}`, type: item.type }])
      return prev.filter(p => p.uid !== selectedUid)
    })
    setSelectedUid(null)
  }

  const autoArrange = () => {
    // Greedy auto-load: heaviest/largest first, left to right.
    const all = [...placed.map(p => p.type), ...queue.map(q => q.type)]
    const sorted = [...all].sort((a, b) => (b.load.cols * b.load.rows) - (a.load.cols * a.load.rows) || b.weight - a.weight)
    const result: PlacedItem[] = []
    for (const type of sorted) {
      let best: { col: number; row: number } | null = null
      for (let c = 0; c <= TRAILER_COLS - type.load.cols; c++) {
        const s = settleRow(result, c, type.load.cols, type.load.rows)
        if (s !== null) { best = { col: c, row: s }; break }
      }
      if (best) result.push({ uid: newUid(), type, col: best.col, row: best.row, cols: type.load.cols, rows: type.load.rows, rotated: false })
    }
    setPlaced(result)
    setQueue([])
    setSelectedUid(null)
  }

  // ─── Securing: swipe to add straps ────────────────────────────────────
  const secureRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const onSecurePointerDown = (e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY }
  }
  const onSecurePointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || !secureRef.current) return
    const dx = Math.abs(e.clientX - start.x)
    if (dx < 40) return // require a horizontal swipe
    const rect = secureRef.current.getBoundingClientRect()
    const y = Math.max(0.05, Math.min(0.92, (start.y - rect.top) / rect.height))
    setStrapYs(prev => (prev.length >= 6 ? prev : [...prev, y]))
  }

  const selectedItem = placed.find(p => p.uid === selectedUid) ?? null

  const handleStartTransport = () => {
    setLoadPlan({ items: placed, securing, metrics })
    setScreen('delivery')
  }

  return (
    <div className="fixed inset-0 bg-surface-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-14 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/30">
            {phase === 'place' ? 'Steg 1 · Lastplanering' : 'Steg 2 · Lastsäkring'}
          </div>
          <h1 className="text-xl font-black text-white font-display">
            {phase === 'place' ? 'Bygg din last' : 'Säkra lasten'}
          </h1>
        </div>
        <div className="flex gap-1.5">
          <div className={`w-8 h-1.5 rounded-full ${phase === 'place' ? 'bg-lbc-green' : 'bg-lbc-green/40'}`} />
          <div className={`w-8 h-1.5 rounded-full ${phase === 'secure' ? 'bg-lbc-green' : 'bg-white/15'}`} />
        </div>
      </div>

      {/* ── PLACE PHASE ── */}
      {phase === 'place' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Trailer interactive area */}
          <div className="px-4 pt-1">
            <div className="relative">
              {/* exact interior grid for hit-testing (matches TRAILER_COLS×ROWS) */}
              <div className="relative w-full rounded-2xl border border-white/12 overflow-hidden"
                style={{ aspectRatio: `${TRAILER_COLS} / ${TRAILER_ROWS}`, background: 'linear-gradient(170deg, rgba(30,40,34,.95), rgba(12,18,14,.98))', boxShadow: 'inset 0 2px 18px rgba(0,0,0,.5)' }}
              >
                <div ref={gridRef} className="absolute inset-0">
                  {/* framstam / bakdörrar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-white/20 to-white/5 z-20 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-2 border-l border-white/15 bg-white/5 z-20 pointer-events-none" />
                  {/* grid lines */}
                  <div className="absolute inset-0 pointer-events-none opacity-[.13]">
                    {Array.from({ length: TRAILER_COLS - 1 }).map((_, i) => (
                      <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${pctX(i + 1)}%` }} />
                    ))}
                    {Array.from({ length: TRAILER_ROWS - 1 }).map((_, i) => (
                      <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-white" style={{ top: `${pctY(i + 1)}%` }} />
                    ))}
                  </div>

                  {/* placed items */}
                  {placed.map(it => {
                    const selected = selectedUid === it.uid
                    return (
                      <div
                        key={it.uid}
                        onPointerDown={e => startPlacedDrag(it.uid, e)}
                        onClick={() => setSelectedUid(it.uid)}
                        className="absolute rounded-lg overflow-hidden touch-none"
                        style={{
                          left: `${pctX(it.col)}%`, top: `${pctY(it.row)}%`,
                          width: `${pctX(it.cols)}%`, height: `${pctY(it.rows)}%`,
                          padding: 2, zIndex: selected ? 30 : 10, cursor: 'grab',
                        }}
                      >
                        <div className="w-full h-full rounded-lg relative flex flex-col items-center justify-center"
                          style={{
                            background: `linear-gradient(150deg, ${it.type.color2}, ${it.type.color})`,
                            border: selected ? '2px solid #fff' : `1.5px solid ${it.type.color2}`,
                            boxShadow: selected ? '0 0 16px rgba(255,255,255,.5)' : '0 5px 12px rgba(0,0,0,.4)',
                            opacity: drag?.uid === it.uid ? 0.4 : 1,
                          }}
                        >
                          <div className="absolute top-0 left-0 right-0 h-1/4 bg-white/20 rounded-t-lg pointer-events-none" />
                          <div className="absolute top-0 right-0 bottom-0 w-1/5 bg-black/20 pointer-events-none" />
                          <span className="relative leading-none" style={{ fontSize: 'min(5vw, 24px)' }}>{it.type.emoji}</span>
                          {it.rows >= 2 && (
                            <span className="relative mt-0.5 px-1 text-[8px] font-bold text-white/90 leading-tight text-center line-clamp-1">{it.type.name}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* ghost */}
                  {ghost && (
                    <div className="absolute rounded-lg pointer-events-none"
                      style={{
                        left: `${pctX(ghost.col)}%`, top: `${pctY(ghost.row)}%`,
                        width: `${pctX(ghost.cols)}%`, height: `${pctY(ghost.rows)}%`,
                        border: `2px dashed ${ghost.valid ? '#27a349' : '#e04020'}`,
                        background: ghost.valid ? 'rgba(39,163,73,.18)' : 'rgba(224,64,32,.16)',
                        zIndex: 40,
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-between px-1 mt-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">⟵ Framstam</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Bakdörrar ⟶</span>
              </div>
            </div>
          </div>

          {/* Live metrics */}
          <div className="px-4 mt-2 grid grid-cols-3 gap-2">
            <Metric label="Fyllnadsgrad" value={metrics.fillPercent} suffix="%" color="#1a7e34" />
            <Metric label="Viktbalans" value={metrics.weightBalance} suffix="%" color="#d4a017" />
            <Metric label="Tyngdpunkt" value={100 - metrics.cogHeight} suffix="%" color="#2a8ae0" />
          </div>

          {/* Feedback + selected controls */}
          <div className="px-4 mt-2 flex-1 min-h-0 flex flex-col">
            <div className="flex flex-wrap gap-1.5">
              {metrics.feedback.slice(0, 3).map((f, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-white/75">{f}</span>
              ))}
            </div>

            <AnimatePresence>
              {selectedItem && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-white/70 flex-1">Vald: <strong className="text-white">{selectedItem.type.name}</strong></span>
                  <Button size="sm" variant="secondary" onClick={rotateSelected}>🔄 Rotera</Button>
                  <Button size="sm" variant="danger" onClick={removeSelected}>🗑 Ta bort</Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Palette */}
            <div className="mt-3 mb-1 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                Att lasta · {queue.length} kvar
              </div>
              {queue.length > 0 && (
                <button onClick={autoArrange} className="text-[11px] font-bold text-lbc-blue">⚡ Autolasta</button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {queue.length === 0 && (
                <div className="text-white/30 text-sm py-3">Allt gods är lastat 🎉</div>
              )}
              {queue.map(q => (
                <div
                  key={q.qid}
                  onPointerDown={e => startPaletteDrag(q, e)}
                  className="flex-shrink-0 w-[88px] rounded-2xl bg-white/6 border border-white/12 p-2 touch-none active:scale-95 transition-transform cursor-grab"
                >
                  <div className="flex items-center justify-center h-9 rounded-lg mb-1"
                    style={{ background: `linear-gradient(150deg, ${q.type.color2}, ${q.type.color})` }}>
                    <span className="text-xl">{q.type.emoji}</span>
                  </div>
                  <div className="text-[10px] font-bold text-white leading-tight line-clamp-1">{q.type.name}</div>
                  <div className="text-[9px] text-white/45">{q.type.weight} kg · {q.type.load.cols}×{q.type.load.rows}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Continue */}
          <div className="px-4 pb-6 pt-1 border-t border-white/8 bg-surface-900/80">
            <Button fullWidth size="lg" disabled={placed.length === 0} onClick={() => { setSelectedUid(null); setPhase('secure') }}>
              {placed.length === 0 ? 'Lasta minst ett gods' : queue.length > 0 ? `Fortsätt till lastsäkring (${queue.length} kvar)` : 'Fortsätt till lastsäkring →'}
            </Button>
          </div>
        </div>
      )}

      {/* ── SECURE PHASE ── */}
      {phase === 'secure' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-1">
            <p className="text-white/55 text-sm mb-2">Dra fingret vågrätt över lasten för att spänna fast band. Lägg till nät, mellanvägg och stoppklossar för full säkring.</p>
            <div ref={secureRef} className="relative touch-none"
              onPointerDown={onSecurePointerDown}
              onPointerUp={onSecurePointerUp}
            >
              <TrailerView items={placed} strapYs={strapYs} net={net} divider={divider} />
            </div>
          </div>

          {/* Securing meter */}
          <div className="px-4 mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/55">Lastsäkring</span>
              <span className="text-sm font-black" style={{ color: metrics.securing >= 80 ? '#27a349' : metrics.securing >= 50 ? '#d4a017' : '#e04020' }}>
                {metrics.securing}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                animate={{ width: `${metrics.securing}%` }}
                style={{ background: metrics.securing >= 80 ? '#27a349' : metrics.securing >= 50 ? '#d4a017' : '#e04020' }} />
            </div>
          </div>

          {/* Securing tools */}
          <div className="px-4 mt-3 grid grid-cols-2 gap-2">
            <ToolToggle active={strapYs.length > 0} icon="🔗" label={`Spännband · ${strapYs.length}`} onClick={() => {
              // tapping also adds a strap at a sensible default height
              setStrapYs(prev => prev.length >= 6 ? prev : [...prev, 0.3 + prev.length * 0.12])
            }} />
            <ToolToggle active={false} icon="↩️" label="Ångra band" disabled={strapYs.length === 0} onClick={() => setStrapYs(prev => prev.slice(0, -1))} />
            <ToolToggle active={net} icon="🕸️" label="Lastnät bak" onClick={() => setNet(v => !v)} />
            <ToolToggle active={divider} icon="🧱" label="Mellanvägg" onClick={() => setDivider(v => !v)} />
            <ToolToggle active={chocks} icon="🔻" label="Stoppklossar" onClick={() => setChocks(v => !v)} />
            <ToolToggle active={false} icon="🤖" label="Säkra automatiskt" onClick={() => { setStrapYs([0.28, 0.45, 0.62, 0.78]); setNet(true); setChocks(true) }} />
          </div>

          {/* Feedback */}
          <div className="px-4 mt-3 flex-1 min-h-0">
            <GlassCard className="p-3">
              <div className="flex flex-wrap gap-1.5">
                {metrics.feedback.map((f, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-white/75">{f}</span>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Actions */}
          <div className="px-4 pb-6 pt-1 border-t border-white/8 bg-surface-900/80 space-y-2">
            <Button fullWidth size="lg" onClick={handleStartTransport}>🚚 Starta transport</Button>
            <Button fullWidth size="sm" variant="ghost" onClick={() => setPhase('place')}>← Tillbaka till lastning</Button>
          </div>
        </div>
      )}

      {/* Floating drag preview */}
      {drag && pointer && (
        <div className="fixed pointer-events-none z-[2000] -translate-x-1/2 -translate-y-1/2 rounded-lg flex items-center justify-center shadow-2xl"
          style={{
            left: pointer.x, top: pointer.y,
            width: 46, height: 46,
            background: `linear-gradient(150deg, ${drag.type.color2}, ${drag.type.color})`,
            border: '2px solid rgba(255,255,255,.7)', opacity: 0.92,
          }}>
          <span className="text-xl">{drag.type.emoji}</span>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white/6 border border-white/10 px-2.5 py-2 text-center">
      <div className="text-lg font-black" style={{ color }}>{value}{suffix}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">{label}</div>
    </div>
  )
}

function ToolToggle({ active, icon, label, onClick, disabled }: { active: boolean; icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={[
        'flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all text-left',
        disabled ? 'opacity-35' : 'active:scale-95',
        active ? 'bg-lbc-green/18 border-lbc-green/40 text-lbc-green' : 'bg-white/6 border-white/12 text-white/80',
      ].join(' ')}
    >
      <span className="text-base">{icon}</span>
      <span className="leading-tight">{label}</span>
    </button>
  )
}
