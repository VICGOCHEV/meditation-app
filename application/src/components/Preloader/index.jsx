import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useThemeStore } from '../../store/useThemeStore'

const SESSION_KEY = 'preloader_played'
const FALLBACK_TIMEOUT = 8000
// Пока показан тап-гейт — не завершаем сплэш этим таймером (ждём касание),
// но и не залипаем навсегда, если юзер отвлёкся.
const GATE_SAFETY = 20000

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
  // Тап-гейт «Нажми, чтобы начать» — показывается ТОЛЬКО когда браузер
  // зарезал автоплей со звуком (типовой холодный вход в PWA/webview на iOS,
  // где нет user-gesture на origin). Тап пользователя разблокирует звук и
  // запускает видео с музыкой. На desktop / где жест уже был — автоплей
  // со звуком проходит сразу, гейт не показывается.
  const [gate, setGate] = useState(false)
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

    const v = videoRef.current
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      sessionStorage.setItem(SESSION_KEY, '1')
      setVisible(false)
      onDone?.()
    }

    let fallback = setTimeout(finish, FALLBACK_TIMEOUT)
    const onEnded = () => {
      clearTimeout(fallback)
      finish()
    }
    v?.addEventListener('ended', onEnded)

    // Пробуем автоплей СО звуком. Пустил браузер (desktop / был жест) —
    // сплэш звучит сразу. Зарезал (iOS cold) — показываем одноразовый
    // тап-гейт, чтобы звук гарантированно заиграл после касания.
    if (v) {
      v.muted = false
      v.defaultMuted = false
      const p = v.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          setGate(true)
          clearTimeout(fallback)
          fallback = setTimeout(finish, GATE_SAFETY)
        })
      }
    }

    return () => {
      clearTimeout(fallback)
      v?.removeEventListener('ended', onEnded)
    }
  }, [visible, onDone])

  // Тап по гейту — жест разблокирует звук, запускаем видео с музыкой.
  const startWithSound = () => {
    setGate(false)
    const v = videoRef.current
    if (v) {
      v.muted = false
      v.defaultMuted = false
      const p = v.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }
  }

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
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="auto"
            controls={false}
            disableRemotePlayback
            disablePictureInPicture
          />

          <AnimatePresence>
            {gate && (
              <motion.button
                type="button"
                onClick={startWithSound}
                aria-label="Нажми, чтобы начать со звуком"
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-bg-0/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.span
                  className="block h-16 w-16 rounded-full border border-fg-2/50"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="font-serif text-[19px] font-light tracking-wide text-fg-0">
                  Нажми, чтобы начать
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
                  со звуком
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
