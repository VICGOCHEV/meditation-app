import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import AudioPlayer from '../../components/AudioPlayer'
import { findPractice as findFromMock, mockAudioUrl } from '../../api/mock'
import { fetchPractice } from '../../api/practices'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useProgressStore } from '../../store/useProgressStore'
import { formatTime } from '../../hooks/useAudio'

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
      <header className="mb-4 shrink-0">
        <button
          onClick={() => exit(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line-2 bg-white/5 text-fg-0 hover:bg-white/10"
          aria-label="Назад"
        >
          ←
        </button>
      </header>

      <AudioPlayer
        practiceId={id}
        audioUrl={practice?.audioUrl || mockAudioUrl}
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
