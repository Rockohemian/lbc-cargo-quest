export type GameScreen = 'splash' | 'map' | 'collect' | 'loading' | 'delivery' | 'result' | 'profile' | 'garage'

export interface LatLng { lat: number; lng: number }

export type CargoRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export type WeightClass = 'light' | 'medium' | 'heavy'

export interface CargoLoad {
  cols: number          // footprint width in trailer grid (front→back)
  rows: number          // footprint height in trailer grid (floor→ceiling)
  weightClass: WeightClass
  stackable: boolean    // can other items stack on top
  fragile: boolean      // damaged more easily during transport
}

export interface CargoType {
  id: string
  name: string
  emoji: string
  color: string
  color2: string
  weight: number    // kg
  volume: number    // m³
  value: number     // SEK
  ecoImpact: number // 0–10
  rarity: CargoRarity
  xpReward: number
  description: string
  loadingTip: string
  load: CargoLoad
}

export interface CargoItem {
  id: string
  type: CargoType
  position: LatLng
  collected: boolean
  spawnTime: number
}

export interface Player {
  name: string
  level: number
  xp: number
  xpToNext: number
  rank: string
  totalDeliveries: number
  company: string
}

export interface Badge {
  id: string
  icon: string
  title: string
  description: string
  color: string
}

// ─── Load planning ──────────────────────────────────────────────────────
export interface PlacedItem {
  uid: string          // unique placement id
  type: CargoType
  col: number          // top-left column
  row: number          // top-left row
  cols: number         // current footprint (after rotation)
  rows: number
  rotated: boolean
}

export interface SecuringState {
  straps: number       // number of tension straps applied
  net: boolean         // rear load net
  divider: boolean     // intermediate wall
}

export interface LoadMetrics {
  fillPercent: number      // lastutnyttjande
  weightBalance: number    // viktfördelning (0–100, 100 = perfekt)
  cogHeight: number        // tyngdpunktshöjd (0–100, lägre = bättre stabilitet)
  frontBias: number        // -100 (bak) .. +100 (fram), 0 = balanserat
  securing: number         // lastsäkring 0–100
  feedback: string[]       // realtidsfeedback
}

export interface LoadPlan {
  items: PlacedItem[]
  securing: SecuringState
  metrics: LoadMetrics
}

// ─── Result ─────────────────────────────────────────────────────────────
export interface RoundResult {
  cargoCount: number
  fillPercent: number       // lastutnyttjande %
  weightBalance: number     // viktfördelning %
  securing: number          // lastsäkring %
  cargoDamage: number       // godsskador %
  ecoScore: number          // 0–100
  safetyScore: number       // 0–100
  qualityScore: number      // 0–100
  totalXP: number
  totalPoints: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  badges: Badge[]
  summary: string           // professionell sammanfattning
}

export * from './garage'
