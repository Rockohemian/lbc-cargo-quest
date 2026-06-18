import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useGameStore } from '../../store/gameStore'
import { useGeolocation, type GpsStatus } from '../../hooks/useGeolocation'
import {
  generateCargoField,
  generateNearbyTestCargoItems,
  ensureMinimumCargoNearby,
  getDistanceMeters,
  stepToward,
  offset,
} from '../../utils/cargoGenerator'
import { RARITY_COLORS } from '../../data/cargoTypes'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import type { CargoItem, LatLng } from '../../types'

// ─── Rival trucks ───────────────────────────────────────────────────────────────
const RIVAL_SPEED_MPS = 1.4        // meter per sekund (~gång+)
const RIVAL_STEAL_RANGE = 24       // meter från godset före stjälning börjar
const RIVAL_STEAL_SECONDS = 12     // sekunder det tar att stjäla
const RIVAL_TICK_MS = 2000         // uppdatering var 2:a sekund
const RIVAL_MAX = 2                // max antal rivaler samtidigt
const RIVAL_SPAWN_DELAY_MS = 15000 // f\u00f6rsta rival efter 15s
const RIVAL_RESPAWN_MS = 30000     // ny rival var 30s

interface Rival {
  id: string
  position: LatLng
  targetId: string | null
  dwellSec: number   // sekunder spenderade vid målet
}

let rivalSeq = 0
function rivalId() { return `rival-${++rivalSeq}` }

function rivalIcon(dwellSec: number, stealTotal: number) {
  const pct = Math.min(100, Math.round((dwellSec / stealTotal) * 100))
  const stealing = pct > 0
  const bg = stealing ? 'rgba(130,10,5,.97)' : 'rgba(12,9,7,.97)'
  const border = stealing ? '#a01808' : '#1e1e1e'
  const glow = stealing ? '0 0 18px rgba(190,35,15,.85)' : '0 0 10px rgba(0,0,0,.9)'
  const pctBg = pct > 60 ? '#d03010' : '#b07800'
  const progress = stealing
    ? '<div style="width:44px;height:3px;background:#1a1a1a;border-radius:2px;overflow:hidden;margin-top:2px">' +
      '<div style="height:100%;width:' + pct + '%;background:' + pctBg + ';border-radius:2px"></div></div>'
    : ''
  return L.divIcon({
    className: '',
    html:
      '<div style="display:flex;flex-direction:column;align-items:center">' +
      '<div style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;' +
      'background:' + bg + ';border:2px solid ' + border + ';border-radius:10px;font-size:22px;' +
      'box-shadow:' + glow + ';filter:grayscale(0.65) brightness(0.6) sepia(0.4)">' +
      '&#x1F69B;</div>' +
      progress +
      '<div style="font-size:8px;font-weight:900;letter-spacing:0.18em;color:#666;' +
      'text-transform:uppercase;text-shadow:0 1px 4px #000;margin-top:2px">RIVAL</div>' +
      '</div>',
    iconSize: [46, 66], iconAnchor: [23, 23],
  })
}

// ─── Leaflet icon fix ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function cargoIcon(emoji: string, rarity: string, collected: boolean) {
  const c = collected ? '#333' : (RARITY_COLORS[rarity] ?? '#9EA3A5')
  return L.divIcon({
    className: '',
    html: `<div style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;
      background:rgba(8,16,10,.9);border:2.5px solid ${c};border-radius:50%;font-size:22px;
      box-shadow:0 0 14px ${c}55;opacity:${collected ? .25 : 1}">${emoji}</div>`,
    iconSize: [46, 46], iconAnchor: [23, 23],
  })
}

function playerIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;position:relative">
      <div style="position:absolute;inset:0;background:rgba(26,126,52,.2);border-radius:50%;animation:pulse 2s infinite"></div>
      <div style="width:26px;height:26px;background:#1a7e34;border:3px solid #fff;border-radius:50%;
        box-shadow:0 0 20px rgba(26,126,52,.7)"></div></div>`,
    iconSize: [50, 50], iconAnchor: [25, 25],
  })
}

function RecenterMap({ pos, follow }: { pos: LatLng; follow: boolean }) {
  const map = useMap()
  const firstRef = useRef(true)
  useEffect(() => {
    if (firstRef.current) { map.setView([pos.lat, pos.lng], 16); firstRef.current = false; return }
    if (follow) map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.4 })
  }, [map, pos, follow])
  return null
}

const COLLECT_RADIUS = 20
const LOAD_MIN = 10

