import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { TrailerView, type ItemFx } from '../game/TrailerView'
import { calcRoundResult, simulateDamage } from '../../utils/scoring'

const WEATHERS = [
  { icon: '☀', label: 'Klart väder', risk: 0 },
  { icon: '☁', label: 'Molnigt', risk: 0.05 },
  { icon: '☂', label: 'Regn', risk: 0.12 },
  { icon: '❄', label: 'Snöfall', risk: 0.2 },
  { icon: '≡', label: 'Dimma', risk: 0.08 },
]
const TRAFFICS = [
  { icon: '●', label: 'Lugn trafik', risk: 0, color: '#00843e' },
  { icon: '●', label: 'Medeltät trafik', risk: 0.05, color: '#c98a00' },
  { icon: '●', label: 'Tät trafik', risk: 0.1, color: '#c93820' },
]
const DEST_CITIES: { name: string; km: number }[] = [
  { name: 'Stockholm', km: 310 },
  { name: 'Göteborg', km: 250 },
  { name: 'Örebro', km: 110 },
  { name: 'Falun', km: 190 },
  { name: 'Gävle', km: 230 },
  { name: 'Sundsvall', km: 470 },
]

interface SimEvent { at: number; type: 'curve-l' | 'curve-r' | 'brake' | 'bump' | 'accel'; label: string }
const EVENTS: SimEvent[] = [
  { at: 16, type: 'accel', label: 'Acceleration på motorväg' },
  { at: 34, type: 'curve-l', label: 'Skarp vänsterkurva' },
  { at: 52, type: 'brake', label: 'Inbromsning i korsning' },
  { at: 70, type: 'curve-r', label: 'Rondell' },
  { at: 86, type: 'bump', label: 'Ojämn vägbana' },
]

