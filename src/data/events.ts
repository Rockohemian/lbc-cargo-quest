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
    center: { lat: 59.409722, lng: 13.499352 },
    spawnRadius: 130,
    displayRadius: 160,
  },
]

export const CURRENT_EVENT = EVENTS[0]
