import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Liten pulserande pil ↓ som visas när ett scrollbart element har mer innehåll
 * nedanför. Försvinner mjukt när användaren scrollat nära botten.
 *
 * Användning:
 *   const ref = useRef<HTMLDivElement>(null)
 *   <div ref={ref} className="overflow-y-auto"> ... </div>
 *   <ScrollHint targetRef={ref} />
 */
interface Props {
  targetRef: RefObject<HTMLElement | null>
  /** avstånd i px från botten där pilen fadeas ut (default 40) */
  hideBefore?: number
  /** absolut placering av pilen — default centrerad över botten */
  bottomOffset?: number
}

export function ScrollHint({ targetRef, hideBefore = 40, bottomOffset = 80 }: Props) {
  const [visible, setVisible] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    const compute = () => {
      const canScroll = el.scrollHeight - el.clientHeight > 8
      const nearBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - hideBefore
      setVisible(canScroll && !nearBottom)
    }

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(compute)
    }

    compute()
    el.addEventListener('scroll', onScroll, { passive: true })

    // Räkna om vid resize / content-ändring
    const ro = new ResizeObserver(compute)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [targetRef, hideBefore])

  return (
    <div
      aria-hidden
      className={
        'pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 transition-opacity duration-300 ' +
        (visible ? 'opacity-100' : 'opacity-0')
      }
      style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` }}
    >
      <div
        className="flex items-center gap-1.5 bg-[#0a0a0a] text-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em]"
        style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
      >
        <span>Scrolla</span>
        <span className="scroll-hint-arrow text-[13px] leading-none">↓</span>
      </div>
      <style>{`
        @keyframes lbcScrollHint {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(3px); }
        }
        .scroll-hint-arrow { display: inline-block; animation: lbcScrollHint 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}