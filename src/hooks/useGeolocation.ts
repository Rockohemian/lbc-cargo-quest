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

    // If nothing comes back quickly, treat GPS as weak and fall back.
    const fallbackTimer = window.setTimeout(() => {
      statusRef.current?.('fallback')
      cbRef.current(KARLSTAD)
    }, 15000)

    const ok = (p: GeolocationPosition) => {
      window.clearTimeout(fallbackTimer)
      // Very poor accuracy is treated as a soft fallback but still used.
      statusRef.current?.(p.coords.accuracy && p.coords.accuracy > 120 ? 'fallback' : 'ok')
      cbRef.current({ lat: p.coords.latitude, lng: p.coords.longitude })
    }

    const err = () => {
      window.clearTimeout(fallbackTimer)
      statusRef.current?.('fallback')
      cbRef.current(KARLSTAD)
    }

    navigator.geolocation.getCurrentPosition(ok, err, opts)
    const id = navigator.geolocation.watchPosition(ok, err, opts)

    return () => {
      window.clearTimeout(fallbackTimer)
      navigator.geolocation.clearWatch(id)
    }
  }, [enabled])
}
