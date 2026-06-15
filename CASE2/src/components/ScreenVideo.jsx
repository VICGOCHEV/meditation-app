import { useState } from 'react'

// Экран в мокапе телефона: если есть видеозапись экрана приложения —
// проигрываем её (loop, muted, inline). Если файла нет / ошибка загрузки —
// откатываемся на UI-реплику (children). Так кейс не ломается без видео,
// а с появлением файлов в /public/screens/ они подхватываются сами.
export default function ScreenVideo({ src, children, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return children
  return (
    <video
      src={src}
      className={`h-full w-full object-cover ${className}`}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      onError={() => setFailed(true)}
    />
  )
}
