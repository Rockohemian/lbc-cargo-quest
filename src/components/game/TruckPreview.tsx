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
 * LBC lastbil i verkstadsmässig look — vit karosseri, grön italic LBC-logga,
 * ekomeddelande på flaket. Matchar de verkliga LBCfrakt-bilarna.
 * Kosmetiska delar (front, tak, sida, hjul, decor) läggs på top av basen.
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

  const wheelRim = accent('wheels', '#2a2f2c')
  const sideColor = accent('side', '#1a7e34')
  const decorColor = accent('decor', '#1a7e34')
  const frontColor = accent('front', '#c4ccc7')
  const roofColor = accent('roof', '#d4a017')

  const GREEN = '#1a7e34'

  return (
    <svg viewBox="0 0 360 200" className={className} role="img" aria-label="LBC lastbil">
      <defs>
        {/* Vit karosseri med subtil skuggning */}
        <linearGradient id={`${uid}-white`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#f5f7f5" />
          <stop offset="1" stopColor="#dde3de" />
        </linearGradient>
        {/* Vindruta */}
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5aa8c8" />
          <stop offset="1" stopColor="#2f6f8a" />
        </linearGradient>
        {/* Skugga under bilen */}
        <radialGradient id={`${uid}-floor`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,.32)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        {/* Ljus från strålkastare / roof-glow */}
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255,240,180,.95)" />
          <stop offset="1" stopColor="rgba(255,240,180,0)" />
        </radialGradient>
      </defs>

      {/* Skugga under bilen */}
      <ellipse cx="180" cy="182" rx="160" ry="10" fill={`url(#${uid}-floor)`} />

      {view === 'side' && (
        <SideView
          uid={uid} green={GREEN}
          wheelRim={wheelRim} sideColor={sideColor} decorColor={decorColor}
          frontColor={frontColor} roofColor={roofColor}
          has={has} isLegendary={isLegendary}
        />
      )}
      {view === 'front' && (
        <FrontView
          uid={uid} green={GREEN}
          frontColor={frontColor} roofColor={roofColor} wheelRim={wheelRim}
          has={has} isLegendary={isLegendary}
        />
      )}
      {view === 'back' && (
        <BackView
          uid={uid} green={GREEN}
          decorColor={decorColor} sideColor={sideColor} wheelRim={wheelRim}
          has={has}
        />
      )}
    </svg>
  )
}

