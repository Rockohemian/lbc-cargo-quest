import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useGameStore } from '../../store/gameStore'
import { useGeolocation, type GpsStatus } from '../../hooks/useGeolocation'
import {
  generateCargoField,
  generateEventCargoField,
  applySafetyFilter,
  ensureMinimumCargoNearby,
  getDistanceMeters,
  stepToward,
  offset,
} from '../../utils/cargoGenerator'
import { CURRENT_EVENT } from '../../data/events'
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
  const c = collected ? '#9ca3af' : (RARITY_COLORS[rarity] ?? '#9EA3A5')
  const op = collected ? 0.35 : 1
  return L.divIcon({
    className: '',
    html: `<div style="width:44px;height:52px;display:flex;flex-direction:column;align-items:center;opacity:${op}">` +
      `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;` +
      `background:#ffffff;border:1.5px solid #0a0a0a;font-size:20px;` +
      `box-shadow:0 4px 12px rgba(0,0,0,.18)">${emoji}</div>` +
      `<div style="width:24px;height:3px;background:${c};margin-top:2px"></div>` +
      `</div>`,
    iconSize: [44, 52], iconAnchor: [22, 26],
  })
}

function playerIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;position:relative">
      <div style="position:absolute;inset:0;background:rgba(26,126,52,.22);border-radius:50%;animation:pulse 2s infinite"></div>
      <div style="width:20px;height:20px;background:#00843e;border:3px solid #fff;border-radius:50%;
        box-shadow:0 2px 8px rgba(10,10,10,.35)"></div></div>`,
    iconSize: [44, 44], iconAnchor: [22, 22],
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

const RARITY_LABEL: Record<string, string> = {
  common: 'Vanlig', uncommon: 'Ovanlig', rare: 'Sällsynt', epic: 'Episk',
}
const WEIGHT_LABEL: Record<string, string> = {
  light: 'Lätt', medium: 'Medelvikt', heavy: 'Tung',
}

