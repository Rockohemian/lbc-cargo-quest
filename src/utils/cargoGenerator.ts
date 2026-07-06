import type { CargoItem, CargoType, LatLng } from '../types'
import type { EventVenue } from '../data/events'
import { CARGO_TYPES } from '../data/cargoTypes'

// ─── Geo helpers ─────────────────────────────────────────────────────────
export function offset(center: LatLng, meters: number, bearingDeg: number): LatLng {
  const R = 6371000
  const d = meters / R
  const b = (bearingDeg * Math.PI) / 180
  const lat1 = (center.lat * Math.PI) / 180
  const lng1 = (center.lng * Math.PI) / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lng2 =
    lng1 +
    Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI }
}

export function getDistanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

/** Move a position toward a target by a fixed number of meters. */
export function stepToward(pos: LatLng, target: LatLng, stepMeters: number): LatLng {
  const dist = getDistanceMeters(pos, target)
  if (dist <= stepMeters) return target
  const t = stepMeters / dist
  return { lat: pos.lat + (target.lat - pos.lat) * t, lng: pos.lng + (target.lng - pos.lng) * t }
}

// ─── Cargo type selection (weighted by rarity) ───────────────────────────
const RARITY_WEIGHT: Record<string, number> = { common: 5, uncommon: 3, rare: 2, epic: 1 }

const WEIGHTED_POOL: CargoType[] = CARGO_TYPES.flatMap((ct) =>
  Array(RARITY_WEIGHT[ct.rarity] ?? 1).fill(ct)
)

export function randomCargoType(): CargoType {
  return WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)]
}

