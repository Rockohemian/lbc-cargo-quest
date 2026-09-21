import { useEffect, useRef } from 'react'
import type { LatLng } from '../types'

const KARLSTAD: LatLng = { lat: 59.3793, lng: 13.5036 }

/** Noggrannhet i meter under vilken vi litar på positionen som en riktig GPS-fix. */
export const PRECISE_ACCURACY_M = 100

export type GpsStatus =
  | 'pending'       // väntar på första positionen
  | 'ok'            // riktig GPS-fix
  | 'coarse'        // position finns, men är grov (mast/wifi/IP)
  | 'denied'        // användaren nekade platsbehörighet
  | 'unavailable'   // enheten kan inte ge någon position alls
  | 'insecure'      // sidan körs inte över https → webbläsaren blockerar

export interface GpsInfo {
  status: GpsStatus
  /** Rapporterad osäkerhet i meter, eller null om position saknas. */
  accuracy: number | null
  /** Förklaring att visa för spelaren när något är fel. */
  message: string | null
}

export const GPS_PENDING: GpsInfo = { status: 'pending', accuracy: null, message: null }

/** "±8 m" / "±3,2 km" */
export function formatAccuracy(accuracy: number | null): string {
  if (accuracy == null) return ''
  if (accuracy >= 1000) return `±${(accuracy / 1000).toFixed(1).replace('.', ',')} km`
  return `±${Math.round(accuracy)} m`
}

interface Options {
  /** When false, the watcher is disabled (e.g. while in manual test mode). */
  enabled?: boolean
  onStatus?: (info: GpsInfo) => void
}

/**
 * Positionering med noggrannhet som förstklassig information.
 *
 * Tidigare räknades varje position som godkänd. Problemet är att en mobil
 * gärna svarar med en nätverksposition härledd ur mast eller IP innan den
 * riktiga GPS-fixen hinner fram — den landar systematiskt mitt i närmaste
 * tätort med flera kilometers osäkerhet. Spelet placerade då godset runt fel
 * punkt och spelaren kunde aldrig gå fram till det.
 *
 * Nu skiljs en grov position från en riktig fix, watchern fortsätter leta
 * efter något bättre, och spelet får veta vilket det är.
 */
export function useGeolocation(onUpdate: (pos: LatLng) => void, options: Options = {}) {
  const { enabled = true, onStatus } = options
  const cbRef = useRef(onUpdate)
  const statusRef = useRef(onStatus)
  cbRef.current = onUpdate
  statusRef.current = onStatus

  useEffect(() => {
    if (!enabled) return

    const report = (info: GpsInfo) => statusRef.current?.(info)

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      report({
        status: 'insecure',
        accuracy: null,
        message: 'Sidan körs inte över https, så webbläsaren blockerar platsdelning.',
      })
      cbRef.current(KARLSTAD)
      return
    }

    if (!navigator.geolocation) {
      report({
        status: 'unavailable',
        accuracy: null,
        message: 'Den här webbläsaren saknar stöd för positionering.',
      })
      cbRef.current(KARLSTAD)
      return
    }

    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    let gotAnyFix = false
    let bestAccuracy = Number.POSITIVE_INFINITY

    // Har ingenting alls kommit in på 20 s ger vi spelaren besked i stället för
    // att låta hen stirra på en karta som aldrig rör sig.
    const fallbackTimer = window.setTimeout(() => {
      if (gotAnyFix) return
      report({
        status: 'unavailable',
        accuracy: null,
        message: 'Ingen position kunde hämtas. Kontrollera att platstjänster är påslagna.',
      })
      cbRef.current(KARLSTAD)
    }, 20000)

    const ok = (p: GeolocationPosition) => {
      gotAnyFix = true
      window.clearTimeout(fallbackTimer)
      const accuracy = p.coords.accuracy

      // En grov position efter att en skarp redan kommit in är ett bakslag —
      // behåll den bättre i stället för att hoppa tillbaka ut på stan.
      if (accuracy > PRECISE_ACCURACY_M && bestAccuracy <= PRECISE_ACCURACY_M) return
      bestAccuracy = Math.min(bestAccuracy, accuracy)

      if (accuracy <= PRECISE_ACCURACY_M) {
        report({ status: 'ok', accuracy, message: null })
      } else {
        report({
          status: 'coarse',
          accuracy,
          message:
            'Positionen kommer från mobilnätet, inte från GPS, och kan vara flera kilometer fel. ' +
            'Slå på exakt plats för webbläsaren och gå ut i det fria — eller spela utan GPS.',
        })
      }
      cbRef.current({ lat: p.coords.latitude, lng: p.coords.longitude })
    }

    const err = (e: GeolocationPositionError) => {
      if (e.code === e.PERMISSION_DENIED) {
        window.clearTimeout(fallbackTimer)
        report({
          status: 'denied',
          accuracy: null,
          message: 'Platsbehörighet nekades. Tillåt plats i webbläsaren eller spela utan GPS.',
        })
        cbRef.current(KARLSTAD)
        return
      }
      // Timeout / position-unavailable: låt watchPosition fortsätta försöka.
    }

    navigator.geolocation.getCurrentPosition(ok, err, opts)
    const id = navigator.geolocation.watchPosition(ok, err, opts)

    return () => {
      window.clearTimeout(fallbackTimer)
      navigator.geolocation.clearWatch(id)
    }
  }, [enabled])
}
