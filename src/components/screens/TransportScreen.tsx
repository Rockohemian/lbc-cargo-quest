import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { GlassCard } from '../ui/GlassCard'
import { TrailerView, type ItemFx } from '../game/TrailerView'
import { calcRoundResult, simulateDamage } from '../../utils/scoring'

// Stylised Sweden silhouette (approximate, for atmosphere).
const SWEDEN_PATH =
  'M96 8 C104 14 102 26 108 34 C116 44 112 56 118 66 C126 78 120 92 126 104 ' +
  'C134 118 128 134 132 150 C138 168 150 178 150 196 C150 214 138 226 140 244 ' +
  'C142 262 132 274 128 290 C124 304 116 312 104 314 C92 316 86 306 82 294 ' +
  'C76 276 84 262 78 246 C70 226 58 220 56 200 C54 180 64 170 60 152 ' +
  'C56 132 44 124 46 104 C48 86 60 80 64 64 C68 48 62 34 72 22 C80 12 88 6 96 8 Z'

// Route waypoints in the SVG coordinate space (Karlstad → destination).
const ROUTE = [
  { x: 70, y: 232, city: 'Karlstad' },
  { x: 86, y: 210 },
  { x: 104, y: 196 },
  { x: 120, y: 178, city: 'Mål' },
]

const WEATHERS = [
  { icon: '☀️', label: 'Klart väder', risk: 0 },
  { icon: '🌧️', label: 'Regn', risk: 0.12 },
  { icon: '🌨️', label: 'Snöfall', risk: 0.2 },
  { icon: '🌫️', label: 'Dimma', risk: 0.08 },
]
const TRAFFICS = [
  { icon: '🟢', label: 'Lugn trafik', risk: 0 },
  { icon: '🟡', label: 'Medeltät trafik', risk: 0.05 },
  { icon: '🔴', label: 'Tät trafik', risk: 0.1 },
]
const DEST_CITIES = ['Stockholm', 'Göteborg', 'Örebro', 'Falun', 'Gävle', 'Sundsvall']

interface SimEvent { at: number; type: 'curve-l' | 'curve-r' | 'brake' | 'bump' | 'accel'; label: string }
const EVENTS: SimEvent[] = [
  { at: 16, type: 'accel', label: 'Acceleration på motorväg' },
  { at: 34, type: 'curve-l', label: 'Skarp vänsterkurva' },
  { at: 52, type: 'brake', label: 'Inbromsning i korsning' },
  { at: 70, type: 'curve-r', label: 'Rondell' },
  { at: 86, type: 'bump', label: 'Ojämn vägbana' },
]

function lerpRoute(t: number) {
  const seg = (ROUTE.length - 1) * t
  const i = Math.min(ROUTE.length - 2, Math.floor(seg))
  const f = seg - i
  return {
    x: ROUTE[i].x + (ROUTE[i + 1].x - ROUTE[i].x) * f,
    y: ROUTE[i].y + (ROUTE[i + 1].y - ROUTE[i].y) * f,
  }
}

