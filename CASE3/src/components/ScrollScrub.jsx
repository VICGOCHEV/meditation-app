import { useEffect, useRef } from 'react'

const B = import.meta.env.BASE_URL

// Покадровый скролл-скраб: AVIF-секвенция, отрисовка на canvas по прогрессу
// (MotionValue 0→1 фазы скраба). Кадры предзагружаются и ДЕКОДИРУЮТСЯ заранее
// (img.decode) → drawImage без джанка при скролле.
export default function ScrollScrub({ progress, dir = 'frames', count = 121 }) {
  const canvasRef = useRef(null)
  const imagesRef = useRef([])
  const FRAME_COUNT = count
  const framePath = (i) => `${B}${dir}/${String(i).padStart(4, '0')}.avif`

  useEffect(() => {
    // Прогрессивная загрузка: первый кадр сразу, остальные — пулом (CONC),
    // decode по очереди → нет «шторма декода», который вешал старт.
    let cancelled = false
    const imgs = new Array(FRAME_COUNT)
    imagesRef.current = imgs
    const load = (i) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = framePath(i + 1)
      imgs[i] = img
      return img
    }
    // первый кадр — приоритетно
    const first = load(0)
    if (first.decode) first.decode().then(() => { first._ready = true }).catch(() => { first._ready = true })
    else first._ready = true

    const CONC = 6
    let next = 1
    let active = 0
    const pump = () => {
      while (!cancelled && active < CONC && next < FRAME_COUNT) {
        const img = load(next++)
        active++
        // помечаем кадр готовым ТОЛЬКО после декода → в draw не будет
        // синхронного decode-on-draw (главная причина дёрганья при скролле)
        const done = () => { img._ready = true; active--; if (!cancelled) pump() }
        if (img.decode) img.decode().then(done).catch(done)
        else { img.onload = done; img.onerror = done }
      }
    }
    // старт пула откладываем — даём hero-входу отрисоваться на свободном
    // главном потоке (декод 100+ AVIF иначе душит анимацию появления).
    // Но если юзер скроллит раньше — стартуем немедленно по первому скроллу.
    let started = false
    const startPump = () => { if (!started && !cancelled) { started = true; pump() } }
    const ric = window.requestIdleCallback || ((fn) => setTimeout(fn, 500))
    const idleId = ric(startPump, { timeout: 1200 })
    window.addEventListener('wheel', startPump, { once: true, passive: true })
    window.addEventListener('touchstart', startPump, { once: true, passive: true })
    return () => {
      cancelled = true
      if (window.cancelIdleCallback && typeof idleId === 'number') window.cancelIdleCallback(idleId)
      window.removeEventListener('wheel', startPump)
      window.removeEventListener('touchstart', startPump)
    }
  }, [dir, count])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let lastIdx = -1
    let visible = true

    const cover = (img) => {
      const cw = canvas.clientWidth, ch = canvas.clientHeight
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch
      let w, h, x, y
      if (cr > ir) { w = cw; h = cw / ir; x = 0; y = (ch - h) / 2 }
      else { h = ch; w = ch * ir; x = (cw - w) / 2; y = 0 }
      return [x, y, w, h]
    }
    const draw = (force) => {
      const p = progress?.get ? progress.get() : 0
      const idx = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(p * (FRAME_COUNT - 1))))
      if (idx === lastIdx && !force) return
      const img = imagesRef.current[idx]
      const cw = canvas.clientWidth, ch = canvas.clientHeight
      // рисуем только декодированный кадр; иначе оставляем предыдущий (lastIdx не двигаем),
      // poll/следующий скролл дорисует, когда кадр будет готов — без синхронного декода
      if (img && img._ready && img.naturalWidth) {
        const [x, y, w, h] = cover(img)
        ctx.clearRect(0, 0, cw, ch)
        ctx.drawImage(img, x, y, w, h)
        lastIdx = idx
      }
    }
    const applyResize = () => {
      // DPR ≤ 1.5: исходники кадров ~1824px, при DPR 2 канва только апскейлит
      // (лишние пиксели в drawImage каждый кадр = тормоза на retina)
      const dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5)
      canvas.width = Math.floor(canvas.clientWidth * dpr)
      canvas.height = Math.floor(canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(true)
    }

    const resize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(applyResize)
    }

    applyResize()
    window.addEventListener('resize', resize)
    const unsub = progress?.on ? progress.on('change', () => {
      if (!visible) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => draw(false))
    }) : null
    // догрузка кадров — перерисовываем
    const poll = setInterval(() => { if (visible) draw(true) }, 300)
    const stop = setTimeout(() => clearInterval(poll), 12000)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) draw(true)
    }, { rootMargin: '160px' })
    io.observe(canvas)

    return () => {
      window.removeEventListener('resize', resize)
      io.disconnect()
      if (unsub) unsub()
      cancelAnimationFrame(raf); clearInterval(poll); clearTimeout(stop)
    }
  }, [progress])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
}
