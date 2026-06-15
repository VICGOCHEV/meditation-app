import { useEffect, useRef, useState } from 'react'

// Экран в мокапе телефона: если есть видеозапись экрана приложения —
// проигрываем её (loop, muted, inline). Если файла нет / ошибка загрузки —
// откатываемся на UI-реплику (children). Так кейс не ломается без видео,
// а с появлением файлов в /public/screens/ они подхватываются сами.
//
// ВАЖНО: React не всегда выставляет DOM-свойство `muted` из JSX-атрибута,
// из-за чего iOS считает видео «со звуком», блокирует autoplay и рисует
// свою play-кнопку. Поэтому форсим muted/playsInline через ref и зовём
// play() вручную (в т.ч. по первому касанию — на случай Low Power Mode).
export default function ScreenVideo({ src, children, className = '' }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    v.playsInline = true
    const tryPlay = () => { const p = v.play(); if (p) p.catch(() => {}) }
    tryPlay()
    v.addEventListener('loadeddata', tryPlay)
    const onFirstTouch = () => tryPlay()
    window.addEventListener('touchstart', onFirstTouch, { passive: true, once: true })
    return () => {
      v.removeEventListener('loadeddata', tryPlay)
      window.removeEventListener('touchstart', onFirstTouch)
    }
  }, [src])

  if (!src || failed) return children
  return (
    <video
      ref={ref}
      src={src}
      className={`h-full w-full object-cover ${className}`}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      controls={false}
      onError={() => setFailed(true)}
    />
  )
}
