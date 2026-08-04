import { useEffect, useRef, useState, useCallback } from 'react'
import { Howl } from 'howler'

// Доля длительности, которую нужно РЕАЛЬНО прослушать, чтобы практика
// считалась завершённой. Считаем накопленное время воспроизведения, а не
// позицию плейхеда: позицию можно перемотать, накопленное время — нет.
const COMPLETE_RATIO = 0.95

export function useAudio(src, { initialPosition = 0, onEnd } = {}) {
  const howlRef = useRef(null)
  const [isPlaying, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(initialPosition)
  const [loaded, setLoaded] = useState(false)
  // Сколько секунд практика реально играла. Не сбрасывается при смене src:
  // переключение голоса/музыки посреди практики — это тот же сеанс.
  //
  // Считаем по РЕАЛЬНОМУ времени между play и pause/end, а не по числу тиков
  // интервала: на мобильном в фоне таймеры throttl'ятся, аудио при этом
  // продолжает играть — практика была бы дослушана, но не засчитана.
  const listenedRef = useRef(0)
  // Момент последнего старта воспроизведения (мс), null — сейчас не играет.
  const playingSinceRef = useRef(null)
  const completedRef = useRef(false)
  // onEnd держим в ref: колбэк пересоздаётся на каждый рендер Player'а, а
  // Howl создаётся один раз на src — иначе в onend залипнет старая версия.
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const fireComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onEndRef.current?.()
  }, [])

  // Забирает накопленное с момента последнего play и останавливает счётчик.
  const flushListened = useCallback(() => {
    if (playingSinceRef.current == null) return listenedRef.current
    listenedRef.current += (Date.now() - playingSinceRef.current) / 1000
    playingSinceRef.current = null
    return listenedRef.current
  }, [])

  // Прослушано на данный момент, включая текущий незакрытый отрезок.
  const listenedNow = useCallback(
    () =>
      listenedRef.current +
      (playingSinceRef.current == null ? 0 : (Date.now() - playingSinceRef.current) / 1000),
    []
  )

  useEffect(() => {
    if (!src) return
    let cancelled = false
    // Если уже играл предыдущий трек — crossfade: запоминаем позицию +
    // громкость, плавно гасим, и стартуем новый с той же позиции с fade-in.
    // Если первый запуск (нет предыдущего) — обычный load.
    const prev = howlRef.current
    const wasPlaying = !!(prev && prev.playing())
    const prevSec = prev ? prev.seek() : initialPosition
    const startAt = (typeof prevSec === 'number' && Number.isFinite(prevSec) && prevSec > 0)
      ? prevSec
      : initialPosition

    const FADE_MS = 380
    if (prev) {
      try {
        // Плавно гасим старый, потом unload.
        prev.fade(prev.volume() || 1, 0, FADE_MS)
        setTimeout(() => {
          try { prev.stop(); prev.unload() } catch { /* ignore */ }
        }, FADE_MS + 30)
      } catch { /* ignore */ }
    }

    const howl = new Howl({
      src: [src],
      html5: true,
      volume: 0,  // fade-in
      onload: () => {
        if (cancelled) return
        setLoaded(true)
        setDuration(howl.duration())
        if (startAt > 0 && startAt < howl.duration()) {
          howl.seek(startAt)
        }
        if (wasPlaying) howl.play()
      },
      onplay: () => {
        setPlaying(true)
        playingSinceRef.current = Date.now()
        try { howl.fade(0, 1, FADE_MS) } catch { /* ignore */ }
      },
      onpause: () => {
        setPlaying(false)
        flushListened()
      },
      onstop: () => {
        setPlaying(false)
        flushListened()
      },
      onend: () => {
        setPlaying(false)
        setPosition(0)
        // Трек доиграл до конца — но засчитываем, только если он реально
        // звучал. Скип в конец (если он когда-нибудь появится в UI) даст
        // onend при почти нулевом listened и завершением считаться не будет.
        const listened = flushListened()
        const total = howl.duration() || 0
        if (total === 0 || listened >= total * COMPLETE_RATIO) {
          fireComplete()
        }
      },
    })
    howlRef.current = howl
    return () => {
      cancelled = true
      try {
        // Не unload текущий howl здесь — если src сменился, новый useEffect
        // уже создал новый howl и сделал crossfade. Unload произойдёт через
        // crossfade-handler. Если же effect размонтируется (уход со страницы)
        // — нужно остановить howl и unload.
        if (howlRef.current === howl) {
          howl.fade(howl.volume() || 1, 0, 280)
          setTimeout(() => { try { howl.stop(); howl.unload() } catch { /* ok */ } }, 320)
          howlRef.current = null
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  useEffect(() => {
    if (!loaded) return
    // 250 мс вместо 500 — плавнее ходит курсор. Читаем howl.seek() даже
    // на паузе чтобы не было лага в визуале после ±15 или drag-перемотки.
    const TICK_MS = 250
    const id = setInterval(() => {
      const h = howlRef.current
      if (!h) return
      const cur = h.seek()
      if (typeof cur === 'number' && Number.isFinite(cur)) setPosition(cur)

      if (!h.playing()) return
      // Хвост трека (тишина, затухание) часть юзеров не дослушивает физически —
      // 95% реального времени достаточно, ждать onend необязательно.
      // Интервал здесь только опрашивает счётчик; само время считается по
      // часам, поэтому throttling таймера в фоне ничего не теряет.
      const total = h.duration() || 0
      if (total > 0 && listenedNow() >= total * COMPLETE_RATIO) {
        fireComplete()
      }
    }, TICK_MS)
    return () => clearInterval(id)
  }, [loaded, fireComplete, listenedNow])

  const play = useCallback(() => howlRef.current?.play(), [])
  const pause = useCallback(() => howlRef.current?.pause(), [])
  const toggle = useCallback(() => {
    const h = howlRef.current
    if (!h) return
    h.playing() ? h.pause() : h.play()
  }, [])
  const seek = useCallback((sec) => {
    const h = howlRef.current
    if (!h) return
    h.seek(sec)
    setPosition(sec)
  }, [])
  const skip = useCallback((delta) => {
    const h = howlRef.current
    if (!h) return
    const next = Math.max(0, Math.min((h.seek() || 0) + delta, h.duration() || 0))
    h.seek(next)
    setPosition(next)
  }, [])
  const setVolume = useCallback((v) => howlRef.current?.volume(v), [])
  const getCurrent = useCallback(() => howlRef.current?.seek() || 0, [])

  return {
    isPlaying,
    duration,
    position,
    loaded,
    play,
    pause,
    toggle,
    seek,
    skip,
    setVolume,
    getCurrent,
  }
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${mm}:${ss}`
}
