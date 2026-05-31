import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Horizontal variant of DialSlider. Same visual language (violet
// gradient, glow, fine ticks, pulsing knob halo, big animated number
// with blur+Y on change) but draggable left-right, so vertical
// page-scroll never competes with the gesture. `touch-action: none`
// on the track captures all pointer events on touch devices.

const TRACK_THICK = 14
const KNOB_R = 12
const HALO_R = 18
// SVG viewBox coords. The track runs left→right with `KNOB_R + 2` px
// padding on each side so the knob halo doesn't get clipped.
const VBW = 1000
const VBH = 48
const TRACK_X0 = KNOB_R + 2
const TRACK_X1 = VBW - (KNOB_R + 2)
const TRACK_Y = VBH / 2

function useSmoothValue(target, duration = 260) {
  const [v, setV] = useState(target)
  const fromRef = useRef(target)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const lastTargetRef = useRef(target)

  useEffect(() => {
    if (target === lastTargetRef.current) return
    fromRef.current = v
    lastTargetRef.current = target
    startRef.current = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setV(fromRef.current + (target - fromRef.current) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return v
}

export default function LinearSlider({
  value,
  onChange,
  min = 0,
  max = 10,
  unitLabel = (v) => declineBalov(v),
}) {
  const range = max - min || 1
  const animValue = useSmoothValue(value, 260)
  const t = (animValue - min) / range
  const knobX = TRACK_X0 + t * (TRACK_X1 - TRACK_X0)

  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const onPoint = useCallback(
    (e) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      // Visual track inside the SVG runs from TRACK_X0/VBW to TRACK_X1/VBW
      // of the bounding box width. Map pointer back into that range.
      const x0px = (TRACK_X0 / VBW) * rect.width
      const x1px = (TRACK_X1 / VBW) * rect.width
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left - x0px) / (x1px - x0px)))
      const v = Math.round(min + ratio * range)
      onChange?.(Math.max(min, Math.min(max, v)))
    },
    [min, max, range, onChange],
  )

  useEffect(() => {
    if (!dragging) return
    const move = (e) => {
      e.preventDefault()
      onPoint(e)
    }
    const up = () => setDragging(false)
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, onPoint])

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  // Fine ticks: 4 between each integer = 41 total for 0..10.
  const TICK_COUNT = (max - min) * 4 + 1
  const ticks = Array.from({ length: TICK_COUNT })

  return (
    <div className="w-full select-none">
      {/* Big animated value + caption */}
      <div className="text-center">
        <div className="relative mx-auto h-[88px] w-full">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={value}
              className="absolute inset-x-0 font-light text-fg-0"
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 80,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
              initial={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              transition={{ duration: 0.32, ease: [0.22, 0.8, 0.36, 1] }}
            >
              {value}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-lilac">
          {unitLabel(value)}
        </div>
      </div>

      {/* Number labels row */}
      <div className="mt-6 flex justify-between px-1">
        {numbers.map((n) => {
          const isActive = n === value
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange?.(n)}
              className="font-sans transition-colors"
              style={{
                fontSize: 18,
                fontWeight: isActive ? 500 : 300,
                color: isActive ? '#f4f0ff' : 'rgba(216,200,255,0.55)',
                background: 'transparent',
                border: 'none',
                padding: '4px 2px',
                cursor: 'pointer',
              }}
              aria-label={`${n}`}
            >
              {n}
            </button>
          )
        })}
      </div>

      {/* Track + knob */}
      <div
        ref={trackRef}
        className="relative mt-3 h-12 cursor-pointer"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          setDragging(true)
          onPoint(e)
        }}
        aria-label="Slider track"
      >
        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient
              id="lin-grad"
              gradientUnits="userSpaceOnUse"
              x1={TRACK_X0}
              y1={TRACK_Y}
              x2={TRACK_X1}
              y2={TRACK_Y}
            >
              <stop offset="0%" stopColor="#9b75ff" />
              <stop offset="100%" stopColor="#6145c2" />
            </linearGradient>
            <filter id="lin-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="lin-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Fine ticks above the track (mirror of dial's inner ring) */}
          {ticks.map((_, i) => {
            const ratio = i / (TICK_COUNT - 1)
            const x = TRACK_X0 + ratio * (TRACK_X1 - TRACK_X0)
            const isMajor = i % 4 === 0
            const isActive = ratio <= t
            return (
              <line
                key={i}
                x1={x}
                x2={x}
                y1={TRACK_Y - TRACK_THICK / 2 - (isMajor ? 8 : 5)}
                y2={TRACK_Y - TRACK_THICK / 2 - 2}
                stroke={
                  isActive ? 'rgba(216,200,255,0.65)' : 'rgba(180,160,255,0.18)'
                }
                strokeWidth={isMajor ? 1.6 : 1}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}

          {/* Background bar */}
          <line
            x1={TRACK_X0}
            y1={TRACK_Y}
            x2={TRACK_X1}
            y2={TRACK_Y}
            stroke="rgba(180,160,255,0.16)"
            strokeWidth={TRACK_THICK}
            strokeLinecap="round"
          />

          {/* Pulsing glow under the active fill */}
          {t > 0.02 && (
            <motion.line
              x1={TRACK_X0}
              y1={TRACK_Y}
              x2={knobX}
              y2={TRACK_Y}
              stroke="#9b75ff"
              strokeWidth={TRACK_THICK}
              strokeLinecap="round"
              filter="url(#lin-glow-strong)"
              initial={false}
              animate={{ opacity: [0.18, 0.42, 0.18] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Active fill */}
          {t > 0.02 && (
            <line
              x1={TRACK_X0}
              y1={TRACK_Y}
              x2={knobX}
              y2={TRACK_Y}
              stroke="url(#lin-grad)"
              strokeWidth={TRACK_THICK}
              strokeLinecap="round"
              filter="url(#lin-glow)"
            />
          )}

          {/* Knob halo (pulsing) */}
          <motion.circle
            cx={knobX}
            cy={TRACK_Y}
            r={HALO_R}
            fill="rgba(155,117,255,0.35)"
            filter="url(#lin-glow-strong)"
            initial={false}
            animate={{ opacity: [0.55, 0.9, 0.55], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: knobX, originY: TRACK_Y }}
          />

          {/* Knob */}
          <circle cx={knobX} cy={TRACK_Y} r={KNOB_R} fill="#fff" />
        </svg>
      </div>
    </div>
  )
}

function declineBalov(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'балл'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'балла'
  return 'баллов'
}
