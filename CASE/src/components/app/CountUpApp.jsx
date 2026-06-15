import { useEffect, useRef, useState } from 'react'

// Tween a number from 0 → value over `duration` (ms). Returns a string
// formatted with `decimals`. Used on the deep-analysis result screen
// for ИТ / ИО / КТ count-up reveals.
export default function CountUp({
  value,
  duration = 1100,
  decimals = 1,
  prefix = '',
  className = '',
  delay = 0,
}) {
  const [out, setOut] = useState(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const start = performance.now() + delay
    let cancelled = false

    function tick(now) {
      if (cancelled) return
      const t = Math.max(0, Math.min(1, (now - start) / duration))
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setOut(value * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, delay])

  const formatted = out.toFixed(decimals)
  return <span className={className}>{prefix}{formatted}</span>
}
