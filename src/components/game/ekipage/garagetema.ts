import type { EquippedParts, PartCategory, TruckPart } from '../../../types'
import { PART_BY_ID, PART_RARITY_COLORS } from '../../../data/garageParts'
import { LBC_TEMA, type Ekipagetema } from './Ekipagegrafik'

/**
 * Garagets monterade delar översatta till lackering.
 *
 * Sällsyntheten styr kulören — samma färgskala som resten av garaget använder,
 * så en legendarisk del syns på bilen och inte bara i listan. Funktionen bor
 * här och inte i förhandsvisningen, eftersom lastningsvyn behöver samma
 * lackering: bilen spelaren bygger i garaget ska vara bilen hen lastar.
 */
export function temaFor(equipped: EquippedParts): Ekipagetema {
  const part = (c: PartCategory): TruckPart | undefined =>
    equipped[c] ? PART_BY_ID[equipped[c]!] : undefined
  const accent = (c: PartCategory, fallback: string): string => {
    const p = part(c)
    return p ? PART_RARITY_COLORS[p.rarity] : fallback
  }
  return {
    gron: accent('side', LBC_TEMA.gron),
    dekor: accent('decor', LBC_TEMA.dekor),
    taklist: accent('roof', LBC_TEMA.taklist),
    falg: accent('wheels', LBC_TEMA.falg),
    lykta: accent('front', LBC_TEMA.lykta),
  }
}
