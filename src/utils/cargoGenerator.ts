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
  const total = count ?? 12 + Math.floor(Math.random() * 9) // 12–20
  const items: CargoItem[] = []

  // Spread bearings so objects land in different directions.
  const baseBearing = Math.random() * 360

  // 2 items at short walking distance (just outside collect radius).
  for (let i = 0; i < 2; i++) {
    const bearing = (baseBearing + i * 180 + Math.random() * 60) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 28, maxDistance: 45, bearing }))
  }

  // 3 items within easy walking distance.
  for (let i = 2; i < 5; i++) {
    const bearing = (baseBearing + i * 120 + Math.random() * 40) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 50, maxDistance: 100, bearing }))
  }

  // Remaining objects across the full radius.
  for (let i = 5; i < total; i++) {
    const bearing = (baseBearing + (i * 360) / total + Math.random() * 30) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 60, maxDistance: 300, bearing }))
  }

  return dedupeByProximity(items, 18)
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
 * Async safety filter: removes cargo that is too close to railways or
 * major motorways (queried from Overpass API). Replaces removed items
 * with safe alternatives. Fails open — if Overpass is unavailable the
 * original array is returned unchanged.
 */
export async function applySafetyFilter(
  items: CargoItem[],
  center: LatLng,
  maxRadius: number
): Promise<CargoItem[]> {
  if (items.length === 0) return items
  const BUFFER_M = 12

  const lats = items.map(i => i.position.lat)
  const lngs = items.map(i => i.position.lng)
  const south = (Math.min(...lats) - 0.001).toFixed(6)
  const west  = (Math.min(...lngs) - 0.001).toFixed(6)
  const north = (Math.max(...lats) + 0.001).toFixed(6)
  const east  = (Math.max(...lngs) + 0.001).toFixed(6)

  const query =
    '[out:json][timeout:12];' +
    '(' +
    'way["railway"~"^(rail|tram|light_rail|subway|narrow_gauge)$"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    'way["highway"~"^(motorway|trunk|motorway_link|trunk_link)$"](' + south + ',' + west + ',' + north + ',' + east + ');' +
    ');out geom;'

  let dangerNodes: Array<Array<{ lat: number; lon: number }>> = []

  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 10000)
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    })
    window.clearTimeout(timer)
    if (!resp.ok) return items
    const data = await resp.json() as { elements?: Array<{ geometry?: Array<{ lat: number; lon: number }> }> }
    dangerNodes = (data.elements ?? [])
      .filter(el => Array.isArray(el.geometry) && el.geometry.length > 0)
      .map(el => el.geometry!)
  } catch {
    return items // fail open: keep all items when offline
  }

  if (dangerNodes.length === 0) return items

  // Point-to-segment distance (flat-earth approximation, fine for <1 km)
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

  function isSafe(pos: LatLng): boolean {
    return !dangerNodes.some(nodes =>
      nodes.some((node, idx) => {
        if (idx === 0) return getDistanceMeters(pos, { lat: node.lat, lng: node.lon }) < BUFFER_M
        return ptSegDist(pos, nodes[idx - 1], node) < BUFFER_M
      })
    )
  }

  const safe = items.filter(item => isSafe(item.position))
  const toReplace = items.length - safe.length
  if (toReplace === 0) return items

  // Batch-generate replacement candidates and keep the safe ones
  const candidates: CargoItem[] = []
  for (let i = 0; i < toReplace * 6; i++) {
    candidates.push(generateCargoAroundPlayer(center, { minDistance: 28, maxDistance: maxRadius }))
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
