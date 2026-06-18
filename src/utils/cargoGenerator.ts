import type { CargoItem, CargoType, LatLng } from '../types'
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

  // 2 items right next to the player (immediately collectible).
  for (let i = 0; i < 2; i++) {
    const bearing = (baseBearing + i * 180 + Math.random() * 60) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 8, maxDistance: 20, bearing }))
  }

  // 3 items within easy walking distance.
  for (let i = 2; i < 5; i++) {
    const bearing = (baseBearing + i * 120 + Math.random() * 40) % 360
    items.push(generateCargoAroundPlayer(center, { minDistance: 25, maxDistance: 80, bearing }))
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
  options: { testMode?: boolean } = {}
): CargoItem[] {
  const { testMode = false } = options
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
      generateCargoAroundPlayer(center, {
        minDistance: testMode ? 12 : 70,
        maxDistance: testMode ? 60 : 300,
      })
    )
    changed = true
    guard++
  }

  // 3. Guarantee close objects so the player always has something reachable.
  guard = 0
  while (nearCount() < MIN_NEAR && next.length < MAX_TOTAL && guard < 30) {
    next.push(
      generateCargoAroundPlayer(center, {
        minDistance: testMode ? 8 : 55,
        maxDistance: testMode ? 30 : 130,
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

// ─── Internal ────────────────────────────────────────────────────────────
function dedupeByProximity(items: CargoItem[], minGapMeters: number): CargoItem[] {
  const kept: CargoItem[] = []
  for (const item of items) {
    if (kept.some((k) => getDistanceMeters(k.position, item.position) < minGapMeters)) continue
    kept.push(item)
  }
  return kept
}
