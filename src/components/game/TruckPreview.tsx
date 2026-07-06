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
 * LBC 24-meters ekipage — dragbil (Volvo/Scania-typ) + trailer.
 * Vit karosseri med officiell LBCfrakt-logotyp (grön #00843e).
 */
export function TruckPreview({ equipped, view = 'side', className = '' }: Props) {
  const uid = useId().replace(/:/g, '')
  const LOGO = import.meta.env.BASE_URL + 'assets/lbc-logo.png'

  const part = (c: PartCategory): TruckPart | undefined =>
    equipped[c] ? PART_BY_ID[equipped[c]!] : undefined
  const accent = (c: PartCategory, fallback: string): string => {
    const p = part(c)
    return p ? PART_RARITY_COLORS[p.rarity] : fallback
  }
  const has = (c: PartCategory) => Boolean(equipped[c])
  const isLegendary = (c: PartCategory) => part(c)?.rarity === 'legendary'

  const wheelRim = accent('wheels', '#26302b')
  const sideColor = accent('side', '#00843e')
  const decorColor = accent('decor', '#00843e')
  const frontColor = accent('front', '#c4ccc7')
  const roofColor = accent('roof', '#d4a017')

  const GREEN = '#00843e'

  return (
    <svg viewBox="0 0 480 220" className={className} role="img" aria-label="LBC 24-meters ekipage">
      <defs>
        <linearGradient id={`${uid}-white`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f2f4f2" />
          <stop offset="1" stopColor="#c8d0cb" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6bb2ce" />
          <stop offset="1" stopColor="#2a627d" />
        </linearGradient>
        <linearGradient id={`${uid}-tarmac`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(0,0,0,0)" />
          <stop offset="0.5" stopColor="rgba(0,0,0,.28)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255,240,180,.95)" />
          <stop offset="1" stopColor="rgba(255,240,180,0)" />
        </radialGradient>
      </defs>

      {/* Vägmarkskugga */}
      <ellipse cx="240" cy="204" rx="220" ry="6" fill={`url(#${uid}-tarmac)`} />

      {view === 'side' && (
        <SideView
          uid={uid} logo={LOGO} green={GREEN}
          wheelRim={wheelRim} sideColor={sideColor} decorColor={decorColor}
          frontColor={frontColor} roofColor={roofColor}
          has={has} isLegendary={isLegendary}
        />
      )}
      {view === 'front' && (
        <FrontView
          uid={uid} logo={LOGO} green={GREEN}
          frontColor={frontColor} roofColor={roofColor} wheelRim={wheelRim}
          has={has} isLegendary={isLegendary}
        />
      )}
      {view === 'back' && (
        <BackView
          uid={uid} logo={LOGO} green={GREEN}
          wheelRim={wheelRim} decorColor={decorColor}
          has={has} isLegendary={isLegendary}
        />
      )}
    </svg>
  )
}

// ─── SIDE (24m ekipage — dragbil + semitrailer) ───────────────────────────
function SideView({ uid, logo, green, wheelRim, sideColor, decorColor, frontColor, roofColor, has, isLegendary }: {
  uid: string; logo: string; green: string
  wheelRim: string; sideColor: string; decorColor: string; frontColor: string; roofColor: string
  has: (c: PartCategory) => boolean; isLegendary: (c: PartCategory) => boolean
}) {
  return (
    <g>
      {/* ═════ SEMITRAILER (bakre 70%) ═════ */}
      {/* Underliggande chassiram */}
      <rect x="120" y="152" width="290" height="10" fill="#1b201d" />

      {/* Trailerlåda — vit box, svart kantlinje */}
      <rect x="120" y="52" width="290" height="102" fill={`url(#${uid}-white)`} stroke="#0a0a0a" strokeWidth="1.4" />

      {/* Sidosockel */}
      <rect x="120" y="146" width="290" height="8" fill="#e2e6e2" stroke="#0a0a0a" strokeWidth="0.8" />

      {/* Skarv mellan trailer-paneler (tunn linje) */}
      <line x1="220" y1="52" x2="220" y2="154" stroke="#0a0a0a" strokeWidth="0.4" opacity="0.15" />
      <line x1="320" y1="52" x2="320" y2="154" stroke="#0a0a0a" strokeWidth="0.4" opacity="0.15" />

      {/* Grönt/valfritt sidostripe */}
      {has('side') ? (
        <>
          <rect x="120" y="60" width="290" height="4" fill={sideColor} />
          <rect x="120" y="140" width="290" height="4" fill={sideColor} />
        </>
      ) : (
        <rect x="120" y="140" width="290" height="4" fill="#00843e" opacity="0.85" />
      )}

      {/* ÄKTA LOGOTYP — LBCfrakt "på god väg" */}
      <image href={logo} x="150" y="76" width="180" height="60" preserveAspectRatio="xMidYMid meet" />

      {/* Bakre kant med döroppning */}
      <rect x="404" y="54" width="6" height="98" fill="#0a0a0a" opacity="0.7" />
      <line x1="410" y1="52" x2="410" y2="154" stroke="#0a0a0a" strokeWidth="1.4" />

      {/* Trailer-front (mot cab) */}
      <rect x="120" y="52" width="8" height="102" fill="#0a0a0a" opacity="0.85" />

      {/* Decor-strip om equipped */}
      {has('decor') && (
        <rect x="128" y="66" width="280" height="1.5" fill={decorColor} opacity="0.6" />
      )}

      {/* Kingpin / kopplingssken */}
      <rect x="118" y="162" width="10" height="6" fill="#333" />

      {/* Semitrailer-hjul (3 axlar bakre) */}
      <Bogie cx={310} cy={172} rim={wheelRim} />
      <Bogie cx={352} cy={172} rim={wheelRim} />
      <Bogie cx={394} cy={172} rim={wheelRim} />

      {/* ═════ DRAGBIL (främre 30%) ═════ */}
      {/* Chassiram */}
      <rect x="10" y="152" width="112" height="10" fill="#1b201d" />

      {/* Sovhytt-kropp */}
      <path
        d="M 20 155 L 20 90 Q 20 78 32 78 L 90 78 Q 100 78 108 88 L 118 105 L 118 155 Z"
        fill={`url(#${uid}-white)`} stroke="#0a0a0a" strokeWidth="1.4"
      />

      {/* Framruta */}
      <path
        d="M 40 92 L 100 92 Q 106 92 110 100 L 116 111 L 40 111 Z"
        fill={`url(#${uid}-glass)`} stroke="#0a0a0a" strokeWidth="1"
      />
      {/* Rutans ram */}
      <line x1="70" y1="92" x2="70" y2="111" stroke="#0a0a0a" strokeWidth="0.6" opacity="0.5" />

      {/* Kylargrill med LBC */}
      <rect x="102" y="112" width="16" height="22" fill="#1a1f1c" stroke="#0a0a0a" strokeWidth="0.8" />
      <text x="110" y="126" textAnchor="middle" fontSize="7" fontWeight="900" fill={green} fontStyle="italic" fontFamily="Manrope, sans-serif">LBC</text>

      {/* Strålkastare */}
      <rect x="108" y="136" width="10" height="6" fill="#f5f0d0" stroke="#0a0a0a" strokeWidth="0.6" />
      {isLegendary('front') && (
        <>
          <circle cx="113" cy="139" r="10" fill={`url(#${uid}-glow)`} opacity="0.85" />
          <circle cx="113" cy="139" r="18" fill={`url(#${uid}-glow)`} opacity="0.5" />
        </>
      )}

      {/* Solskydd */}
      {has('roof') && (
        <>
          <rect x="30" y="76" width="72" height="4" fill={roofColor} stroke="#0a0a0a" strokeWidth="0.6" />
          {isLegendary('roof') && (
            <>
              <rect x="42" y="70" width="4" height="6" fill={roofColor} />
              <rect x="60" y="70" width="4" height="6" fill={roofColor} />
              <rect x="78" y="70" width="4" height="6" fill={roofColor} />
            </>
          )}
        </>
      )}

      {/* Front-sockel */}
      {has('front') ? (
        <rect x="102" y="142" width="18" height="10" fill={frontColor} stroke="#0a0a0a" strokeWidth="0.6" />
      ) : (
        <rect x="102" y="142" width="18" height="10" fill="#3a4340" stroke="#0a0a0a" strokeWidth="0.6" />
      )}

      {/* Dörr-linje */}
      <line x1="52" y1="90" x2="52" y2="150" stroke="#0a0a0a" strokeWidth="0.6" opacity="0.4" />
      <circle cx="60" cy="126" r="1.2" fill="#0a0a0a" opacity="0.5" />

      {/* Kopplingsvipa */}
      <rect x="112" y="150" width="8" height="4" fill="#0a0a0a" />

      {/* Dragbil-hjul (framaxel + drivaxel) */}
      <Bogie cx={40} cy={172} rim={wheelRim} />
      <Bogie cx={90} cy={172} rim={wheelRim} />
    </g>
  )
}

// ─── FRONT ─────────────────────────────────────────────────────────
function FrontView({ uid, logo, green, frontColor, roofColor, wheelRim, has, isLegendary }: {
  uid: string; logo: string; green: string
  frontColor: string; roofColor: string; wheelRim: string
  has: (c: PartCategory) => boolean; isLegendary: (c: PartCategory) => boolean
}) {
  return (
    <g>
      {/* Kabin front */}
      <path
        d="M 140 60 L 340 60 Q 356 60 356 76 L 356 176 L 124 176 L 124 76 Q 124 60 140 60 Z"
        fill={`url(#${uid}-white)`} stroke="#0a0a0a" strokeWidth="1.4"
      />

      {/* Solskydd */}
      {has('roof') && (
        <rect x="128" y="56" width="224" height="6" fill={roofColor} stroke="#0a0a0a" strokeWidth="0.6" />
      )}

      {/* Framruta */}
      <path
        d="M 156 76 L 324 76 Q 336 76 336 88 L 336 118 L 144 118 L 144 88 Q 144 76 156 76 Z"
        fill={`url(#${uid}-glass)`} stroke="#0a0a0a" strokeWidth="1"
      />
      <line x1="240" y1="76" x2="240" y2="118" stroke="#0a0a0a" strokeWidth="0.6" opacity="0.4" />

      {/* LBC-logga över grillen */}
      <image href={logo} x="180" y="122" width="120" height="28" preserveAspectRatio="xMidYMid meet" />

      {/* Kylargrill */}
      <rect x="176" y="150" width="128" height="18" fill="#1a1f1c" stroke="#0a0a0a" strokeWidth="0.8" />

      {/* Strålkastare */}
      <rect x="132" y="152" width="40" height="14" fill="#f5f0d0" stroke="#0a0a0a" strokeWidth="0.6" />
      <rect x="308" y="152" width="40" height="14" fill="#f5f0d0" stroke="#0a0a0a" strokeWidth="0.6" />

      {isLegendary('front') && (
        <>
          <circle cx="152" cy="159" r="16" fill={`url(#${uid}-glow)`} opacity="0.7" />
          <circle cx="328" cy="159" r="16" fill={`url(#${uid}-glow)`} opacity="0.7" />
        </>
      )}

      {/* Frontsockel */}
      {has('front') && (
        <rect x="128" y="170" width="224" height="6" fill={frontColor} stroke="#0a0a0a" strokeWidth="0.6" />
      )}

      {/* Hjul (front-vy visar 2 främre) */}
      <Bogie cx={140} cy={190} rim={wheelRim} r={11} />
      <Bogie cx={340} cy={190} rim={wheelRim} r={11} />
    </g>
  )
}

// ─── BACK (dörrar på trailer) ──────────────────────────────────────
function BackView({ uid, logo, green, wheelRim, decorColor, has, isLegendary }: {
  uid: string; logo: string; green: string
  wheelRim: string; decorColor: string
  has: (c: PartCategory) => boolean; isLegendary: (c: PartCategory) => boolean
}) {
  return (
    <g>
      {/* Trailer bak */}
      <rect x="110" y="42" width="260" height="140" fill={`url(#${uid}-white)`} stroke="#0a0a0a" strokeWidth="1.4" />

      {/* Två dörrar */}
      <line x1="240" y1="42" x2="240" y2="182" stroke="#0a0a0a" strokeWidth="1.2" />

      {/* Dörrhandtag */}
      <rect x="235" y="98" width="10" height="26" fill="#1a1f1c" stroke="#0a0a0a" strokeWidth="0.6" />

      {/* Gångjärn */}
      <circle cx="114" cy="60" r="2" fill="#0a0a0a" />
      <circle cx="114" cy="110" r="2" fill="#0a0a0a" />
      <circle cx="114" cy="160" r="2" fill="#0a0a0a" />
      <circle cx="366" cy="60" r="2" fill="#0a0a0a" />
      <circle cx="366" cy="110" r="2" fill="#0a0a0a" />
      <circle cx="366" cy="160" r="2" fill="#0a0a0a" />

      {/* Logo — mindre variant */}
      <image href={logo} x="170" y="62" width="140" height="46" preserveAspectRatio="xMidYMid meet" />

      {/* Underrun-skydd */}
      <rect x="108" y="180" width="264" height="4" fill="#1b201d" />

      {/* Baklyktor */}
      <rect x="120" y="148" width="18" height="26" fill="#c93820" stroke="#0a0a0a" strokeWidth="0.6" />
      <rect x="342" y="148" width="18" height="26" fill="#c93820" stroke="#0a0a0a" strokeWidth="0.6" />

      {/* Registreringsskylt */}
      <rect x="204" y="150" width="72" height="14" fill="#f4d64a" stroke="#0a0a0a" strokeWidth="0.6" />
      <text x="240" y="161" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="Manrope, sans-serif" fill="#0a0a0a">LBC 001</text>

      {/* Decor-detalj bakom dörr */}
      {has('decor') && (
        <>
          <rect x="118" y="46" width="244" height="3" fill={decorColor} />
          <rect x="118" y="176" width="244" height="3" fill={decorColor} />
        </>
      )}

      {/* Underifrån-hjul (semitrailer bak) */}
      <Bogie cx={150} cy={196} rim={wheelRim} r={10} />
      <Bogie cx={240} cy={196} rim={wheelRim} r={10} />
      <Bogie cx={330} cy={196} rim={wheelRim} r={10} />
    </g>
  )
}

// ─── HJUL ──────────────────────────────────────────────────────────
function Bogie({ cx, cy, rim, r = 12 }: { cx: number; cy: number; rim: string; r?: number }) {
  return (
    <g>
      {/* Skugga */}
      <ellipse cx={cx} cy={cy + r * 0.9} rx={r * 1.1} ry={r * 0.28} fill="rgba(0,0,0,0.35)" />
      {/* Däck */}
      <circle cx={cx} cy={cy} r={r} fill="#141816" stroke="#0a0a0a" strokeWidth="1" />
      {/* Fälg */}
      <circle cx={cx} cy={cy} r={r * 0.55} fill={rim} stroke="#0a0a0a" strokeWidth="0.6" />
      {/* Nav */}
      <circle cx={cx} cy={cy} r={r * 0.18} fill="#0a0a0a" />
      {/* Ekrar */}
      <line x1={cx - r * 0.5} y1={cy} x2={cx + r * 0.5} y2={cy} stroke="#0a0a0a" strokeWidth="0.6" opacity="0.6" />
      <line x1={cx} y1={cy - r * 0.5} x2={cx} y2={cy + r * 0.5} stroke="#0a0a0a" strokeWidth="0.6" opacity="0.6" />
    </g>
  )
}