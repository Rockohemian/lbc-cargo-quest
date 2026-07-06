import type { TruckPart, PartCategory, PartRarity, CrateTier, Achievement } from '../types'

// ─── Rarity styling ─────────────────────────────────────────────────────────
export const PART_RARITY_COLORS: Record<PartRarity, string> = {
  common: '#9EA3A5', uncommon: '#00a34c', rare: '#2a8ae0', epic: '#9b30f0', legendary: '#f5a623',
}
export const PART_RARITY_LABELS: Record<PartRarity, string> = {
  common: 'Vanlig', uncommon: 'Ovanlig', rare: 'Sällsynt', epic: 'Episk', legendary: 'Legendarisk',
}
export const PART_RARITY_ORDER: PartRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export const CATEGORY_LABELS: Record<PartCategory, string> = {
  front: 'Front', roof: 'Tak', side: 'Sidor', wheels: 'Hjul', interior: 'Interiör', decor: 'Dekoration',
}
export const CATEGORY_ICONS: Record<PartCategory, string> = {
  front: '🛡️', roof: '💡', side: '📐', wheels: '🛞', interior: '🎛️', decor: '✨',
}
export const CATEGORY_ORDER: PartCategory[] = ['front', 'roof', 'side', 'wheels', 'interior', 'decor']

