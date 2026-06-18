import { useEffect, useRef, useCallback, useState } from 'react'
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
} from '../../utils/cargoGenerator'
import { RARITY_COLORS } from '../../data/cargoTypes'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import type { CargoItem, LatLng } from '../../types'

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

const COLLECT_RADIUS = 28

// ─── Joystick ──────────────────────────────────────────────────────────────
interface JoystickProps {
  onMove: (dx: number, dy: number) => void
  onStop: () => void
}

function Joystick({ onMove, onStop }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const vecRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  const getVec = (cx: number, cy: number, clientX: number, clientY: number) => {
    const dx = clientX - cx
    const dy = clientY - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    const maxR = 32
    const r = Math.min(len, maxR)
    return { dx: len ? (dx / len) * r : 0, dy: len ? (dy / len) * r : 0, nx: len ? dx / len : 0, ny: len ? dy / len : 0 }
  }

  const startJoy = (clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    activeRef.current = true
    const update = (x: number, y: number) => {
      const v = getVec(cx, cy, x, y)
      if (stickRef.current) {
        stickRef.current.style.transform = `translate(${v.dx}px,${v.dy}px)`
      }
      vecRef.current = { dx: v.nx, dy: v.ny }
    }
    update(clientX, clientY)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (activeRef.current) onMove(vecRef.current.dx, vecRef.current.dy)
    }, 150)
    return { cx, cy }
  }

  const stopJoy = () => {
    activeRef.current = false
    if (stickRef.current) stickRef.current.style.transform = 'translate(0,0)'
    vecRef.current = { dx: 0, dy: 0 }
    if (intervalRef.current) clearInterval(intervalRef.current)
    onStop()
  }

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return (
    <div
      ref={baseRef}
      className="relative w-24 h-24 rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-md flex items-center justify-center touch-none select-none"
      onTouchStart={e => {
        const t = e.touches[0]
        startJoy(t.clientX, t.clientY)
      }}
      onTouchMove={e => {
        if (!activeRef.current) return
        const t = e.touches[0]
        const base = baseRef.current!
        const rect = base.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const v = getVec(cx, cy, t.clientX, t.clientY)
        if (stickRef.current) stickRef.current.style.transform = `translate(${v.dx}px,${v.dy}px)`
        vecRef.current = { dx: v.nx, dy: v.ny }
      }}
      onTouchEnd={stopJoy}
      onMouseDown={e => { e.preventDefault(); startJoy(e.clientX, e.clientY) }}
      onMouseMove={e => {
        if (!activeRef.current) return
        const base = baseRef.current!
        const rect = base.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const v = getVec(cx, cy, e.clientX, e.clientY)
        if (stickRef.current) stickRef.current.style.transform = `translate(${v.dx}px,${v.dy}px)`
        vecRef.current = { dx: v.nx, dy: v.ny }
      }}
      onMouseUp={stopJoy}
    >
      <div ref={stickRef} className="w-10 h-10 rounded-full bg-lbc-green/80 border-2 border-white/40 shadow-[0_0_16px_rgba(26,126,52,.6)] transition-shadow" style={{ transition: 'box-shadow 0.1s' }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <span className="text-white text-xl">⊕</span>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export function MapScreen() {
  const {
    playerPosition, setPlayerPosition, cargoItems, setCargoItems,
    selectCargo, setScreen, inventory, testMode, setTestMode,
  } = useGameStore()

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('pending')
  const [simulating, setSimulating] = useState(false)
  const [followPlayer, setFollowPlayer] = useState(true)
  const [mapTheme, setMapTheme] = useState<'night' | 'day'>(
    () => (localStorage.getItem('lcq-map-theme') as 'night' | 'day') || 'night'
  )
  const spawnedRef = useRef(false)
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track last position for spawn engine — use ref to avoid effect dependency loop
  const lastSpawnPosRef = useRef<LatLng>(playerPosition)

  // GPS with status
  useGeolocation(
    useCallback((pos: LatLng) => {
      setPlayerPosition(pos)
    }, [setPlayerPosition]),
    { enabled: !simulating, onStatus: setGpsStatus }
  )

  // Initial cargo field — runs once
  useEffect(() => {
    if (spawnedRef.current) return
    spawnedRef.current = true
    if (testMode || gpsStatus === 'fallback') {
      setCargoItems(generateNearbyTestCargoItems(playerPosition, 12))
    } else {
      setCargoItems(generateCargoField(playerPosition))
    }
    lastSpawnPosRef.current = playerPosition
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dynamic refill: check every 5 seconds, or when player moves > 50m from last check
  useEffect(() => {
    const timer = setInterval(() => {
      const state = useGameStore.getState()
      const pos = state.playerPosition
      const moved = getDistanceMeters(pos, lastSpawnPosRef.current)
      if (moved > 30 || state.cargoItems.filter(i => !i.collected).length < 8) {
        lastSpawnPosRef.current = pos
        const updated = ensureMinimumCargoNearby(state.cargoItems, pos, { testMode: state.testMode })
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

  // Simulation: auto-walk toward nearest cargo
  const toggleSimulate = useCallback(() => {
    if (simulating) {
      if (simRef.current) clearInterval(simRef.current)
      setSimulating(false)
      return
    }
    setSimulating(true)
    setFollowPlayer(true)
    simRef.current = setInterval(() => {
      const { playerPosition: pos, cargoItems: items } = useGameStore.getState()
      const uncollected = items.filter(i => !i.collected)
      if (uncollected.length === 0) { clearInterval(simRef.current!); setSimulating(false); return }
      const target = uncollected.reduce((a, b) =>
        getDistanceMeters(pos, a.position) < getDistanceMeters(pos, b.position) ? a : b
      )
      setPlayerPosition(stepToward(pos, target.position, 9))
    }, 300)
  }, [simulating, setPlayerPosition])

  useEffect(() => () => { if (simRef.current) clearInterval(simRef.current) }, [])

  // Joystick movement (test/fallback mode)
  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    const { playerPosition: pos } = useGameStore.getState()
    // dx/dy are normalized (-1..1); move ~4m per tick in that direction
    const stepMeters = 5
    const R = 6371000
    const newLat = pos.lat + (dy * -1 * stepMeters) / R * (180 / Math.PI)
    const newLng = pos.lng + (dx * stepMeters) / (R * Math.cos(pos.lat * Math.PI / 180)) * (180 / Math.PI)
    setPlayerPosition({ lat: newLat, lng: newLng })
    setFollowPlayer(true)
  }, [setPlayerPosition])

  const handleNearbyTestSpawn = () => {
    setTestMode(true)
    setCargoItems(generateNearbyTestCargoItems(playerPosition, 12))
    spawnedRef.current = true
  }

  const handleRespawn = () => {
    setCargoItems(generateCargoField(playerPosition))
    spawnedRef.current = true
  }

  const showJoystick = testMode || gpsStatus === 'fallback' || simulating
  const uncollectedCount = nearest.length
  const nearestDistance = nearest[0] ? Math.round(nearest[0].dist) : null

  const showTestTools = testMode || gpsStatus === 'fallback'
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
        </MapContainer>

        {/* GPS status banner */}
        <AnimatePresence>
          {gpsStatus === 'fallback' && !testMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-[1100] whitespace-nowrap"
            >
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/12 backdrop-blur-xl px-4 py-2 text-xs font-bold text-amber-200 shadow-[0_12px_30px_rgba(0,0,0,.3)]">
                📍 Svag GPS — använd joystick eller simulering
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
          {showTestTools && (
            <button
              onClick={handleNearbyTestSpawn}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-lbc-blue/14 text-lbc-blue border border-lbc-blue/25 backdrop-blur-lg opacity-70"
            >
              🧪 Nära
            </button>
          )}
          {testMode && (
            <button
              onClick={toggleSimulate}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all opacity-70 ${
                simulating
                  ? 'bg-lbc-green text-white border-lbc-green-d'
                  : 'bg-surface-800/90 text-white/80 border-white/15 backdrop-blur-lg'
              }`}
            >
              {simulating ? '⏸' : '🚶'}
            </button>
          )}
          {showTestTools && uncollectedCount < 4 && (
            <button
              onClick={handleRespawn}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-surface-800/90 text-white/80 border border-white/15 backdrop-blur-lg opacity-70"
            >
              🔄
            </button>
          )}
        </div>

        {/* Joystick (test/fallback/sim mode) */}
        <AnimatePresence>
          {showJoystick && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="absolute bottom-72 left-4 z-[1000]"
              onTouchStart={e => e.stopPropagation()}
            >
              <Joystick onMove={handleJoystickMove} onStop={() => {}} />
              <div className="mt-1 text-center text-[10px] text-white/30">Joystick</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* In-range collect buttons */}
        <AnimatePresence>
          {inRange.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-64 left-4 right-4 z-[1000] space-y-2"
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

      {/* Bottom panel — kompakt */}
      <div className="bg-[linear-gradient(180deg,rgba(16,24,16,.96),rgba(8,16,10,.99))] backdrop-blur-xl border-t border-white/10 px-3 pt-2 pb-3 z-[1000] safe-area-bottom">
        <div className="max-w-lg mx-auto">
          {/* header row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-sm">Sök gods</span>
              {testMode && <span className="text-[10px] font-bold text-lbc-blue">Testläge</span>}
              {gpsStatus === 'fallback' && !testMode && <span className="text-[10px] text-amber-300/80">GPS saknas</span>}
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
              disabled={inventory.length < 6}
              onClick={() => setScreen('loading')}
            >
              {inventory.length < 6 ? `${inventory.length}/6` : '📦 Lasta!'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