let cargoSeq = 0
function uniqueId(): string {
  cargoSeq += 1
  return `cargo-${Date.now().toString(36)}-${cargoSeq}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

// ─── Spawn engine ────────────────────────────────────────────────────────

export interface SpawnOptions {
  minDistance?: number
  maxDistance?: number
  bearing?: number
}

/**
 * Generate one cargo object around the player's location.
 * Picks a random distance (default 50–300 m) and a random bearing,
 * converts to a new lat/lng, selects a rarity-weighted cargo type,
 * and assigns a unique id.
 */
export function generateCargoAroundPlayer(playerLocation: LatLng, opts: SpawnOptions = {}): CargoItem {
  const minDistance = opts.minDistance ?? 50
  const maxDistance = opts.maxDistance ?? 300
  const distance = minDistance + Math.random() * (maxDistance - minDistance)
  const bearing = opts.bearing ?? Math.random() * 360
  const position = offset(playerLocation, distance, bearing)

  return {
    id: uniqueId(),
    type: randomCargoType(),
    position,
    collected: false,
    spawnTime: Date.now(),
  }
}

/**
 * Build a full field of cargo around the player when a session starts.
 * Creates 12–20 objects within 50–300 m spread across all directions,
 * guaranteeing at least 3 within easy walking distance.
 */
export function generateCargoField(center: LatLng, count?: number): CargoItem[] {
  const total = count ?? 12 + Math.floor(Math.random() * 5) // 12–16
  const items: CargoItem[] = []

  // Spread bearings so objects land in different directions.
  const baseBearing = Math.random() * 360

  // 3 items very close (right outside collect radius).
  for (let i = 0; i < 3; i++) {
    const bearing = (baseBearing + i * 120 + Math.random() * 40) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 22, maxDistance: 40, bearing }))
  }

  // 4 items short walk away.
  for (let i = 3; i < 7; i++) {
    const bearing = (baseBearing + i * 90 + Math.random() * 30) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 40, maxDistance: 75, bearing }))
  }

  // Rest — medium range for exploration.
  for (let i = 7; i < total; i++) {
    const bearing = (baseBearing + (i * 360) / total + Math.random() * 30) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 55, maxDistance: 140, bearing }))
  }

  return dedupeByProximity(items, 14)
}

/** Backwards-compatible alias used across the app. */
export function generateCargoItems(center: LatLng, count = 14): CargoItem[] {
  return generateCargoField(center, count)
}

/** Test/fallback field: dense, very close cargo for indoor or weak-GPS play. */
export function generateNearbyTestCargoItems(center: LatLng, count = 10): CargoItem[] {
  const items: CargoItem[] = []
  const baseBearing = Math.random() * 360
  for (let i = 0; i < count; i++) {
    const bearing = (baseBearing + (i * 360) / count + Math.random() * 20) % 360
    const minDistance = i < 3 ? 8 : 18
    const maxDistance = i < 3 ? 22 : 55
    items.push(generateCargoAroundPlayer(center, { minDistance, maxDistance, bearing }))
  }
  return dedupeByProximity(items, 8)
}

const MAX_RANGE_METERS = 800
const MIN_ACTIVE = 10
const TARGET_ACTIVE = 12
const MAX_TOTAL = 24
const NEAR_RANGE = 150
const MIN_NEAR = 3

/**
 * Keep the world alive around the player:
 * - removes uncollected cargo farther than 800 m,
 * - refills until at least the target number of active objects exist,
 * - guarantees a minimum of nearby objects within walking distance.
 *
 * Returns a new array when changes were made, otherwise the same reference.
 */
export function ensureMinimumCargoNearby(
  items: CargoItem[],
  center: LatLng,
  options: { testMode?: boolean; eventBoundCenter?: LatLng; eventBoundRadius?: number } = {}
): CargoItem[] {
  const { testMode = false, eventBoundCenter, eventBoundRadius } = options
  const spawnCenter = eventBoundCenter ?? center
  const maxSpawnDist = eventBoundRadius ?? (testMode ? 60 : 300)
  const minSpawnDist = testMode ? 12 : (eventBoundRadius ? Math.min(60, eventBoundRadius * 0.4) : 70)
  const minNearDist  = testMode ? 8  : (eventBoundRadius ? Math.min(40, eventBoundRadius * 0.3) : 55)
  const maxNearDist  = testMode ? 30 : (eventBoundRadius ? Math.min(maxSpawnDist * 0.9, 130) : 130)
  let changed = false

  // 1. Drop far-away uncollected cargo (keeps map relevant to player).
  let next = items.filter((item) => {
    if (item.collected) return getDistanceMeters(center, item.position) <= MAX_RANGE_METERS * 1.5
    const keep = getDistanceMeters(center, item.position) <= MAX_RANGE_METERS
    if (!keep) changed = true
    return keep
  })

  const activeCount = () => next.filter((i) => !i.collected).length
  const nearCount = () =>
    next.filter((i) => !i.collected && getDistanceMeters(center, i.position) <= NEAR_RANGE).length

  // 2. Refill until we are back at a lively amount of cargo.
  let guard = 0
  while (activeCount() < (activeCount() < MIN_ACTIVE ? TARGET_ACTIVE : MIN_ACTIVE) && next.length < MAX_TOTAL && guard < 60) {
    next.push(
      generateCargoAroundPlayer(spawnCenter, {
        minDistance: minSpawnDist,
        maxDistance: maxSpawnDist,
      })
    )
    changed = true
    guard++
  }

  // 3. Guarantee close objects so the player always has something reachable.
  guard = 0
  while (nearCount() < MIN_NEAR && next.length < MAX_TOTAL && guard < 30) {
    next.push(
      generateCargoAroundPlayer(spawnCenter, {
        minDistance: minNearDist,
        maxDistance: maxNearDist,
      })
    )
    changed = true
    guard++
  }

  return changed ? next : items
}

/**
 * Spawn fresh cargo ahead of / around a moving player so the world keeps
 * feeling populated as they walk.
 */
export function spawnAheadOfPlayer(center: LatLng, headingDeg: number, amount = 2): CargoItem[] {
  const out: CargoItem[] = []
  for (let i = 0; i < amount; i++) {
    const spread = headingDeg + (Math.random() * 120 - 60)
    out.push(generateCargoAroundPlayer(center, { minDistance: 120, maxDistance: 300, bearing: spread }))
  }
  return out
}

/**
 * Generate a cargo field bounded within an event venue.
 * All cargo spawns within venue.spawnRadius of venue.center.
 */
export function generateEventCargoField(venue: EventVenue): CargoItem[] {
  const { center, spawnRadius } = venue
  const items: CargoItem[] = []
  const baseBearing = Math.random() * 360
  const total = 14

  // Close items: just outside collect radius
  for (let i = 0; i < 3; i++) {
    const bearing = (baseBearing + i * 120 + Math.random() * 40) % 360
    items.push(generateCargoAroundPlayer(center, {
      minDistance: 28,
      maxDistance: Math.min(52, spawnRadius * 0.38),
      bearing,
    }))
  }

  // Mid range
  for (let i = 3; i < 8; i++) {
    const bearing = (baseBearing + i * 45 + Math.random() * 30) % 360
    items.push(generateCargoAroundPlayer(center, {
      minDistance: 50,
      maxDistance: Math.min(spawnRadius * 0.7, 95),
      bearing,
    }))
  }

  // Full venue range
  for (let i = 8; i < total; i++) {
    const bearing = (baseBearing + (i * 360) / total + Math.random() * 20) % 360
    items.push(generateCargoAroundPlayer(center, {
      minDistance: 55,
      maxDistance: spawnRadius,
      bearing,
    }))
  }

  return dedupeByProximity(items, 14)
}

/**
 * Async safety filter: removes cargo that lies on/inside danger zones —
 *   • buildings (must not require walking inside)
 *   • water (rivers, lakes, sea)
 *   • significant roads (motorway → residential/service) — buffered
 *   • railways / tram lines — buffered
 * Replaces removed items with safe candidates. Fails open — if Overpass
 * is unavailable the original array is returned unchanged.
 */
export async function applySafetyFilter(
  items: CargoItem[],
  center: LatLng,
  maxRadius: number
): Promise<CargoItem[]> {
  if (items.length === 0) return items

  // Per-type buffer (metres) — how far from a linear hazard cargo must sit
  const ROAD_BUFFER = {
    motorway: 18, trunk: 15,
    primary: 10, secondary: 8, tertiary: 7,
    unclassified: 5, residential: 5, service: 4,
    motorway_link: 12, trunk_link: 10, primary_link: 8,
    secondary_link: 6, tertiary_link: 5,
  } as const
  const RAIL_BUFFER = 12
  const BUILDING_PAD = 2   // metres of padding around building polygon
  const WATER_PAD    = 3

  const lats = items.map(i => i.position.lat)
  const lngs = items.map(i => i.position.lng)
  const south = (Math.min(...lats) - 0.001).toFixed(6)
  const west  = (Math.min(...lngs) - 0.001).toFixed(6)
  const north = (Math.max(...lats) + 0.001).toFixed(6)
  const east  = (Math.max(...lngs) + 0.001).toFixed(6)
  const bbox = south + ',' + west + ',' + north + ',' + east

  const query =
    '[out:json][timeout:20];' +
    '(' +
      // Roads (any drivable street)
      'way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](' + bbox + ');' +
      // Rail
      'way["railway"~"^(rail|tram|light_rail|subway|narrow_gauge)$"](' + bbox + ');' +
      // Buildings
      'way["building"](' + bbox + ');' +
      // Water
      'way["natural"="water"](' + bbox + ');' +
      'way["waterway"~"^(river|stream|canal)$"](' + bbox + ');' +
    ');out geom tags;'

  type OverpassWay = {
    tags?: Record<string, string>
    geometry?: Array<{ lat: number; lon: number }>
  }

  let elements: OverpassWay[] = []
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 15000)
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    })
    window.clearTimeout(timer)
    if (!resp.ok) return items
    const data = await resp.json() as { elements?: OverpassWay[] }
    elements = (data.elements ?? []).filter(el => Array.isArray(el.geometry) && el.geometry.length > 0)
  } catch {
    return items // fail open when offline
  }

  if (elements.length === 0) return items

  // Classify elements into line hazards (with buffer) and polygon hazards
  const lineHazards: Array<{ nodes: Array<{ lat: number; lon: number }>; buffer: number }> = []
  const polygonHazards: Array<{ ring: Array<{ lat: number; lon: number }>; padM: number }> = []

  for (const el of elements) {
    const tags = el.tags ?? {}
    const geom = el.geometry!

    // Building polygon (closed way)
    if (tags.building) {
      polygonHazards.push({ ring: geom, padM: BUILDING_PAD })
      continue
    }
    // Water polygon (natural=water is closed)
    if (tags.natural === 'water') {
      polygonHazards.push({ ring: geom, padM: WATER_PAD })
      continue
    }
    // Waterway (line — rivers, streams, canals)
    if (tags.waterway) {
      lineHazards.push({ nodes: geom, buffer: WATER_PAD + 3 })
      continue
    }
    // Railway
    if (tags.railway) {
      lineHazards.push({ nodes: geom, buffer: RAIL_BUFFER })
      continue
    }
    // Highway
    if (tags.highway) {
      const b = (ROAD_BUFFER as Record<string, number>)[tags.highway] ?? 6
      lineHazards.push({ nodes: geom, buffer: b })
      continue
    }
  }

  // Point-to-segment distance (flat-earth approximation, fine for < 1 km)
  function ptSegDist(p: LatLng, a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    const dlat = b.lat - a.lat
    const dlng = b.lon - a.lon
    const lenSq = dlat * dlat + dlng * dlng
    if (lenSq === 0) return getDistanceMeters(p, { lat: a.lat, lng: a.lon })
    const t = Math.max(0, Math.min(1,
      ((p.lat - a.lat) * dlat + (p.lng - a.lon) * dlng) / lenSq
    ))
    return getDistanceMeters(p, { lat: a.lat + t * dlat, lng: a.lon + t * dlng })
  }

  // Ray casting point-in-polygon (lon = x, lat = y)
  function pointInRing(p: LatLng, ring: Array<{ lat: number; lon: number }>): boolean {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i].lon, yi = ring[i].lat
      const xj = ring[j].lon, yj = ring[j].lat
      const intersect = ((yi > p.lat) !== (yj > p.lat)) &&
        (p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi + 1e-15) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  function isSafe(pos: LatLng): boolean {
    // Inside a polygon hazard? unsafe
    for (const poly of polygonHazards) {
      if (pointInRing(pos, poly.ring)) return false
      // Even if not inside, keep a small pad from ring edge
      if (poly.padM > 0) {
        for (let i = 0; i < poly.ring.length; i++) {
          const a = poly.ring[i]
          const b = poly.ring[(i + 1) % poly.ring.length]
          if (ptSegDist(pos, a, b) < poly.padM) return false
        }
      }
    }
    // Too close to a line hazard?
    for (const line of lineHazards) {
      for (let i = 0; i < line.nodes.length; i++) {
        if (i === 0) {
          if (getDistanceMeters(pos, { lat: line.nodes[0].lat, lng: line.nodes[0].lon }) < line.buffer) return false
        } else {
          if (ptSegDist(pos, line.nodes[i - 1], line.nodes[i]) < line.buffer) return false
        }
      }
    }
    return true
  }

  const safe = items.filter(item => isSafe(item.position))
  const toReplace = items.length - safe.length
  if (toReplace === 0) return items

  // Generate replacement candidates and keep the safe ones
  const candidates: CargoItem[] = []
  for (let i = 0; i < toReplace * 10; i++) {
    candidates.push(generateCargoAroundPlayer(center, { minDistance: 22, maxDistance: maxRadius }))
  }
  const safeReplacements = candidates.filter(c => isSafe(c.position)).slice(0, toReplace)

  return dedupeByProximity([...safe, ...safeReplacements], 14)
}

// ─── Internal ────────────────────────────────────────────────────────────
export function dedupeByProximity(items: CargoItem[], minGapMeters: number): CargoItem[] {
  const kept: CargoItem[] = []
  for (const item of items) {
    if (kept.some((k) => getDistanceMeters(k.position, item.position) < minGapMeters)) continue
    kept.push(item)
  }
  return kept
}
