import type {
  PlacedItem, SecuringState, LoadMetrics, LoadViolation, LoadRuleSeverity,
} from '../types'
import { computeSecuringScore } from './securingEngine'

// Trailer side-view grid. Left = framstam (front), right = bakdörrar (rear),
// bottom row = golv (floor).
export const TRAILER_COLS = 12
export const TRAILER_ROWS = 6
const TOTAL_CELLS = TRAILER_COLS * TRAILER_ROWS

/** Topmost occupied row per column (TRAILER_ROWS if the column is empty). */
function columnTops(items: PlacedItem[], ignoreUid?: string): number[] {
  const tops = new Array(TRAILER_COLS).fill(TRAILER_ROWS)
  for (const it of items) {
    if (it.uid === ignoreUid) continue
    for (let c = it.col; c < it.col + it.cols; c++) {
      if (c < 0 || c >= TRAILER_COLS) continue
      if (it.row < tops[c]) tops[c] = it.row
    }
  }
  return tops
}

/** True when a footprint fits inside the trailer without overlap. */
export function isFree(
  items: PlacedItem[],
  col: number,
  row: number,
  cols: number,
  rows: number,
  ignoreUid?: string
): boolean {
  if (col < 0 || row < 0 || col + cols > TRAILER_COLS || row + rows > TRAILER_ROWS) return false
  for (const it of items) {
    if (it.uid === ignoreUid) continue
    const overlapX = col < it.col + it.cols && col + cols > it.col
    const overlapY = row < it.row + it.rows && row + rows > it.row
    if (overlapX && overlapY) return false
  }
  return true
}

/**
 * Apply gravity: given target columns, return the top row where the footprint
 * settles (resting on the floor or the tallest underlying stack).
 */
export function settleRow(
  items: PlacedItem[],
  col: number,
  cols: number,
  rows: number,
  ignoreUid?: string
): number | null {
  if (col < 0 || col + cols > TRAILER_COLS) return null
  const tops = columnTops(items, ignoreUid)
  let surface = TRAILER_ROWS
  for (let c = col; c < col + cols; c++) surface = Math.min(surface, tops[c])
  const row = surface - rows
  if (row < 0) return null
  if (!isFree(items, col, row, cols, rows, ignoreUid)) return null
  return row
}

// ─── Metrics ──────────────────────────────────────────────────────────────
export function computeSecuring(items: PlacedItem[], s: SecuringState): number {
  return computeSecuringScore(items, s, TRAILER_COLS)
}

/** Kolumnen där tyngdpunkten helst ska ligga — något framför mitten. */
export const IDEAL_COM_COL = TRAILER_COLS * 0.48
/** Hur långt tyngdpunkten får vandra innan det börjar kosta poäng, i kolumner. */
export const COM_TOLERANCE = 1.15

/** Axlarnas lägen i rutnätets kolumnskala. Framaxeln sitter under framstammen,
 *  bakboggin en bit in från bakdörrarna — samma lägen som hjulen ritas på. */
const FRONT_AXLE_COL = 0.9
const REAR_AXLE_COL = 10.4

export interface WeightProfile {
  /** Lastens totalvikt i kg. */
  totalWeight: number
  /** Tyngdpunktens kolumn, 0 = framstam .. TRAILER_COLS = bakdörrar. */
  comCol: number
  /** Tyngdpunktens höjd över golvet i celler. */
  comHeight: number
  /** Vikt per kolumn i kg. Längden är alltid TRAILER_COLS. */
  perColumn: number[]
  /** Tyngsta kolumnens vikt — skalan att rita staplarna mot. */
  heaviestColumn: number
  /** Lastens fördelning över axlarna i procent. Summan är 100. */
  frontAxlePct: number
  rearAxlePct: number
}

/**
 * Var vikten faktiskt ligger.
 *
 * `computeMetrics` räknar redan ut tyngdpunkten, men lämnar bara ifrån sig en
 * betygssiffra. Den säger att lastningen är dålig utan att säga var felet
 * sitter, vilket gör balansen till en gissningslek. Den här funktionen lämnar
 * ut råsiffrorna så att de går att RITA — då blir lastningen ett pussel som går
 * att lösa medvetet i stället för att prövas fram.
 */