// ─── Part catalogue ─────────────────────────────────────────────────────────
export const TRUCK_PARTS: TruckPart[] = [
  // Front
  { id: 'front_algstaket',    category: 'front', name: 'Älgstaket',            rarity: 'common',    icon: '🦌', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Robust älgstaket i stål som skyddar fronten.' },
  { id: 'front_frontbage',    category: 'front', name: 'Frontbåge',            rarity: 'common',    icon: '🛡️', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Klassisk frontbåge för tuff look.' },
  { id: 'front_extraljus',    category: 'front', name: 'Extraljuspaket',       rarity: 'uncommon',  icon: '🔆', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Extra strålkastare för mörka vägar.' },
  { id: 'front_led_ramp',     category: 'front', name: 'LED-ramp',             rarity: 'uncommon',  icon: '💡', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Bländstark LED-ramp över fronten.' },
  { id: 'front_krom_bage',    category: 'front', name: 'Kromad frontbåge',     rarity: 'rare',      icon: '✨', source: 'crate',       unlockHint: 'Hittas i guldlådor+', description: 'Polerad kromad frontbåge som blänker.' },
  { id: 'front_dubbla_led',   category: 'front', name: 'Dubbla LED-ramper',    rarity: 'epic',      icon: '🌟', source: 'crate',       unlockHint: 'Hittas i diamantlådor', description: 'Två fulla LED-ramper – lyser upp natten.' },
  { id: 'front_algstaket_legend', category: 'front', name: 'Legendariskt älgstaket', rarity: 'legendary', icon: '🦌', source: 'achievement', unlockHint: 'Prestation: Säkerhetsmästare', description: 'Handsmitt legendariskt älgstaket. Endast för de skickligaste.' },

  // Roof
  { id: 'roof_takbage',       category: 'roof', name: 'Takbåge',               rarity: 'common',    icon: '🔩', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Takbåge i borstat stål.' },
  { id: 'roof_takljus',       category: 'roof', name: 'Takljus',               rarity: 'uncommon',  icon: '💡', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Rad av positionsljus på taket.' },
  { id: 'roof_varningsljus',  category: 'roof', name: 'Varningsljus',          rarity: 'uncommon',  icon: '🟠', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Roterande varningsljus för specialtransport.' },
  { id: 'roof_arbetsbelysning', category: 'roof', name: 'Arbetsbelysning',     rarity: 'rare',      icon: '🔦', source: 'crate',       unlockHint: 'Hittas i guldlådor+', description: 'Kraftig arbetsbelysning för lastning i mörker.' },

  // Sides
  { id: 'side_sidokjolar',    category: 'side', name: 'Sidokjolar',            rarity: 'common',    icon: '📐', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Aerodynamiska sidokjolar som sänker bränsleåtgången.' },
  { id: 'side_dekorlister',   category: 'side', name: 'Dekorlister',           rarity: 'common',    icon: '➖', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Eleganta dekorlister längs sidan.' },
  { id: 'side_alu_skydd',     category: 'side', name: 'Aluminiumskydd',        rarity: 'uncommon',  icon: '🛡️', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Slittåligt aluminiumskydd på chassit.' },
  { id: 'side_krom_kjolar',   category: 'side', name: 'Kromade sidokjolar',    rarity: 'epic',      icon: '✨', source: 'achievement', unlockHint: 'Prestation: Lastsäkringsexpert', description: 'Spegelblanka kromade sidokjolar.' },

  // Wheels
  { id: 'wheels_alu',         category: 'wheels', name: 'Aluminiumfälgar',     rarity: 'common',    icon: '🛞', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Lätta aluminiumfälgar.' },
  { id: 'wheels_svarta',      category: 'wheels', name: 'Svarta sportfälgar',  rarity: 'uncommon',  icon: '⚫', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Mattsvarta sportfälgar.' },
  { id: 'wheels_polerade',    category: 'wheels', name: 'Polerade aluminiumfälgar', rarity: 'rare', icon: '✨', source: 'crate',      unlockHint: 'Hittas i guldlådor+', description: 'Högglanspolerade fälgar som speglar omgivningen.' },
  { id: 'wheels_premium',     category: 'wheels', name: 'Premiumfälgar',       rarity: 'epic',      icon: '💠', source: 'crate',       unlockHint: 'Hittas i diamantlådor', description: 'Exklusiva premiumfälgar i flerekersdesign.' },

  // Interior
  { id: 'int_bakelitratt',    category: 'interior', name: 'Bakelitratt',       rarity: 'common',    icon: '🎛️', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Klassisk bakelitratt.' },
  { id: 'int_traratt',        category: 'interior', name: 'Träratt',           rarity: 'uncommon',  icon: '🪵', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Ratt med inläggningar i äkta trä.' },
  { id: 'int_klassisk',       category: 'interior', name: 'Klassisk chaufförsratt', rarity: 'rare', icon: '🕹️', source: 'crate',     unlockHint: 'Hittas i guldlådor+', description: 'Smal klassisk chaufförsratt.' },
  { id: 'int_premium',        category: 'interior', name: 'Premiumratt',       rarity: 'epic',      icon: '💎', source: 'crate',       unlockHint: 'Hittas i diamantlådor', description: 'Läderklädd premiumratt med kromdetaljer.' },

  // Decor
  { id: 'decor_dekalpaket',   category: 'decor', name: 'Dekalpaket',           rarity: 'common',    icon: '🏷️', source: 'crate',       unlockHint: 'Hittas i lådor', description: 'Grundläggande dekalpaket.' },
  { id: 'decor_lbc',          category: 'decor', name: 'LBC-märken',           rarity: 'uncommon',  icon: '🟢', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Officiella LBC-märken.' },
  { id: 'decor_miljo',        category: 'decor', name: 'Miljömärken',          rarity: 'uncommon',  icon: '🌿', source: 'crate',       unlockHint: 'Hittas i silverlådor+', description: 'Märken för hållbar transport.' },
  { id: 'decor_sakerhet',     category: 'decor', name: 'Säkerhetsmärken',      rarity: 'rare',      icon: '⚠️', source: 'crate',       unlockHint: 'Hittas i guldlådor+', description: 'Certifierade säkerhetsmärken.' },
  { id: 'decor_event',        category: 'decor', name: 'Specialevent-dekaler', rarity: 'legendary', icon: '🎉', source: 'crate',       unlockHint: 'Endast legendariska LBC-lådor', description: 'Limiterade event-dekaler.' },
  { id: 'decor_gront_paket',  category: 'decor', name: 'Grönt miljöpaket',     rarity: 'epic',      icon: '🌱', source: 'achievement', unlockHint: 'Prestation: Eco Driver', description: 'Komplett grön dekoruppsättning för miljöhjältar.' },
  { id: 'decor_lbc_legend',   category: 'decor', name: 'LBC Legend-design',    rarity: 'legendary', icon: '👑', source: 'achievement', unlockHint: 'Prestation: Cargo Legend', description: 'Exklusiv guldfoliering – endast för en sann LBC Legend.' },
]

export const PART_BY_ID: Record<string, TruckPart> = Object.fromEntries(TRUCK_PARTS.map(p => [p.id, p]))

// ─── Cargo crates ───────────────────────────────────────────────────────────
export interface CrateMeta {
  tier: CrateTier
  name: string
  icon: string
  color: string
  glow: string
  /** drop weights per rarity */
  weights: Record<PartRarity, number>
}

export const CRATES: Record<CrateTier, CrateMeta> = {
  bronze:    { tier: 'bronze',    name: 'Bronslåda',          icon: '🟫', color: '#cd7f32', glow: 'rgba(205,127,50,.55)',  weights: { common: 70, uncommon: 25, rare: 5,  epic: 0,  legendary: 0 } },
  silver:    { tier: 'silver',    name: 'Silverlåda',         icon: '⬜', color: '#c0c8d0', glow: 'rgba(192,200,208,.55)', weights: { common: 45, uncommon: 35, rare: 17, epic: 3,  legendary: 0 } },
  gold:      { tier: 'gold',      name: 'Guldlåda',           icon: '🟨', color: '#f5c518', glow: 'rgba(245,197,24,.6)',   weights: { common: 18, uncommon: 35, rare: 32, epic: 14, legendary: 1 } },
  diamond:   { tier: 'diamond',   name: 'Diamantlåda',        icon: '💎', color: '#5fd0e0', glow: 'rgba(95,208,224,.6)',  weights: { common: 0,  uncommon: 24, rare: 36, epic: 30, legendary: 10 } },
  legendary: { tier: 'legendary', name: 'Legendarisk LBC-låda', icon: '👑', color: '#f5a623', glow: 'rgba(245,166,35,.7)',  weights: { common: 0,  uncommon: 0,  rare: 25, epic: 45, legendary: 30 } },
}

export const CRATE_ORDER: CrateTier[] = ['bronze', 'silver', 'gold', 'diamond', 'legendary']

/** Pick a crate tier based on the player's level (used for level-up rewards). */
export function crateForLevel(level: number): CrateTier {
  if (level >= 25) return 'diamond'
  if (level >= 18) return 'gold'
  if (level >= 10) return 'silver'
  return 'bronze'
}

// ─── Achievements ───────────────────────────────────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'safety_master',   title: 'Säkerhetsmästare',   description: 'Leverera 50 uppdrag utan skador.',   icon: '🛡️', rewardPartId: 'front_algstaket_legend', goal: 50,   metric: 'damageFreeDeliveries' },
  { id: 'eco_driver',      title: 'Eco Driver',          description: 'Samla 5 000 miljöpoäng.',            icon: '🌱', rewardPartId: 'decor_gront_paket',     goal: 5000, metric: 'ecoPointsTotal' },
  { id: 'securing_expert', title: 'Lastsäkringsexpert',  description: 'Uppnå 95 % lastsäkring 25 gånger.',  icon: '🔗', rewardPartId: 'side_krom_kjolar',      goal: 25,   metric: 'highSecuringCount' },
  { id: 'cargo_legend',    title: 'Cargo Legend',        description: 'Nå nivå 25.',                        icon: '👑', rewardPartId: 'decor_lbc_legend',      goal: 25,   metric: 'level' },
]

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))

export const GARAGE_UNLOCK_POINTS = 10000

/** Weighted random rarity roll for a crate tier. */
export function rollRarity(tier: CrateTier): PartRarity {
  const w = CRATES[tier].weights
  const total = PART_RARITY_ORDER.reduce((s, r) => s + w[r], 0)
  let roll = Math.random() * total
  for (const r of PART_RARITY_ORDER) {
    roll -= w[r]
    if (roll <= 0) return r
  }
  return 'common'
}

/** Resolve which part a crate yields, preferring parts the player doesn't own yet. */
export function rollCratePart(tier: CrateTier, ownedIds: string[]): TruckPart {
  const owned = new Set(ownedIds)
  const droppable = TRUCK_PARTS.filter(p => p.source === 'crate')
  const rarity = rollRarity(tier)

  const unownedOfRarity = droppable.filter(p => p.rarity === rarity && !owned.has(p.id))
  if (unownedOfRarity.length) return pick(unownedOfRarity)

  const anyUnowned = droppable.filter(p => !owned.has(p.id))
  if (anyUnowned.length) return pick(anyUnowned)

  // Everything is owned – return a duplicate of the rolled rarity (or any).
  const ofRarity = droppable.filter(p => p.rarity === rarity)
  return pick(ofRarity.length ? ofRarity : droppable)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
