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
    if (first.decode) first.decode().catch(() => {})

    const CONC = 4
    let next = 1
    let active = 0
    const pump = () => {
      while (!cancelled && active < CONC && next < FRAME_COUNT) {
        const img = load(next++)
        active++
        const done = () => { active--; if (!cancelled) pump() }
        if (img.decode) img.decode().then(done).catch(done)
        else { img.onload = done; img.onerror = done }
      }
    }
    pump()
    return () => { cancelled = true }
  }, [dir, count])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let lastIdx = -1

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
      lastIdx = idx
      const img = imagesRef.current[idx]
      const cw = canvas.clientWidth, ch = canvas.clientHeight
      if (img && img.complete && img.naturalWidth) {
        const [x, y, w, h] = cover(img)
        ctx.clearRect(0, 0, cw, ch)
        ctx.drawImage(img, x, y, w, h)
      }
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(canvas.clientWidth * dpr)
      canvas.height = Math.floor(canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(true)
    }

    resize()
    window.addEventListener('resize', resize)
    const unsub = progress?.on ? progress.on('change', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => draw(false)) }) : null
    // догрузка кадров — перерисовываем
    const poll = setInterval(() => draw(true), 250)
    const stop = setTimeout(() => clearInterval(poll), 12000)

    return () => {
      window.removeEventListener('resize', resize)
      if (unsub) unsub()
      cancelAnimationFrame(raf); clearInterval(poll); clearTimeout(stop)
    }
  }, [progress])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
}