// ─── Side view ────────────────────────────────────────────────────────────
function SideView(p: {
  uid: string; green: string
  wheelRim: string; sideColor: string; decorColor: string; frontColor: string; roofColor: string
  has: (c: PartCategory) => boolean; isLegendary: (c: PartCategory) => boolean
}) {
  const { uid, green, wheelRim, sideColor, decorColor, frontColor, roofColor, has, isLegendary } = p
  return (
    <g>
      {/* ── Släpvagn / box ── */}
      <rect x="20" y="58" width="200" height="92" rx="4" fill={`url(#${uid}-white)`} stroke="#c8d0cb" strokeWidth="1.2" />
      {/* Övre highlight */}
      <rect x="20" y="58" width="200" height="10" rx="4" fill="#ffffff" opacity=".7" />
      {/* Underkantslinje */}
      <line x1="24" y1="145" x2="216" y2="145" stroke="#b8c2bb" strokeWidth="0.8" />
      {/* Panellinjer */}
      {[70, 120, 170].map((x, i) => (
        <line key={i} x1={x} y1="62" x2={x} y2="145" stroke="#d5dcd7" strokeWidth="0.8" />
      ))}

      {/* Grön ekotext-remsa upptill */}
      <text
        x="42" y="82" fontSize="7.5" fontWeight="700" fill={green}
        fontFamily="'Manrope','Space Grotesk',sans-serif" letterSpacing="0.2"
      >
        Den här elhybriden är på god väg
      </text>
      <text
        x="42" y="92" fontSize="7.5" fontWeight="700" fill={green}
        fontFamily="'Manrope','Space Grotesk',sans-serif" letterSpacing="0.2"
      >
        mot fossilfria transporter
      </text>

      {/* Diagonal LBC-logga (stor, italic, grön) — LBC's signaturlogga */}
      <g transform="translate(122,124)">
        <text
          x="0" y="0" fontSize="42" fontWeight="900"
          fill={decorColor}
          fontFamily="'Space Grotesk','Manrope',sans-serif"
          fontStyle="italic"
          letterSpacing="-1"
          transform="skewX(-14)"
        >
          LBC
        </text>
      </g>
      {/* www.lbcfrakt.com under loggan */}
      <text
        x="185" y="140" fontSize="5.5" fontWeight="600" fill={green}
        fontFamily="'Manrope',sans-serif" opacity="0.85"
      >
        www.lbcfrakt.com
      </text>

      {/* Grön dekor-remsa i botten om utrustad */}
      {has('decor') && (
        <rect x="20" y="140" width="200" height="4" fill={decorColor} opacity=".85" />
      )}

      {/* Sidoskörtar */}
      {has('side') && <rect x="36" y="148" width="184" height="8" rx="2" fill={sideColor} opacity=".9" />}

      {/* ── Förarhytt (vit Scania-lookalike) ── */}
      {/* Chassisram bakom hytten */}
      <rect x="220" y="130" width="10" height="18" fill="#4a4f4c" />
      {/* Hyttkropp */}
      <path
        d="M228 78 L302 78 Q316 78 320 102 L322 138 Q322 148 312 148 L228 148 Z"
        fill={`url(#${uid}-white)`}
        stroke="#c8d0cb" strokeWidth="1.2"
      />
      {/* Grön nedre remsa på hytten (som riktiga LBC-bilar) */}
      <rect x="228" y="138" width="94" height="10" fill={green} opacity=".92" />
      {/* Vindruta */}
      <path
        d="M240 86 L298 86 Q308 86 311 102 L312 116 L240 116 Z"
        fill={`url(#${uid}-glass)`}
        opacity=".9"
      />
      <path
        d="M240 86 L298 86 Q308 86 311 102 L312 116 L240 116 Z"
        fill="#ffffff" opacity=".18"
      />
      {/* Sidoruta bakom förarrutan */}
      <rect x="232" y="118" width="14" height="18" rx="1" fill={`url(#${uid}-glass)`} opacity=".85" />
      {/* Dörrhandtag */}
      <rect x="270" y="128" width="10" height="2" rx="1" fill="#6f7a73" />
      {/* Dörrskarv */}
      <line x1="266" y1="116" x2="266" y2="148" stroke="#c8d0cb" strokeWidth="0.8" />

      {/* Liten LBC-logga på hyttdörren */}
      <text
        x="248" y="134" fontSize="14" fontWeight="900"
        fill={decorColor}
        fontFamily="'Space Grotesk',sans-serif"
        fontStyle="italic"
        letterSpacing="-0.5"
        transform="skewX(-14) translate(-32,0)"
      >
        LBC
      </text>

      {/* Taklyktor */}
      {has('roof') && (
        <g>
          <rect x="246" y="70" width="60" height="8" rx="2" fill="#1a1f1c" />
          {[0, 1, 2, 3].map(i => (
            <circle key={i} cx={254 + i * 14} cy={74} r="2.5" fill={roofColor}>
              {isLegendary('roof') && <animate attributeName="opacity" values="1;.35;1" dur="1.4s" repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      )}

      {/* Bull bar / front-utrustning */}
      {has('front') && (
        <g>
          <rect x="322" y="106" width="6" height="34" rx="2" fill={frontColor} stroke="#8a938e" strokeWidth="0.6" />
          <rect x="318" y="112" width="12" height="4" rx="1" fill={frontColor} />
          <rect x="318" y="128" width="12" height="4" rx="1" fill={frontColor} />
          <circle cx="331" cy="108" r="4" fill="#fff3b0" stroke="#c9a020" strokeWidth="0.6" />
          {isLegendary('front') && (
            <circle cx="331" cy="108" r="10" fill={`url(#${uid}-glow)`}>
              <animate attributeName="r" values="8;12;8" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      )}

      {/* Strålkastare (standard) */}
      <rect x="316" y="130" width="8" height="8" rx="1.5" fill="#ffe9a8" />

      {/* Grill */}
      <rect x="316" y="140" width="8" height="8" rx="1" fill="#c8d0cb" />

      {/* ── Hjul (kabin: 1 axel, släp: 2 axlar bakom) ── */}
      {/* Släphjul */}
      {[62, 100, 168].map((cx, i) => (
        <g key={`t${i}`}>
          <circle cx={cx} cy="152" r="18" fill="#1a1f1c" />
          <circle cx={cx} cy="152" r="16" fill="#2b3230" stroke="#0e1210" strokeWidth="0.8" />
          <circle cx={cx} cy="152" r="9" fill={wheelRim} />
          <circle cx={cx} cy="152" r="3" fill="#0c0e0d" />
          {/* Ekrar */}
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <line
              key={deg}
              x1={cx} y1="152"
              x2={cx + Math.cos((deg * Math.PI) / 180) * 8}
              y2={152 + Math.sin((deg * Math.PI) / 180) * 8}
              stroke="#0c0e0d" strokeWidth="1.2"
            />
          ))}
        </g>
      ))}
      {/* Hyttshjul */}
      <g>
        <circle cx="290" cy="152" r="18" fill="#1a1f1c" />
        <circle cx="290" cy="152" r="16" fill="#2b3230" stroke="#0e1210" strokeWidth="0.8" />
        <circle cx="290" cy="152" r="9" fill={wheelRim} />
        <circle cx="290" cy="152" r="3" fill="#0c0e0d" />
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <line
            key={deg}
            x1="290" y1="152"
            x2={290 + Math.cos((deg * Math.PI) / 180) * 8}
            y2={152 + Math.sin((deg * Math.PI) / 180) * 8}
            stroke="#0c0e0d" strokeWidth="1.2"
          />
        ))}
      </g>
    </g>
  )
}

