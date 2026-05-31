// Генеративные символы в духе аморф-сферы, но дешёвые (SVG/CSS, без WebGL).
// По одному на фразу манифеста. Размер ~200px.

const V = '#6145c2'
const L = '#d6c8ff'

function Frame({ children }) {
  return (
    <div className="relative h-44 w-44 sm:h-52 sm:w-52" style={{ filter: 'drop-shadow(0 0 30px rgba(97,69,194,0.5))' }}>
      {children}
    </div>
  )
}

// 1 — мягкая морфирующая капля (мини-сфера)
export function SymBlob() {
  return (
    <Frame>
      <div
        className="sym-blob absolute inset-6"
        style={{
          background: `radial-gradient(60% 60% at 40% 35%, ${L}, ${V} 45%, rgba(97,69,194,0.15) 80%)`,
          boxShadow: `inset -10px -14px 30px rgba(20,10,50,0.7), 0 0 40px ${V}`,
        }}
      />
    </Frame>
  )
}

// 2 — орбита: кольца + бусина по эллипсу
export function SymOrbit() {
  return (
    <Frame>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <circle cx="100" cy="100" r="30" fill="none" stroke={V} strokeWidth="1.5" opacity="0.8" />
        <circle cx="100" cy="100" r="12" fill={L} opacity="0.9" />
        <g className="sym-spin" style={{ transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="78" ry="40" fill="none" stroke={V} strokeWidth="1" strokeDasharray="2 6" opacity="0.6" />
          <circle cx="178" cy="100" r="5" fill={L} />
        </g>
        <g className="sym-spin-r" style={{ transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="40" ry="78" fill="none" stroke={V} strokeWidth="1" strokeDasharray="2 8" opacity="0.4" />
        </g>
      </svg>
    </Frame>
  )
}

// 3 — рябь: расходящиеся кольца
export function SymRipple() {
  return (
    <Frame>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <circle cx="100" cy="100" r="10" fill={L} />
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke={V}
            strokeWidth="1.5"
            style={{
              transformOrigin: '100px 100px',
              animation: `symRipple 4s ease-out ${i * 1.3}s infinite`,
            }}
          />
        ))}
      </svg>
    </Frame>
  )
}

// 4 — волна: мягкая синусоида
export function SymWave() {
  return (
    <Frame>
      <svg viewBox="0 0 200 200" className="sym-float absolute inset-0 h-full w-full">
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M10 ${90 + i * 14} Q 55 ${60 + i * 14} 100 ${90 + i * 14} T 190 ${90 + i * 14}`}
            fill="none"
            stroke={i === 1 ? L : V}
            strokeWidth={i === 1 ? 2 : 1.2}
            opacity={i === 1 ? 0.95 : 0.5}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </Frame>
  )
}

// 5 — созвездие: точки + тонкие связи
export function SymConstellation() {
  const pts = [
    [60, 60], [120, 45], [150, 100], [110, 140], [55, 120], [95, 95],
  ]
  return (
    <Frame>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <g className="sym-float">
          {pts.map((a, i) =>
            pts.slice(i + 1).map((b, j) => {
              const d = Math.hypot(a[0] - b[0], a[1] - b[1])
              return d < 75 ? (
                <line key={`${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={V} strokeWidth="0.7" opacity="0.4" />
              ) : null
            }),
          )}
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 5 ? 5 : 3} fill={i === 5 ? L : V} opacity="0.95" />
          ))}
        </g>
      </svg>
    </Frame>
  )
}

export const SYMBOLS = [SymBlob, SymRipple, SymWave, SymOrbit, SymConstellation]
