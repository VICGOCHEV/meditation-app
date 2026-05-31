import { useEffect, useRef, useState } from 'react'
import { IconPlay, IconPause } from './icons.jsx'
import { fmtClock } from '../lib/format.js'

// Глобально один проигрыватель — чтобы не играли две дорожки разом.
let current = null

export default function MiniPlayer({ url, label, durationSec, compact = false }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const a = ref.current
    if (!a) return
    const onEnd = () => setPlaying(false)
    a.addEventListener('ended', onEnd)
    a.addEventListener('pause', onEnd)
    return () => {
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('pause', onEnd)
      if (current === a) current = null
    }
  }, [])

  const toggle = (e) => {
    e.stopPropagation()
    const a = ref.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      if (current && current !== a) current.pause()
      current = a
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  if (!url) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      className={`group inline-flex items-center gap-2 rounded-sm border border-line bg-bg-0 transition-colors hover:border-violet/60 ${
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
      }`}
    >
      <audio ref={ref} src={url} preload="none" />
      <span
        className={`grid place-items-center rounded-full text-white transition-colors ${
          playing ? 'bg-violet' : 'bg-bg-3 group-hover:bg-violet/80'
        } ${compact ? 'h-5 w-5' : 'h-6 w-6'}`}
      >
        {playing ? <IconPause size={compact ? 11 : 13} /> : <IconPlay size={compact ? 11 : 13} />}
      </span>
      {label && <span className="truncate text-xs text-fg-2 max-w-[120px]">{label}</span>}
      {durationSec != null && (
        <span className="font-mono text-[11px] text-fg-3">{fmtClock(durationSec)}</span>
      )}
    </button>
  )
}
