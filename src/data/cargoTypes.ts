import type { CargoType } from '../types'

export const RANKS = [
  'Transportelev', 'Chaufför', 'Senior Chaufför', 'Transportspecialist',
  'Transportledare', 'Logistikexpert', 'Hållbarhetsmästare',
  'Cargo Champion', 'Cargo Master', 'LBC Legend',
]

// Real transport objects. Footprint is given in trailer side-view grid cells
// (cols = length front→back, rows = height floor→ceiling). Grid is 12 × 6.
export const CARGO_TYPES: CargoType[] = [
  {
    id: 'europall', name: 'Europall', emoji: '🟫',
    color: '#8a6a3a', color2: '#b08a48', weight: 720, volume: 1.4,
    value: 4000, ecoImpact: 2, rarity: 'common', xpReward: 80,
    description: 'Standardiserad EUR-pall, 1200×800 mm. Logistikens ryggrad.',
    loadingTip: 'Lasta tätt mot framstam. Tål stapling.',
    load: { cols: 2, rows: 2, weightClass: 'medium', stackable: true, fragile: false },
  },
  {
    id: 'halvpall', name: 'Halvpall', emoji: '▫️',
    color: '#9a7a4a', color2: '#bd9a5a', weight: 320, volume: 0.7,
    value: 2200, ecoImpact: 1, rarity: 'common', xpReward: 60,
    description: 'Halvpall 800×600 mm. Smidig för butiksleveranser.',
    loadingTip: 'Fyller luckor mellan helpallar fint.',
    load: { cols: 1, rows: 2, weightClass: 'light', stackable: true, fragile: false },
  },
  {
    id: 'paketbur', name: 'Paketbur', emoji: '🛒',
    color: '#5a6a72', color2: '#7d8f99', weight: 180, volume: 1.0,
    value: 1800, ecoImpact: 2, rarity: 'common', xpReward: 70,
    description: 'Rullbur med paket. Hög och relativt lätt – tippar lätt.',
    loadingTip: 'Säkra mot vägg. Bör spännas – välter annars.',
    load: { cols: 1, rows: 3, weightClass: 'light', stackable: false, fragile: false },
  },
  {
    id: 'kylgods', name: 'Kylgods', emoji: '🌡️',
    color: '#0a5a8a', color2: '#1e8ac0', weight: 480, volume: 1.2,
    value: 5000, ecoImpact: 5, rarity: 'uncommon', xpReward: 150,
    description: 'Temperaturkänsligt gods. Max +4 °C hela vägen.',
    loadingTip: 'Placera så luften cirkulerar. Känsligt för stötar.',
    load: { cols: 2, rows: 2, weightClass: 'medium', stackable: true, fragile: true },
  },
  {
    id: 'frysgods', name: 'Frysgods', emoji: '❄️',
    color: '#1a6a9a', color2: '#3aa8d8', weight: 620, volume: 1.6,
    value: 6500, ecoImpact: 6, rarity: 'uncommon', xpReward: 160,
    description: 'Djupfryst gods, −18 °C. Får aldrig brytas i kylkedjan.',
    loadingTip: 'Håll samlat och säkrat. Ömtåligt vid temperaturväxling.',
    load: { cols: 2, rows: 3, weightClass: 'medium', stackable: true, fragile: true },
  },
  {
    id: 'byggskiva', name: 'Byggskivor', emoji: '🪵',
    color: '#7a5a30', color2: '#a07840', weight: 950, volume: 1.1,
    value: 7000, ecoImpact: 4, rarity: 'uncommon', xpReward: 120,
    description: 'Skivmaterial på flak. Tungt, lågt och långt.',
    loadingTip: 'Tungt gods lågt och centrerat. Lägg i botten.',
    load: { cols: 4, rows: 1, weightClass: 'heavy', stackable: true, fragile: false },
  },
  {
    id: 'vitvara', name: 'Vitvara', emoji: '🧊',
    color: '#c8cdd2', color2: '#eef1f4', weight: 95, volume: 0.9,
    value: 5500, ecoImpact: 3, rarity: 'uncommon', xpReward: 110,
    description: 'Kyl, frys eller tvättmaskin. Hög, lätt och stöttålig endast stående.',
    loadingTip: 'Alltid stående. Säkra – välter vid hård körning.',
    load: { cols: 1, rows: 3, weightClass: 'light', stackable: false, fragile: true },
  },
  {
    id: 'mobel', name: 'Möbel', emoji: '🛋️',
    color: '#5C4033', color2: '#7a5544', weight: 140, volume: 1.8,
    value: 4500, ecoImpact: 2, rarity: 'common', xpReward: 90,
    description: 'Soffa, skåp eller bord. Skrymmande och repkänsligt.',
    loadingTip: 'Skydda med filt. Klämms och repas lätt.',
    load: { cols: 2, rows: 3, weightClass: 'light', stackable: false, fragile: true },
  },
  {
    id: 'industrimaskin', name: 'Industrimaskin', emoji: '🏭',
    color: '#4a6070', color2: '#6080a0', weight: 1800, volume: 3.2,
    value: 22000, ecoImpact: 4, rarity: 'rare', xpReward: 260,
    description: 'Komplett maskin. Mycket tung – avgör viktfördelningen.',
    loadingTip: 'Centrera över boggin. Kräver kraftig säkring.',
    load: { cols: 3, rows: 3, weightClass: 'heavy', stackable: false, fragile: false },
  },
  {
    id: 'maskindel', name: 'Maskindel', emoji: '⚙️',
    color: '#54606a', color2: '#78909c', weight: 760, volume: 0.8,
    value: 12000, ecoImpact: 3, rarity: 'rare', xpReward: 200,
    description: 'Tung komponent, t.ex. motorblock eller växellåda.',
    loadingTip: 'Tungt och kompakt – lasta lågt och stötta upp.',
    load: { cols: 2, rows: 2, weightClass: 'heavy', stackable: true, fragile: false },
  },
  {
    id: 'langgods', name: 'Långgods', emoji: '📏',
    color: '#6a6050', color2: '#8d8068', weight: 1100, volume: 1.3,
    value: 9000, ecoImpact: 4, rarity: 'rare', xpReward: 220,
    description: 'Rör, balkar eller profiler. Långt och tungt.',
    loadingTip: 'Lägg längs golvet, stötta ändarna mot förskjutning.',
    load: { cols: 5, rows: 1, weightClass: 'heavy', stackable: true, fragile: false },
  },
  {
    id: 'konst', name: 'Konstgods', emoji: '🖼️',
    color: '#7B0080', color2: '#a020a0', weight: 60, volume: 0.4,
    value: 50000, ecoImpact: 1, rarity: 'epic', xpReward: 500,
    description: 'Konstverk eller antikvitet. Extremt värdefullt och ömtåligt.',
    loadingTip: 'Specialhantering. Får inte stötas eller belastas.',
    load: { cols: 1, rows: 2, weightClass: 'light', stackable: false, fragile: true },
  },
]

export const RARITY_COLORS: Record<string, string> = {
  common: '#9EA3A5', uncommon: '#00a34c', rare: '#2a8ae0', epic: '#9b30f0',
}
export const RARITY_LABELS: Record<string, string> = {
  common: 'Vanlig', uncommon: 'Ovanlig', rare: 'Sällsynt', epic: 'Episk',
}
