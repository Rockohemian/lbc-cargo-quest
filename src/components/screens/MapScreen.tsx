import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useGameStore } from '../../store/gameStore'
import { useGeolocation, formatAccuracy, GPS_PENDING, type GpsInfo } from '../../hooks/useGeolocation'
import {
  generateCargoField,
  generateNearbyTestCargoItems,
  generateEventCargoField,
  applySafetyFilter,
  ensureMinimumCargoNearby,
  getDistanceMeters,
  stepToward,
  offset,
} from '../../utils/cargoGenerator'
import { CURRENT_EVENT } from '../../data/events'
import { RARITY_COLORS, LOAD_MIN } from '../../data/cargoTypes'
import { QUIZ_STARS, QUIZ_STAR_POINTS, STAR_LAYOUT } from '../../data/quizStars'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { HowToPlaySheet } from '../game/HowToPlaySheet'
import type { CargoItem, LatLng, QuizStarPin } from '../../types'

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

// ─── Gemensamt formspråk för alla kartmarkörer ──────────────────────────────
const PIN_SHADOW = '0 8px 18px rgba(12,20,15,.20), 0 2px 5px rgba(12,20,15,.14)'
const PIN_FONT = "700 8px/1 'Inter',system-ui,sans-serif"

/** Nedåtpekande spets i markörens accentfärg. */
function pinTail(accent: string) {
  return '<div style="width:0;height:0;margin-top:-2px;border-left:5px solid transparent;' +
    'border-right:5px solid transparent;border-top:9px solid ' + accent + '"></div>'
}

/** Liten versal etikett under spetsen. */
function pinLabel(text: string, accent: string) {
  return '<div style="margin-top:4px;font:' + PIN_FONT + ';letter-spacing:.16em;color:#fff;' +
    'background:' + accent + ';padding:3px 5px;border-radius:3px;' +
    'box-shadow:0 2px 6px rgba(12,20,15,.22)">' + text + '</div>'
}

