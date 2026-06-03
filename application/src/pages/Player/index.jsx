import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import AudioPlayer from '../../components/AudioPlayer'
import MusicSwitcher from '../../components/MusicSwitcher'
import { findPractice as findFromMock, mockAudioUrl } from '../../api/mock'
import { fetchPractice } from '../../api/practices'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useProgressStore } from '../../store/useProgressStore'
import { formatTime } from '../../hooks/useAudio'

// Карта (voice + musicId) → ключ в practice.audioByVariant. Та же
// нотация что использует CMS (см. backend/utils/contentShape.js).
function variantKey(voice, music) {
  return `${voice || 'male'}_music${music || 1}`
}
// Возвращает URL дорожки для выбранной пары (голос, музыка), с фолбэком
// на любую непустую — на случай если у практики нет матрицы (например,
// «авторские», где только одна дорожка в male_music1).
function resolveAudioUrl(practice, voice, music) {
  const av = practice?.audioByVariant
  if (av && typeof av === 'object') {
    const exact = av[variantKey(voice, music)]
    if (exact) return exact
    // фолбэк — для голос выбранный, любая музыка
    for (const m of [1, 2, 3]) {
      const v = av[variantKey(voice, m)]
      if (v) return v
    }
    // следующий фолбэк — любая дорожка вообще
    const any = Object.values(av).find(Boolean)
    if (any) return any
  }
  return practice?.audioUrl
}

const BLOCK_LABEL = {
  relaxation: 'Расслабление',
  awareness: 'Осознанность',
  author: 'Авторский',
}

export default function Player() {
  const { id } = useParams()
  const navigate = useNavigate()

  const loadPosition = usePlayerStore((s) => s.loadPosition)
  const clearPosition = usePlayerStore((s) => s.clearPosition)
  const markComplete = useProgressStore((s) => s.markPracticeComplete)
  // Подписываемся на выбор голоса и музыки — при смене audioUrl пересчитается
  // и useAudio запустит crossfade.
  const selectedVoice = usePlayerStore((s) => s.selectedVoice)
  const musicByPractice = usePlayerStore((s) => s.musicByPractice)
  const fallbackMusic = usePlayerStore((s) => s.selectedMusic)
  const currentMusic = musicByPractice[id] ?? fallbackMusic

  // Start from the synchronous mock match so the page renders
  // immediately; if the CMS/backend returns a richer record, swap.
  const [practice, setPractice] = useState(() => findFromMock(id))
  const [practiceLoaded, setPracticeLoaded] = useState(false)
  const [resumePrompt, setResumePrompt] = useState(null)
  const [completed, setCompleted] = useState(false)
  // `leaving` flips on intent-to-navigate. AudioPlayer reads it as
  // `shaderHidden` and runs an AnimatePresence exit on the sphere
  // BEFORE the route's own opacity fade kicks in. Without this the
  // route fade would create a stacking context that traps the
  // mix-blend-mode: screen sphere — showing as black during exit.
  const [leaving, setLeaving] = useState(false)

  // Intercept all navigation away from the player so we always have
  // the ~280 ms sphere fade-out before the route transition runs.
  const exit = (target = -1) => {
    setLeaving(true)
    setTimeout(() => {
      navigate(target)
    }, 280)
  }

  useEffect(() => {
    let alive = true
    fetchPractice(id)
      .then((p) => {
        if (!alive) return
        if (p) setPractice(p)
        setPracticeLoaded(true)
      })
      .catch(() => alive && setPracticeLoaded(true))
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    const savedPos = loadPosition(id)
    if (savedPos > 10) setResumePrompt(savedPos)
  }, [id, loadPosition])

  if (!practice && practiceLoaded) {
    return (
      <ScreenShell>
        <div className="flex min-h-[50dvh] flex-col items-center justify-center">
          <p className="text-fg-2">Практика не найдена</p>
          <div className="mt-6">
            <Button onClick={() => exit('/')}>На главную</Button>
          </div>
        </div>
      </ScreenShell>
    )
  }

  const onEnd = async () => {
    clearPosition(id)
    // markPracticeComplete is now async — it does both completion +
    // today's tracker entry in a single server call.
    try {
      await markComplete(id)
    } catch {
      /* progress saved locally even on network failure */
    }
    setCompleted(true)
  }

  return (
    <ScreenShell fixed>
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <button
          onClick={() => exit(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line-2 bg-white/5 text-fg-0 hover:bg-white/10"
          aria-label="Назад"
        >
          ←
        </button>
        {/* Music switcher — клиент 27.05: выбор фоновой энергии живёт
            внутри практики, запоминается per-practice. Если у практики
            ограничен набор фонов — передаём available={[1,2]} и т.п.
            Пока CMS не отдаёт это поле — все 3 доступны для всех. */}
        <MusicSwitcher practiceId={id} available={practice?.availableMusics} />
      </header>

      <AudioPlayer
        practiceId={id}
        audioUrl={resolveAudioUrl(practice, selectedVoice, currentMusic) || mockAudioUrl}
        title={practice?.title || '…'}
        blockLabel={BLOCK_LABEL[practice?.block]?.toUpperCase()}
        durationLabel={practice?.duration || ''}
        onEnd={onEnd}
        shaderHidden={leaving}
      />

      <Modal
        open={resumePrompt !== null}
        onClose={() => setResumePrompt(null)}
        title="Продолжить?"
      >
        <p className="text-[14px] text-fg-1">
          В прошлый раз ты остановился на {formatTime(resumePrompt || 0)}. Продолжить с этого места?
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              clearPosition(id)
              setResumePrompt(null)
            }}
          >
            Сначала
          </Button>
          <Button fullWidth onClick={() => setResumePrompt(null)}>
            Да, продолжить
          </Button>
        </div>
      </Modal>

      <Modal
        open={completed}
        onClose={() => exit('/')}
        title="Практика завершена ✓"
      >
        <p className="text-[14px] text-fg-1">
          Отмечено в трекере. Путь продолжается.
        </p>
        <div className="mt-5">
          <Button fullWidth onClick={() => exit('/')}>
            На главную
          </Button>
        </div>
      </Modal>
    </ScreenShell>
  )
}
