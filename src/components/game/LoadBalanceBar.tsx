import { memo } from 'react'
import {
  COM_TOLERANCE,
  IDEAL_COM_COL,
  TRAILER_COLS,
  type WeightProfile,
} from '../../utils/loadEngine'

interface Props {
  profil: WeightProfile
  className?: string
}

const pct = (col: number) => (col / TRAILER_COLS) * 100

/** Hur mycket av mätarens höjd den tyngsta kolumnen får ta. */
const MAX_STAPEL = 0.92

/**
 * Var vikten ligger, ritad i linje med lastrutnätet.
 *
 * Balanssiffran i mätarraden säger ATT lasten är sned men inte ÅT VILKET HÅLL,
 * och det gör balansen till en gissningslek: spelaren flyttar gods och ser en
 * siffra röra sig utan att veta varför. Den här stapeln delar x-axel med
 * trailern ovanför, så en tung kolumn syns rakt under det gods som orsakar den
 * och tyngdpunktsmarkören pekar på den kolumn som behöver avlastas.
 *
 * Målfönstret är medvetet ett BAND och inte en linje. Perfekt balans är varken
 * uppnåelig eller nödvändig; det som ska undvikas är att ligga utanför.
 */
function LoadBalanceBarBase({ profil, className = '' }: Props) {
  const { totalWeight, comCol, perColumn, heaviestColumn, frontAxlePct, rearAxlePct } = profil
  const tom = totalWeight <= 0

  const avvikelse = comCol - IDEAL_COM_COL
  const utanfor = Math.abs(avvikelse) > COM_TOLERANCE
  const kritisk = Math.abs(avvikelse) > COM_TOLERANCE * 2
  const markorfarg = tom ? '#9aa0a8' : kritisk ? '#d93025' : utanfor ? '#e08a1e' : '#00843e'

  const fonsterVanster = pct(Math.max(0, IDEAL_COM_COL - COM_TOLERANCE))
  const fonsterBredd = pct(Math.min(TRAILER_COLS, 2 * COM_TOLERANCE))

  return (
    <div className={`px-4 mt-1 loading-balance ${className}`}>
      <div className="relative h-[26px] bg-[#0e1310] border border-black/15 overflow-hidden">
        {/* Vikt per kolumn. */}
        {perColumn.map((kg, i) => {
          const h = heaviestColumn > 0 ? (kg / heaviestColumn) * MAX_STAPEL : 0
          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                left: `calc(${pct(i)}% + 1px)`,
                width: `calc(${pct(1)}% - 2px)`,
                height: `${h * 100}%`,
                background:
                  h > 0
                    ? 'linear-gradient(180deg, rgba(120,220,160,.95), rgba(0,132,62,.7))'
                    : 'transparent',
                transition: 'height 180ms ease-out',
              }}
            />
          )
        })}

        {/* Målfönstret för tyngdpunkten. Ritas ÖVER staplarna — annars döljs det
            så fort lasten blir hög, och då försvinner just den referens som gör
            markörens läge begripligt. */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: `${fonsterVanster}%`,
            width: `${fonsterBredd}%`,
            borderLeft: '1px dashed rgba(255,255,255,.5)',
            borderRight: '1px dashed rgba(255,255,255,.5)',
            background: 'rgba(255,255,255,.07)',
          }}
        />

        {/* Tyngdpunkten. */}
        {!tom && (
          <div
            className="absolute top-0 bottom-0 w-[3px] pointer-events-none"
            style={{
              left: `calc(${pct(comCol)}% - 1.5px)`,
              background: markorfarg,
              boxShadow: `0 0 8px ${markorfarg}, 0 0 2px #000`,
              transition: 'left 220ms ease-out',
            }}
          >
            <div
              className="absolute -top-px -left-[3.5px] w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `6px solid ${markorfarg}`,
              }}
            />
            <div
              className="absolute -bottom-px -left-[3.5px] w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: `6px solid ${markorfarg}`,
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-0.5 text-[8px] font-black uppercase tracking-[0.16em]">
        <span className="text-black/45">
          Framaxel <span className="text-[#0a0a0a]">{tom ? '–' : `${frontAxlePct}%`}</span>
        </span>
        <span style={{ color: markorfarg }}>
          {tom
            ? 'Tom'
            : kritisk
            ? avvikelse > 0
              ? 'Kraftigt baktung'
              : 'Kraftigt framtung'
            : utanfor
            ? avvikelse > 0
              ? 'Baktung'
              : 'Framtung'
            : 'Balanserad'}
          {' · '}
          <span className="text-black/55">{totalWeight.toLocaleString('sv-SE')} kg</span>
        </span>
        <span className="text-black/45">
          <span className="text-[#0a0a0a]">{tom ? '–' : `${rearAxlePct}%`}</span> Boggi
        </span>
      </div>
    </div>
  )
}

export const LoadBalanceBar = memo(LoadBalanceBarBase)
