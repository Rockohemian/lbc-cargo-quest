import type { LatLng } from '../types'

export interface EventVenue {
  id: string
  name: string
  center: LatLng
  spawnRadius: number   // max meter från mitten för cargo-spawn
  displayRadius: number // cirkel-radie som visas på kartan
}

export const EVENTS: EventVenue[] = [
  {
    id: 'farjestad-travbana',
    name: 'Karlstad Travbana – Färjestad',
    // Geometrisk mittpunkt av innerbanan (beräknad från OSM-polygon bbox):
    // bbox: lat 59.4081–59.4113, lng 13.4987–13.5054
    center: { lat: 59.4097, lng: 13.5020 },
    spawnRadius: 90,    // håller gods inom innerbanan
    displayRadius: 115, // visar hela banområdet på kartan
  },
]

export const CURRENT_EVENT = EVENTS[0]
