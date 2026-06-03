import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AmorphSphere from '../AmorphSphere'
import { useAudio, formatTime } from '../../hooks/useAudio'
import { usePlayerStore } from '../../store/usePlayerStore'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

export default function AudioPlayer({
  practiceId,
  audioUrl,
  title,
  blockLabel,
  durationLabel,
  onEnd,
  shaderHidden = false,
}) {
  const savePosition = usePlayerStore((s) => s.savePosition)
  const loadPosition = usePlayerStore((s) => s.loadPosition)
  const saveTimer = useRef(null)

  // Defer mounting AmorphSphere until the route opacity fade completes —
  // while opacity < 1 the route wrapper is a stacking context and screen
  // blend cannot reach the global AppBackground (visible as black). Plus
  // give the WebGL canvas a beat to compile its shader and paint the
  // first frame before our opacity fade-in begins; otherwise the canvas
  // appears empty for ~200ms, then the sphere pops in at full opacity.
  const [shaderReady, setShaderReady] = useState(false)
  const [shaderPainted, setShaderPainted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShaderReady(true), 800)
    return () => clearTimeout(t)
  }, [])

  const initialPos = loadPosition(practiceId)

  const {
    isPlaying,
    duration,
    position,
    loaded,
    toggle,
    seek,
    skip,
    getCurrent,
  } = useAudio(audioUrl, { initialPosition: initialPos, onEnd })

  useEffect(() => {
    if (!loaded) return
    saveTimer.current = setInterval(() => {
      const sec = getCurrent()
      if (sec > 0) savePosition(practiceId, sec)
    }, 5000)
    return () => {
      clearInterval(saveTimer.current)
      const sec = getCurrent()
      if (sec > 0) savePosition(practiceId, sec)
    }
  }, [loaded, practiceId, savePosition, getCurrent])

  // Локальный override во время drag'а — даёт мгновенный визуальный отклик,
  // даже до того как Howler реально проматывает (html5 mode иногда отстаёт).
  const [dragPos, setDragPos] = useState(null)
  const displayedPos = dragPos != null ? dragPos : position
  const pct = duration ? (displayedPos / duration) * 100 : 0

  const ratioFromEvent = (e, rect) => {
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const onBarPointerDown = (e) => {
    if (!duration) return
    e.preventDefault()
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const update = (ev) => setDragPos(ratioFromEvent(ev, rect) * duration)
    update(e.nativeEvent)
    const onMove = (ev) => update(ev)
    const onUp = (ev) => {
      const finalSec = ratioFromEvent(ev, rect) * duration
      seek(finalSec)
      setDragPos(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const stopAnd = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="relative flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-between overflow-hidden py-8"
        onClick={toggle}
        role="button"
        aria-label={isPlaying ? 'Пауза' : 'Играть'}
      >
        {/* Sphere lives inside a square host so it never overflows the
            column on tall viewports. AnimatePresence drives a clean
            fade-OUT on navigation so the screen-blend isn't trapped
            in the route's own opacity stacking context (= black).
            Crucially: we fade in only AFTER the shader signals first
            paint — until then the canvas is fully transparent and
            no black flash is possible. */}
        <AnimatePresence>
          {shaderReady && !shaderHidden && (
            <motion.div
              key="amorph-shader"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: shaderPainted ? 1 : 0 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.28, ease: [0.22, 0.8, 0.36, 1] },
              }}
              transition={{ duration: 0.9, ease: [0.22, 0.8, 0.36, 1] }}
            >
              <div className="relative aspect-square w-full max-w-[540px]">
                <AmorphSphere
                  onFirstPaint={() => setShaderPainted(true)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h1 className="relative z-10 px-6 text-center font-serif text-[32px] leading-tight text-fg-0">
          {title}
        </h1>

        <div className="relative z-10 flex items-center gap-6">
          <button
            type="button"
            onClick={stopAnd(() => skip(-15))}
            disabled={!loaded}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/5 text-fg-0 backdrop-blur-sm transition hover:bg-white/10 disabled:opacity-50"
            aria-label="-15 секунд"
          >
            <span className="font-mono text-[13px]">-15</span>
          </button>

          {/* Big play button — same look as the practice-card play
              (transparent, 2 px violet border, layered violet glow,
              lilac icon), just scaled up to 88×88. */}
          <button
            type="button"
            onClick={stopAnd(toggle)}
            disabled={!loaded}
            className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-transparent text-lilac transition hover:bg-violet/10 disabled:opacity-60"
            style={{
              border: '2px solid #6145c2',
              boxShadow:
                '0 0 28px rgba(97,69,194,.95), 0 0 56px rgba(97,69,194,.55), inset 0 0 18px rgba(97,69,194,.35)',
            }}
            aria-label={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            onClick={stopAnd(() => skip(15))}
            disabled={!loaded}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/5 text-fg-0 backdrop-blur-sm transition hover:bg-white/10 disabled:opacity-50"
            aria-label="+15 секунд"
          >
            <span className="font-mono text-[13px]">+15</span>
          </button>
        </div>

        <div className="relative z-10 text-center">
          <div className="label-mono">{blockLabel}</div>
          <div className="mt-2 text-[15px] text-fg-1">{durationLabel}</div>
        </div>
      </div>

      <div className="mt-4 shrink-0">
        {/* Тач-область толще (16px) — пальцем удобно. Видимая дорожка
            тоньше (4px). Thumb-кружок показывает текущую позицию.
            Поддерживает drag (pointer events + window-уровень handlers). */}
        <div
          onPointerDown={onBarPointerDown}
          className="relative h-4 w-full cursor-pointer touch-none select-none"
          role="slider"
          aria-label="Перемотка"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={displayedPos}
        >
          <div className="absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full"
              style={{
                width: `${pct}%`,
                background:
                  'linear-gradient(90deg, oklch(0.55 0.2 290), oklch(0.78 0.14 310))',
                transition: dragPos != null ? 'none' : 'width 0.2s linear',
              }}
            />
          </div>
          {/* Thumb */}
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{
              left: `${pct}%`,
              boxShadow: '0 0 14px rgba(180,160,255,.8), 0 0 24px rgba(97,69,194,.5)',
              transition: dragPos != null ? 'none' : 'left 0.2s linear',
              opacity: duration ? 1 : 0,
            }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-fg-3">
          <span>{formatTime(displayedPos)}</span>
          <span>{duration ? formatTime(duration) : durationLabel}</span>
        </div>
      </div>
    </div>
  )
}
