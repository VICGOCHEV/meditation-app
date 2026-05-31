import { useEffect, useRef } from 'react'

// Кастомный курсор: лиловая голова-точка + шлейф из 16 частиц,
// каждая лагает за предыдущей (smooth chase). На hover по интерактиву
// голова раздувается, на скорости шлейф растягивается (motion blur).
// Только desktop + точный указатель; touch не трогаем.
const N = 16

export default function CursorTrail() {
  const headRef = useRef(null)
  const dotsRef = useRef([])
  const raf = useRef(0)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) document.documentElement.classList.add('cursor-hidden')
    if (!fine) return

    const pts = Array.from({ length: N }, () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }))
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    let prev = { x: mouse.x, y: mouse.y }
    let hovering = false

    const onMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      const el = e.target
      hovering = !!(el && el.closest('a, button, .shiny-cta, [data-hover]'))
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const loop = () => {
      // голова догоняет мышь
      pts[0].x += (mouse.x - pts[0].x) * 0.35
      pts[0].y += (mouse.y - pts[0].y) * 0.35
      // остальные лагают за предыдущей
      for (let i = 1; i < N; i++) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * 0.32
        pts[i].y += (pts[i - 1].y - pts[i].y) * 0.32
      }

      const speed = Math.hypot(pts[0].x - prev.x, pts[0].y - prev.y)
      prev = { x: pts[0].x, y: pts[0].y }
      const stretch = Math.min(1 + speed * 0.06, 2.6)
      const angle = Math.atan2(mouse.y - pts[0].y, mouse.x - pts[0].x)

      const head = headRef.current
      if (head) {
        const s = hovering ? 30 : 10
        head.style.width = `${s}px`
        head.style.height = `${s}px`
        head.style.transform = `translate3d(${pts[0].x}px, ${pts[0].y}px, 0) translate(-50%, -50%)`
        head.style.filter = hovering ? 'blur(3px)' : 'blur(0px)'
      }
      dotsRef.current.forEach((d, i) => {
        if (!d) return
        const t = i / N
        const size = (1 - t) * 9 + 1
        d.style.width = `${size}px`
        d.style.height = `${size}px`
        d.style.opacity = `${(1 - t) * 0.5}`
        d.style.transform =
          `translate3d(${pts[i].x}px, ${pts[i].y}px, 0) translate(-50%, -50%) ` +
          `rotate(${angle}rad) scaleX(${stretch})`
      })

      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('mousemove', onMove)
      document.documentElement.classList.remove('cursor-hidden')
    }
  }, [])

  const fine =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!fine) return null

  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', mixBlendMode: 'screen' }}
    >
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (dotsRef.current[i] = el)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: '999px',
            background:
              i < N / 2
                ? 'radial-gradient(circle, #d6c8ff, rgba(97,69,194,0.6) 60%, transparent)'
                : 'radial-gradient(circle, rgba(97,69,194,0.8), transparent 70%)',
            willChange: 'transform',
          }}
        />
      ))}
      <span
        ref={headRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          borderRadius: '999px',
          background: '#6145c2',
          boxShadow: '0 0 16px 4px rgba(97,69,194,0.8)',
          transition: 'width 0.2s ease, height 0.2s ease, filter 0.2s ease',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
