import type { CargoNetState, PlacedItem, SecuringState } from '../types'

const DEFAULT_NET_SPAN = 3

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function normalizeCargoNet(
  net: SecuringState['net'],
  trailerCols: number,
  defaultSpan = DEFAULT_NET_SPAN
): CargoNetState {
  const span = clamp(defaultSpan, 1, trailerCols)
  const rearCol = Math.max(0, trailerCols - span)

  if (typeof net === 'boolean') {
    return { enabled: net, col: rearCol, span }
  }

  const safeSpan = clamp(Math.round(net.span), 1, trailerCols)
  const safeCol = clamp(Math.round(net.col), 0, trailerCols - safeSpan)
  return { enabled: !!net.enabled, col: safeCol, span: safeSpan }
}

export function computeNetCoverage(items: PlacedItem[], net: CargoNetState): number {
  if (!net.enabled || items.length === 0) return 0

  const netStart = net.col
  const netEnd = net.col + net.span

  let totalCells = 0
  let coveredCells = 0

  for (const it of items) {
    const itemStart = it.col
    const itemEnd = it.col + it.cols
    const overlapCols = Math.max(0, Math.min(itemEnd, netEnd) - Math.max(itemStart, netStart))

    const itemCells = it.cols * it.rows
    totalCells += itemCells
    if (overlapCols > 0) coveredCells += overlapCols * it.rows
  }

  if (totalCells === 0) return 0
  return coveredCells / totalCells
}

export function computeSecuringScore(items: PlacedItem[], securing: SecuringState, trailerCols: number): number {
  if (items.length === 0) return 0

  const riskItems = items.filter(
    it => it.rows >= 3 || it.type.load.fragile || it.type.load.weightClass === 'heavy' || !it.type.load.stackable
  )

  const required = Math.max(1, riskItems.length)
  const strapCoverage = Math.min(1, securing.straps / required)

  const netState = normalizeCargoNet(securing.net, trailerCols)
  const netCoverage = computeNetCoverage(items, netState)

  let score = strapCoverage * 58
  score += Math.min(1, netCoverage) * 14
  if (securing.divider) score += 14

  // Tall unstable items with too few straps cap securing low.
  const tallUnstable = items.filter(it => it.rows >= 3 && !it.type.load.stackable).length
  if (tallUnstable > 0 && securing.straps < tallUnstable) score = Math.min(score, 55)

  return Math.max(0, Math.min(100, Math.round(score)))
}
