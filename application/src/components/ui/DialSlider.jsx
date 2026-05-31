import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Round-dial slider used by Checkin and DeepAnalysis. 330° arc, gap at
// the bottom centred between value=0 (lower-left) and value=max
// (lower-right). 5 sits at the apex (12 o'clock).
//
// SVG y-down coordinate system (geometry note):
//   pointAt(cx, cy, r, deg) computes (cx + r*cos, cy + r*sin), so
//   angle 90° lands BELOW the centre, 270° ABOVE. Increasing the
//   angle therefore sweeps clockwise visually.
//   We pick START_DEG = 105° (lower-left) and increase by SPAN_DEG
//   = 330° to reach the lower-right side. v=5 lands at 105+165=270°
//   = top of the dial.

const SPAN_DEG = 330
const START_DEG = 105

function pointAt(cx, cy, r, angDeg) {
  const a = (angDeg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function valueRatioForAngle(angDeg) {
  // d = how far CW (visually) we are from START.
  let d = (angDeg - START_DEG + 360) % 360
  if (d > SPAN_DEG) {
    return d - SPAN_DEG < 360 - d ? 1 : 0
  }
  return d / SPAN_DEG
}

// Smoothly tweens `target` over `duration` (ms). Used to animate the
// arc / knob while the integer `value` updates instantly. ease-out
// cubic so it lands snappy.
function useSmoothValue(target, duration = 240) {
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
      const next = fromRef.current + (target - fromRef.current) * eased
      setV(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return v
}

export default function DialSlider({
  value,
  onChange,
  min = 0,
  max = 10,
  size = 300,
  unitLabel = (v) => declineBalov(v),
}) {
  const cx = size / 2
  const cy = size / 2
  const trackR = size * 0.40
  const trackThick = 14
  const ringR = trackR
  const labelR = trackR + 18
  const innerDiskR = size * 0.27
  const knobR = 12
  const range = max - min || 1

  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const animValue = useSmoothValue(value, 260)
  const animT = (animValue - min) / range
  const ang = START_DEG + animT * SPAN_DEG
  const [knobX, knobY] = pointAt(cx, cy, ringR, ang)

  // Background full arc
  const [bsx, bsy] = pointAt(cx, cy, ringR, START_DEG)
  const [bex, bey] = pointAt(cx, cy, ringR, START_DEG + SPAN_DEG)
  const bgPath = `M ${bsx} ${bsy} A ${ringR} ${ringR} 0 1 1 ${bex} ${bey}`

  // Active fill arc — start..ang
  const [sx, sy] = pointAt(cx, cy, ringR, START_DEG)
  const [ex, ey] = pointAt(cx, cy, ringR, ang)
  const traversed = ang - START_DEG
  const largeArc = traversed > 180 ? 1 : 0
  // Don't render a degenerate arc at value=0 — gives a stray dot.
  const showFill = traversed > 0.4

  const TICK_COUNT = 81
  const ticks = Array.from({ length: TICK_COUNT })
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  const onPoint = useCallback(
    (e) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      // viewBox includes padding, so map pointer to the same coords
      const vbX = (px / rect.width) * (size + 64) - 32
      const vbY = (py / rect.height) * (size + 64) - 32
      let a = (Math.atan2(vbY - cy, vbX - cx) * 180) / Math.PI
      if (a < 0) a += 360
      const t = valueRatioForAngle(a)
      const v = Math.round(min + t * range)
      onChange?.(Math.max(min, Math.min(max, v)))
    },
    [cx, cy, size, min, max, range, onChange]
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

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size, touchAction: 'none' }}
    >
      <svg
        ref={svgRef}
        viewBox={`-32 -32 ${size + 64} ${size + 64}`}
        width={size}
        height={size}
        className="block select-none"
        style={{ overflow: 'visible' }}
        onPointerDown={(e) => {
          setDragging(true)
          onPoint(e)
        }}
        aria-label="Dial slider"
      >
        <defs>
          <linearGradient id="dial-grad" gradientUnits="userSpaceOnUse" x1="0" y1={size} x2={size} y2="0">
            <stop offset="0%" stopColor="#9b75ff" />
            <stop offset="100%" stopColor="#6145c2" />
          </linearGradient>
          <filter id="dial-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dial-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Inner ring of fine ticks */}
        {ticks.map((_, i) => {
          const t = i / (TICK_COUNT - 1)
          const a = START_DEG + t * SPAN_DEG
          const [ix, iy] = pointAt(cx, cy, ringR - trackThick - 2, a)
          const [ox, oy] = pointAt(cx, cy, ringR - trackThick + 6, a)
          const isActive = t <= animT
          return (
            <line
              key={i}
              x1={ix}
              y1={iy}
              x2={ox}
              y2={oy}
              stroke={isActive ? 'rgba(216,200,255,.65)' : 'rgba(180,160,255,.18)'}
              strokeWidth={i % 5 === 0 ? 1.6 : 1}
              strokeLinecap="round"
            />
          )
        })}

        {/* Background full arc */}
        <path
          d={bgPath}
          stroke="rgba(180,160,255,.16)"
          strokeWidth={trackThick}
          fill="none"
          strokeLinecap="round"
        />

        {/* Pulsating glow underneath the active arc */}
        {showFill && (
          <motion.path
            d={`M ${sx} ${sy} A ${ringR} ${ringR} 0 ${largeArc} 1 ${ex} ${ey}`}
            stroke="#9b75ff"
            strokeWidth={trackThick}
            fill="none"
            strokeLinecap="round"
            filter="url(#dial-glow-strong)"
            initial={false}
            animate={{ opacity: [0.18, 0.42, 0.18] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Active fill arc */}
        {showFill && (
          <path
            d={`M ${sx} ${sy} A ${ringR} ${ringR} 0 ${largeArc} 1 ${ex} ${ey}`}
            stroke="url(#dial-grad)"
            strokeWidth={trackThick}
            fill="none"
            strokeLinecap="round"
            filter="url(#dial-glow)"
          />
        )}

        {/* Number labels around the dial */}
        {numbers.map((n) => {
          const t = (n - min) / range
          const a = START_DEG + t * SPAN_DEG
          const [nx, ny] = pointAt(cx, cy, labelR, a)
          const isActive = n === value
          return (
            <text
              key={n}
              x={nx}
              y={ny}
              fill={isActive ? '#f4f0ff' : 'rgba(216,200,255,.55)'}
              fontFamily="Manrope, sans-serif"
              fontWeight={isActive ? 500 : 300}
              fontSize="22"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(n)
              }}
            >
              {n}
            </text>
          )
        })}

        {/* Inner solid disk */}
        <circle
          cx={cx}
          cy={cy}
          r={innerDiskR}
          fill="rgba(14,10,28,0.92)"
          stroke="rgba(180,160,255,.10)"
          strokeWidth="1.5"
        />

        {/* Big value — animates on change */}
        <AnimatePresence mode="popLayout">
          <motion.text
            key={value}
            x={cx}
            y={cy - 6}
            fill="#f4f0ff"
            fontFamily="Manrope, sans-serif"
            fontWeight="300"
            fontSize={size * 0.22}
            textAnchor="middle"
            dominantBaseline="middle"
            initial={{ opacity: 0, y: cy - 6 - 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: cy - 6, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: cy - 6 + 14, filter: 'blur(6px)' }}
            transition={{ duration: 0.32, ease: [0.22, 0.8, 0.36, 1] }}
          >
            {value}
          </motion.text>
        </AnimatePresence>

        {/* Mono caption — auto-declined */}
        <text
          x={cx}
          y={cy + size * 0.13}
          fill="rgba(180,160,255,.7)"
          fontFamily="JetBrains Mono, monospace"
          fontSize="11"
          letterSpacing="2"
          textAnchor="middle"
        >
          {unitLabel(value).toUpperCase()}
        </text>

        {/* Knob */}
        <motion.circle
          cx={knobX}
          cy={knobY}
          r={knobR + 6}
          fill="rgba(155,117,255,.35)"
          filter="url(#dial-glow-strong)"
          initial={false}
          animate={{ opacity: [0.55, 0.9, 0.55], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: knobX, originY: knobY }}
        />
        <circle cx={knobX} cy={knobY} r={knobR} fill="#fff" />
      </svg>
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
