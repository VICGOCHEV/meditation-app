import { motion } from 'framer-motion'

// Half-circle gauge for the Coefficient of Transformation.
// Domain: −10 .. +10. The arc's filled portion is anchored at the centre
// (KT = 0) and grows left for negative values, right for positive.
//
// Stroke width 12. Two layers:
//   · faint background arc (full half-circle)
//   · gradient arc that animates `pathLength` from 0 to |kt|/10
// A small filled circle marks the needle tip; KT label sits centred below.
//
// All measurements are kept in viewBox space (200 × 120) so the host
// can size the SVG with width="100%".

const W = 200
const H = 120
const CX = 100
const CY = 100
const R = 86

function point(angleDeg) {
  const a = (angleDeg * Math.PI) / 180
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)]
}

// Whole half-circle from 180° (left) → 360°/0° (right).
function buildHalfArcPath() {
  const [x1, y1] = point(180)
  const [x2, y2] = point(0)
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`
}

// Arc from the bottom centre (270°) outward by `delta` degrees.
// Positive delta sweeps right (clockwise from 270°), negative sweeps left.
function buildPartialArcPath(delta) {
  const startAng = 270
  const endAng = 270 + delta
  const [x1, y1] = point(startAng)
  const [x2, y2] = point(endAng)
  const sweepFlag = delta >= 0 ? 1 : 0
  const largeArc = Math.abs(delta) > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`
}

// We anchor the half-circle at the bottom: 180° (left) → 0° (right).
// Our gauge inverts: KT = 0 sits at the TOP of the dome, not the bottom.
// Easier rendering math: rotate the conceptual half-circle so 0° is up.
// We'll use angles in standard SVG space where 0° is right; therefore:
//   KT = -10 → 180° on the arc (far left of the dome)
//   KT =  0  → 270° (top of the dome — bottom in SVG coords)
//   KT = +10 → 360°/0° (far right of the dome)
// And the arc lives between y = CY − R and y = CY.
// To avoid negative-y geometry, we just translate the SVG coordinate
// system so the arc's apex sits near the bottom. The simpler approach
// below uses the same point() helper but flips the layout: we draw the
// whole arc 180° → 360° and place ticks inside that range.

// Map KT (-10..+10) → angle in [180, 360]. Centre KT=0 → 270.
function ktToAngle(kt) {
  const clamped = Math.max(-10, Math.min(10, kt))
  return 270 + clamped * 9 // (10 * 9° = 90° of swing per side)
}

export default function KTGauge({ value }) {
  const kt = Number.isFinite(value) ? value : 0
  const needleAng = ktToAngle(kt)
  const [nx, ny] = point(needleAng)

  // Two arcs, depending on sign — both start at the centre tick (270°).
  const fillSweep = (kt / 10) * 90 // degrees from 270°
  const fillPath = buildPartialArcPath(fillSweep)

  const positive = kt > 0
  const tone = positive ? '#7be1a3' : kt < 0 ? '#e6a878' : '#9eb5ff'

  // Tick marks at -10, -5, 0, +5, +10
  const ticks = [-10, -5, 0, 5, 10].map((v) => {
    const a = ktToAngle(v)
    const [ix, iy] = point(a)
    const [ox, oy] = (() => {
      const ang = (a * Math.PI) / 180
      const r2 = R + 8
      return [CX + r2 * Math.cos(ang), CY + r2 * Math.sin(ang)]
    })()
    return { v, ix, iy, ox, oy }
  })

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 8}`}
      className="block w-full overflow-visible"
      aria-label="KT gauge"
    >
      <defs>
        <linearGradient id="kt-grad-pos" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#9eb5ff" />
          <stop offset="100%" stopColor="#7be1a3" />
        </linearGradient>
        <linearGradient id="kt-grad-neg" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0%" stopColor="#9eb5ff" />
          <stop offset="100%" stopColor="#e6a878" />
        </linearGradient>
        <filter id="kt-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background half-arc */}
      <path
        d={buildHalfArcPath()}
        stroke="rgba(180,160,255,.16)"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />

      {/* Tick marks */}
      {ticks.map((t) => (
        <line
          key={t.v}
          x1={t.ix} y1={t.iy} x2={t.ox} y2={t.oy}
          stroke={t.v === 0 ? 'rgba(180,160,255,.55)' : 'rgba(180,160,255,.3)'}
          strokeWidth={t.v === 0 ? 2 : 1.5}
          strokeLinecap="round"
        />
      ))}
      {/* Tick labels */}
      <text x={point(180)[0] - 6} y={point(180)[1] + 2} fill="rgba(180,160,255,.55)" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="end">−10</text>
      <text x={point(0)[0]   + 6} y={point(0)[1]   + 2} fill="rgba(180,160,255,.55)" fontSize="9" fontFamily="JetBrains Mono, monospace">+10</text>
      <text x={CX} y={CY - R - 6} fill="rgba(180,160,255,.55)" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle">0</text>

      {/* Animated fill arc — `pathLength` trick lets us tween the visible portion */}
      <motion.path
        d={fillPath}
        stroke={positive ? 'url(#kt-grad-pos)' : 'url(#kt-grad-neg)'}
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        filter="url(#kt-glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 0.8, 0.36, 1], delay: 0.15 }}
      />

      {/* Needle dot */}
      <motion.circle
        cx={nx}
        cy={ny}
        r="6"
        fill={tone}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 1.1 }}
      />
      <motion.circle
        cx={nx}
        cy={ny}
        r="11"
        fill="none"
        stroke={tone}
        strokeOpacity="0.4"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      />
    </svg>
  )
}