// ─── Main Component ────────────────────────────────────────────────────────
export function MapScreen() {
  const {
    playerPosition, setPlayerPosition, cargoItems, setCargoItems,
    selectCargo, setScreen, inventory,
  } = useGameStore()

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('pending')
  const [followPlayer, setFollowPlayer] = useState(true)
  const [mapTheme, setMapTheme] = useState<'night' | 'day'>(
    () => (localStorage.getItem('lcq-map-theme') as 'night' | 'day') || 'day'
  )
  const [rivals, setRivals] = useState<Rival[]>([])
  const [stolenNotice, setStolenNotice] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<(CargoItem & { dist: number }) | null>(null)
  const [showReadyToLoad, setShowReadyToLoad] = useState(false)
  const prevInventoryLen = useRef(0)
  // Ready-to-load popup
  useEffect(() => {
    const minLoad = LOAD_MIN
    if (prevInventoryLen.current < minLoad && inventory.length >= minLoad) {
      setShowReadyToLoad(true)
      window.setTimeout(() => setShowReadyToLoad(false), 4000)
    }
    prevInventoryLen.current = inventory.length
  }, [inventory.length])

  const spawnedRef = useRef(false)
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track last position for spawn engine — use ref to avoid effect dependency loop
  const lastSpawnPosRef = useRef<LatLng>(playerPosition)

  // GPS with status
  useGeolocation(
    useCallback((pos: LatLng) => {
      setPlayerPosition(pos)
    }, [setPlayerPosition]),
    { enabled: true, onStatus: setGpsStatus }
  )

  // Initial cargo field — runs once
  useEffect(() => {
    if (spawnedRef.current) return
    spawnedRef.current = true
    setCargoItems(generateCargoField(playerPosition))
    lastSpawnPosRef.current = playerPosition
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When GPS gets first real fix: regenerate cargo around actual position if far from default
  const gpsFirstFixRef = useRef(false)
  useEffect(() => {
    if (gpsStatus !== 'ok' || gpsFirstFixRef.current) return
    gpsFirstFixRef.current = true
    const dist = getDistanceMeters(playerPosition, lastSpawnPosRef.current)
    if (dist > 150) {
      setCargoItems(generateCargoField(playerPosition))
      lastSpawnPosRef.current = playerPosition
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsStatus])

  // Dynamic refill: check every 5 seconds, or when player moves > 50m from last check
  useEffect(() => {
    const timer = setInterval(() => {
      const state = useGameStore.getState()
      const pos = state.playerPosition
      const moved = getDistanceMeters(pos, lastSpawnPosRef.current)
      if (moved > 30 || state.cargoItems.filter(i => !i.collected).length < 8) {
        lastSpawnPosRef.current = pos
        const updated = ensureMinimumCargoNearby(state.cargoItems, pos, {})
        // Only update if something actually changed (reference will differ)
        if (updated !== state.cargoItems) {
          setCargoItems(updated)
        }
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [setCargoItems])

  const nearest = cargoItems
    .filter(i => !i.collected)
    .map(i => ({ ...i, dist: getDistanceMeters(playerPosition, i.position) }))
    .sort((a, b) => a.dist - b.dist)

  const inRange = nearest.filter(i => i.dist <= COLLECT_RADIUS)

  const handleCollect = (item: CargoItem) => {
    selectCargo(item)
    setScreen('collect')
  }

  const handleRespawn = () => {
    setCargoItems(generateCargoField(playerPosition))
    spawnedRef.current = true
  }

  // ── Rival trucks ──────────────────────────────────────────────────────────
  const playerPositionRef = useRef(playerPosition)
  playerPositionRef.current = playerPosition
  const cargoItemsRef = useRef(cargoItems)
  cargoItemsRef.current = cargoItems

  useEffect(() => {
    // Spawn first rival after delay, then periodically
    const spawnRival = () => {
      setRivals(prev => {
        if (prev.length >= RIVAL_MAX) return prev
        const center = playerPositionRef.current
        const bearing = Math.random() * 360
        const dist = 220 + Math.random() * 180
        const pos = offset(center, dist, bearing)
        return [...prev, { id: rivalId(), position: pos, targetId: null, dwellSec: 0 }]
      })
    }

    const spawnTimer = window.setTimeout(spawnRival, RIVAL_SPAWN_DELAY_MS)
    const respawnTimer = window.setInterval(spawnRival, RIVAL_RESPAWN_MS)

    // Movement + steal tick
    const moveTick = window.setInterval(() => {
      const cargo = cargoItemsRef.current
      const uncollected = cargo.filter(i => !i.collected)

      setRivals(prev => {
        if (prev.length === 0 || uncollected.length === 0) return prev
        let stolen: string | null = null

        const next = prev.map(r => {
          // Pick target
          let target = r.targetId ? uncollected.find(c => c.id === r.targetId) : null
          if (!target) {
            // Pick closest uncollected that no other rival is already targeting
            const taken = new Set(prev.filter(x => x.id !== r.id).map(x => x.targetId))
            target = uncollected
              .filter(c => !taken.has(c.id))
              .sort((a, b) => getDistanceMeters(r.position, a.position) - getDistanceMeters(r.position, b.position))[0]
              ?? uncollected[0]
          }
          if (!target) return r

          const dist = getDistanceMeters(r.position, target.position)
          const stepM = RIVAL_SPEED_MPS * (RIVAL_TICK_MS / 1000)

          if (dist <= RIVAL_STEAL_RANGE) {
            const newDwell = r.dwellSec + RIVAL_TICK_MS / 1000
            if (newDwell >= RIVAL_STEAL_SECONDS) {
              // Steal it!
              stolen = target.id
              return { ...r, targetId: null, dwellSec: 0, position: r.position }
            }
            return { ...r, targetId: target.id, dwellSec: newDwell }
          }

          const newPos = stepToward(r.position, target.position, stepM)
          return { ...r, position: newPos, targetId: target.id, dwellSec: 0 }
        })

        if (stolen) {
          setCargoItems(cargoItemsRef.current.filter(c => c.id !== stolen))
          setStolenNotice('💨 Konkurrenten stal ett kolli!')
          window.setTimeout(() => setStolenNotice(null), 3500)
        }

        return next
      })
    }, RIVAL_TICK_MS)

    return () => {
      window.clearTimeout(spawnTimer)
      window.clearInterval(respawnTimer)
      window.clearInterval(moveTick)
    }
  }, [setCargoItems])

  const rivalIcons = useMemo(
    () => rivals.map(r => ({ r, icon: rivalIcon(r.dwellSec, RIVAL_STEAL_SECONDS) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rivals.map(r => `${r.id}-${Math.round(r.dwellSec)}-${Math.round(r.position.lat * 10000)}`).join()]
  )
  // ─────────────────────────────────────────────────────────────────────────

  const uncollectedCount = nearest.length
  const nearestDistance = nearest[0] ? Math.round(nearest[0].dist) : null

  const toggleMapTheme = useCallback(() => {
    setMapTheme(prev => {
      const next = prev === 'night' ? 'day' : 'night'
      localStorage.setItem('lcq-map-theme', next)
      return next
    })
  }, [])

  const isNight = mapTheme === 'night'
  const tileUrl = isNight
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

  return (
    <div className="fixed inset-0 bg-surface-900 flex flex-col">
      {/* Map */}
      <div className={`flex-1 relative ${isNight ? 'map-night' : 'map-day'}`}>
        <MapContainer
          center={[playerPosition.lat, playerPosition.lng]}
          zoom={16}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            key={mapTheme}
            url={tileUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />
          <RecenterMap pos={playerPosition} follow={followPlayer} />

          <Circle
            center={[playerPosition.lat, playerPosition.lng]}
            radius={COLLECT_RADIUS}
            pathOptions={{ color: '#1a7e34', fillColor: '#1a7e34', fillOpacity: 0.1, weight: 2 }}
          />

          {cargoItems.map(item => (
            <Marker
              key={item.id}
              position={[item.position.lat, item.position.lng]}
              icon={cargoIcon(item.type.emoji, item.type.rarity, item.collected)}
            />
          ))}

          <Marker position={[playerPosition.lat, playerPosition.lng]} icon={playerIcon()} />

          {rivalIcons.map(({ r, icon }) => (
            <Marker key={r.id} position={[r.position.lat, r.position.lng]} icon={icon} />
          ))}
        </MapContainer>

        {/* GPS status banner */}
        <AnimatePresence>
          {gpsStatus === 'pending' && (
            <motion.div
              key="gps-pending"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-[1100] whitespace-nowrap"
            >
              <div className="rounded-2xl border border-white/20 bg-black/50 backdrop-blur-xl px-4 py-2 text-xs font-bold text-white/70 shadow-[0_12px_30px_rgba(0,0,0,.3)] flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-lbc-green animate-pulse" />
                Hämtar GPS-position – tillåt plats när webbläsaren frågar
              </div>
            </motion.div>
          )}
          {gpsStatus === 'fallback' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-[1100] whitespace-nowrap"
            >
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/12 backdrop-blur-xl px-4 py-2 text-xs font-bold text-amber-200 shadow-[0_12px_30px_rgba(0,0,0,.3)]">
                📍 GPS ej tillgänglig – tillåt plats i webbläsaren</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stolen notice */}
        <AnimatePresence>
          {stolenNotice && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute bottom-40 left-1/2 -translate-x-1/2 z-[1200] whitespace-nowrap"
            >
              <div className="rounded-2xl border border-red-500/40 bg-red-900/80 backdrop-blur-xl px-4 py-2.5 text-sm font-black text-red-200 shadow-[0_8px_24px_rgba(180,30,10,.5)]">
                {stolenNotice}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cargo radar */}
        <div className="absolute top-20 left-4 z-[1000] w-[11.5rem]">
          <GlassCard className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/28">Cargo Radar</div>
                <div className="mt-1 text-lg font-black text-white font-display">
                  {nearestDistance !== null ? `${nearestDistance}m` : 'Tomt'}
                </div>
                <div className="text-xs text-white/42 mt-0.5">
                  {nearest[0] ? nearest[0].type.name : 'Väntar på gods...'}
                </div>
              </div>
              <div className="rounded-2xl border border-lbc-green/25 bg-lbc-green/12 px-2 py-1 text-xs font-bold text-lbc-green">
                {uncollectedCount}st
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Action buttons */}
        <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={toggleMapTheme}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-surface-800/90 text-white/85 border border-white/15 backdrop-blur-lg shadow-[0_14px_34px_rgba(0,0,0,.24)]"
          >
            {isNight ? '☀️ Dagläge' : '🌙 Nattläge'}
          </button>
          </div>

        {/* In-range collect buttons */}
        <AnimatePresence>
          {inRange.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-36 z-[1000] space-y-2 left-4 right-4"
            >
              {inRange.slice(0, 2).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleCollect(item)}
                  className="w-full flex items-center gap-3 bg-lbc-green/90 backdrop-blur-sm border border-lbc-green-d rounded-xl px-4 py-3 text-white font-bold text-sm active:scale-95 transition-transform"
                >
                  <span className="text-2xl">{item.type.emoji}</span>
                  <div className="flex-1 text-left">
                    <div>{item.type.name}</div>
                    <div className="text-xs text-white/70">{Math.round(item.dist)}m bort · +{item.type.xpReward} XP</div>
                  </div>
                  <span className="text-lg">→</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ready-to-load popup */}
      <AnimatePresence>
        {showReadyToLoad && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-36 left-4 right-4 z-[1200]"
          >
            <button
              onClick={() => { setShowReadyToLoad(false); setScreen('loading') }}
              className="w-full flex items-center justify-between gap-3 bg-lbc-green rounded-2xl px-5 py-4 shadow-[0_8px_32px_rgba(26,126,52,.6)] border border-lbc-green-l active:scale-98"
            >
              <div className="text-left">
                <div className="text-white font-black text-base">📦 Redo att lasta!</div>
                <div className="text-white/75 text-xs mt-0.5">Du har {inventory.length} kolli – tryck för att lasta</div>
              </div>
              <span className="text-2xl">→</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom panel — kompakt */}
      <div className="bg-[linear-gradient(180deg,rgba(16,24,16,.96),rgba(8,16,10,.99))] backdrop-blur-xl border-t border-white/10 px-3 pt-2 pb-3 z-[1000] safe-area-bottom">
        <div className="max-w-lg mx-auto">
          {/* header row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen('profile')} className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1 text-white/70 text-xs font-bold active:bg-white/20">👤 Profil</button>
              <span className="text-white font-black text-sm">Sök gods</span>
              {gpsStatus === 'fallback' && <span className="text-[10px] text-amber-300/80">GPS saknas</span>}
            </div>
            <span className="text-xs font-bold text-lbc-green">{inventory.length}/6</span>
          </div>

          {/* Cargo carousel */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-1.5 scrollbar-hide">
            {nearest.slice(0, 8).map(item => (
              <div key={item.id} className="flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[44px]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2"
                  style={{ borderColor: RARITY_COLORS[item.type.rarity], background: 'rgba(255,255,255,.06)' }}
                >
                  {item.type.emoji}
                </div>
                <span className="text-[10px] text-white/45">{Math.round(item.dist)}m</span>
              </div>
            ))}
            {nearest.length === 0 && (
              <div className="text-white/30 text-xs py-1 italic">Genererar gods...</div>
            )}
          </div>

          {/* Inventory + lasta-knapp */}
          <div className="flex items-center gap-2">
            <GlassCard className="flex-1 px-3 py-2">
              <div className="flex items-center gap-1 flex-wrap min-h-[24px]">
                {inventory.length === 0
                  ? <span className="text-white/25 text-xs">Ingen last ännu</span>
                  : inventory.slice(-10).map((c, i) => (
                      <span key={i} className="text-base">{c.emoji}</span>
                    ))
                }
              </div>
            </GlassCard>
            <Button
              size="md"
              disabled={inventory.length < LOAD_MIN}
              onClick={() => setScreen('loading')}
            >
              {inventory.length < LOAD_MIN ? `${inventory.length}/${LOAD_MIN}` : '📦 Lasta!'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}