function rivalIcon(dwellSec: number, stealTotal: number) {
  const pct = Math.min(100, Math.round((dwellSec / stealTotal) * 100))
  const stealing = pct > 0
  const accent = stealing ? '#b63a28' : '#3c423d'
  const ring = stealing ? ', 0 0 0 5px rgba(182,58,40,.16)' : ''
  const progress = stealing
    ? '<div style="width:38px;height:3px;margin-top:5px;background:rgba(12,20,15,.18);' +
      'border-radius:2px;overflow:hidden"><div style="height:100%;width:' + pct + '%;' +
      'background:' + accent + ';border-radius:2px"></div></div>'
    : ''
  return L.divIcon({
    className: '',
    html:
      '<div style="width:54px;height:76px;display:flex;flex-direction:column;align-items:center">' +
      '<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;' +
      'background:#1b211d;border:2px solid ' + accent + ';border-radius:50%;font-size:18px;line-height:1;' +
      'box-shadow:' + PIN_SHADOW + ring + '">&#x1F69B;</div>' +
      pinTail(accent) +
      progress +
      pinLabel('RIVAL', accent) +
      '</div>',
    iconSize: [54, 76], iconAnchor: [27, 47],
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
  const accent = collected ? '#b4b9b3' : (RARITY_COLORS[rarity] ?? '#9EA3A5')
  const op = collected ? 0.4 : 1
  const gray = collected ? 'filter:grayscale(1);' : ''
  return L.divIcon({
    className: '',
    html:
      `<div style="width:48px;height:52px;display:flex;flex-direction:column;align-items:center;opacity:${op}">` +
      `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;` +
      `background:#fff;border:2px solid ${accent};border-radius:50%;font-size:19px;line-height:1;` +
      `box-shadow:${PIN_SHADOW};${gray}">${emoji}</div>` +
      pinTail(accent) +
      `</div>`,
    iconSize: [48, 52], iconAnchor: [24, 47],
  })
}

/** Kunskapsstjärna. Besvarade stjärnor tonas ner och märks med resultatet. */
function starIcon(state: 'open' | 'correct' | 'wrong') {
  const answered = state !== 'open'
  const accent = state === 'correct' ? '#00843e' : state === 'wrong' ? '#8d938c' : '#c98a00'
  const mark = state === 'correct' ? '&#10003;' : state === 'wrong' ? '&#10005;' : '&#9733;'
  const halo = answered
    ? ''
    : '<span style="position:absolute;inset:-8px;border-radius:50%;' +
      'background:rgba(201,138,0,.24);animation:lcq-halo 2.4s ease-out infinite"></span>'
  return L.divIcon({
    className: '',
    html:
      '<div style="width:52px;height:68px;display:flex;flex-direction:column;align-items:center;' +
      'opacity:' + (answered ? 0.72 : 1) + '">' +
      '<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;' +
      'justify-content:center">' + halo +
      '<span style="position:relative;width:40px;height:40px;display:flex;align-items:center;' +
      'justify-content:center;background:' + accent + ';border:2px solid #fff;border-radius:50%;' +
      'font-size:17px;line-height:1;color:#fff;box-shadow:' + PIN_SHADOW + '">' + mark + '</span></div>' +
      pinTail(accent) +
      pinLabel('QUIZ', accent) +
      '</div>',
    iconSize: [52, 68], iconAnchor: [26, 47],
  })
}

/** Placerar de tre stjärnorna runt en mittpunkt. */
function makeQuizStars(center: LatLng, tapMode: boolean): QuizStarPin[] {
  return QUIZ_STARS.map((s, i) => {
    const layout = STAR_LAYOUT[i % STAR_LAYOUT.length]
    return {
      id: s.id,
      position: offset(center, tapMode ? layout.tapMeters : layout.meters, layout.bearing),
    }
  })
}

function playerIcon() {
  return L.divIcon({
    className: '',
    html:
      `<div style="width:48px;height:48px;position:relative;display:flex;align-items:center;justify-content:center">` +
      `<span style="position:absolute;inset:6px;border-radius:50%;background:rgba(0,132,62,.22);` +
      `animation:lcq-halo 2.6s ease-out infinite"></span>` +
      `<span style="position:relative;width:20px;height:20px;border-radius:50%;background:#00843e;` +
      `border:3px solid #fff;box-shadow:0 3px 10px rgba(12,20,15,.35)"></span>` +
      `</div>`,
    iconSize: [48, 48], iconAnchor: [24, 24],
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
    collectMode, setCollectMode,
    quizStars, setQuizStars, quizAnswers, answerQuizStar, quizBonus,
  } = useGameStore()

  const isTapMode = collectMode === 'tap'
  const [showModePicker, setShowModePicker] = useState(false)
  const [gpsHintDismissed, setGpsHintDismissed] = useState(false)
  // Introrutan visas en gång per spelare och går att öppna igen via "?".
  const [showIntro, setShowIntro] = useState(() => localStorage.getItem('lcq-intro-seen') !== '1')

  const [gps, setGps] = useState<GpsInfo>(GPS_PENDING)
  const gpsStatus = gps.status
  const gpsBlocked = gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'insecure'
  const gpsImprecise = gpsBlocked || gpsStatus === 'coarse'
  const [followPlayer, setFollowPlayer] = useState(true)
  const [mapTheme, setMapTheme] = useState<'night' | 'day'>(
    () => (localStorage.getItem('lcq-map-theme') as 'night' | 'day') || 'day'
  )
  const [rivals, setRivals] = useState<Rival[]>([])
  const [stolenNotice, setStolenNotice] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<(CargoItem & { dist: number }) | null>(null)
  const [activeStarId, setActiveStarId] = useState<string | null>(null)
  const [starPicked, setStarPicked] = useState<number | null>(null)
  const [showReadyToLoad, setShowReadyToLoad] = useState(false)
  const prevInventoryLen = useRef(0)
  const readyTimerRef = useRef<number | null>(null)
  // Ready-to-load popup
  useEffect(() => {
    const minLoad = LOAD_MIN
    if (prevInventoryLen.current < minLoad && inventory.length >= minLoad) {
      setShowReadyToLoad(true)
      if (readyTimerRef.current) window.clearTimeout(readyTimerRef.current)
      readyTimerRef.current = window.setTimeout(() => setShowReadyToLoad(false), 4000)
    }
    prevInventoryLen.current = inventory.length
  }, [inventory.length])

  // Timern lever längre än skärmen om man går vidare direkt till lastningen.
  useEffect(() => () => { if (readyTimerRef.current) window.clearTimeout(readyTimerRef.current) }, [])

  const spawnedRef = useRef(false)
  // Track last position for spawn engine — use ref to avoid effect dependency loop
  const lastSpawnPosRef = useRef<LatLng>(playerPosition)
  // Keep eventMode accessible inside interval callbacks
  const eventModeRef = useRef(eventMode)
  eventModeRef.current = eventMode
  const tapModeRef = useRef(isTapMode)
  tapModeRef.current = isTapMode

  // GPS with status — avstängd helt i tap-läget (ingen behörighetsfråga ställs)
  useGeolocation(
    useCallback((pos: LatLng) => {
      setPlayerPosition(pos)
    }, [setPlayerPosition]),
    { enabled: collectMode === 'gps', onStatus: setGps }
  )

  // Initial cargo field — körs när spelaren valt insamlingsläge
  useEffect(() => {
    if (!collectMode) return
    if (spawnedRef.current) return
    spawnedRef.current = true
    const isEvent = eventMode
    const spawnCenter = isEvent ? CURRENT_EVENT.center : playerPosition
    const maxR = isEvent ? CURRENT_EVENT.spawnRadius : 300
    const initial = isEvent
      ? generateEventCargoField(CURRENT_EVENT)
      : collectMode === 'tap'
        ? generateNearbyTestCargoItems(playerPosition, 12)
        : generateCargoField(playerPosition)
    setCargoItems(initial)
    setQuizStars(makeQuizStars(spawnCenter, collectMode === 'tap'))
    lastSpawnPosRef.current = spawnCenter
    if (collectMode === 'tap' && !isEvent) return // tätt fält behöver ingen vägfiltrering
    // Async safety pass — runs in background, removes any rail/motorway spawns
    applySafetyFilter(initial, spawnCenter, maxR).then(safe => {
      if (safe.length !== initial.length) setCargoItems(safe)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectMode])

  // När GPS ger sin första SKARPA fix: lägg om godsfältet runt den riktiga
  // positionen. En grov nätverksposition duger inte — den ligger typiskt mitt i
  // stan, och då skulle vi spränga ut godset på helt fel plats.
  const gpsFirstFixRef = useRef(false)
  useEffect(() => {
    if (gpsStatus !== 'ok' || gpsFirstFixRef.current) return
    gpsFirstFixRef.current = true
    if (eventModeRef.current) return // in event mode, cargo is pinned to venue
    const currentInventory = useGameStore.getState().inventory
    if (currentInventory.length > 0) return // don't disrupt ongoing round
    const newField = generateCargoField(playerPosition)
    setCargoItems(newField)
    setQuizStars(makeQuizStars(playerPosition, false))
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
            : { testMode: tapModeRef.current }
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

  const inRange = isTapMode ? nearest : nearest.filter(i => i.dist <= COLLECT_RADIUS)

  // ── Kunskapsstjärnor ─────────────────────────────────────────────────────
  const starPins = quizStars.flatMap(pin => {
    const star = QUIZ_STARS.find(s => s.id === pin.id)
    if (!star) return []
    return [{
      ...pin,
      star,
      dist: getDistanceMeters(playerPosition, pin.position),
      answered: pin.id in quizAnswers,
      correct: quizAnswers[pin.id] === true,
    }]
  })
  const activeStar = starPins.find(p => p.id === activeStarId) ?? null
  const starsAnswered = starPins.filter(p => p.answered).length
  const starReachable = !activeStar || isTapMode || activeStar.dist <= COLLECT_RADIUS

  const closeStar = () => { setActiveStarId(null); setStarPicked(null) }

  const pickStarAnswer = (index: number) => {
    if (!activeStar || activeStar.answered) return
    setStarPicked(index)
    answerQuizStar(activeStar.id, index === activeStar.star.correctIndex)
  }

  const handleCollect = (item: CargoItem) => {
    selectCargo(item)
    setScreen('collect')
  }

  const chooseMode = (mode: 'gps' | 'tap') => {
    const changed = mode !== collectMode
    setCollectMode(mode)
    setShowModePicker(false)
    setGpsHintDismissed(false)
    if (changed) {
      // Nytt läge → nytt fält så avstånden stämmer med spelsättet
      spawnedRef.current = false
      setGps(GPS_PENDING)
      gpsFirstFixRef.current = false
    }
  }

  const handleRespawn = () => {
    setCargoItems(
      isTapMode
        ? generateNearbyTestCargoItems(playerPosition, 12)
        : generateCargoField(playerPosition)
    )
    spawnedRef.current = true
  }

  // ── Rival trucks ──────────────────────────────────────────────────────────
  const playerPositionRef = useRef(playerPosition)
  playerPositionRef.current = playerPosition
  const cargoItemsRef = useRef(cargoItems)
  cargoItemsRef.current = cargoItems
  // Rivalerna läses inne i ett interval. Utan ref hade intervallet antingen
  // sett en fryst lista eller behövt startas om varannan sekund.
  const rivalsRef = useRef(rivals)
  rivalsRef.current = rivals
  const noticeTimerRef = useRef<number | null>(null)

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

    // Movement + steal tick.
    //
    // Uträkningen ligger MEDVETET utanför setRivals. En state-uppdaterare måste
    // vara ren — React kör den fler än en gång i strict mode, och gjorde vi
    // stölden där inne försvann två kollin per stöld och notisen dubblerades.
    const moveTick = window.setInterval(() => {
      const uncollected = cargoItemsRef.current.filter(i => !i.collected)
      const prev = rivalsRef.current
      if (prev.length === 0 || uncollected.length === 0) return

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

      setRivals(next)

      if (stolen) {
        setCargoItems(cargoItemsRef.current.filter(c => c.id !== stolen))
        setStolenNotice('💨 Konkurrenten stal ett kolli!')
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = window.setTimeout(() => setStolenNotice(null), 3500)
      }
    }, RIVAL_TICK_MS)

    return () => {
      window.clearTimeout(spawnTimer)
      window.clearInterval(respawnTimer)
      window.clearInterval(moveTick)
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
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
  // OpenStreetMap standardrutor — fria, kräver ingen API-nyckel och visar
  // gator, vägnamn och kvarter tydligt. Nattläget skapas av CSS-filtret
  // .map-night i index.css, så samma rutor används för båda teman.
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

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
            url={tileUrl}
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <RecenterMap pos={playerPosition} follow={followPlayer} />

          <Circle
            center={[playerPosition.lat, playerPosition.lng]}
            radius={COLLECT_RADIUS}
            pathOptions={{ color: '#00843e', fillColor: '#00843e', fillOpacity: 0.07, weight: 1.5, opacity: 0.55 }}
          />

          {/* Event venue boundary circle */}
          {eventMode && (
            <Circle
              center={[CURRENT_EVENT.center.lat, CURRENT_EVENT.center.lng]}
              radius={CURRENT_EVENT.displayRadius}
              pathOptions={{
                color: '#c98a00',
                fillColor: '#c98a00',
                fillOpacity: 0.05,
                weight: 1.5,
                opacity: 0.6,
                dashArray: '6 8',
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

          {starPins.map(pin => (
            <Marker
              key={pin.id}
              position={[pin.position.lat, pin.position.lng]}
              icon={starIcon(pin.answered ? (pin.correct ? 'correct' : 'wrong') : 'open')}
              eventHandlers={{ click: () => { setStarPicked(null); setActiveStarId(pin.id) } }}
            />
          ))}

          <Marker position={[playerPosition.lat, playerPosition.lng]} icon={playerIcon()} />
          {/* Osäkerhetsradie — gör det synligt när positionen bara är ungefärlig */}
          {!isTapMode && gpsStatus === 'coarse' && gps.accuracy != null && (
            <Circle
              center={[playerPosition.lat, playerPosition.lng]}
              radius={gps.accuracy}
              pathOptions={{ color: '#c98a00', fillColor: '#c98a00', fillOpacity: 0.08, weight: 1.5, dashArray: '6 6' }}
            />
          )}

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

        {/* Day/night toggle — diskret uppe till höger, fri från CTA-knappen */}
        <button
          onClick={toggleMapTheme}
          className="absolute top-3 right-3 z-[1000] w-9 h-9 rounded-full flex items-center justify-center bg-white/95 backdrop-blur text-[#0a0a0a] border border-black/10 shadow-[0_4px_12px_rgba(12,20,15,.16)] active:bg-[#f6f4ef]"
          aria-label="Växla kart-tema"
        >
          {isNight ? '☀️' : '🌙'}
        </button>

        {/* Hjälp — öppnar introrutan och lastskolan igen */}
        <button
          onClick={() => setShowIntro(true)}
          className="absolute top-3 right-14 z-[1000] w-9 h-9 rounded-full flex items-center justify-center bg-white/95 backdrop-blur text-[#0a0a0a] border border-black/10 shadow-[0_4px_12px_rgba(12,20,15,.16)] text-[15px] font-black active:bg-[#f6f4ef]"
          aria-label="Så spelar du"
        >
          ?
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
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      {isTapMode ? 'Utan GPS' : Math.round(item.dist) + 'm'}
                    </div>
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
              <button
                onClick={() => setShowModePicker(true)}
                className={[
                  'text-[10px] font-bold uppercase tracking-[0.22em] inline-flex items-center gap-1.5 active:opacity-60',
                  isTapMode          ? 'text-[#0a0a0a]' :
                  gpsStatus === 'ok' ? 'text-[#00843e]' :
                  gpsBlocked         ? 'text-red-700' :
                  gpsStatus === 'coarse' ? 'text-amber-700' :
                                       'text-black/40',
                ].join(' ')}
              >
                <span className={[
                  'w-1.5 h-1.5 rounded-full',
                  isTapMode          ? 'bg-[#0a0a0a]' :
                  gpsStatus === 'ok' ? 'bg-[#00843e]' :
                  gpsBlocked         ? 'bg-red-600' :
                  gpsStatus === 'coarse' ? 'bg-amber-600' :
                                       'bg-black/25',
                ].join(' ')} />
                {isTapMode ? 'Utan GPS'
                  : gpsStatus === 'ok'          ? `GPS ${formatAccuracy(gps.accuracy)}`
                  : gpsStatus === 'coarse'      ? `Ungefärlig ${formatAccuracy(gps.accuracy)}`
                  : gpsStatus === 'denied'      ? 'Plats nekad'
                  : gpsStatus === 'insecure'    ? 'Blockerad'
                  : gpsStatus === 'unavailable' ? 'GPS saknas'
                  :                               'Hämtar GPS'}
                <span className="text-black/30 normal-case tracking-normal font-medium">· byt</span>
              </button>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50 tabular-nums">{inventory.length}/{LOAD_MIN} kolli</span>
          </div>

          {/* Uppdragsrad — hur många kollin som krävs och hur långt man kommit */}
          <div className="px-5 py-2.5 border-b border-black/8">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-black text-[#0a0a0a]">
                {inventory.length >= LOAD_MIN
                  ? `Fullt uppdrag — ${inventory.length} kolli redo att lastas`
                  : `Samla in ${LOAD_MIN} kolli för att få lasta`}
              </span>
              <span className={
                'text-[11px] font-black tabular-nums whitespace-nowrap ' +
                (inventory.length >= LOAD_MIN ? 'text-[#00843e]' : 'text-black/45')
              }>
                {inventory.length >= LOAD_MIN
                  ? '✓ Klart'
                  : `${LOAD_MIN - inventory.length} kvar`}
              </span>
            </div>
            <div className="mt-1.5 h-1 bg-black/10 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (inventory.length / LOAD_MIN) * 100)}%`,
                  background: inventory.length >= LOAD_MIN ? '#00843e' : '#0a0a0a',
                }}
              />
            </div>
          </div>

          {/* Kunskapsstjärnor — bonuspoäng för rätt svar om LBC Frakt */}
          {starPins.length > 0 && (
            <button
              onClick={() => {
                const next = starPins.find(p => !p.answered) ?? starPins[0]
                setStarPicked(null)
                setActiveStarId(next.id)
              }}
              className="w-full flex items-center justify-between gap-3 px-5 py-2 border-b border-black/8 active:bg-black/[0.03]"
            >
              <span className="text-[11px] font-black text-[#0a0a0a] flex items-center gap-2">
                <span className="text-[13px]">⭐</span>
                {starsAnswered < starPins.length
                  ? 'Hitta kunskapsstjärnorna på kartan'
                  : 'Alla stjärnor besvarade'}
              </span>
              <span className="text-[11px] font-black tabular-nums whitespace-nowrap text-[#c98a00]">
                {starsAnswered}/{starPins.length} · {quizBonus} p
              </span>
            </button>
          )}

          {/* Hjälptext */}
          {inventory.length < LOAD_MIN && cargoItems.length > 0 && (
            <div className="px-5 py-2 text-[11px] text-black/50 text-center border-b border-black/8">
              {isTapMode
                ? 'Tryck på en godsikon på kartan och samla in direkt — ingen GPS behövs'
                : 'Tryck på en godsikon på kartan för att se detaljer'}
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
                ? <span className="tabular-nums">{LOAD_MIN - inventory.length} kvar</span>
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
                  ['Avstånd', isTapMode ? '—' : Math.round(previewItem.dist) + ' m'],
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
                {isTapMode || previewItem.dist <= COLLECT_RADIUS ? (
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

      {/* Kunskapsstjärna — fråga om LBC Frakt */}
      <AnimatePresence>
        {activeStar && (
          <>
            <motion.div
              key="star-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeStar}
              className="absolute inset-0 z-[1190] bg-black/45"
            />
            <motion.div
              key="star-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-[1195] bg-[#f6f4ef] border-t border-black/10 max-h-[88%] overflow-y-auto"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            >
              <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mt-3 mb-2" />

              <div className="flex items-center justify-between px-5 h-9 border-b border-black/8">
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#c98a00]">
                  — {activeStar.star.label}
                </span>
                <button onClick={closeStar} className="text-black/40 active:text-[#0a0a0a] text-lg" aria-label="Stäng">✕</button>
              </div>

              {!starReachable ? (
                <div className="px-5 py-6">
                  <h2 className="text-[19px] font-black leading-snug tracking-tight text-[#0a0a0a]">
                    Kunskapsstjärna
                  </h2>
                  <p className="mt-2 text-[13px] text-black/60 leading-relaxed">
                    Gå fram till stjärnan för att svara på frågan och tjäna {QUIZ_STAR_POINTS} bonuspoäng.
                  </p>
                  <button
                    onClick={closeStar}
                    className="mt-4 w-full bg-white border border-black/15 h-14 flex items-center justify-between px-5 active:bg-black/[0.03] transition-colors"
                  >
                    <span className="text-[12px] font-black uppercase tracking-[0.22em] text-[#0a0a0a]">Gå dit</span>
                    <span className="text-[12px] font-bold text-black/60">{Math.round(activeStar.dist)} m bort</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-5 pt-5 pb-4">
                    <h2 className="text-[19px] font-black leading-snug tracking-tight text-[#0a0a0a]">
                      {activeStar.star.question}
                    </h2>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-black/45">
                      {activeStar.answered
                        ? (activeStar.correct ? `+${QUIZ_STAR_POINTS} poäng` : '0 poäng')
                        : `${QUIZ_STAR_POINTS} poäng för rätt svar · ett försök`}
                    </p>
                  </div>

                  <div className="px-5 space-y-2">
                    {activeStar.star.options.map((opt, i) => {
                      const isCorrect = i === activeStar.star.correctIndex
                      const chosen = starPicked === i
                      const reveal = activeStar.answered
                      const style = !reveal
                        ? 'bg-white border-black/15 active:bg-black/[0.04]'
                        : isCorrect
                          ? 'bg-[#00843e]/10 border-[#00843e]'
                          : chosen
                            ? 'bg-red-50 border-red-400'
                            : 'bg-white border-black/10 opacity-55'
                      return (
                        <button
                          key={opt}
                          onClick={() => pickStarAnswer(i)}
                          disabled={reveal}
                          className={'w-full text-left border px-4 py-3 flex items-center gap-3 transition-colors ' + style}
                        >
                          <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center border border-black/20 text-[11px] font-black text-[#0a0a0a]">
                            {reveal && isCorrect ? '✓' : reveal && chosen ? '✕' : String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-[13px] font-bold leading-snug text-[#0a0a0a]">{opt}</span>
                        </button>
                      )
                    })}
                  </div>

                  {activeStar.answered && (
                    <div className="px-5 pt-4">
                      <div
                        className={
                          'border px-4 py-3 ' +
                          (activeStar.correct ? 'border-[#00843e] bg-[#00843e]/8' : 'border-black/15 bg-white')
                        }
                      >
                        <div
                          className="text-[10px] font-black uppercase tracking-[0.28em] mb-1.5"
                          style={{ color: activeStar.correct ? '#00843e' : '#c93820' }}
                        >
                          {activeStar.correct ? `Rätt svar · +${QUIZ_STAR_POINTS} p` : 'Fel svar · 0 p'}
                        </div>
                        <p className="text-[12.5px] leading-relaxed text-black/75">{activeStar.star.explanation}</p>
                      </div>
                      <button
                        onClick={closeStar}
                        className="mt-4 w-full bg-[#0a0a0a] text-white h-14 flex items-center justify-between px-5 active:bg-[#00843e] transition-colors"
                      >
                        <span className="text-[12px] font-black uppercase tracking-[0.22em]">Tillbaka till kartan</span>
                        <span className="text-[12px] font-black text-[#00a34c]">{quizBonus} p bonus →</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GPS otillförlitlig — erbjud byte till läget utan GPS */}
      <AnimatePresence>
        {!isTapMode && collectMode === 'gps' && gpsImprecise && !gpsHintDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute top-3 left-4 right-4 z-[1150]"
          >
            <div className="bg-[#0a0a0a] text-white px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,.3)]">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">
                {gpsStatus === 'coarse'
                  ? `Ungefärlig position ${formatAccuracy(gps.accuracy)}`
                  : gpsStatus === 'denied'
                    ? 'Platsbehörighet saknas'
                    : gpsStatus === 'insecure'
                      ? 'Plats blockerad'
                      : 'Ingen position'}
              </div>
              <p className="text-[12px] text-white/70 mt-1 leading-snug">
                {gps.message ?? 'Vi hittar inte din position. Du kan spela vidare utan GPS och samla gods direkt från kartan.'}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => chooseMode('tap')}
                  className="flex-1 h-10 bg-white text-[#0a0a0a] text-[11px] font-black uppercase tracking-[0.22em] active:bg-[#00843e] active:text-white"
                >
                  Spela utan GPS
                </button>
                <button
                  onClick={() => setGpsHintDismissed(true)}
                  className="h-10 px-4 border border-white/25 text-white/70 text-[11px] font-black uppercase tracking-[0.22em] active:bg-white/10"
                >
                  Fortsätt
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Välj insamlingssätt — visas första gången och vid manuellt byte */}
      <AnimatePresence>
        {!showIntro && (!collectMode || showModePicker) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1300] bg-[#0a0a0a]/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-[#f6f4ef] border-t border-black/10"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            >
              <div className="px-5 pt-5 pb-4 border-b border-black/8">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e]">— Välj spelsätt</div>
                <h2 className="text-[22px] font-black tracking-tight text-[#0a0a0a] mt-1 leading-tight">
                  Hur vill du samla in godset?
                </h2>
                <p className="text-[12px] text-black/55 mt-1 leading-relaxed">
                  Målet är att samla in <strong className="text-[#0a0a0a]">{LOAD_MIN} kolli</strong>, lasta bilen rätt och köra hem poäng.
                  Du kan byta spelsätt när som helst via statusraden längst ner.
                </p>
              </div>

              <button
                onClick={() => chooseMode('gps')}
                className="w-full text-left px-5 py-4 border-b border-black/8 bg-white active:bg-black/[0.03] flex items-start gap-4"
              >
                <span className="text-3xl leading-none mt-0.5">🚶</span>
                <span className="flex-1">
                  <span className="block text-[15px] font-black text-[#0a0a0a]">Gå och samla</span>
                  <span className="block text-[12px] text-black/55 mt-0.5 leading-snug">
                    Godset ligger utspritt runt dig. Du måste gå inom 20 meter för att plocka upp det.
                  </span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#00843e] mt-2">
                    Kräver platsbehörighet
                  </span>
                </span>
                {collectMode === 'gps' && <span className="text-[#00843e] text-lg font-black">✓</span>}
              </button>

              <button
                onClick={() => chooseMode('tap')}
                className="w-full text-left px-5 py-4 border-b border-black/8 bg-white active:bg-black/[0.03] flex items-start gap-4"
              >
                <span className="text-3xl leading-none mt-0.5">👆</span>
                <span className="flex-1">
                  <span className="block text-[15px] font-black text-[#0a0a0a]">Samla från kartan</span>
                  <span className="block text-[12px] text-black/55 mt-0.5 leading-snug">
                    Tryck på godset och plocka upp det direkt — stå still, sitt ner, spela inomhus.
                  </span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-black/45 mt-2">
                    Ingen GPS behövs
                  </span>
                </span>
                {collectMode === 'tap' && <span className="text-[#00843e] text-lg font-black">✓</span>}
              </button>

              {collectMode && (
                <div className="px-5 pt-3">
                  <button
                    onClick={() => setShowModePicker(false)}
                    className="w-full h-12 border border-black/15 text-[11px] font-black uppercase tracking-[0.22em] text-black/60 active:bg-black/[0.03]"
                  >
                    Avbryt
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro: vad spelet går ut på och hur man lastar rätt */}
      <HowToPlaySheet
        open={showIntro}
        onClose={() => {
          localStorage.setItem('lcq-intro-seen', '1')
          setShowIntro(false)
        }}
      />
    </div>
  )
}