export function computeWeightProfile(items: PlacedItem[]): WeightProfile {
  const perColumn = new Array<number>(TRAILER_COLS).fill(0)
  let totalWeight = 0
  let weightedCol = 0
  let weightedHeight = 0

  for (const it of items) {
    const w = it.type.weight
    totalWeight += w
    weightedCol += w * (it.col + it.cols / 2)
    weightedHeight += w * (TRAILER_ROWS - (it.row + it.rows / 2))
    // Godset antas ha jämn täthet, så vikten delas lika över de kolumner det
    // står på. Ett långgods över fem kolumner belastar inte en enda punkt.
    const andel = w / it.cols
    for (let c = it.col; c < it.col + it.cols; c++) {
      if (c >= 0 && c < TRAILER_COLS) perColumn[c] += andel
    }
  }

  if (totalWeight <= 0) {
    return {
      totalWeight: 0,
      comCol: IDEAL_COM_COL,
      comHeight: 0,
      perColumn,
      heaviestColumn: 0,
      frontAxlePct: 50,
      rearAxlePct: 50,
    }
  }

  const comCol = weightedCol / totalWeight
  // Statisk jämvikt kring två stödpunkter: ju längre bak tyngdpunkten ligger,
  // desto mer av lasten bärs av boggin.
  const span = REAR_AXLE_COL - FRONT_AXLE_COL
  const front = Math.max(0, Math.min(1, (REAR_AXLE_COL - comCol) / span))
  const frontAxlePct = Math.round(front * 100)

  return {
    totalWeight: Math.round(totalWeight),
    comCol,
    comHeight: weightedHeight / totalWeight,
    perColumn,
    heaviestColumn: Math.max(...perColumn),
    frontAxlePct,
    rearAxlePct: 100 - frontAxlePct,
  }
}

// ─── Lastregler ───────────────────────────────────────────────────────────
//
// Poängen ska belöna last som är byggd som den ska i verkligheten, inte bara
// last som fyller ytan. Reglerna nedan är de som en chaufför faktiskt bedöms
// efter: tungt underst, ömtåligt fritt från tryck, inget staplat på det som
// inte tål det, tyngdpunkten låg, och lasten tight mot framstammen utan glapp.

const WEIGHT_RANK: Record<string, number> = { light: 1, medium: 2, heavy: 3 }

const SEVERITY_PENALTY: Record<LoadRuleSeverity, number> = {
  critical: 20,
  major: 9,
  minor: 5,
}

/** Kollin som vilar direkt ovanpå `base`. */
function itemsRestingOn(items: PlacedItem[], base: PlacedItem): PlacedItem[] {
  return items.filter(
    (it) =>
      it.uid !== base.uid &&
      it.row + it.rows === base.row &&
      it.col < base.col + base.cols &&
      it.col + it.cols > base.col
  )
}

/** Kollin som bär upp `upper`. */
function supportersOf(items: PlacedItem[], upper: PlacedItem): PlacedItem[] {
  return items.filter(
    (it) =>
      it.uid !== upper.uid &&
      it.row === upper.row + upper.rows &&
      it.col < upper.col + upper.cols &&
      it.col + it.cols > upper.col
  )
}

export interface LoadRuleReport {
  violations: LoadViolation[]
  /** 0–100. 100 = lastat helt enligt regelverket. */
  stackScore: number
}

/**
 * Hur många regelbrott en tänkt placering skulle orsaka.
 * Används av autolastningen för att aldrig föreslå en last som bryter mot
 * reglerna spelet själv bedömer efter.
 */
