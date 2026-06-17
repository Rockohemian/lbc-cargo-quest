// ─── Garage & truck customisation ──────────────────────────────────────────

export type PartCategory = 'front' | 'roof' | 'side' | 'wheels' | 'interior' | 'decor'

export type PartRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CrateTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary'

/** How a part is obtained. Achievement/level parts never drop from crates. */
export type PartSource = 'crate' | 'achievement' | 'level'

export interface TruckPart {
  id: string
  category: PartCategory
  name: string
  rarity: PartRarity
  icon: string
  description: string
  source: PartSource
  /** Short note on how it is earned (shown when locked). */
  unlockHint: string
}

/** One equipped part id per visual slot. */
export type EquippedParts = Partial<Record<PartCategory, string>>

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rewardPartId: string
  goal: number
  /** Which lifetime stat is measured against the goal. */
  metric: 'damageFreeDeliveries' | 'ecoPointsTotal' | 'highSecuringCount' | 'level'
}

/** A queued celebratory notice shown by the unlock overlay. */
export type UnlockNotice =
  | { kind: 'garage' }
  | { kind: 'achievement'; id: string }

export interface GarageStats {
  lifetimePoints: number
  ecoPointsTotal: number
  damageFreeDeliveries: number
  highSecuringCount: number
}

export interface GarageState {
  unlocked: boolean
  ownedPartIds: string[]
  equipped: EquippedParts
  pendingCrates: CrateTier[]
  openedCrateCount: number
  achievementsUnlocked: string[]
  stats: GarageStats
  unlockQueue: UnlockNotice[]
}
