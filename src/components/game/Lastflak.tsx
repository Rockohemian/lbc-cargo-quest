/**
 * Lastbilen som spelplan.
 *
 * Samma ekipage som står i garaget, men med flaket utbrutet som en yta att
 * lägga gods på. Poängen är att spelaren ska känna igen sin egen bil när hon
 * lastar den — inte möta en abstrakt svart ruta som råkar ha samma mått.
 *
 * Rutnätets läge räknas ur `flakruta()` i grafiken och skrivs alltså aldrig av
 * för hand. Ändras flakets geometri följer spelplanen med av sig själv.
 */

import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import {
  Ekipagegrafik, LBC_TEMA, flakruta, rymdForRutnat, type Ekipagetema,
} from './ekipage/Ekipagegrafik'
import { TOM_LAST } from './ekipage/pallast'
import { TRAILER_COLS, TRAILER_ROWS } from '../../utils/loadEngine'

/** Lastrymd vald så att spelets rutor blir kvadratiska. */
export const LASTRYMD = rymdForRutnat(TRAILER_COLS, TRAILER_ROWS)
export const FLAKRUTA = flakruta(LASTRYMD)

interface Props {
  tema?: Ekipagetema
  /** Lutning i grader, för gupp och kurvor under transporten. */
  tilt?: number
  className?: string
  style?: CSSProperties
  /** Läggs exakt över lastytan, med `position: relative` som referens. */
  children?: ReactNode
}

export const Lastflak = forwardRef<HTMLDivElement, Props>(function Lastflak(
  { tema = LBC_TEMA, tilt = 0, className = '', style, children },
  ref,
) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        aspectRatio: `${FLAKRUTA.aspekt}`,
        // Bilen tippar kring bakhjulen, inte kring bildens mitt — annars ser
        // ett gupp ut som att hela vägen lutar.
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        transformOrigin: '78% 92%',
        transition: 'transform .25s ease-out',
        ...style,
      }}
    >
      <Ekipagegrafik
        last={TOM_LAST}
        lastrymd={LASTRYMD}
        visaLediga={false}
        dampad
        tema={tema}
        etikett="Lastbilen sedd från sidan"
        className="absolute inset-0 w-full h-full"
      />
      <div
        ref={ref}
        className="absolute"
        style={{
          left: `${FLAKRUTA.vanster * 100}%`,
          top: `${FLAKRUTA.topp * 100}%`,
          width: `${FLAKRUTA.bredd * 100}%`,
          height: `${FLAKRUTA.hojd * 100}%`,
        }}
      >
        {children}
      </div>
    </div>
  )
})
