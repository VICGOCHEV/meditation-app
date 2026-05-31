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
    const howl = new Howl({
      src: [src],
      html5: true,
      onload: () => {
        setLoaded(true)
        setDuration(howl.duration())
        if (initialPosition > 0) howl.seek(initialPosition)
      },
      onplay: () => setPlaying(true),
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
      howl.unload()
      howlRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  useEffect(() => {
    if (!loaded) return
    const id = setInterval(() => {
      const h = howlRef.current
      if (h && h.playing()) setPosition(h.seek() || 0)
    }, 500)
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