// ETA baserat på 70 km/h snitthastighet, avgång 13:30
function formatEta(totalKm: number, progressPct: number): string {
  const remainingKm = totalKm * (1 - progressPct / 100)
  const remainingMin = Math.max(0, Math.round((remainingKm / 70) * 60))
  const startMinutes = 13 * 60 + 30
  const etaMinutes = startMinutes + Math.round((totalKm / 70) * 60)
  const h = Math.floor(etaMinutes / 60) % 24
  const m = etaMinutes % 60
  if (progressPct >= 100) return 'Framme'
  if (remainingMin < 60) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} · ${remainingMin} min kvar`
  const rh = Math.floor(remainingMin / 60)
  const rm = remainingMin % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} · ${rh}h ${rm}m kvar`
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

  const weather = useMemo(() => WEATHERS[Math.floor(Math.random() * WEATHERS.length)], [])
  const traffic = useMemo(() => TRAFFICS[Math.floor(Math.random() * TRAFFICS.length)], [])
  const destCity = useMemo(() => DEST_CITIES[Math.floor(Math.random() * DEST_CITIES.length)], [])

  const targetDamage = useMemo(() => {
    if (!loadPlan) return 0
    const base = simulateDamage(loadPlan)
    const factor = 1 + weather.risk + traffic.risk
    return Math.min(100, Math.round(base * factor))
  }, [loadPlan, weather.risk, traffic.risk])

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
      setTilt(0); setEventLabel(null)
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
      if (p >= 100) { setPhase('done'); return }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

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
  const cargoState = liveDamage <= 8 ? 'Stabilt' : liveDamage <= 25 ? 'Viss förskjutning' : 'Lasten rör sig'
  const cargoStateColor = liveDamage <= 8 ? '#00843e' : liveDamage <= 25 ? '#c98a00' : '#c93820'

  return (
    <div
      className="fixed inset-0 bg-[#f6f4ef] text-[#0a0a0a] flex flex-col overflow-hidden"
      style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-black/8"
        style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e]">— Transport</div>
          <h1 className="text-[26px] font-black leading-none tracking-tight mt-1">
            {phase === 'briefing' ? 'Nästa uppdrag' : phase === 'running' ? 'På väg' : 'Framme'}
            <span className="text-[#00843e]">.</span>
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45">Rutt</div>
          <div className="text-[13px] font-black">Karlstad → {destCity.name}</div>
        </div>
      </div>

      <div data-scroll className="flex-1 overflow-y-auto scrollbar-hide">
        {/* ── Rutt-vy (från → till med progress) ── */}
        <div className="px-5 pt-4">
          <div className="border border-black/12 bg-white p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-black/45">Från</div>
                <div className="text-[20px] font-black leading-none tracking-tight mt-1">Karlstad</div>
                <div className="text-[10px] font-bold text-black/50 mt-1">Avgång 13:30</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-black/45">Till</div>
                <div className="text-[20px] font-black leading-none tracking-tight mt-1">{destCity.name}</div>
                <div className="text-[10px] font-bold text-black/50 mt-1">
                  ETA {formatEta(destCity.km, progress)}
                </div>
              </div>
            </div>

            {/* Progress-track */}
            <div className="relative h-8">
              {/* bakgrundslinje */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-black/12" />
              {/* körd sträcka */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#00843e] transition-[width] duration-100" style={{ width: `${progress}%` }} />
              {/* Start-punkt */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0a0a0a]" />
              {/* Mål-punkt */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#0a0a0a] bg-white" />
              {/* Lastbil — emoji 🚛 pekar naturligt åt vänster, flippas så den kör framåt (åt höger mot målet) */}
              <div
                className="absolute top-1/2 text-[22px] leading-none transition-[left] duration-100 select-none"
                style={{ left: `${progress}%`, transform: 'translate(-50%, -50%) scaleX(-1)' }}
              >
                🚛
              </div>
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <span className="text-[11px] font-bold text-black/60 tabular-nums">
                {Math.round(destCity.km * progress / 100)} / {destCity.km} km
              </span>
              <span className="text-[13px] font-black tabular-nums text-[#00843e]">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Villkor ── */}
        <div className="grid grid-cols-2 border-y border-black/8 mt-4">
          <CondCell label="Väder" value={weather.label} icon={weather.icon} />
          <CondCell label="Trafik" value={traffic.label} icon={traffic.icon} iconColor={traffic.color} divider />
          <CondCell label="Fyllnad" value={`${loadPlan.metrics.fillPercent}%`} icon="■" />
          <CondCell label="Viktbalans" value={`${loadPlan.metrics.weightBalance}%`} icon="⚖" divider />
        </div>

        {/* ── Live-lasten ── */}
        <div className="px-5 mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55">— Lasten under färd</span>
            {eventLabel && (
              <motion.span
                key={eventLabel}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c98a00]"
              >
                ⚠ {eventLabel}
              </motion.span>
            )}
          </div>
          <div className="border border-black/15 bg-[#0e1310] p-2">
            <TrailerView
              items={loadPlan.items} tilt={tilt} itemFx={itemFx}
              strapYs={strapsToYs(loadPlan.securing.straps)}
              net={loadPlan.securing.net} divider={loadPlan.securing.divider}
            />
          </div>
        </div>

        {/* ── Progress ── */}
        <div className="px-5 mt-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55">— Leveransförlopp</span>
            <span className="text-[18px] font-black tabular-nums text-[#00843e]">{Math.round(progress)}%</span>
          </div>
          <div className="h-[3px] bg-black/8 overflow-hidden">
            <div className="h-full bg-[#00843e] transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] font-bold">
            <span className="uppercase tracking-widest text-black/50">Godsskick</span>
            <span style={{ color: cargoStateColor }}>{cargoState}</span>
          </div>
        </div>

        {/* ── Briefing eller Klar ── */}
        {phase === 'briefing' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-5 mt-5 pb-6">
            <div className="border border-black/12 bg-white p-4 mb-3">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55 mb-2">— Uppdragsbeskrivning</div>
              <p className="text-[13px] leading-relaxed text-black/70">
                Transporten testar din last genom acceleration, kurvor, inbromsning och ojämn väg.
                Är lasten välbyggd och säkrad ligger godset stabilt — annars kan det förskjutas och skadas.
              </p>
            </div>
            <button
              onClick={startSim}
              className="w-full h-14 bg-[#0a0a0a] text-white flex items-center justify-between px-5 text-[12px] font-black uppercase tracking-[0.22em] active:bg-[#00843e] transition-colors"
            >
              <span>Kör transporten</span>
              <span className="text-base">▶</span>
            </button>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 mt-6 pb-6 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e] mb-2">— Leverans klar</div>
            <div className="text-[32px] font-black leading-tight tracking-tight">Framme i<br/>{destCity.name}<span className="text-[#00843e]">.</span></div>
            <div className="mt-3 text-[11px] font-bold uppercase tracking-widest text-black/45 animate-pulse">Sammanställer leveransrapport…</div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────
function strapsToYs(n: number): number[] {
  const ys: number[] = []
  for (let i = 0; i < n; i++) ys.push(0.88 - (i * 0.62) / Math.max(1, n))
  return ys
}

function CondCell({ label, value, icon, iconColor, divider }: {
  label: string; value: string; icon: string; iconColor?: string; divider?: boolean
}) {
  return (
    <div className={'px-4 py-3 ' + (divider ? 'border-l border-black/8' : '')}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-[14px]" style={{ color: iconColor ?? '#0a0a0a' }}>{icon}</span>
        <span className="text-[13px] font-black tracking-tight truncate">{value}</span>
      </div>
    </div>
  )
}