import { useEffect, useRef } from 'react'
import type { LatLng } from '../types'

const KARLSTAD: LatLng = { lat: 59.3793, lng: 13.5036 }

export type GpsStatus = 'pending' | 'ok' | 'fallback'

interface Options {
  /** When false, the watcher is disabled (e.g. while in manual test mode). */
  enabled?: boolean
  onStatus?: (status: GpsStatus) => void
}

export function useGeolocation(onUpdate: (pos: LatLng) => void, options: Options = {}) {
  const { enabled = true, onStatus } = options
  const cbRef = useRef(onUpdate)
  const statusRef = useRef(onStatus)
  cbRef.current = onUpdate
  statusRef.current = onStatus

  useEffect(() => {
    if (!enabled) return

    if (!navigator.geolocation) {
      statusRef.current?.('fallback')
      cbRef.current(KARLSTAD)
      return
    }

    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 14000, maximumAge: 4000 }
    let settled = false

    // Fall back after 15 s if no position has arrived.
    const fallbackTimer = window.setTimeout(() => {
      if (!settled) {
        statusRef.current?.('fallback')
        cbRef.current(KARLSTAD)
      }
    }, 15000)

    const ok = (p: GeolocationPosition) => {
      settled = true
      window.clearTimeout(fallbackTimer)
      // Accuracy >200 m = network/cell estimate, mark as fallback but still use the real coords.
      statusRef.current?.(p.coords.accuracy && p.coords.accuracy > 200 ? 'fallback' : 'ok')
      cbRef.current({ lat: p.coords.latitude, lng: p.coords.longitude })
    }

    const err = (e: GeolocationPositionError) => {
      // Only give up immediately on explicit permission denial.
      // Timeout / position-unavailable: let watchPosition keep trying.
      if (e.code === e.PERMISSION_DENIED) {
        settled = true
        window.clearTimeout(fallbackTimer)
        statusRef.current?.('fallback')
        cbRef.current(KARLSTAD)
      }
    }

    navigator.geolocation.getCurrentPosition(ok, err, opts)
    const id = navigator.geolocation.watchPosition(ok, err, opts)

    return () => {
      window.clearTimeout(fallbackTimer)
      navigator.geolocation.clearWatch(id)
    }
  }, [enabled])
}
