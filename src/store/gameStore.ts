import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GameScreen, CargoType, CargoItem, Player, LatLng, RoundResult, LoadPlan,
  GarageState, EquippedParts, CrateTier, PartCategory, TruckPart, UnlockNotice,
} from '../types'
import { RANKS } from '../data/cargoTypes'
import {
  ACHIEVEMENTS, GARAGE_UNLOCK_POINTS,
  crateForLevel, rollCratePart,
} from '../data/garageParts'

interface GameState {
  screen: GameScreen
  testMode: boolean
  eventMode: boolean
  player: Player
  playerPosition: LatLng
  cargoItems: CargoItem[]
  inventory: CargoType[]
  selectedCargo: CargoItem | null
  loadPlan: LoadPlan | null
  lastResult: RoundResult | null
  garage: GarageState

  setScreen: (s: GameScreen) => void
  setTestMode: (enabled: boolean) => void
  setEventMode: (enabled: boolean) => void
  setPlayerName: (n: string) => void
  setPlayerPosition: (p: LatLng) => void
  setCargoItems: (items: CargoItem[]) => void
  selectCargo: (item: CargoItem | null) => void
  collectCargo: (id: string) => void
  setLoadPlan: (plan: LoadPlan) => void
  finishRound: (result: RoundResult) => void
  resetRound: () => void
  openCrate: (tier: CrateTier) => TruckPart
  equipPart: (category: PartCategory, partId: string) => void
  unequipPart: (category: PartCategory) => void
  dismissUnlockNotice: () => void
  testUnlockGarage: () => void
}

const DEFAULT_GARAGE: GarageState = {
  unlocked: false,
  ownedPartIds: [],
  equipped: {},
  pendingCrates: [],
  openedCrateCount: 0,
  achievementsUnlocked: [],
  stats: { lifetimePoints: 0, ecoPointsTotal: 0, damageFreeDeliveries: 0, highSecuringCount: 0 },
  unlockQueue: [],
}

const DEFAULT_PLAYER: Player = {
  name: '', level: 1, xp: 0, xpToNext: 500, rank: 'Transportelev',
  totalDeliveries: 0, company: 'LBC Frakt i Värmland',
}

