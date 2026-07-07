import { memo } from 'react'
import type { PlacedItem } from '../../types'
import { TRAILER_COLS, TRAILER_ROWS } from '../../utils/loadEngine'

export interface ItemFx {
  dx?: number      // px shift
  dy?: number
  rot?: number     // deg
  damaged?: boolean
}

export interface GhostPreview {
  col: number
  row: number
  cols: number
  rows: number
  valid: boolean
}

interface Props {
  items: PlacedItem[]
  tilt?: number
  itemFx?: Record<string, ItemFx>
  /** vertical strap positions as fractions of height (0 = top, 1 = floor) */
  strapYs?: number[]
  net?: boolean
  divider?: boolean
  ghost?: GhostPreview | null
  showGrid?: boolean
  selectedUid?: string | null
  className?: string
  onItemPointerDown?: (uid: string, e: React.PointerEvent) => void
}

const pctX = (c: number) => (c / TRAILER_COLS) * 100
const pctY = (r: number) => (r / TRAILER_ROWS) * 100

function TrailerViewBase({
  items, tilt = 0, itemFx = {}, strapYs = [], net = false, divider = false,
  ghost = null, showGrid = false, selectedUid = null, className = '', onItemPointerDown,
}: Props) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ aspectRatio: `${TRAILER_COLS} / ${TRAILER_ROWS + 1}` }}
    >
      {/* Truck cab hint (front / framstam is on the left) */}
      <div className="absolute -top-px left-0 bottom-7 w-2 rounded-l-xl bg-gradient-to-r from-lbc-green/60 to-transparent" />

      {/* Trailer body */}
      <div
        className="absolute inset-0 bottom-7 rounded-2xl overflow-hidden border border-white/12"
        style={{
          background: 'linear-gradient(170deg, rgba(30,40,34,.95), rgba(12,18,14,.98))',
          transform: `rotate(${tilt}deg)`,
          transformOrigin: '50% 100%',
          transition: 'transform 0.25s ease-out',
          boxShadow: 'inset 0 2px 18px rgba(0,0,0,.5)',
        }}
      >
        {/* Framstam (front wall) */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-white/20 to-white/5" />
        {/* Bakdörrar (rear doors) */}
        <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col">
          <div className="flex-1 border-l border-white/15 bg-white/5" />
          <div className="flex-1 border-l border-t border-white/15 bg-white/[.03]" />
        </div>

        {/* Optional grid */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none opacity-[.16]">
            {Array.from({ length: TRAILER_COLS - 1 }).map((_, i) => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${pctX(i + 1)}%` }} />
            ))}
            {Array.from({ length: TRAILER_ROWS - 1 }).map((_, i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-white" style={{ top: `${pctY(i + 1)}%` }} />
            ))}
          </div>
        )}

        {/* Intermediate divider wall */}
        {divider && (
          <div className="absolute top-0 bottom-0 w-[3px] bg-gradient-to-b from-lbc-blue/80 to-lbc-blue/30 shadow-[0_0_10px_rgba(42,138,224,.6)]" style={{ left: '49%' }} />
        )}

        {/* Items */}
        {items.map(it => {
          const fx = itemFx[it.uid] ?? {}
          const selected = selectedUid === it.uid
          return (
            <div
              key={it.uid}
              onPointerDown={onItemPointerDown ? e => onItemPointerDown(it.uid, e) : undefined}
              className="absolute rounded-lg flex items-center justify-center overflow-hidden touch-none"
              style={{
                left: `calc(${pctX(it.col)}% + 2px)`,
                top: `calc(${pctY(it.row)}% + 2px)`,
                width: `calc(${pctX(it.cols)}% - 4px)`,
                height: `calc(${pctY(it.rows)}% - 4px)`,
                transform: `translate(${fx.dx ?? 0}px, ${fx.dy ?? 0}px) rotate(${fx.rot ?? 0}deg)`,
                transition: 'transform 0.3s cubic-bezier(.3,1.4,.5,1)',
                zIndex: selected ? 30 : 10,
                cursor: onItemPointerDown ? 'grab' : 'default',
              }}
            >
              <div
                className="w-full h-full rounded-lg relative flex flex-col items-center justify-center"
                style={{
                  background: `linear-gradient(150deg, ${it.type.color2}, ${it.type.color})`,
                  border: selected ? '2px solid #fff' : `1.5px solid ${it.type.color2}`,
                  boxShadow: fx.damaged
                    ? '0 0 0 2px rgba(224,64,32,.8), 0 6px 14px rgba(0,0,0,.4)'
                    : selected
                    ? '0 0 18px rgba(255,255,255,.5), 0 6px 14px rgba(0,0,0,.4)'
                    : '0 5px 12px rgba(0,0,0,.4)',
                }}
              >
                {/* top highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/4 bg-white/20 rounded-t-lg pointer-events-none" />
                {/* right shade for 3D */}
                <div className="absolute top-0 right-0 bottom-0 w-1/5 bg-black/20 pointer-events-none" />
                <span className="relative leading-none" style={{ fontSize: 'min(4vw, 22px)' }}>{it.type.emoji}</span>
                {it.rows >= 2 && (
                  <span className="relative mt-0.5 px-1 text-[8px] font-bold text-white/90 leading-tight text-center line-clamp-1">
                    {it.type.name}
                  </span>
                )}
                {fx.damaged && (
                  <span className="absolute top-0.5 right-0.5 text-[10px]">💥</span>
                )}
              </div>
            </div>
          )
        })}

        {/* Drag ghost */}
        {ghost && (
          <div
            className="absolute rounded-lg pointer-events-none"
            style={{
              left: `${pctX(ghost.col)}%`,
              top: `${pctY(ghost.row)}%`,
              width: `${pctX(ghost.cols)}%`,
              height: `${pctY(ghost.rows)}%`,
              border: `2px dashed ${ghost.valid ? '#00a34c' : '#e04020'}`,
              background: ghost.valid ? 'rgba(39,163,73,.18)' : 'rgba(224,64,32,.16)',
              zIndex: 40,
            }}
          />
        )}

        {/* Tension straps overlay */}
        {strapYs.map((y, i) => (
          <div key={`strap${i}`} className="absolute left-0 right-0 pointer-events-none" style={{ top: `${y * 100}%`, zIndex: 35 }}>
            <div className="h-[5px] bg-gradient-to-r from-amber-300/90 via-amber-400 to-amber-300/90 shadow-[0_0_8px_rgba(245,180,40,.7)]" />
            <div className="absolute left-1 -top-1 w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-500" />
            <div className="absolute right-1 -top-1 w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-500" />
          </div>
        ))}

        {/* Rear load net */}
        {net && (
          <div className="absolute top-0 bottom-0 right-1 w-10 pointer-events-none opacity-70"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.4) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,.4) 0 1px, transparent 1px 7px)',
            }}
          />
        )}
      </div>

      {/* Floor / chassis with wheels */}
      <div className="absolute left-0 right-0 bottom-3 h-2 rounded bg-gradient-to-b from-[#2a2f2a] to-[#151915] border-y border-black/40" />
      <div className="absolute bottom-0 flex gap-1.5" style={{ left: '14%' }}>
        {[0, 1].map(i => <div key={i} className="w-4 h-4 rounded-full bg-[#1a1d1a] border-2 border-[#333]" />)}
      </div>
      <div className="absolute bottom-0 flex gap-1.5" style={{ right: '12%' }}>
        {[0, 1, 2].map(i => <div key={i} className="w-4 h-4 rounded-full bg-[#1a1d1a] border-2 border-[#333]" />)}
      </div>

      {/* Labels */}
      <div className="absolute -bottom-0.5 left-1 text-[8px] font-bold uppercase tracking-wider text-white/30">Fram</div>
      <div className="absolute -bottom-0.5 right-1 text-[8px] font-bold uppercase tracking-wider text-white/30">Bak</div>
    </div>
  )
}

export const TrailerView = memo(TrailerViewBase)
