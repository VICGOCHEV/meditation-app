import { useRef } from 'react'

// Плашка с 3D-наклоном за курсором. baseTilt задаёт стартовую изометрию,
// max — амплитуду отклика на мышь. Внутри — блик, реагирующий на наклон.
export default function TiltCard({
  children,
  className = '',
  baseRotX = 6,
  baseRotY = -14,
  max = 10,
  glare = true,
  style,
}) {
  const ref = useRef(null)
  const glareRef = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    const rx = baseRotX - py * max
    const ry = baseRotY + px * max
    el.style.transform = `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg)`
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(40% 60% at ${
        (px + 0.5) * 100
      }% ${(py + 0.5) * 100}%, rgba(214,200,255,0.22), transparent 70%)`
    }
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = `perspective(1400px) rotateX(${baseRotX}deg) rotateY(${baseRotY}deg)`
  }

  return (
    <div style={{ perspective: '1400px' }} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div
        ref={ref}
        className={className}
        style={{
          transform: `perspective(1400px) rotateX(${baseRotX}deg) rotateY(${baseRotY}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.25s cubic-bezier(0.22,0.8,0.36,1)',
          ...style,
        }}
      >
        {children}
        {glare && (
          <div
            ref={glareRef}
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ mixBlendMode: 'screen' }}
          />
        )}
      </div>
    </div>
  )
}
