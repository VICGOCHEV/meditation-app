import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AmorphSphere from '../AmorphSphere'
import { useAudio, formatTime } from '../../hooks/useAudio'
import { usePlayerStore } from '../../store/usePlayerStore'

function PlayIcon({ className = 'h-16 w-16' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function CloseIcon({ className = 'h-14 w-14' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// Плеер БЕЗ перемотки (клиент 03.06: «практика — это поток»).
// — PLAY кнопка ×2 (176px)
// — Когда играет: вместо PAUSE — кнопка «Завершить» (× с надписью).
//   onRequestFinish прокидывается в родителя, который показывает confirm
//   модалку и решает: реально завершить (onEnd) или продолжить.
// — Прогресс-бар светящийся, толстый (8px), БЕЗ drag-перемотки.
// — Кнопок ±15 нет.
export default function AudioPlayer({
  practiceId,
  audioUrl,
  title,
  blockLabel,
  durationLabel,
  onEnd,
  onRequestFinish,
  shaderHidden = false,
}) {
  const savePosition = usePlayerStore((s) => s.savePosition)
  const loadPosition = usePlayerStore((s) => s.loadPosition)
  const saveTimer = useRef(null)

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

  const pct = duration ? (position / duration) * 100 : 0

  // Центральный клик по кнопке:
  //  — если ещё не играл → toggle (стартует)
  //  — если уже играет → дёргаем onRequestFinish (родитель покажет confirm)
  function onCenterClick(e) {
    e.stopPropagation()
    if (!loaded) return
    if (!isPlaying) toggle()
    else onRequestFinish?.()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="relative flex min-h-0 flex-1 flex-col items-center justify-between overflow-hidden py-8"
      >
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

        {/* Центральный круг — единственная активная кнопка. ×2 размер
            (~176px) против прежних 88. Клик: либо стартует, либо
            предлагает завершить. */}
        <button
          type="button"
          onClick={onCenterClick}
          disabled={!loaded}
          className="relative z-10 flex h-[176px] w-[176px] items-center justify-center rounded-full bg-transparent text-lilac transition active:scale-[0.97] disabled:opacity-60"
          style={{
            border: '2px solid #6145c2',
            boxShadow:
              '0 0 56px rgba(97,69,194,.95), 0 0 112px rgba(97,69,194,.55), inset 0 0 36px rgba(97,69,194,.35)',
          }}
          aria-label={isPlaying ? 'Завершить практику' : 'Играть'}
        >
          {isPlaying ? (
            <span className="flex flex-col items-center gap-1">
              <CloseIcon className="h-12 w-12" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-lilac/80">
                Завершить
              </span>
            </span>
          ) : (
            <PlayIcon className="h-20 w-20" />
          )}
        </button>

        <div className="relative z-10 text-center">
          <div className="label-mono">{blockLabel}</div>
          <div className="mt-2 text-[15px] text-fg-1">{durationLabel}</div>
        </div>
      </div>

      {/* Прогресс-бар — светящийся, без drag, БЕЗ thumb (т.к. ничего
          не клик-перемотать). Просто визуальная индикация хода практики. */}
      <div className="mt-3 shrink-0">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full transition-[width] duration-200 ease-linear"
            style={{
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, oklch(0.62 0.18 290), oklch(0.78 0.14 310), oklch(0.82 0.12 280))',
              boxShadow:
                '0 0 14px rgba(180,160,255,.85), 0 0 26px rgba(97,69,194,.55)',
            }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-fg-3">
          <span>{formatTime(position)}</span>
          <span>{duration ? formatTime(duration) : durationLabel}</span>
        </div>
      </div>
    </div>
  )
}