// ─── Main Component ────────────────────────────────────────────────────────
export function MapScreen() {
  const {
    playerPosition, setPlayerPosition, cargoItems, setCargoItems,
    selectCargo, setScreen, inventory, eventMode,
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
  // Keep eventMode accessible inside interval callbacks
  const eventModeRef = useRef(eventMode)
  eventModeRef.current = eventMode

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
    const isEvent = eventMode
    const spawnCenter = isEvent ? CURRENT_EVENT.center : playerPosition
    const maxR = isEvent ? CURRENT_EVENT.spawnRadius : 300
    const initial = isEvent ? generateEventCargoField(CURRENT_EVENT) : generateCargoField(playerPosition)
    setCargoItems(initial)
    lastSpawnPosRef.current = spawnCenter
    // Async safety pass — runs in background, removes any rail/motorway spawns
    applySafetyFilter(initial, spawnCenter, maxR).then(safe => {
      if (safe.length !== initial.length) setCargoItems(safe)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When GPS gets first real fix: regenerate cargo around actual position.
  // Always regen (no distance threshold) as long as player hasn't collected anything yet.
  const gpsFirstFixRef = useRef(false)
  useEffect(() => {
    if (gpsStatus !== 'ok' || gpsFirstFixRef.current) return
    gpsFirstFixRef.current = true
    if (eventModeRef.current) return // in event mode, cargo is pinned to venue
    const currentInventory = useGameStore.getState().inventory
    if (currentInventory.length > 0) return // don't disrupt ongoing round
    const newField = generateCargoField(playerPosition)
    setCargoItems(newField)
    lastSpawnPosRef.current = playerPosition
    applySafetyFilter(newField, playerPosition, 300).then(safe => {
      if (safe.length !== newField.length) setCargoItems(safe)
    })
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
        const updated = ensureMinimumCargoNearby(
          state.cargoItems,
          pos,
          eventModeRef.current
            ? { eventBoundCenter: CURRENT_EVENT.center, eventBoundRadius: CURRENT_EVENT.spawnRadius }
            : {}
        )
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
    <div
      className="fixed inset-x-0 bottom-0 bg-[#f6f4ef] flex flex-col"
      style={{ top: 'calc(3rem + env(safe-area-inset-top, 0px))' }}
    >
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
            pathOptions={{ color: '#00843e', fillColor: '#00843e', fillOpacity: 0.1, weight: 2 }}
          />

          {/* Event venue boundary circle */}
          {eventMode && (
            <Circle
              center={[CURRENT_EVENT.center.lat, CURRENT_EVENT.center.lng]}
              radius={CURRENT_EVENT.displayRadius}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.06,
                weight: 2,
                dashArray: '8 6',
              }}
            />
          )}

          {cargoItems.map(item => (
            <Marker
              key={item.id}
              position={[item.position.lat, item.position.lng]}
              icon={cargoIcon(item.type.emoji, item.type.rarity, item.collected)}
              eventHandlers={{
                click: () => {
                  if (item.collected) return
                  setPreviewItem({ ...item, dist: getDistanceMeters(playerPosition, item.position) })
                },
              }}
            />
          ))}

          <Marker position={[playerPosition.lat, playerPosition.lng]} icon={playerIcon()} />

          {rivalIcons.map(({ r, icon }) => (
            <Marker key={r.id} position={[r.position.lat, r.position.lng]} icon={icon} />
          ))}
        </MapContainer>

        {/* GPS-status visas i bottenpanelen — inga flytande banners */}

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

        {/* Day/night toggle — diskret nere till höger */}
        <button
          onClick={toggleMapTheme}
          className="absolute bottom-36 right-3 z-[1000] w-9 h-9 flex items-center justify-center bg-white text-[#0a0a0a] border border-black/12 shadow-[0_2px_8px_rgba(0,0,0,.12)] active:bg-[#f6f4ef]"
          aria-label="Växla kart-tema"
        >
          {isNight ? '☀️' : '🌙'}
        </button>

        {/* In-range collect button — svart platt CTA */}
        <AnimatePresence>
          {inRange.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-36 z-[1000] left-4 right-4"
            >
              {inRange.slice(0, 1).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleCollect(item)}
                  className="w-full flex items-center gap-3 bg-[#0a0a0a] text-white px-5 h-14 active:bg-[#00843e] transition-colors"
                >
                  <span className="text-2xl leading-none">{item.type.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">Samla in</div>
                    <div className="text-sm font-black leading-tight">{item.type.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">{Math.round(item.dist)}m</div>
                    <div className="text-[13px] font-black text-[#00a34c]">+{item.type.xpReward} XP</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ready-to-load popup — svart platt CTA */}
      <AnimatePresence>
        {showReadyToLoad && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-36 left-4 right-4 z-[1200]"
          >
            <button
              onClick={() => { setShowReadyToLoad(false); setScreen('loading') }}
              className="w-full flex items-center justify-between gap-3 bg-[#0a0a0a] text-white px-5 h-16 active:bg-[#00843e] transition-colors shadow-[0_8px_24px_rgba(0,0,0,.25)]"
            >
              <div className="text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#00a34c]">Redo att lasta</div>
                <div className="text-sm font-black leading-tight mt-0.5">Du har {inventory.length} kolli — tryck för att lasta</div>
              </div>
              <span className="text-2xl">→</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottenpanel — ljus, verksamhetssystem */}
      <div className="bg-[#f6f4ef] border-t border-black/10 z-[1000] safe-area-bottom">
        <div className="max-w-lg mx-auto">
          {/* Statusrad */}
          <div className="flex items-center justify-between gap-2 px-5 h-11 border-b border-black/8">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-[#0a0a0a] uppercase tracking-[0.28em]">Sök gods</span>
              <span className={[
                'text-[10px] font-bold uppercase tracking-[0.22em] inline-flex items-center gap-1.5',
                gpsStatus === 'ok'       ? 'text-[#00843e]' :
                gpsStatus === 'fallback' ? 'text-amber-700' :
                                           'text-black/40',
              ].join(' ')}>
                <span className={[
                  'w-1.5 h-1.5 rounded-full',
                  gpsStatus === 'ok'       ? 'bg-[#00843e]' :
                  gpsStatus === 'fallback' ? 'bg-amber-600' :
                                             'bg-black/25',
                ].join(' ')} />
                {gpsStatus === 'ok' ? 'GPS' : gpsStatus === 'fallback' ? 'GPS saknas' : 'Hämtar GPS'}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50 tabular-nums">{inventory.length}/{LOAD_MIN} kolli</span>
          </div>

          {/* Hjälptext */}
          {inventory.length < LOAD_MIN && cargoItems.length > 0 && (
            <div className="px-5 py-2 text-[11px] text-black/50 text-center border-b border-black/8">
              Tryck på en godsikon på kartan för att se detaljer
            </div>
          )}

          {/* Inventory + lasta-knapp — två celler i grid */}
          <div className="grid grid-cols-[1fr_auto]">
            <div className="px-5 py-3 border-r border-black/8 min-h-[56px] flex items-center">
              {inventory.length === 0 ? (
                <span className="text-black/35 text-[12px] font-medium">Ingen last ännu</span>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  {inventory.slice(-10).map((c, i) => (
                    <span key={i} className="text-lg">{c.emoji}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setScreen('loading')}
              disabled={inventory.length < LOAD_MIN}
              className={
                'px-6 h-14 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.22em] transition-colors ' +
                (inventory.length < LOAD_MIN
                  ? 'bg-black/5 text-black/35 cursor-not-allowed'
                  : 'bg-[#0a0a0a] text-white active:bg-[#00843e]')
              }
            >
              {inventory.length < LOAD_MIN
                ? <span>{inventory.length}/{LOAD_MIN}</span>
                : <><span>Lasta</span><span className="text-lg">→</span></>}
            </button>
          </div>
        </div>
      </div>

      {/* Cargo preview modal — ljus, verksamhetssystem */}
      <AnimatePresence>
        {previewItem && (
          <>
            <motion.div
              key="preview-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewItem(null)}
              className="absolute inset-0 z-[1090] bg-black/35"
            />
            <motion.div
              key="preview-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-[1095] bg-[#f6f4ef] border-t border-black/10"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mt-3 mb-2" />

              {/* Eyebrow + close */}
              <div className="flex items-center justify-between px-5 h-9 border-b border-black/8">
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e]">— Godsinformation</span>
                <button onClick={() => setPreviewItem(null)} className="text-black/40 active:text-[#0a0a0a] text-lg" aria-label="Stäng">✕</button>
              </div>

              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-black/8 flex items-start gap-4">
                <div
                  className="w-16 h-16 flex items-center justify-center text-3xl flex-shrink-0 bg-white border border-[#0a0a0a]"
                >
                  {previewItem.type.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[22px] font-black leading-tight tracking-tight text-[#0a0a0a]">{previewItem.type.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.22em] px-2 py-0.5"
                      style={{ color: RARITY_COLORS[previewItem.type.rarity], background: RARITY_COLORS[previewItem.type.rarity] + '18' }}
                    >
                      {RARITY_LABEL[previewItem.type.rarity]}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">
                      {WEIGHT_LABEL[previewItem.type.load.weightClass]}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-black/60 leading-relaxed">{previewItem.type.description}</p>
                </div>
              </div>

              {/* Stats grid — 3 kolumner med tunna avdelare */}
              <div className="grid grid-cols-3 border-b border-black/8">
                {([
                  ['Avstånd', Math.round(previewItem.dist) + ' m'],
                  ['XP', '+' + previewItem.type.xpReward],
                  ['Värde', previewItem.type.value + ' kr'],
                ] as [string, string][]).map(([label, value], i) => (
                  <div key={label} className={'px-4 py-3 ' + (i < 2 ? 'border-r border-black/8' : '')}>
                    <div className="text-[9px] font-black uppercase tracking-[0.28em] text-black/45 mb-0.5">{label}</div>
                    <div className="text-[16px] font-black tracking-tight text-[#0a0a0a]">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-b border-black/8">
                {([
                  ['Vikt', previewItem.type.weight + ' kg'],
                  ['Volym', previewItem.type.volume + ' m³'],
                  ['Storlek', previewItem.type.load.cols + '×' + previewItem.type.load.rows],
                ] as [string, string][]).map(([label, value], i) => (
                  <div key={label} className={'px-4 py-3 ' + (i < 2 ? 'border-r border-black/8' : '')}>
                    <div className="text-[9px] font-black uppercase tracking-[0.28em] text-black/45 mb-0.5">{label}</div>
                    <div className="text-[14px] font-black tracking-tight text-[#0a0a0a]">{value}</div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {(previewItem.type.load.fragile || previewItem.type.load.stackable) && (
                <div className="flex gap-2 px-5 py-3 border-b border-black/8 flex-wrap">
                  {previewItem.type.load.fragile && (
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] bg-red-50 text-red-700 border border-red-200 px-2 py-1">⚠ Ömtåligt</span>
                  )}
                  {previewItem.type.load.stackable && (
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] bg-black/5 text-black/55 border border-black/10 px-2 py-1">Stapelbart</span>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="px-5 pt-4">
                {previewItem.dist <= COLLECT_RADIUS ? (
                  <button
                    onClick={() => { handleCollect(previewItem); setPreviewItem(null) }}
                    className="w-full bg-[#0a0a0a] text-white h-14 flex items-center justify-between px-5 active:bg-[#00843e] transition-colors"
                  >
                    <span className="text-[12px] font-black uppercase tracking-[0.22em]">Samla in</span>
                    <span className="text-[12px] font-black text-[#00a34c]">+{previewItem.type.xpReward} XP →</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="w-full bg-white border border-black/15 h-14 flex items-center justify-between px-5 active:bg-black/[0.03] transition-colors"
                  >
                    <span className="text-[12px] font-black uppercase tracking-[0.22em] text-[#0a0a0a]">Gå dit</span>
                    <span className="text-[12px] font-bold text-black/60">{Math.round(previewItem.dist)} m bort</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}