export function placementRuleCost(items: PlacedItem[], candidate: PlacedItem): number {
  let cost = 0
  const onFloor = candidate.row + candidate.rows === TRAILER_ROWS
  for (const s of supportersOf(items, candidate)) {
    if (s.type.load.fragile) cost += 3
    if (!s.type.load.stackable) cost += 3
    if (WEIGHT_RANK[candidate.type.load.weightClass] > WEIGHT_RANK[s.type.load.weightClass]) cost += 3
  }
  if (candidate.type.load.weightClass === 'heavy' && !onFloor) cost += 1
  return cost
}

/**
 * Granska lasten mot lastningsreglerna.
 *
 * Returnerar både en lista att visa för spelaren och en sammanvägd siffra som
 * poängräkningen använder. Varje överträdelse straffar efter allvarlighetsgrad
 * och antal, så en enstaka miss sänker betyget medan en genomgående slarvig
 * last rasar.
 */
export function evaluateLoadRules(items: PlacedItem[]): LoadRuleReport {
  if (items.length === 0) return { violations: [], stackScore: 0 }

  const found = new Map<string, LoadViolation>()
  const add = (
    id: string,
    severity: LoadRuleSeverity,
    title: string,
    detail: string,
    uid: string
  ) => {
    const existing = found.get(id)
    if (existing) {
      if (!existing.uids.includes(uid)) {
        existing.uids.push(uid)
        existing.count = existing.uids.length
      }
      return
    }
    found.set(id, { id, severity, title, detail, count: 1, uids: [uid] })
  }

  for (const base of items) {
    const above = itemsRestingOn(items, base)
    if (above.length === 0) continue

    if (base.type.load.fragile) {
      add(
        'crushed-fragile',
        'critical',
        'Ömtåligt under last',
        'Ömtåligt gods ska stå överst eller avskilt. Last ovanpå ger krosskador.',
        base.uid
      )
    }
    if (!base.type.load.stackable) {
      add(
        'stacked-on-unstackable',
        'critical',
        'Staplat på ostapelbart',
        'Godset är märkt som ej stapelbart. Inget får lastas ovanpå det.',
        base.uid
      )
    }
    for (const upper of above) {
      if (WEIGHT_RANK[upper.type.load.weightClass] > WEIGHT_RANK[base.type.load.weightClass]) {
        add(
          'heavy-on-light',
          'critical',
          'Tungt ovanpå lätt',
          'Tungt gods lastas underst och lätt överst — annars trycks underlaget sönder och tyngdpunkten hamnar högt.',
          upper.uid
        )
      }
    }
  }

  for (const it of items) {
    const onFloor = it.row + it.rows === TRAILER_ROWS
    if (it.type.load.weightClass === 'heavy' && !onFloor) {
      add(
        'heavy-high',
        'major',
        'Tung last högt upp',
        'Tunga kollin hör hemma på golvet. Högt placerad tyngd höjer tyngdpunkten och ökar tipprisken.',
        it.uid
      )
    }
    if (supportersOf(items, it).length === 0 && !onFloor) {
      add(
        'unsupported',
        'critical',
        'Gods utan underlag',
        'Lasten måste vila mot golv eller underliggande gods i hela sin bredd.',
        it.uid
      )
    }
  }

  // Bottenraden: tight mot framstammen och utan glapp.
  const floorRow = TRAILER_ROWS - 1
  const floorOccupied = new Array<PlacedItem | null>(TRAILER_COLS).fill(null)
  for (const it of items) {
    if (it.row + it.rows - 1 < floorRow) continue
    if (it.row > floorRow) continue
    for (let c = it.col; c < it.col + it.cols; c++) {
      if (c >= 0 && c < TRAILER_COLS) floorOccupied[c] = it
    }
  }
  const firstCol = floorOccupied.findIndex((v) => v !== null)
  const lastCol = floorOccupied.length - 1 - [...floorOccupied].reverse().findIndex((v) => v !== null)

  if (firstCol >= 2 && floorOccupied[firstCol]) {
    add(
      'headboard-gap',
      'minor',
      'Ej mot framstam',
      'Lasta framifrån och tight mot framstammen. Ett stort tomrum där gör att lasten kan kasta sig framåt vid inbromsning.',
      floorOccupied[firstCol]!.uid
    )
  }
  if (firstCol >= 0) {
    for (let c = firstCol; c < lastCol; c++) {
      if (floorOccupied[c] === null) {
        const nextItem = floorOccupied.slice(c).find((v) => v !== null)
        if (nextItem) {
          add(
            'load-gap',
            'major',
            'Glapp i lasten',
            'Tomrum mellan kollin låter lasten förskjutas i sidled och längsled. Lasta tight eller fyll ut.',
            nextItem.uid
          )
        }
      }
    }
  }

  const violations = [...found.values()].sort(
    (a, b) => SEVERITY_PENALTY[b.severity] * b.count - SEVERITY_PENALTY[a.severity] * a.count
  )

  const penalty = violations.reduce(
    (sum, v) => sum + SEVERITY_PENALTY[v.severity] * Math.min(v.count, 3),
    0
  )

  return { violations, stackScore: Math.max(0, Math.min(100, Math.round(100 - penalty))) }
}

