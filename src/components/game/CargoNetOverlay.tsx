import type { CargoNetState } from '../../types'
import { TRAILER_COLS } from '../../utils/loadEngine'

interface Props {
  net: CargoNetState
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
}

const pctX = (c: number) => (c / TRAILER_COLS) * 100

export function CargoNetOverlay({ net, onPointerDown }: Props) {
  if (!net.enabled) return null

  return (
    <div
      data-net-handle
      onPointerDown={onPointerDown}
      className={
        'absolute top-0 bottom-0 opacity-80 z-30 ' +
        (onPointerDown ? 'cursor-grab active:cursor-grabbing touch-none' : 'pointer-events-none')
      }
      style={{
        left: `${pctX(net.col)}%`,
        width: `${pctX(net.span)}%`,
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,.4) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,.4) 0 1px, transparent 1px 7px)',
      }}
    >
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] bg-black/45 text-white/85">
        Nät
      </div>
    </div>
  )
}
