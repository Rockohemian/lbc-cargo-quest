import type { Badge, LoadPlan, LoadViolation, RoundResult } from '../types'

export function grade(pts: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (pts >= 3200) return 'S'
  if (pts >= 2200) return 'A'
  if (pts >= 1400) return 'B'
  if (pts >= 700)  return 'C'
  return 'D'
}

const GRADE_ORDER: Array<'S' | 'A' | 'B' | 'C' | 'D'> = ['S', 'A', 'B', 'C', 'D']

/** Sänker betyget till högst `cap` — ett betyg kan aldrig höjas av en cap. */
function capGrade(g: 'S' | 'A' | 'B' | 'C' | 'D', cap: 'S' | 'A' | 'B' | 'C' | 'D') {
  return GRADE_ORDER.indexOf(g) > GRADE_ORDER.indexOf(cap) ? g : cap
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

function buildSummary(r: {
  fillPercent: number; weightBalance: number; securing: number
  cargoDamage: number; safetyScore: number; ecoScore: number; grade: string
  stackScore: number; violations: LoadViolation[]
}): string {
  const critical = r.violations.filter(v => v.severity === 'critical')
  if (critical.length > 0) {
    return `Lasten bröt mot grundläggande lastningsregler: ${critical[0].title.toLowerCase()}. ` +
      `${critical[0].detail} Sådant stoppas vid en kontroll och drar ner hela leveransen.`
  }
  if (r.violations.length > 0 && r.stackScore < 80) {
    return `${r.violations[0].detail} Rätta till det så lyfter både betyg och poäng rejält.`
  }
  if (r.cargoDamage <= 4 && r.weightBalance >= 80 && r.securing >= 80 && r.stackScore >= 90) {
    return 'Perfekt lastplanering. Lasten var byggd enligt regelverket, stabil genom hela transporten och levererades utan skador.'
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
  const stackScore = clamp(m.stackScore ?? 0)
  const violations = m.violations ?? []
  const criticalCount = violations.filter(v => v.severity === 'critical').length
  const majorCount = violations.filter(v => v.severity === 'major').length

  // Average environmental impact of the load (lower impact = greener).
  const avgEco = cargoCount
    ? plan.items.reduce((s, it) => s + it.type.ecoImpact, 0) / cargoCount
    : 0
  const ecoScore = clamp(m.fillPercent * 0.45 + (100 - avgEco * 10) * 0.35 + m.weightBalance * 0.2)

  const safetyScore = clamp(
    m.securing * 0.3 + stackScore * 0.25 + m.weightBalance * 0.2 + (100 - m.cogHeight) * 0.1 + (100 - damage) * 0.15
  )

  const qualityScore = clamp((100 - damage) * 0.45 + stackScore * 0.25 + m.securing * 0.2 + m.weightBalance * 0.1)

  // Cargo value handled = reward for hauling more/valuable goods.
  const cargoValue = plan.items.reduce((s, it) => s + it.type.value, 0)

  // Lastningen enligt regelverket väger tyngst av alla delmoment — fyllnadsgrad
  // ensamt ska aldrig kunna köpa ett toppbetyg.
  const base =
    m.fillPercent * 6 +
    m.weightBalance * 6 +
    m.securing * 6 +
    stackScore * 10 +
    safetyScore * 5 +
    ecoScore * 3 +
    qualityScore * 4 +
    cargoValue * 0.02

  // Dessutom skalas hela resultatet mot regelefterlevnaden. En last som är
  // byggd fel kan alltså inte nå toppoäng ens med full trailer och maxsäkring.
  const compliance = 0.5 + 0.5 * (stackScore / 100)

  const totalPoints = Math.round(base * compliance - damage * 14)
  const totalXP = Math.max(0, Math.round(totalPoints * 0.4))

  let g = grade(Math.max(0, totalPoints))
  // Hårda tak: allvarliga lastningsfel ska aldrig kunna ge ett högt betyg.
  if (criticalCount > 0) g = capGrade(g, criticalCount > 1 ? 'D' : 'C')
  else if (majorCount >= 2) g = capGrade(g, 'B')
  else if (majorCount === 1) g = capGrade(g, 'A')

  const badges: Badge[] = []
  if (violations.length === 0 && stackScore >= 95) badges.push({ id: 'rules', icon: '📋', title: 'Lastat enligt boken', description: 'Inga regelbrott i lasten', color: '#0f5a99' })
  if (m.fillPercent >= 80) badges.push({ id: 'full', icon: '📦', title: 'Maxad last', description: 'Hög fyllnadsgrad', color: '#00843e' })
  if (m.weightBalance >= 88) badges.push({ id: 'balance', icon: '⚖️', title: 'Perfekt balans', description: 'Optimal viktfördelning', color: '#d4a017' })
  if (m.securing >= 85) badges.push({ id: 'secured', icon: '🔗', title: 'Lastsäkrare', description: 'Föredömlig säkring', color: '#2a8ae0' })
  if (damage <= 4) badges.push({ id: 'intact', icon: '✨', title: 'Skadefritt', description: 'Inget gods skadades', color: '#9b30f0' })
  if (ecoScore >= 85) badges.push({ id: 'eco', icon: '🌱', title: 'Hållbarhetshjälte', description: 'Låg miljöpåverkan', color: '#00a34c' })

  const summary = buildSummary({
    fillPercent: m.fillPercent, weightBalance: m.weightBalance, securing: m.securing,
    cargoDamage: damage, safetyScore, ecoScore, grade: g, stackScore, violations,
  })

  return {
    cargoCount,
    fillPercent: m.fillPercent,
    weightBalance: m.weightBalance,
    securing: m.securing,
    stackScore,
    violations,
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
  const stackGap = (100 - (m.stackScore ?? 0)) / 100
  const cogRisk = m.cogHeight / 100
  const fragileShare = plan.items.filter(i => i.type.load.fragile).length / plan.items.length

  let damage =
    securingGap * 34 +
    balanceGap * 20 +
    stackGap * 32 +
    cogRisk * 14 +
    fragileShare * securingGap * 20

  // A well-secured, balanced load built by the book barely moves.
  if (m.securing >= 85 && m.weightBalance >= 80 && (m.stackScore ?? 0) >= 85) damage *= 0.35
  return Math.max(0, Math.min(100, Math.round(damage)))
}