const DEFAULT_POS: LatLng = { lat: 59.3793, lng: 13.5036 } // LBC HQ Karlstad

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'splash',
      testMode: false,
      eventMode: false,
      player: DEFAULT_PLAYER,
      playerPosition: DEFAULT_POS,
      cargoItems: [],
      inventory: [],
      selectedCargo: null,
      loadPlan: null,
      lastResult: null,
      garage: DEFAULT_GARAGE,

      setScreen: (screen) => set({ screen }),
      setTestMode: (testMode) => set({ testMode }),
      setEventMode: (eventMode) => set({ eventMode }),
      setPlayerName: (name) => set((s) => ({ player: { ...s.player, name } })),
      setPlayerPosition: (playerPosition) => set({ playerPosition }),
      setCargoItems: (cargoItems) => set({ cargoItems }),
      selectCargo: (selectedCargo) => set({ selectedCargo }),

      collectCargo: (id) => set((s) => {
        const item = s.cargoItems.find(i => i.id === id)
        if (!item) return s
        return {
          cargoItems: s.cargoItems.map(i => i.id === id ? { ...i, collected: true } : i),
          inventory: [...s.inventory, item.type],
          selectedCargo: null,
        }
      }),

      setLoadPlan: (loadPlan) => set({ loadPlan }),

      finishRound: (result) => {
        const s = get()
        const prevLevel = s.player.level
        let xp = s.player.xp + result.totalXP
        let level = s.player.level
        let xpToNext = s.player.xpToNext
        while (xp >= xpToNext) { xp -= xpToNext; level++; xpToNext = Math.floor(500 * Math.pow(1.3, level - 1)) }
        const rank = RANKS[Math.min(level - 1, RANKS.length - 1)]

        // ── Garage progression ──────────────────────────────────────────
        const g = s.garage
        const stats = {
          lifetimePoints: g.stats.lifetimePoints + result.totalPoints,
          ecoPointsTotal: g.stats.ecoPointsTotal + result.ecoScore,
          damageFreeDeliveries: g.stats.damageFreeDeliveries + (result.cargoDamage === 0 ? 1 : 0),
          highSecuringCount: g.stats.highSecuringCount + (result.securing >= 95 ? 1 : 0),
        }
        const ownedPartIds = [...g.ownedPartIds]
        const achievementsUnlocked = [...g.achievementsUnlocked]
        const pendingCrates = [...g.pendingCrates]
        const unlockQueue: UnlockNotice[] = [...g.unlockQueue]
        let unlocked = g.unlocked

        // Unlock the garage at the points threshold.
        if (!unlocked && stats.lifetimePoints >= GARAGE_UNLOCK_POINTS) {
          unlocked = true
          unlockQueue.push({ kind: 'garage' })
          pendingCrates.push('gold') // welcome crate
        }

        // Reward a crate for every level gained (only once unlocked).
        if (unlocked && level > prevLevel) {
          for (let l = prevLevel + 1; l <= level; l++) pendingCrates.push(crateForLevel(l))
        }

        // Evaluate achievements.
        if (unlocked) {
          const metricValue = (m: string) =>
            m === 'level' ? level
            : m === 'damageFreeDeliveries' ? stats.damageFreeDeliveries
            : m === 'ecoPointsTotal' ? stats.ecoPointsTotal
            : stats.highSecuringCount
          for (const a of ACHIEVEMENTS) {
            if (achievementsUnlocked.includes(a.id)) continue
            if (metricValue(a.metric) >= a.goal) {
              achievementsUnlocked.push(a.id)
              if (!ownedPartIds.includes(a.rewardPartId)) ownedPartIds.push(a.rewardPartId)
              unlockQueue.push({ kind: 'achievement', id: a.id })
            }
          }
        }

        set({
          lastResult: result,
          player: { ...s.player, xp, level, xpToNext, rank, totalDeliveries: s.player.totalDeliveries + 1 },
          garage: { ...g, unlocked, ownedPartIds, achievementsUnlocked, pendingCrates, stats, unlockQueue },
        })
      },

      resetRound: () => set({
        inventory: [], selectedCargo: null, loadPlan: null,
      }),

      openCrate: (tier) => {
        const g = get().garage
        const part = rollCratePart(tier, g.ownedPartIds)
        const idx = g.pendingCrates.indexOf(tier)
        const pendingCrates = idx >= 0
          ? [...g.pendingCrates.slice(0, idx), ...g.pendingCrates.slice(idx + 1)]
          : g.pendingCrates
        const ownedPartIds = g.ownedPartIds.includes(part.id)
          ? g.ownedPartIds
          : [...g.ownedPartIds, part.id]
        set({ garage: { ...g, pendingCrates, ownedPartIds, openedCrateCount: g.openedCrateCount + 1 } })
        return part
      },

      equipPart: (category, partId) => set((s) => {
        if (!s.garage.ownedPartIds.includes(partId)) return s
        const equipped: EquippedParts = { ...s.garage.equipped, [category]: partId }
        return { garage: { ...s.garage, equipped } }
      }),

      unequipPart: (category) => set((s) => {
        const equipped: EquippedParts = { ...s.garage.equipped }
        delete equipped[category]
        return { garage: { ...s.garage, equipped } }
      }),

      dismissUnlockNotice: () => set((s) => ({
        garage: { ...s.garage, unlockQueue: s.garage.unlockQueue.slice(1) },
      })),

      testUnlockGarage: () => {
        const s = get()
        if (!s.garage.unlocked) {
          // First time: unlock garage + add welcome crate
          set({
            garage: {
              ...s.garage,
              unlocked: true,
              stats: { ...s.garage.stats, lifetimePoints: GARAGE_UNLOCK_POINTS },
              pendingCrates: [...s.garage.pendingCrates, 'gold'],
              unlockQueue: [...s.garage.unlockQueue, { kind: 'garage' }],
            },
          })
        } else {
          // Already unlocked: just add another test crate
          set({
            garage: {
              ...s.garage,
              pendingCrates: [...s.garage.pendingCrates, 'gold'],
            },
          })
        }
      },
    }),
    {
      name: 'lcq-v1',
      partialize: (s) => ({ player: s.player, testMode: s.testMode, garage: s.garage }),
    }
  )
)
