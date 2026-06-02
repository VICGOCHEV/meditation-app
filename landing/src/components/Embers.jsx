import { useEffect, useRef } from 'react'

// Поднимающиеся угли/искры — огонёк рассыпается в рой.
// Glow рисуем ОДИН раз в офскрин-спрайт и потом drawImage'им (без shadowBlur — дёшево).
export default function Embers({ count = 48 }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    let raf = 0, W = 0, H = 0, t = 0
    const colors = ['#ffe6b3', '#ffd28a', '#d6c8ff', '#c2a0ff', '#fff4e0']
    const rnd = (a, b) => a + Math.random() * (b - a)

    // предрендер мягкого огонька в офскрин-канвас (по одному на цвет)
    const SPR = 48
    const sprites = colors.map((c) => {
      const s = document.createElement('canvas'); s.width = s.height = SPR
      const sc = s.getContext('2d')
      const g = sc.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2)
      g.addColorStop(0, c); g.addColorStop(0.4, c + '88'); g.addColorStop(1, 'transparent')
      sc.fillStyle = g; sc.fillRect(0, 0, SPR, SPR)
      return s
    })

    const mk = (atBottom) => ({
      x: rnd(0, W), y: atBottom ? H + rnd(0, 40) : rnd(0, H),
      r: rnd(3, 10), vy: rnd(0.25, 1.0), vx: rnd(-0.3, 0.3),
      a: rnd(0.25, 0.7), ph: rnd(0, 6.28), s: (Math.random() * sprites.length) | 0,
    })
    let ps = []
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      W = cv.clientWidth; H = cv.clientHeight
      cv.width = W * dpr; cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ps = Array.from({ length: count }, () => mk(false))
    }
    let visible = true
    const loop = () => {
      if (!visible) { raf = 0; return } // секция за экраном → не жжём rAF
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      for (const p of ps) {
        p.y -= p.vy
        p.x += p.vx + Math.sin(t * 0.8 + p.ph) * 0.25
        if (p.y < -12) Object.assign(p, mk(true))
        const flick = 0.6 + 0.4 * Math.sin(t * 3 + p.ph)
        const fade = Math.min(1, (H - p.y) / (H * 0.85))
        ctx.globalAlpha = Math.max(0, p.a * flick * fade)
        const d = p.r * 2
        ctx.drawImage(sprites[p.s], p.x - p.r, p.y - p.r, d, d)
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(loop)
    }
    resize(); loop()
    window.addEventListener('resize', resize)
    // пауза, когда секция вне вьюпорта (rootMargin — заранее «прогреть»)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(loop)
    }, { rootMargin: '150px' })
    io.observe(cv)
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize) }
  }, [count])
  return <canvas ref={ref} className="absolute inset-0 block h-full w-full" />
}
