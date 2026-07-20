import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'

interface UseCargoNetDragOptions {
  containerRef: RefObject<HTMLElement | null>
  trailerCols: number
  netSpan: number
  enabled: boolean
  currentCol: number
  onChangeCol: (nextCol: number) => void
}

interface DragState {
  pointerOffsetPx: number
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function useCargoNetDrag({
  containerRef,
  trailerCols,
  netSpan,
  enabled,
  currentCol,
  onChangeCol,
}: UseCargoNetDragOptions) {
  const dragRef = useRef<DragState | null>(null)
  const stopDragRef = useRef<() => void>(() => undefined)

  const optsRef = useRef({ trailerCols, netSpan, enabled, currentCol, onChangeCol, containerRef })
  optsRef.current = { trailerCols, netSpan, enabled, currentCol, onChangeCol, containerRef }

  const onMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return

    const { containerRef: ref, trailerCols: cols, netSpan: span, onChangeCol: onChange } = optsRef.current
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cellW = rect.width / cols
    const maxCol = Math.max(0, cols - span)
    const nextCol = clamp(Math.round((e.clientX - rect.left - drag.pointerOffsetPx) / cellW), 0, maxCol)
    onChange(nextCol)
  }, [])

  const stopDrag = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', stopDragRef.current)
    window.removeEventListener('pointercancel', stopDragRef.current)
  }, [onMove])
  stopDragRef.current = stopDrag

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const { enabled: canDrag, containerRef: ref, trailerCols: cols, currentCol: col } = optsRef.current
    if (!canDrag) return

    const el = ref.current
    if (!el) return

    e.preventDefault()
    e.stopPropagation()

    const rect = el.getBoundingClientRect()
    const cellW = rect.width / cols
    const netLeftPx = rect.left + col * cellW

    dragRef.current = {
      pointerOffsetPx: e.clientX - netLeftPx,
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stopDragRef.current)
    window.addEventListener('pointercancel', stopDragRef.current)
  }, [onMove, stopDrag])

  useEffect(() => {
    return () => stopDrag()
  }, [stopDrag])

  return { onPointerDown }
}
