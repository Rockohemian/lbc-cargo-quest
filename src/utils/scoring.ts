import type { Badge, LoadPlan, RoundResult } from '../types'

export function grade(pts: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (pts >= 3200) return 'S'
  if (pts >= 2200) return 'A'
  if (pts >= 1400) return 'B'
  if (pts >= 700)  return 'C'
  return 'D'
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

function buildSummary(r: {
  fillPercent: number; weightBalance: number; securing: number
  cargoDamage: number; safetyScore: number; ecoScore: number; grade: string
}): string {
  if (r.cargoDamage <= 4 && r.weightBalance >= 80 && r.securing >= 80) {
    return 'Perfekt lastplanering. Lasten var stabil genom hela transporten och levererades utan skador.'
  }
  if (r.cargoDamage >= 25) {
    return 'Godset kom fram, men bristande säkring och viktfördelning gjorde att last försköts och skadades under färden.'
  }
  if (r.securing < 55) {
    return 'Lasten höll i stort sett, men säkringen var för svag – spänn fler band nästa gång för full kvalitet.'
  }
  if (r.weightBalance < 60) {
    return 'Viktfördelningen var ojämn vilket påverkade stabiliteten i kurvor. Centrera tunga kollin bättre.'
  }
  if (r.fillPercent < 45) {
    return 'Säker och skadefri leverans, men låg fyllnadsgrad – mer gods per transport ger bättre lönsamhet och miljö.'
  }
  return 'Bra genomförd leverans. Lasten var stabil och kom fram i gott skick med god marginal.'
}

/**
 * Build the final round result from the load plan and the simulated cargo damage.
 * @param plan        the completed load plan with metrics
 * @param cargoDamage 0–100, produced by the transport simulation
 */
export function calcRoundResult(plan: LoadPlan, cargoDamage: number): RoundResult {
  const m = plan.metrics
  const cargoCount = plan.items.length
  const damage = clamp(cargoDamage)

  // Average environmental impact of the load (lower impact = greener).
  const avgEco = cargoCount
    ? plan.items.reduce((s, it) => s + it.type.ecoImpact, 0) / cargoCount
    : 0
  const ecoScore = clamp(m.fillPercent * 0.45 + (100 - avgEco * 10) * 0.35 + m.weightBalance * 0.2)

  const safetyScore = clamp(
    m.securing * 0.4 + m.weightBalance * 0.25 + (100 - m.cogHeight) * 0.15 + (100 - damage) * 0.2
  )

  const qualityScore = clamp((100 - damage) * 0.6 + m.securing * 0.25 + m.weightBalance * 0.15)

  // Cargo value handled = reward for hauling more/valuable goods.
  const cargoValue = plan.items.reduce((s, it) => s + it.type.value, 0)
  const totalPoints = Math.round(
    m.fillPercent * 9 +
    m.weightBalance * 7 +
    m.securing * 7 +
    safetyScore * 6 +
    ecoScore * 5 +
    qualityScore * 6 +
    cargoValue * 0.02 -
    damage * 14
  )
  const totalXP = Math.max(0, Math.round(totalPoints * 0.4))
  const g = grade(Math.max(0, totalPoints))

  const badges: Badge[] = []
  if (m.fillPercent >= 80) badges.push({ id: 'full', icon: '📦', title: 'Maxad last', description: 'Hög fyllnadsgrad', color: '#1a7e34' })
  if (m.weightBalance >= 88) badges.push({ id: 'balance', icon: '⚖️', title: 'Perfekt balans', description: 'Optimal viktfördelning', color: '#d4a017' })
  if (m.securing >= 85) badges.push({ id: 'secured', icon: '🔗', title: 'Lastsäkrare', description: 'Föredömlig säkring', color: '#2a8ae0' })
  if (damage <= 4) badges.push({ id: 'intact', icon: '✨', title: 'Skadefritt', description: 'Inget gods skadades', color: '#9b30f0' })
  if (ecoScore >= 85) badges.push({ id: 'eco', icon: '🌱', title: 'Hållbarhetshjälte', description: 'Låg miljöpåverkan', color: '#27a349' })

  const summary = buildSummary({
    fillPercent: m.fillPercent, weightBalance: m.weightBalance, securing: m.securing,
    cargoDamage: damage, safetyScore, ecoScore, grade: g,
  })

  return {
    cargoCount,
    fillPercent: m.fillPercent,
    weightBalance: m.weightBalance,
    securing: m.securing,
    cargoDamage: damage,
    ecoScore,
    safetyScore,
    qualityScore,
    totalXP,
    totalPoints: Math.max(0, totalPoints),
    grade: g,
    badges,
    summary,
  }
}

/**
 * Simulate transport stress on the load and produce a cargo-damage percentage.
 * Poorly balanced, high-CoG or weakly secured loads take more damage.
 */
export function simulateDamage(plan: LoadPlan): number {
  const m = plan.metrics
  if (plan.items.length === 0) return 0
  const securingGap = (100 - m.securing) / 100
  const balanceGap = (100 - m.weightBalance) / 100
  const cogRisk = m.cogHeight / 100
  const fragileShare = plan.items.filter(i => i.type.load.fragile).length / plan.items.length

  let damage =
    securingGap * 42 +
    balanceGap * 26 +
    cogRisk * 18 +
    fragileShare * securingGap * 24

  // A well-secured, balanced load barely moves.
  if (m.securing >= 85 && m.weightBalance >= 80) damage *= 0.35
  return Math.max(0, Math.min(100, Math.round(damage)))
}
