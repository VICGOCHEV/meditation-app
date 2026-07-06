import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useThemeStore } from '../../store/useThemeStore'

const SESSION_KEY = 'preloader_played'
const FALLBACK_TIMEOUT = 8000

// Вычисляем «слот по времени», когда тема в режиме auto. Логика такая
// же как в useTimeTheme.js (05/11/17/22 границы), но без 30-мин
// crossfade — нам нужно выбрать ОДИН файл, не интерполировать между.
function autoSlot(date = new Date()) {
  const m = date.getHours() * 60 + date.getMinutes()
  if (m < 300 || m >= 1320) return 'night'
  if (m < 660) return 'morning'
  if (m < 1020) return 'day'
  return 'evening'
}

export default function Preloader({ onDone }) {
  const themeMode = useThemeStore((s) => s.mode)

  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEY) !== '1'
  })
  const videoRef = useRef(null)

  // Слот выбираем один раз при монтировании, чтобы не дёргать src
  // на пересечении границ слотов (в этот момент пользователь смотрит
  // preloader, и переключение разрушит проигрывание).
  const [slot] = useState(() =>
    themeMode === 'auto' ? autoSlot() : themeMode
  )
  const src = `/preloaders/${slot}.mp4`

  useEffect(() => {
    if (!visible) {
      onDone?.()
      return
    }

    const finish = () => {
      sessionStorage.setItem(SESSION_KEY, '1')
      setVisible(false)
      onDone?.()
    }

    // Разовый разлочер звука: если браузер зарезал автоплей со звуком
    // (нет user gesture на origin — типовой «холодный» вход в PWA/webview),
    // видео стартует немым, а первое же касание/скролл/клик врубает звук
    // вживую. Слушатель одноразовый и снимается сам.
    const GESTURES = ['pointerdown', 'touchstart', 'click', 'keydown']
    let unlockAttached = false
    const attachUnlock = (v) => {
      if (unlockAttached) return
      unlockAttached = true
      const unlock = () => {
        detachUnlock()
        if (v.muted) {
          v.muted = false
          v.defaultMuted = false
          // Громкость могла остаться, play() уже идёт — просто снимаем mute.
          const r = v.play()
          if (r && typeof r.catch === 'function') r.catch(() => {})
        }
      }
      GESTURES.forEach((e) =>
        window.addEventListener(e, unlock, { once: true, passive: true })
      )
      detachUnlock = () =>
        GESTURES.forEach((e) => window.removeEventListener(e, unlock))
    }
    let detachUnlock = () => {}

    const v = videoRef.current
    if (v) {
      // Каскад автоплея для видео со звуком:
      // 1. Пробуем с включённым звуком (если user уже взаимодействовал
      //    со страницей — например, кликнул «Войти» — браузер пустит).
      // 2. Если отказ — пробуем muted (всегда разрешено) + вешаем разлочер
      //    звука на первый жест, чтобы звук догнал при касании.
      // 3. Если и muted отказ — скипаем preloader, чтобы не показывать
      //    tap-to-play overlay.
      v.muted = false
      const tryUnmuted = v.play()
      if (tryUnmuted && typeof tryUnmuted.catch === 'function') {
        tryUnmuted.catch(() => {
          v.muted = true
          v.defaultMuted = true
          const tryMuted = v.play()
          if (tryMuted && typeof tryMuted.catch === 'function') {
            tryMuted.catch(() => finish())
          }
          attachUnlock(v)
        })
      }
    }

    const fallback = setTimeout(finish, FALLBACK_TIMEOUT)
    const onEnded = () => {
      clearTimeout(fallback)
      finish()
    }
    v?.addEventListener('ended', onEnded)
    return () => {
      clearTimeout(fallback)
      v?.removeEventListener('ended', onEnded)
      detachUnlock()
    }
  }, [visible, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: [0.22, 0.8, 0.36, 1] }}
        >
          <video
            ref={videoRef}
            src={src}
            className="pointer-events-none h-full w-full object-cover"
            // Контр-фильтр: парент <html> крутит хью на +var(--app-hue),
            // мы здесь крутим обратно. Net = 0deg. Видео остаётся в
            // оригинальной палитре (уже снято под нужный цвет суток).
            style={{ filter: 'hue-rotate(calc(-1 * var(--app-hue, 0deg)))' }}
            autoPlay
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="auto"
            controls={false}
            disableRemotePlayback
            disablePictureInPicture
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
