import { motion } from 'framer-motion'

// Small KT-history sparkline. Domain on Y is fixed [-10, 10] so a flat
// line at 0 = neutral. Last point gets a glowing dot. Used on the
// deep-analysis result screen and on the Profile entry card.

const W = 240
const H = 60
const PAD_X = 8
const PAD_Y = 8

export default function Sparkline({ data, height = H }) {
  const series = (data || []).map((d) => (typeof d === 'number' ? d : d?.kt))
  const len = series.length

  if (len === 0) {
    return (
      <div
        className="rounded-md text-[12px] text-fg-3 flex items-center justify-center"
        style={{ height, border: '1px dashed rgba(180,160,255,.16)' }}
      >
        Истории пока нет
      </div>
    )
  }

  const xStep = len > 1 ? (W - PAD_X * 2) / (len - 1) : 0
  const yFor = (kt) => {
    const norm = (kt + 10) / 20 // 0..1, low→bottom
    return H - PAD_Y - norm * (H - PAD_Y * 2)
  }

  const points = series.map((kt, i) => [PAD_X + i * xStep, yFor(kt)])
  const path =
    len === 1
      ? `M ${PAD_X} ${yFor(series[0])} L ${W - PAD_X} ${yFor(series[0])}`
      : points
          .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
          .join(' ')

  // Filled area under the line, anchored at y=H-PAD_Y (zero baseline visual).
  const area =
    len > 1
      ? `${path} L ${W - PAD_X} ${H - PAD_Y} L ${PAD_X} ${H - PAD_Y} Z`
      : null

  const lastX = points[len - 1][0]
  const lastY = points[len - 1][1]
  const lastKT = series[len - 1]
  const lastTone = lastKT > 0 ? '#7be1a3' : lastKT < 0 ? '#e6a878' : '#9eb5ff'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      className="block overflow-visible"
      aria-label="KT history"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6145c2" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6145c2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#9eb5ff" />
          <stop offset="100%" stopColor={lastTone} />
        </linearGradient>
      </defs>

      {/* Zero baseline */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={yFor(0)}
        y2={yFor(0)}
        stroke="rgba(180,160,255,.18)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      {area && <path d={area} fill="url(#spark-fill)" />}

      <motion.path
        d={path}
        fill="none"
        stroke="url(#spark-line)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 0.8, 0.36, 1], delay: 0.2 }}
      />

      <motion.circle
        cx={lastX}
        cy={lastY}
        r="3.5"
        fill={lastTone}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 1.05 }}
      />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r="7"
        fill="none"
        stroke={lastTone}
        strokeOpacity="0.4"
        strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.15 }}
      />
    </svg>
  )
}
