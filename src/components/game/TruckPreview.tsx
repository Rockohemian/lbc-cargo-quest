import { useEffect, useMemo, useState } from 'react'
import type { EquippedParts } from '../../types'
import { Ekipagegrafik } from './ekipage/Ekipagegrafik'
import { temaFor } from './ekipage/garagetema'
import { TOM_LAST, type Pall, type Pallast } from './ekipage/pallast'

interface Props {
  equipped: EquippedParts
  /** Låt pallarna lastas på och av i en slinga. Av i stillbilder. */
  animera?: boolean
  /** Visa en egen last i stället för demoslingan. */
  last?: Pallast
  className?: string
}

const pall = (id: string, kolumn: number, rad: number, gods: string): Pall => ({
  id,
  kolumn,
  rad,
  gods,
  lastad: true,
})

const A = pall('a', 0, 0, 'Byggmaterial')
const B = pall('b', 1, 0, 'Trä')
const C = pall('c', 2, 0, 'Papper')
const D = pall('d', 3, 0, 'Metall')
const E = pall('e', 4, 0, 'Plast')
const F = pall('f', 0, 1, 'Well')
const G = pall('g', 1, 1, 'Glas')
const H = pall('h', 2, 1, 'Isolering')

/**
 * En lastning i miniatyr.
 *
 * Pall-id:na är stabila mellan bilderna med flit: samma DOM-nod flyttar sig i
 * stället för att försvinna och dyka upp, vilket är det som gör lastningen till
 * en synlig rörelse i stället för ett hopp.
 */
const LASTSLINGA: readonly Pallast[] = [
  TOM_LAST,
  [A],
  [A, B],
  [A, B, C],
  [A, B, C, D, E],
  [A, B, C, D, E, F, G],
  [A, B, C, D, E, F, G, H],
]

/** Bilden som visas när slingan står still — full last läser bäst. */
const STILLBILD: Pallast = LASTSLINGA[LASTSLINGA.length - 1]!

const STEGTID = 2000

/** Respekterar systemets inställning för minskad rörelse. */
function useDampad(): boolean {
  const [dampad, setDampad] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setDampad(mq.matches)
    const lyssna = (e: MediaQueryListEvent) => setDampad(e.matches)
    mq.addEventListener('change', lyssna)
    return () => mq.removeEventListener('change', lyssna)
  }, [])
  return dampad
}

/**
 * LBC:s flakbil — Volvo FM 6x2 solobil med pallflak, sedd från sidan.
 *
 * Hyttritningen är klonad från Biocompanion (UH2026) och lackeras här om efter
 * spelarens garagedelar. Pallarna lastas på och av i en slinga så att bilen
 * visar vad den gör och inte bara hur den ser ut.
 */
export function TruckPreview({ equipped, animera = true, last, className = '' }: Props) {
  const reducerad = useDampad()
  const [steg, setSteg] = useState(0)

  const styrd = last !== undefined
  const rullar = animera && !reducerad && !styrd

  useEffect(() => {
    if (!rullar) return
    const t = window.setInterval(() => setSteg(s => (s + 1) % LASTSLINGA.length), STEGTID)
    return () => window.clearInterval(t)
  }, [rullar])

  const tema = useMemo(() => temaFor(equipped), [equipped])
  const visad: Pallast = styrd ? last : rullar ? LASTSLINGA[steg]! : STILLBILD

  return (
    <div className={`w-full ${className}`}>
      <Ekipagegrafik last={visad} tema={tema} dampad={!rullar} className="w-full" />
    </div>
  )
}