// ─── Front view ────────────────────────────────────────────────────────────
function FrontView(p: {
  uid: string; green: string
  frontColor: string; roofColor: string; wheelRim: string
  has: (c: PartCategory) => boolean; isLegendary: (c: PartCategory) => boolean
}) {
  const { uid, green, frontColor, roofColor, wheelRim, has, isLegendary } = p
  return (
    <g>
      {/* Hyttkropp (vit) */}
      <rect x="112" y="50" width="136" height="112" rx="8" fill={`url(#${uid}-white)`} stroke="#c8d0cb" strokeWidth="1.2" />
      {/* Övre highlight */}
      <rect x="112" y="50" width="136" height="12" rx="8" fill="#ffffff" opacity=".7" />
      {/* Grön nedre remsa */}
      <rect x="112" y="146" width="136" height="16" fill={green} opacity=".92" />

      {/* Vindruta */}
      <rect x="126" y="66" width="108" height="42" rx="4" fill={`url(#${uid}-glass)`} opacity=".92" />
      <rect x="126" y="66" width="108" height="42" rx="4" fill="#ffffff" opacity=".12" />

      {/* Grill med LBC-text (dekorativ) */}
      <rect x="138" y="114" width="84" height="26" rx="3" fill="#e5eae7" stroke="#c8d0cb" strokeWidth="0.8" />
      {[0, 1, 2].map(i => (
        <rect key={i} x="144" y={118 + i * 7} width="72" height="2.5" rx="1" fill="#c8d0cb" />
      ))}
      <text
        x="180" y="132" textAnchor="middle" fontSize="11" fontWeight="900"
        fill={green} fontFamily="'Space Grotesk',sans-serif" fontStyle="italic"
        transform="skewX(-14) translate(43,0)"
      >
        LBC
      </text>

      {/* Backspeglar */}
      <rect x="102" y="76" width="10" height="30" rx="2" fill="#c8d0cb" stroke="#8a938e" strokeWidth="0.6" />
      <rect x="248" y="76" width="10" height="30" rx="2" fill="#c8d0cb" stroke="#8a938e" strokeWidth="0.6" />

      {/* Taklyktor */}
      {has('roof') && (
        <g>
          <rect x="130" y="42" width="100" height="10" rx="2" fill="#1a1f1c" />
          {[0, 1, 2, 3, 4].map(i => (
            <circle key={i} cx={142 + i * 18} cy={47} r="3.2" fill={roofColor}>
              {isLegendary('roof') && <animate attributeName="opacity" values="1;.35;1" dur="1.4s" repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      )}

      {/* Bull bar / front-tillägg */}
      {has('front') && (
        <g>
          <rect x="130" y="120" width="100" height="4" rx="2" fill={frontColor} />
          <rect x="146" y="106" width="4" height="42" rx="2" fill={frontColor} />
          <rect x="210" y="106" width="4" height="42" rx="2" fill={frontColor} />
          <rect x="178" y="106" width="4" height="42" rx="2" fill={frontColor} />
          <circle cx="156" cy="104" r="4" fill="#fff3b0" />
          <circle cx="204" cy="104" r="4" fill="#fff3b0" />
          {isLegendary('front') && (
            <rect x="130" y="98" width="100" height="10" rx="5" fill={`url(#${uid}-glow)`}>
              <animate attributeName="opacity" values=".6;1;.6" dur="1.5s" repeatCount="indefinite" />
            </rect>
          )}
        </g>
      )}

      {/* Strålkastare */}
      <rect x="120" y="130" width="14" height="10" rx="2" fill="#ffe9a8" />
      <rect x="226" y="130" width="14" height="10" rx="2" fill="#ffe9a8" />

      {/* Hjul */}
      {[120, 240].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 14} y="152" width="28" height="22" rx="4" fill="#1a1f1c" />
          <circle cx={cx} cy="163" r="7" fill={wheelRim} />
        </g>
      ))}
    </g>
  )
}

// ─── Back view ─────────────────────────────────────────────────────────────
function BackView(p: {
  uid: string; green: string
  decorColor: string; sideColor: string; wheelRim: string
  has: (c: PartCategory) => boolean
}) {
  const { uid, green, decorColor, sideColor, wheelRim, has } = p
  return (
    <g>
      {/* Bakre trailer-dörrar */}
      <rect x="100" y="44" width="160" height="120" rx="4" fill={`url(#${uid}-white)`} stroke="#c8d0cb" strokeWidth="1.2" />
      {/* Övre highlight */}
      <rect x="100" y="44" width="160" height="8" rx="4" fill="#ffffff" opacity=".7" />
      {/* Grön nedre remsa */}
      <rect x="100" y="156" width="160" height="8" fill={green} opacity=".9" />

      {/* Vertikal dörrskarv */}
      <line x1="180" y1="48" x2="180" y2="160" stroke="#b8c2bb" strokeWidth="1.5" />
      {/* Dörrhandtag/lås */}
      <rect x="172" y="90" width="4" height="34" rx="2" fill="#6f7a73" />
      <rect x="184" y="90" width="4" height="34" rx="2" fill="#6f7a73" />
      {/* Gångjärn */}
      {[64, 104, 144].map((y, i) => (
        <g key={i}>
          <rect x="102" y={y} width="6" height="10" rx="1" fill="#8a938e" />
          <rect x="252" y={y} width="6" height="10" rx="1" fill="#8a938e" />
        </g>
      ))}

      {/* Diagonal LBC-logga över dörrarna */}
      <text
        x="180" y="86" textAnchor="middle" fontSize="30" fontWeight="900"
        fill={decorColor} fontFamily="'Space Grotesk',sans-serif" fontStyle="italic"
        transform="skewX(-14) translate(21,0)"
      >
        LBC
      </text>

      {/* Sidoskörtar */}
      {has('side') && <rect x="104" y="164" width="152" height="6" rx="2" fill={sideColor} />}

      {/* Röda baklyktor */}
      <rect x="108" y="146" width="16" height="10" rx="2" fill="#e04020" />
      <rect x="236" y="146" width="16" height="10" rx="2" fill="#e04020" />

      {/* Hjul som sticker ut */}
      {[124, 236].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 12} y="166" width="24" height="12" rx="4" fill="#1a1f1c" />
          <circle cx={cx} cy="172" r="5" fill={wheelRim} />
        </g>
      ))}
    </g>
  )
}