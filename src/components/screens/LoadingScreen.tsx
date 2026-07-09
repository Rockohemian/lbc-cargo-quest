import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { TrailerView, type GhostPreview } from '../game/TrailerView'
import {
  TRAILER_COLS, TRAILER_ROWS, settleRow, computeMetrics,
} from '../../utils/loadEngine'
import { CARGO_TYPES } from '../../data/cargoTypes'
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

  const [strapYs, setStrapYs] = useState<number[]>([])
  const [net, setNet] = useState(false)
  const [divider, setDivider] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag

  // Runtime-invariant: garantera att inga två items överlappar. Om det ändå skulle hända
  // (bugg någonstans), släng ut duplikaten hellre än att låta användaren se överlapp.
  useEffect(() => {
    const seen: PlacedItem[] = []
    let mutated = false
    for (const it of placed) {
      const overlap = seen.some(s =>
        it.col < s.col + s.cols && it.col + it.cols > s.col &&
        it.row < s.row + s.rows && it.row + it.rows > s.row
      )
      if (overlap) { mutated = true; continue }
      seen.push(it)
    }
    if (mutated) {
      console.warn('[LoadingScreen] Överlappande items upptäckta, städar upp:', placed.length - seen.length)
      setPlaced(seen)
    }
  }, [placed])

  const securing: SecuringState = useMemo(
    () => ({ straps: strapYs.length, net, divider }),
    [strapYs.length, net, divider]
  )
  const metrics = useMemo(() => computeMetrics(placed, securing), [placed, securing])

  const loadDanger = useMemo<'critical' | 'warning' | null>(() => {
    if (placed.length === 0) return null
    if (metrics.weightBalance < 25 || metrics.cogHeight > 75) return 'critical'
    if (metrics.weightBalance < 45 || metrics.cogHeight > 60) return 'warning'
    return null
  }, [placed.length, metrics.weightBalance, metrics.cogHeight])

  const secureDanger = useMemo<'critical' | 'warning' | null>(() => {
    if (phase !== 'secure' || placed.length === 0) return null
    if (metrics.securing < 20) return 'critical'
    if (metrics.securing < 45) return 'warning'
    return null
  }, [phase, placed.length, metrics.securing])

  const computeGhost = useCallback((clientX: number, clientY: number, d: DragState): GhostPreview | null => {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cellW = rect.width / TRAILER_COLS
    const relX = clientX - rect.left
    let intended = Math.round(relX / cellW - d.cols / 2)
    intended = Math.max(0, Math.min(TRAILER_COLS - d.cols, intended))
    const ignore = d.source === 'placed' ? d.uid : undefined

    // Prova avsedd kolumn först
    const direct = settleRow(placed, intended, d.cols, d.rows, ignore)
    if (direct !== null) return { col: intended, row: direct, cols: d.cols, rows: d.rows, valid: true }

    // Snappa till närmaste giltiga kolumn (max 4 steg åt vardera hållet)
    for (let step = 1; step <= 4; step++) {
      for (const dir of [-1, 1]) {
        const c = intended + dir * step
        if (c < 0 || c > TRAILER_COLS - d.cols) continue
        const s = settleRow(placed, c, d.cols, d.rows, ignore)
        if (s !== null) return { col: c, row: s, cols: d.cols, rows: d.rows, valid: true }
      }
    }

    // Ingen valid plats — visa invalid ghost på golvet (row=TRAILER_ROWS-d.rows) så det INTE overlappar
    return { col: intended, row: Math.max(0, TRAILER_ROWS - d.rows), cols: d.cols, rows: d.rows, valid: false }
  }, [placed])

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
      setDrag(null); setGhost(null); setPointer(null)
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
    setPlaced(result); setQueue([]); setSelectedUid(null)
  }

  const secureRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const onSecurePointerDown = (e: React.PointerEvent) => { swipeStart.current = { x: e.clientX, y: e.clientY } }
  const onSecurePointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || !secureRef.current) return
    const dx = Math.abs(e.clientX - start.x)
    if (dx < 40) return
    const rect = secureRef.current.getBoundingClientRect()
    const y = Math.max(0.05, Math.min(0.92, (start.y - rect.top) / rect.height))
    setStrapYs(prev => (prev.length >= 6 ? prev : [...prev, y]))
  }

  const selectedItem = placed.find(p => p.uid === selectedUid) ?? null

  const handleStartTransport = () => {
    setLoadPlan({ items: placed, securing, metrics })
    setScreen('delivery')
  }

  const handleDevAutoLoadAndGo = () => {
    const all: CargoType[] = [...placed.map(p => p.type), ...queue.map(q => q.type)]
    if (all.length === 0) {
      for (let i = 0; i < 6; i++) all.push(CARGO_TYPES[Math.floor(Math.random() * CARGO_TYPES.length)])
    }
    const sorted = [...all].sort((a, b) => (b.load.cols * b.load.rows) - (a.load.cols * a.load.rows) || b.weight - a.weight)
    const result: PlacedItem[] = []
    for (const type of sorted) {
      for (let c = 0; c <= TRAILER_COLS - type.load.cols; c++) {
        const s = settleRow(result, c, type.load.cols, type.load.rows)
        if (s !== null) {
          result.push({ uid: newUid(), type, col: c, row: s, cols: type.load.cols, rows: type.load.rows, rotated: false })
          break
        }
      }
    }
    const sec = { straps: 4, net: true, divider: false }
    const met = computeMetrics(result, sec)
    setLoadPlan({ items: result, securing: sec, metrics: met })
    setScreen('delivery')
  }

  return (
    <div
      className="fixed inset-0 bg-[#f6f4ef] text-[#0a0a0a] flex flex-col overflow-hidden"
      style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-black/8"
        style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e]">
            — Steg {phase === 'place' ? '01' : '02'} · {phase === 'place' ? 'Lastplanering' : 'Lastsäkring'}
          </div>
          <h1 className="text-[26px] font-black leading-none tracking-tight mt-1">
            {phase === 'place' ? 'Bygg din last' : 'Säkra lasten'}<span className="text-[#00843e]">.</span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-1">
            <div className={`w-6 h-[3px] ${phase === 'place' ? 'bg-[#00843e]' : 'bg-[#00843e]/40'}`} />
            <div className={`w-6 h-[3px] ${phase === 'secure' ? 'bg-[#00843e]' : 'bg-black/15'}`} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45">
            {phase === 'place' ? '1 / 2' : '2 / 2'}
          </span>
        </div>
      </div>

      {phase === 'place' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0" data-scroll>
          {/* Trailer */}
          <div className="px-5 pt-3">
            <div
              className="relative w-full border border-black/15 overflow-hidden bg-[#0e1310]"
              style={{ aspectRatio: `${TRAILER_COLS} / ${TRAILER_ROWS}`, boxShadow: 'inset 0 2px 12px rgba(0,0,0,.4)' }}
            >
              <div ref={gridRef} className="absolute inset-0">
                {/* framstam / bakdörrar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00843e] z-20 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-1.5 border-l border-white/25 bg-white/10 z-20 pointer-events-none" />
                {/* rutnät */}
                <div className="absolute inset-0 pointer-events-none opacity-[.12]">
                  {Array.from({ length: TRAILER_COLS - 1 }).map((_, i) => (
                    <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${pctX(i + 1)}%` }} />
                  ))}
                  {Array.from({ length: TRAILER_ROWS - 1 }).map((_, i) => (
                    <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-white" style={{ top: `${pctY(i + 1)}%` }} />
                  ))}
                </div>

                {placed.map(it => {
                  const selected = selectedUid === it.uid
                  return (
                    <div
                      key={it.uid}
                      data-drag-source
                      onPointerDown={e => startPlacedDrag(it.uid, e)}
                      onClick={() => setSelectedUid(it.uid)}
                      className="absolute overflow-hidden touch-none"
                      style={{
                        left: `calc(${pctX(it.col)}% + 2px)`, top: `calc(${pctY(it.row)}% + 2px)`,
                        width: `calc(${pctX(it.cols)}% - 4px)`, height: `calc(${pctY(it.rows)}% - 4px)`,
                        zIndex: selected ? 30 : 10, cursor: 'grab',
                        WebkitUserDrag: 'none',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                      } as React.CSSProperties}
                    >
                      <div className="w-full h-full relative flex flex-col items-center justify-center"
                        style={{
                          background: `linear-gradient(150deg, ${it.type.color2}, ${it.type.color})`,
                          border: selected ? '2px solid #fff' : `1px solid ${it.type.color2}`,
                          boxShadow: selected ? '0 0 12px rgba(255,255,255,.5)' : '0 3px 8px rgba(0,0,0,.4)',
                          opacity: drag?.uid === it.uid ? 0.4 : 1,
                        }}
                      >
                        <span className="relative leading-none" style={{ fontSize: 'min(5vw, 22px)' }}>{it.type.emoji}</span>
                        {it.rows >= 2 && (
                          <span className="relative mt-0.5 px-1 text-[8px] font-bold text-white/90 leading-tight text-center line-clamp-1">{it.type.name}</span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {ghost && (
                  <div className="absolute pointer-events-none flex items-center justify-center"
                    style={{
                      left: `${pctX(ghost.col)}%`, top: `${pctY(ghost.row)}%`,
                      width: `${pctX(ghost.cols)}%`, height: `${pctY(ghost.rows)}%`,
                      border: `3px solid ${ghost.valid ? '#00e070' : '#ff4030'}`,
                      background: ghost.valid
                        ? 'rgba(0,168,80,.35)'
                        : 'repeating-linear-gradient(45deg, rgba(255,64,48,.45) 0 8px, rgba(255,64,48,.18) 8px 16px)',
                      boxShadow: ghost.valid
                        ? '0 0 0 2px rgba(0,168,80,.35), inset 0 0 12px rgba(0,168,80,.45)'
                        : '0 0 0 2px rgba(255,64,48,.4)',
                      zIndex: 40,
                    }}
                  >
                    {!ghost.valid && (
                      <span className="text-white font-black text-xs uppercase tracking-widest select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>
                        ✕ Ingen plats
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-black/40">⟵ Framstam</span>
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-black/40">Bakdörrar ⟶</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 border-y border-black/8 mt-3">
            <MetricCell label="Fyllnad" value={metrics.fillPercent} suffix="%" accent="green" />
            <MetricCell label="Viktbalans" value={metrics.weightBalance} suffix="%" accent="amber" divider />
            <MetricCell label="Tyngdpunkt" value={100 - metrics.cogHeight} suffix="%" accent="blue" />
          </div>

          {/* Feedback + selected */}
          <div className="px-5 mt-3 flex flex-col">
            {metrics.feedback.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {metrics.feedback.slice(0, 3).map((f, i) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-1 border border-black/12 text-black/70 bg-white">{f}</span>
                ))}
              </div>
            )}

            <AnimatePresence>
              {selectedItem && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 pb-3 border-b border-black/8"
                >
                  <span className="text-[11px] text-black/60 flex-1 truncate">
                    <span className="text-[9px] font-black uppercase tracking-widest text-black/45 mr-1">Vald:</span>
                    <strong className="text-[#0a0a0a]">{selectedItem.type.name}</strong>
                  </span>
                  <button onClick={rotateSelected} className="h-8 px-3 text-[10px] font-black uppercase tracking-[0.22em] bg-[#0a0a0a] text-white active:bg-[#00843e]">
                    ↻ Rotera
                  </button>
                  <button onClick={removeSelected} className="h-8 px-3 text-[10px] font-black uppercase tracking-[0.22em] border border-red-600 text-red-700 active:bg-red-50">
                    ✕ Ta bort
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Palette header */}
            <div className="mt-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55">— Att lasta · {queue.length} kvar</span>
              {queue.length > 0 && (
                <button onClick={autoArrange} className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00843e] active:text-[#0a0a0a]">
                  ⚡ Autolasta
                </button>
              )}
            </div>

            {/* Palette */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide" style={{ touchAction: 'pan-x' }}>
              {queue.length === 0 && (
                <div className="text-black/40 text-[12px] py-3 font-bold">Allt gods är lastat.</div>
              )}
              {queue.map(q => {
                const isDragging = drag?.source === 'palette' && drag.qid === q.qid
                const isOtherDrag = drag?.source === 'palette' && drag.qid !== q.qid
                return (
                  <div
                    key={q.qid}
                    data-drag-source
                    onPointerDown={e => startPaletteDrag(q, e)}
                    className="flex-shrink-0 w-[92px] active:scale-95 transition-all cursor-grab"
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.12)',
                      padding: 8,
                      touchAction: 'pan-x',
                      opacity: isOtherDrag ? 0.35 : isDragging ? 0.5 : 1,
                      WebkitUserDrag: 'none',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                    } as React.CSSProperties}
                  >
                    <div
                      className="flex items-center justify-center h-10 mb-1.5"
                      style={{ background: `linear-gradient(150deg, ${q.type.color2}, ${q.type.color})` }}
                    >
                      <span className="text-2xl select-none pointer-events-none" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))' }}>
                        {q.type.emoji}
                      </span>
                    </div>
                    <div className="text-[10px] font-black leading-tight line-clamp-1 pointer-events-none" style={{ color: '#0a0a0a' }}>
                      {q.type.name}
                    </div>
                    <div className="text-[9px] font-bold tracking-wide pointer-events-none" style={{ color: 'rgba(0,0,0,0.5)' }}>
                      {q.type.weight}kg · {q.type.load.cols}×{q.type.load.rows}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          </div>

          {/* Continue */}
          <div className="px-5 pb-6 pt-3 border-t border-black/8 bg-[#f6f4ef] space-y-2">
            {loadDanger && placed.length > 0 && (
              <div className={`px-3 py-2 text-[11px] font-bold flex items-center gap-2 border ${
                loadDanger === 'critical'
                  ? 'bg-red-50 border-red-300 text-red-800'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <span>{loadDanger === 'critical' ? '⚠' : '△'}</span>
                <span>
                  {metrics.weightBalance < 25 ? 'Kritisk viktbalans – lasten kan tippa.'
                    : metrics.cogHeight > 75 ? 'Tyngdpunkten är för hög – tippningsrisk.'
                    : 'Dålig lastfördelning – omfördela godset.'}
                </span>
              </div>
            )}
            <button
              onClick={() => { setSelectedUid(null); setPhase('secure') }}
              disabled={placed.length === 0}
              className={
                'w-full h-14 flex items-center justify-between px-5 text-[12px] font-black uppercase tracking-[0.22em] transition-colors ' +
                (placed.length === 0
                  ? 'bg-black/10 text-black/40 cursor-not-allowed'
                  : 'bg-[#0a0a0a] text-white active:bg-[#00843e]')
              }
            >
              <span>
                {placed.length === 0 ? 'Lasta minst ett gods' : queue.length > 0 ? `Nästa: Lastsäkring · ${queue.length} kvar` : 'Nästa: Lastsäkring'}
              </span>
              <span className="text-base">→</span>
            </button>
            <button
              onClick={handleDevAutoLoadAndGo}
              className="w-full h-9 text-[10px] font-black uppercase tracking-[0.22em] text-black/55 border border-black/12 bg-white active:bg-black/[0.04] transition-colors"
            >
              ⚡ Auto-lasta &amp; hoppa till Transport (dev)
            </button>
          </div>
        </div>
      )}

      {phase === 'secure' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-hide" data-scroll>
            <div className="px-5 pt-3">
              <div ref={secureRef} className="relative touch-none border border-black/15 bg-[#0e1310] overflow-hidden"
                onPointerDown={onSecurePointerDown}
                onPointerUp={onSecurePointerUp}
              >
                <TrailerView items={placed} strapYs={strapYs} net={net} divider={divider} />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45 mt-1.5 text-center">
                Svep horisontellt över lasten för att lägga till spännband
              </div>
            </div>

            {/* Securing meter */}
            <div className="px-5 mt-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55">— Lastsäkring</span>
                <span className="text-[18px] font-black tabular-nums" style={{ color: metrics.securing >= 80 ? '#00843e' : metrics.securing >= 50 ? '#d4a017' : '#c93820' }}>
                  {metrics.securing}%
                </span>
              </div>
              <div className="h-[3px] bg-black/8 overflow-hidden">
                <motion.div
                  className="h-full"
                  animate={{ width: `${metrics.securing}%` }}
                  style={{ background: metrics.securing >= 80 ? '#00843e' : metrics.securing >= 50 ? '#d4a017' : '#c93820' }}
                />
              </div>
            </div>

            {/* Tools */}
            <div className="grid grid-cols-2 border-y border-black/8 mt-4">
              <SecureTool
                label="Spännband"
                value={`${strapYs.length}`}
                helper={strapYs.length === 0 ? 'Inga applicerade' : `${strapYs.length} av 6`}
                enabled={strapYs.length < 6}
                onClick={() => setStrapYs(prev => prev.length >= 6 ? prev : [...prev, 0.88 - prev.length * 0.12])}
              />
              <SecureTool
                label="Ångra band"
                value="↩"
                helper={strapYs.length === 0 ? 'Inget att ångra' : 'Ta bort senaste'}
                enabled={strapYs.length > 0}
                onClick={() => setStrapYs(prev => prev.slice(0, -1))}
                divider
              />
              <SecureTool
                label="Lastnät"
                value={net ? 'PÅ' : 'AV'}
                helper="Skydd baktill"
                enabled
                active={net}
                onClick={() => setNet(v => !v)}
              />
              <SecureTool
                label="Mellanvägg"
                value={divider ? 'PÅ' : 'AV'}
                helper="Delar upp lasten"
                enabled
                active={divider}
                onClick={() => setDivider(v => !v)}
                divider
              />
            </div>

            {metrics.feedback.length > 0 && (
              <div className="px-5 mt-3 mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {metrics.feedback.map((f, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-1 border border-black/12 text-black/70 bg-white">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pb-6 pt-3 border-t border-black/8 bg-[#f6f4ef] space-y-2">
            {secureDanger && (
              <div className={`px-3 py-2 text-[11px] font-bold flex items-center gap-2 border ${
                secureDanger === 'critical' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <span>{secureDanger === 'critical' ? '⚠' : '△'}</span>
                <span>{metrics.securing < 20 ? 'Lasten är nästan osäkrad – farligt att köra.' : 'Lasten behöver mer säkring.'}</span>
              </div>
            )}
            <button
              onClick={handleStartTransport}
              className="w-full h-14 flex items-center justify-between px-5 bg-[#0a0a0a] text-white text-[12px] font-black uppercase tracking-[0.22em] active:bg-[#00843e] transition-colors"
            >
              <span>Starta transport</span>
              <span className="text-base">🚚 →</span>
            </button>
            <button
              onClick={() => setPhase('place')}
              className="w-full h-10 text-[10px] font-black uppercase tracking-[0.22em] text-black/55 border border-black/12 bg-white active:bg-black/[0.04]"
            >
              ← Tillbaka till lastning
            </button>
          </div>
        </div>
      )}

      {/* Floating drag preview */}
      {drag && pointer && (
        <div
          className="fixed pointer-events-none z-[100]"
          style={{
            left: pointer.x, top: pointer.y,
            transform: 'translate(-50%, -50%)',
            width: 44, height: 44,
          }}
        >
          <div
            className="w-full h-full flex items-center justify-center text-2xl border-2 border-white"
            style={{ background: `linear-gradient(150deg, ${drag.type.color2}, ${drag.type.color})`, boxShadow: '0 6px 20px rgba(0,0,0,.4)' }}
          >
            {drag.type.emoji}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────
function MetricCell({ label, value, suffix, accent, divider }: {
  label: string; value: number; suffix?: string; accent?: 'green' | 'amber' | 'blue'; divider?: boolean
}) {
  const color = accent === 'green' ? '#00843e' : accent === 'amber' ? '#c98a00' : '#0f5a99'
  return (
    <div className={'px-3 py-3 ' + (divider ? 'border-x border-black/8' : '')}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45 mb-1">{label}</div>
      <div className="text-[22px] font-black leading-none tabular-nums tracking-tight" style={{ color }}>
        {value}<span className="text-[13px] ml-0.5 text-black/40">{suffix}</span>
      </div>
    </div>
  )
}

function SecureTool({ label, value, helper, enabled, active, divider, onClick }: {
  label: string; value: string; helper: string; enabled: boolean; active?: boolean; divider?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={
        'text-left px-4 py-3 transition-colors ' +
        (divider ? 'border-l border-black/8 ' : '') +
        (!enabled ? 'opacity-40 cursor-not-allowed ' : 'active:bg-black/[0.04] ')
      }
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">{label}</span>
        <span className={'text-[16px] font-black tabular-nums ' + (active ? 'text-[#00843e]' : 'text-[#0a0a0a]')}>{value}</span>
      </div>
      <div className="text-[10px] text-black/45 mt-0.5">{helper}</div>
    </button>
  )
}