import { useId } from 'react'
import type { EquippedParts, PartCategory, TruckPart } from '../../types'
import { PART_BY_ID, PART_RARITY_COLORS } from '../../data/garageParts'

type View = 'side' | 'front' | 'back'

interface Props {
  equipped: EquippedParts
  view?: View
  className?: string
}

/**
 * Premium, build-able LBC truck rendered as layered SVG.
 * Cosmetic parts (front bar, roof lights, side skirts, wheels, decals)
 * are composited based on the player's equipped loadout.
 */
export function TruckPreview({ equipped, view = 'side', className = '' }: Props) {
  const uid = useId().replace(/:/g, '')

  const part = (c: PartCategory): TruckPart | undefined =>
    equipped[c] ? PART_BY_ID[equipped[c]!] : undefined
  const accent = (c: PartCategory, fallback: string): string => {
    const p = part(c)
    return p ? PART_RARITY_COLORS[p.rarity] : fallback
  }
  const has = (c: PartCategory) => Boolean(equipped[c])
  const isLegendary = (c: PartCategory) => part(c)?.rarity === 'legendary'

  const cab = '#1f6b30'
  const cabDark = '#15521f'
  const box = '#e7ebe8'
  const boxShade = '#c9d1cb'

  const wheelRim = accent('wheels', '#3a3f3c')
  const sideColor = accent('side', '#7c8a80')
  const decorColor = accent('decor', '#1a7e34')
  const frontColor = accent('front', '#9aa3a0')
  const roofColor = accent('roof', '#d4a017')

  return (
    <svg viewBox="0 0 360 200" className={className} role="img" aria-label="LBC lastbil">
      <defs>
        <linearGradient id={`${uid}-cab`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a8a40" />
          <stop offset="1" stopColor={cabDark} />
        </linearGradient>
        <linearGradient id={`${uid}-box`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7f4" />
          <stop offset="1" stopColor={boxShade} />
        </linearGradient>
        <radialGradient id={`${uid}-floor`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(39,163,73,.22)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255,240,180,.95)" />
          <stop offset="1" stopColor="rgba(255,240,180,0)" />
        </radialGradient>
      </defs>

      {/* floor light pool */}
      <ellipse cx="180" cy="178" rx="150" ry="20" fill={`url(#${uid}-floor)`} />

      {view === 'side' && (
        <SideView
          uid={uid} cab={cab} cabDark={cabDark} box={box}
          wheelRim={wheelRim} sideColor={sideColor} decorColor={decorColor}
          frontColor={frontColor} roofColor={roofColor}
          has={has} isLegendary={isLegendary}
        />
      )}
      {view === 'front' && (
        <FrontView uid={uid} frontColor={frontColor} roofColor={roofColor} has={has} isLegendary={isLegendary} wheelRim={wheelRim} />
      )}
      {view === 'back' && (
        <BackView box={box} decorColor={decorColor} sideColor={sideColor} has={has} wheelRim={wheelRim} />
      )}
    </svg>
  )
}

// ─── Side view ──────────────────────────────────────────────────────────────
function SideView(p: {
  uid: string; cab: string; cabDark: string; box: string
  wheelRim: string; sideColor: string; decorColor: string; frontColor: string; roofColor: string
  has: (c: PartCategory) => boolean; isLegendary: (c: PartCategory) => boolean
}) {
  const { uid, box, wheelRim, sideColor, decorColor, frontColor, roofColor, has, isLegendary } = p
  return (
    <g>
      {/* trailer box */}
      <rect x="24" y="58" width="196" height="86" rx="6" fill={`url(#${uid}-box)`} stroke="#aeb8b0" strokeWidth="1.5" />
      <rect x="24" y="58" width="196" height="14" rx="6" fill="#ffffff" opacity=".5" />
      {/* decals / stripe */}
      {has('decor') && (
        <>
          <rect x="24" y="104" width="196" height="12" fill={decorColor} opacity=".9" />
          <text x="120" y="92" textAnchor="middle" fontSize="22" fontWeight="900" fill={decorColor} fontFamily="'Space Grotesk',sans-serif" letterSpacing="2">LBC</text>
        </>
      )}
      {!has('decor') && (
        <text x="120" y="106" textAnchor="middle" fontSize="20" fontWeight="900" fill="#b9c2bb" fontFamily="'Space Grotesk',sans-serif" letterSpacing="2">LBC</text>
      )}

      {/* side skirt */}
      {has('side') && <rect x="40" y="138" width="180" height="12" rx="3" fill={sideColor} />}

      {/* cab */}
      <path d="M226 70 L300 70 Q318 70 320 96 L322 134 Q322 144 312 144 L226 144 Z" fill={`url(#${uid}-cab)`} stroke="#0e3c18" strokeWidth="1.5" />
      {/* window */}
      <path d="M236 80 L296 80 Q306 80 308 98 L309 108 L236 108 Z" fill="#bfe5f5" opacity=".92" />
      <path d="M236 80 L296 80 Q306 80 308 98 L309 108 L236 108 Z" fill="#ffffff" opacity=".12" />
      {/* door line */}
      <line x1="262" y1="108" x2="262" y2="144" stroke="#0e3c18" strokeWidth="1.2" opacity=".6" />

      {/* roof light bar */}
      {has('roof') && (
        <g>
          <rect x="244" y="62" width="56" height="9" rx="3" fill="#1a1f1c" />
          {[0, 1, 2, 3].map(i => (
            <circle key={i} cx={252 + i * 14} cy={66} r="3" fill={roofColor}>
              {isLegendary('roof') && <animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      )}

      {/* front bull bar + lights */}
      {has('front') && (
        <g>
          <rect x="320" y="96" width="8" height="46" rx="3" fill={frontColor} />
          <rect x="316" y="104" width="14" height="5" rx="2" fill={frontColor} />
          <rect x="316" y="124" width="14" height="5" rx="2" fill={frontColor} />
          <circle cx="332" cy="100" r="5" fill="#fff3b0" />
          {isLegendary('front') && (
            <circle cx="332" cy="100" r="11" fill={`url(#${uid}-glow)`}>
              <animate attributeName="r" values="9;13;9" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      )}
      {/* headlight */}
      <rect x="316" y="128" width="7" height="9" rx="2" fill="#ffe9a8" />

      {/* wheels */}
      {[70, 150, 286].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy="150" r="20" fill="#151816" />
          <circle cx={cx} cy="150" r="11" fill={wheelRim} />
          <circle cx={cx} cy="150" r="4" fill="#0c0e0d" />
        </g>
      ))}
    </g>
  )
}

// ─── Front view ─────────────────────────────────────────────────────────────
function FrontView(p: {
  uid: string; frontColor: string; roofColor: string; wheelRim: string
  has: (c: PartCategory) => boolean; isLegendary: (c: PartCategory) => boolean
}) {
  const { uid, frontColor, roofColor, wheelRim, has, isLegendary } = p
  return (
    <g>
      {/* cab body */}
      <rect x="118" y="50" width="124" height="110" rx="10" fill={`url(#${uid}-cab)`} stroke="#0e3c18" strokeWidth="1.5" />
      {/* windscreen */}
      <rect x="130" y="62" width="100" height="40" rx="6" fill="#bfe5f5" opacity=".92" />
      <rect x="130" y="62" width="100" height="40" rx="6" fill="#ffffff" opacity=".1" />
      {/* grille */}
      <rect x="142" y="112" width="76" height="30" rx="4" fill="#143f1c" />
      {[0, 1, 2].map(i => <rect key={i} x="148" y={118 + i * 8} width="64" height="3" rx="1.5" fill="#2a8a40" />)}
      {/* mirrors */}
      <rect x="108" y="74" width="10" height="26" rx="3" fill="#143f1c" />
      <rect x="242" y="74" width="10" height="26" rx="3" fill="#143f1c" />

      {/* roof light bar */}
      {has('roof') && (
        <g>
          <rect x="138" y="42" width="84" height="10" rx="3" fill="#1a1f1c" />
          {[0, 1, 2, 3, 4].map(i => (
            <circle key={i} cx={150 + i * 16} cy={47} r="3.4" fill={roofColor}>
              {isLegendary('roof') && <animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      )}

      {/* bull bar */}
      {has('front') && (
        <g>
          <rect x="138" y="120" width="84" height="6" rx="3" fill={frontColor} />
          <rect x="150" y="108" width="6" height="44" rx="3" fill={frontColor} />
          <rect x="204" y="108" width="6" height="44" rx="3" fill={frontColor} />
          <rect x="177" y="108" width="6" height="44" rx="3" fill={frontColor} />
          {/* LED pods */}
          {['front'].map(() => (
            <g key="leds">
              <circle cx="158" cy="104" r="5" fill="#fff3b0" />
              <circle cx="202" cy="104" r="5" fill="#fff3b0" />
            </g>
          ))}
          {isLegendary('front') && (
            <rect x="138" y="100" width="84" height="10" rx="5" fill={`url(#${uid}-glow)`}>
              <animate attributeName="opacity" values=".6;1;.6" dur="1.5s" repeatCount="indefinite" />
            </rect>
          )}
        </g>
      )}

      {/* headlights */}
      <rect x="126" y="128" width="14" height="12" rx="3" fill="#ffe9a8" />
      <rect x="220" y="128" width="14" height="12" rx="3" fill="#ffe9a8" />

      {/* wheels */}
      {[124, 236].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 12} y="150" width="24" height="22" rx="6" fill="#151816" />
          <circle cx={cx} cy="161" r="7" fill={wheelRim} />
        </g>
      ))}
    </g>
  )
}

// ─── Back view ──────────────────────────────────────────────────────────────
function BackView(p: {
  box: string; decorColor: string; sideColor: string; wheelRim: string
  has: (c: PartCategory) => boolean
}) {
  const { decorColor, sideColor, wheelRim, has } = p
  return (
    <g>
      {/* trailer rear */}
      <rect x="108" y="44" width="144" height="120" rx="6" fill="#dfe5e0" stroke="#aeb8b0" strokeWidth="1.5" />
      {/* doors */}
      <line x1="180" y1="48" x2="180" y2="160" stroke="#9aa6a0" strokeWidth="2" />
      <rect x="120" y="86" width="40" height="10" rx="2" fill="#b8c2bb" />
      <rect x="200" y="86" width="40" height="10" rx="2" fill="#b8c2bb" />
      {/* handles */}
      <rect x="172" y="92" width="4" height="30" rx="2" fill="#6f7a73" />
      <rect x="184" y="92" width="4" height="30" rx="2" fill="#6f7a73" />

      {/* decals */}
      {has('decor') && (
        <text x="180" y="74" textAnchor="middle" fontSize="20" fontWeight="900" fill={decorColor} fontFamily="'Space Grotesk',sans-serif" letterSpacing="2">LBC</text>
      )}

      {/* side skirt edge */}
      {has('side') && <rect x="112" y="150" width="136" height="10" rx="3" fill={sideColor} />}

      {/* rear lights */}
      <rect x="116" y="150" width="16" height="12" rx="3" fill="#e0402a" />
      <rect x="228" y="150" width="16" height="12" rx="3" fill="#e0402a" />

      {/* wheels peeking */}
      {[128, 232].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 12} y="160" width="24" height="14" rx="5" fill="#151816" />
          <circle cx={cx} cy="167" r="5" fill={wheelRim} />
        </g>
      ))}
    </g>
  )
}