export function computeMetrics(items: PlacedItem[], securing: SecuringState): LoadMetrics {

  const usedCells = items.reduce((sum, it) => sum + it.cols * it.rows, 0)
  const fillPercent = Math.min(100, Math.round((usedCells / TOTAL_CELLS) * 100))

  // Weighted centre of mass (column + height above floor).
  let totalW = 0
  let weightedCol = 0
  let weightedHeight = 0
  for (const it of items) {
    const w = it.type.weight
    const centreCol = it.col + it.cols / 2
    // height of the item's vertical centre above the floor, in cells
    const centreRow = it.row + it.rows / 2
    const heightAboveFloor = TRAILER_ROWS - centreRow
    totalW += w
    weightedCol += w * centreCol
    weightedHeight += w * heightAboveFloor
  }

  let weightBalance = 100
  let frontBias = 0
  let cogHeight = 0
  if (totalW > 0) {
    const comCol = weightedCol / totalW
    const deviation = comCol - IDEAL_COM_COL // + = toward rear
    frontBias = Math.round(((TRAILER_COLS / 2 - comCol) / (TRAILER_COLS / 2)) * 100)
    let penalty = Math.abs(deviation) * 13
    if (deviation > 0) penalty *= 1.4 // rear-heavy is worse
    weightBalance = Math.max(0, Math.min(100, Math.round(100 - penalty)))

    const comHeight = weightedHeight / totalW // cells above floor
    cogHeight = Math.max(0, Math.min(100, Math.round((comHeight / TRAILER_ROWS) * 100)))
  }

  const securingScore = computeSecuring(items, securing)
  const { violations, stackScore } = evaluateLoadRules(items)

  const feedback: string[] = []
  if (items.length === 0) {
    feedback.push('Dra in gods i trailern för att börja lasta.')
  } else {
    // Regelbrotten först — de är det som kostar mest poäng.
    for (const v of violations.slice(0, 2)) {
      feedback.push(v.count > 1 ? `⚠ ${v.title} ×${v.count}` : `⚠ ${v.title}`)
    }

    if (fillPercent >= 80) feedback.push('Hög fyllnadsgrad – effektiv transport.')
    else if (fillPercent < 40) feedback.push('Tomma ytor minskar fyllnadsgraden.')

    if (frontBias < -22) feedback.push('För mycket vikt bak i trailern.')
    else if (frontBias > 38) feedback.push('För mycket vikt fram – flytta något bakåt.')
    else if (weightBalance >= 80) feedback.push('Bra viktfördelning.')

    if (cogHeight > 60) feedback.push('Tung last högt upp ökar tipprisken.')

    if (securingScore < 45) feedback.push('Lasten behöver säkras bättre.')
    else if (securingScore >= 80) feedback.push('Lasten är väl säkrad.')

    if (violations.length === 0) feedback.unshift('✓ Lastat enligt regelverket.')
  }

  return {
    fillPercent, weightBalance, cogHeight, frontBias,
    securing: securingScore, stackScore, violations, feedback,
  }
}