export function TransportScreen() {
  const { loadPlan, finishRound, setScreen } = useGameStore()

  const [phase, setPhase] = useState<'briefing' | 'running' | 'done'>('briefing')
  const [progress, setProgress] = useState(0)
  const [tilt, setTilt] = useState(0)
  const [itemFx, setItemFx] = useState<Record<string, ItemFx>>({})
  const [eventLabel, setEventLabel] = useState<string | null>(null)
  const [liveDamage, setLiveDamage] = useState(0)

  const rafRef = useRef<number | null>(null)
  const firedRef = useRef<Set<number>>(new Set())

  // Fixed conditions for this run
  const weather = useMemo(() => WEATHERS[Math.floor(Math.random() * WEATHERS.length)], [])
  const traffic = useMemo(() => TRAFFICS[Math.floor(Math.random() * TRAFFICS.length)], [])
  const destCity = useMemo(() => DEST_CITIES[Math.floor(Math.random() * DEST_CITIES.length)], [])

  // Final damage target (load quality + conditions)
  const targetDamage = useMemo(() => {
    if (!loadPlan) return 0
    const base = simulateDamage(loadPlan)
    const factor = 1 + weather.risk + traffic.risk
    return Math.min(100, Math.round(base * factor))
  }, [loadPlan, weather.risk, traffic.risk])

  // Which items will visibly move (the riskiest ones)
  const unstableUids = useMemo(() => {
    if (!loadPlan) return [] as string[]
    const count = Math.ceil(targetDamage / 18)
    const scored = [...loadPlan.items]
      .map(it => ({
        uid: it.uid,
        risk: (it.type.load.fragile ? 2 : 0) + (it.rows >= 3 ? 2 : 0) + (it.type.load.weightClass === 'heavy' ? 1 : 0) + it.col / 4,
      }))
      .sort((a, b) => b.risk - a.risk)
    return scored.slice(0, count).map(s => s.uid)
  }, [loadPlan, targetDamage])

  useEffect(() => {
    if (!loadPlan || loadPlan.items.length === 0) { setScreen('map') }
  }, [loadPlan, setScreen])

  const applyEvent = (ev: SimEvent) => {
    setEventLabel(ev.label)
    const severity = Math.min(1, targetDamage / 60)
    const dir = ev.type === 'curve-l' ? -1 : ev.type === 'curve-r' ? 1 : 0
    const tiltAmt = (ev.type === 'curve-l' || ev.type === 'curve-r') ? dir * (3 + severity * 7) : ev.type === 'bump' ? 0 : 0
    setTilt(tiltAmt)

    const fx: Record<string, ItemFx> = {}
    unstableUids.forEach((uid, idx) => {
      const shift = 6 + severity * 22 + idx * 2
      if (ev.type === 'curve-l') fx[uid] = { dx: -shift, rot: -dir * 4, damaged: severity > 0.4 }
      else if (ev.type === 'curve-r') fx[uid] = { dx: shift, rot: dir * 4, damaged: severity > 0.4 }
      else if (ev.type === 'brake') fx[uid] = { dy: -shift * 0.5, dx: shift * 0.4, damaged: severity > 0.5 }
      else if (ev.type === 'bump') fx[uid] = { dy: -6 - severity * 6, damaged: severity > 0.6 }
      else fx[uid] = { dx: -shift * 0.3 }
    })
    setItemFx(fx)

    window.setTimeout(() => {
      setTilt(0)
      setEventLabel(null)
      // Good loads snap back fully; damaged items keep a residual offset
      if (severity <= 0.35) setItemFx({})
      else {
        setItemFx(prev => {
          const next: Record<string, ItemFx> = {}
          Object.entries(prev).forEach(([uid, f]) => {
            next[uid] = { dx: (f.dx ?? 0) * 0.4, dy: (f.dy ?? 0) * 0.3, rot: (f.rot ?? 0) * 0.4, damaged: f.damaged }
          })
          return next
        })
      }
    }, 650)
  }

  const startSim = () => {
    setPhase('running')
    const duration = 7200
    const t0 = performance.now()
    firedRef.current = new Set()
    const loop = (now: number) => {
      const p = Math.min(100, ((now - t0) / duration) * 100)
      setProgress(p)
      setLiveDamage(Math.round(targetDamage * (p / 100)))
      EVENTS.forEach((ev, i) => {
        if (p >= ev.at && !firedRef.current.has(i)) {
          firedRef.current.add(i)
          applyEvent(ev)
        }
      })
      if (p >= 100) {
        setPhase('done')
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  // Finish → result
  useEffect(() => {
    if (phase !== 'done' || !loadPlan) return
    const t = window.setTimeout(() => {
      const result = calcRoundResult(loadPlan, targetDamage)
      finishRound(result)
      setScreen('result')
    }, 1400)
    return () => window.clearTimeout(t)
  }, [phase, loadPlan, targetDamage, finishRound, setScreen])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  if (!loadPlan) return null
  const truck = lerpRoute(progress / 100)

  return (
    <div className="fixed inset-0 bg-surface-900 flex flex-col overflow-hidden">
      <div className="px-4 pt-14 pb-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-white/30">Transport</div>
        <h1 className="text-xl font-black text-white font-display">Karlstad → {destCity}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-[1.1fr_1fr] gap-3">
          {/* Sweden map */}
          <GlassCard className="p-3">
            <svg viewBox="0 0 200 330" className="w-full h-auto">
              <defs>
                <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#0b1620" />
                  <stop offset="1" stopColor="#0a1218" />
                </linearGradient>
                <linearGradient id="landG" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#16321f" />
                  <stop offset="1" stopColor="#0e2417" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="200" height="330" fill="url(#seaG)" />
              <path d={SWEDEN_PATH} fill="url(#landG)" stroke="#2b6b3c" strokeWidth="1.5" />
              {/* route */}
              <polyline
                points={ROUTE.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke="#1a7e34" strokeWidth="2.5" strokeDasharray="5 4" opacity="0.7"
              />
              {/* travelled */}
              <polyline
                points={(() => {
                  const pts: string[] = []
                  const steps = 24
                  for (let i = 0; i <= steps; i++) {
                    const t = (progress / 100) * (i / steps)
                    const pos = lerpRoute(t)
                    pts.push(`${pos.x},${pos.y}`)
                  }
                  return pts.join(' ')
                })()}
                fill="none" stroke="#27ff80" strokeWidth="2.5"
              />
              {ROUTE.filter(p => p.city).map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" />
                  <text x={p.x + 6} y={p.y + 3} fontSize="9" fill="#cdd6cd" fontWeight="bold">{p.city}</text>
                </g>
              ))}
              {/* truck */}
              <g transform={`translate(${truck.x},${truck.y})`}>
                <circle r="7" fill="#1a7e34" opacity="0.3" />
                <text x="0" y="4" fontSize="13" textAnchor="middle">🚚</text>
              </g>
            </svg>
          </GlassCard>

          {/* Conditions */}
          <div className="space-y-2">
            <Condition icon={weather.icon} label="Väder" value={weather.label} />
            <Condition icon={traffic.icon} label="Trafikläge" value={traffic.label} />
            <Condition icon="🌱" label="Hållbarhet"
              value={`${loadPlan.metrics.fillPercent}% fyllt`} />
            <Condition icon="⚖️" label="Viktbalans" value={`${loadPlan.metrics.weightBalance}%`} />
          </div>
        </div>

        {/* Live trailer under stress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">Lasten under färd</span>
            {eventLabel && (
              <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-bold text-amber-300">⚠ {eventLabel}</motion.span>
            )}
          </div>
          <div className="rounded-2xl bg-surface-800/40 p-3 border border-white/8">
            <TrailerView items={loadPlan.items} tilt={tilt} itemFx={itemFx}
              strapYs={strapsToYs(loadPlan.securing.straps)} net={loadPlan.securing.net} divider={loadPlan.securing.divider} />
          </div>
        </div>

        {/* Progress + status */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-white/50">Leveransförlopp</span>
            <span className="text-xs font-black text-lbc-green">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-lbc-green rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-white/45">Godsskick</span>
            <span className="font-bold" style={{ color: liveDamage <= 8 ? '#27a349' : liveDamage <= 25 ? '#d4a017' : '#e04020' }}>
              {liveDamage <= 8 ? 'Stabilt' : liveDamage <= 25 ? 'Viss förskjutning' : 'Lasten rör sig!'}
            </span>
          </div>
        </div>

        {/* Briefing / start */}
        {phase === 'briefing' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <GlassCard className="p-4 mb-3">
              <p className="text-white/75 text-sm leading-relaxed">
                Transporten testar din last genom acceleration, kurvor, inbromsning och ojämn väg.
                Är lasten välbyggd och säkrad ligger godset stabilt – annars kan det förskjutas och skadas.
              </p>
            </GlassCard>
            <button onClick={startSim}
              className="w-full py-4 rounded-xl bg-lbc-green text-white font-black text-lg shadow-[0_10px_30px_rgba(26,126,52,.4)] active:scale-95 transition-transform">
              ▶ Kör transporten
            </button>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 text-center">
            <div className="text-4xl mb-1">🏁</div>
            <div className="text-white font-black text-lg">Framme i {destCity}!</div>
            <div className="text-white/40 text-sm animate-pulse mt-1">Sammanställer leveransrapport…</div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function strapsToYs(n: number): number[] {
  const ys: number[] = []
  for (let i = 0; i < n; i++) ys.push(0.24 + (i * 0.62) / Math.max(1, n))
  return ys
}

function Condition({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/6 border border-white/10 px-3 py-2.5">
      <span className="text-xl">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
        <div className="text-sm font-bold text-white truncate">{value}</div>
      </div>
    </div>
  )
}
