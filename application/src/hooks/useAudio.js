import { useEffect, useRef, useState, useCallback } from 'react'
import { Howl } from 'howler'

export function useAudio(src, { initialPosition = 0, onEnd } = {}) {
  const howlRef = useRef(null)
  const [isPlaying, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(initialPosition)
  const [loaded, setLoaded] = useState(false)

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
        try { howl.fade(0, 1, FADE_MS) } catch { /* ignore */ }
      },
      onpause: () => setPlaying(false),
      onstop: () => setPlaying(false),
      onend: () => {
        setPlaying(false)
        setPosition(0)
        onEnd?.()
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
    const id = setInterval(() => {
      const h = howlRef.current
      if (!h) return
      const cur = h.seek()
      if (typeof cur === 'number' && Number.isFinite(cur)) setPosition(cur)
    }, 250)
    return () => clearInterval(id)
  }, [loaded])

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
