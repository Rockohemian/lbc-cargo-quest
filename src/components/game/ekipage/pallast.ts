/**
 * Flakbilens pallast — ren logik, ingen React.
 *
 * Lastytan är ett rutnät: kolumner längs flaket räknat från framstammen, rader
 * uppåt från golvet. En EUR-pall är 1200 mm lång, och i sidovy är det längden
 * som syns — därför är kolumnen 1,25 m bred med spel inräknat.
 *
 * Pallens `id` är stabilt över tid med flit. Samma id på samma pall gör att en
 * omlastning blir en RÖRELSE i vyn: samma DOM-nod flyttar sig i stället för att
 * försvinna på ett ställe och dyka upp på ett annat.
 */

/** Antal pallplatser längs flaket. */
export const PALL_KOLUMNER = 5
/** Antal lagerplan. Rad 0 är golvet, rad 1 står staplad ovanpå. */
export const PALL_RADER = 2

/** EUR-pallens längd i sidovy, meter, med lastspel. */
export const PALL_L = 1.25
/** Full byggnadshöjd per lagerplan: pall + gods, meter. */
export const PALL_H = 1.05
/** Själva träpallens höjd, meter. */
export const PALL_TJOCKLEK = 0.145

export interface Pall {
  /** Stabilt id. Samma id mellan två lastbilder = samma pall som flyttat sig. */
  id: string
  /** Kolumn 0..PALL_KOLUMNER-1, räknat från framstammen. */
  kolumn: number
  /** Rad 0 = golvet, uppåt. */
  rad: number
  /** Godsslag — styr färg och etikett. */
  gods: string
  /** Lastad pall ritas mättad, tomretur blekt. */
  lastad: boolean
}

export type Pallast = readonly Pall[]

export const TOM_LAST: Pallast = []

/** Ligger pallen inom flakets rutnät? */
export function inomFlak(p: Pall): boolean {
  return (
    p.kolumn >= 0 && p.kolumn < PALL_KOLUMNER && p.rad >= 0 && p.rad < PALL_RADER
  )
}

/**
 * Pallar utanför rutnätet och dubbletter på samma plats slängs.
 *
 * Vyn ska aldrig rita två pallar ovanpå varandra: gör den det syns bara den
 * översta, och lastbilden ljuger om hur mycket som faktiskt står på flaket.
 */
export function stada(last: Pallast): Pall[] {
  const upptagen = new Set<string>()
  const ut: Pall[] = []
  for (const p of last) {
    if (!inomFlak(p)) continue
    const nyckel = `${p.kolumn}:${p.rad}`
    if (upptagen.has(nyckel)) continue
    upptagen.add(nyckel)
    ut.push(p)
  }
  return ut
}

/** Antal pallar ombord. */
export function antalOmbord(last: Pallast): number {
  return stada(last).length
}

/** Andel av flakets platser som är fyllda, 0–1. */
export function fyllnadsgrad(last: Pallast): number {
  return antalOmbord(last) / (PALL_KOLUMNER * PALL_RADER)
}

/**
 * Lediga golvplatser, i ordning framifrån.
 *
 * En pall kan bara staplas på en pall — därför räknas rad 1 som ledig först när
 * rad 0 i samma kolumn är upptagen.
 */
export function ledigaPlatser(last: Pallast): { kolumn: number; rad: number }[] {
  const upptagen = new Set(stada(last).map(p => `${p.kolumn}:${p.rad}`))
  const ut: { kolumn: number; rad: number }[] = []
  for (let k = 0; k < PALL_KOLUMNER; k += 1) {
    for (let r = 0; r < PALL_RADER; r += 1) {
      if (upptagen.has(`${k}:${r}`)) continue
      if (r > 0 && !upptagen.has(`${k}:${r - 1}`)) continue
      ut.push({ kolumn: k, rad: r })
    }
  }
  return ut
}
