import type { PlacedItem, SecuringState, LoadMetrics } from '../types'
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
    const idealCol = TRAILER_COLS * 0.48 // slightly forward of centre
    const deviation = comCol - idealCol // + = toward rear
    frontBias = Math.round(((TRAILER_COLS / 2 - comCol) / (TRAILER_COLS / 2)) * 100)
    let penalty = Math.abs(deviation) * 13
    if (deviation > 0) penalty *= 1.4 // rear-heavy is worse
    weightBalance = Math.max(0, Math.min(100, Math.round(100 - penalty)))

    const comHeight = weightedHeight / totalW // cells above floor
    cogHeight = Math.max(0, Math.min(100, Math.round((comHeight / TRAILER_ROWS) * 100)))
  }

  const securingScore = computeSecuring(items, securing)

  const feedback: string[] = []
  if (items.length === 0) {
    feedback.push('Dra in gods i trailern för att börja lasta.')
  } else {
    if (fillPercent >= 80) feedback.push('Hög fyllnadsgrad – effektiv transport.')
    else if (fillPercent < 40) feedback.push('Tomma ytor minskar fyllnadsgraden.')

    if (frontBias < -22) feedback.push('För mycket vikt bak i trailern.')
    else if (frontBias > 38) feedback.push('För mycket vikt fram – flytta något bakåt.')
    else if (weightBalance >= 80) feedback.push('Bra viktfördelning.')

    if (cogHeight > 60) feedback.push('Tung last högt upp ökar tipprisken.')

    if (securingScore < 45) feedback.push('Lasten behöver säkras bättre.')
    else if (securingScore >= 80) feedback.push('Lasten är väl säkrad.')
  }

  return { fillPercent, weightBalance, cogHeight, frontBias, securing: securingScore, feedback }
}
