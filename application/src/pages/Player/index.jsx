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

// Какие музыки реально загружены у практики (1/2/3) — для MusicSwitcher,
// чтобы не показывать активными те которых нет в БД. Если у практики только
// male_music1 / female_music1 (CSV «нет, одна музыка») — вернёт [1].
function availableMusicsOf(practice) {
  const av = practice?.audioByVariant
  if (!av || typeof av !== 'object') return [1, 2, 3]
  const set = new Set()
  for (const m of [1, 2, 3]) {
    if (av[`male_music${m}`] || av[`female_music${m}`]) set.add(m)
  }
  if (!set.size) return [1, 2, 3]
  return Array.from(set).sort()
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
  const setVoice = usePlayerStore((s) => s.setVoice)
  const musicByPractice = usePlayerStore((s) => s.musicByPractice)
  const fallbackMusic = usePlayerStore((s) => s.selectedMusic)
  const currentMusic = musicByPractice[id] ?? fallbackMusic

  // Start from the synchronous mock match so the page renders
  // immediately; if the CMS/backend returns a richer record, swap.
  const [practice, setPractice] = useState(() => findFromMock(id))
  const [practiceLoaded, setPracticeLoaded] = useState(false)
  const [resumePrompt, setResumePrompt] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [finishConfirm, setFinishConfirm] = useState(false)
  // Intro-модалка показывается только при первом открытии плеера (за всё
  // время). После закрытия — кладём флаг в localStorage и больше не дёргаем.
  const [introOpen, setIntroOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('player_intro_seen') !== '1'
  })
  const dismissIntro = () => {
    try { localStorage.setItem('player_intro_seen', '1') } catch { /* noop */ }
    setIntroOpen(false)
  }
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

  const availableMusics = availableMusicsOf(practice)
  const showMusicSwitcher = availableMusics.length > 1

  return (
    <ScreenShell fixed>
      {/* Только кнопка «назад» сверху. Voice + Music ушли вниз — клиент 03.06. */}
      <header className="mb-2 flex shrink-0 items-center justify-between gap-3">
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
        audioUrl={resolveAudioUrl(practice, selectedVoice, currentMusic) || mockAudioUrl}
        title={practice?.title || '…'}
        blockLabel={BLOCK_LABEL[practice?.block]?.toUpperCase()}
        durationLabel={practice?.duration || ''}
        onEnd={onEnd}
        onRequestFinish={() => setFinishConfirm(true)}
        shaderHidden={leaving}
      />

      {/* Bottom row: voice toggle слева, MusicSwitcher справа.
          Music switcher скрываем если у практики только одна музыка
          (CSV: «Утреннее погружение» и «Обращение к себе» без выбора). */}
      <div className="mt-3 flex shrink-0 items-end justify-between gap-3">
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">
            Голос
          </span>
          <div className="flex rounded-full border border-line-2 bg-white/5 p-1">
            {[{ id: 'male', label: 'М' }, { id: 'female', label: 'Ж' }].map((v) => {
              const on = selectedVoice === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoice(v.id)}
                  className={[
                    'h-8 w-8 rounded-full text-[13px] font-medium transition',
                    on ? 'bg-lilac/30 text-fg-0' : 'text-fg-2 hover:text-fg-0',
                  ].join(' ')}
                  aria-label={v.id === 'male' ? 'Мужской голос' : 'Женский голос'}
                  aria-pressed={on}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>

        {showMusicSwitcher ? (
          <div className="flex flex-col items-end">
            <MusicSwitcher practiceId={id} available={availableMusics} />
          </div>
        ) : (
          <div /> /* placeholder для flex-выравнивания */
        )}
      </div>

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

      {/* Confirm «остановить практику» — клиент 03.06: при клике на ×
          посреди плеера юзер должен явно подтвердить. */}
      <Modal
        open={finishConfirm}
        onClose={() => setFinishConfirm(false)}
        title="Завершить практику?"
      >
        <p className="text-[14px] text-fg-1">
          Ты действительно хочешь остановить практику? Прогресс этого сеанса
          сохранится, но завершённой не отметим.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setFinishConfirm(false)}>
            Продолжить
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setFinishConfirm(false)
              // Тот же путь что и завершение «по концу аудио» — просто
              // выход без mark complete (юзер не дослушал).
              clearPosition(id)
              exit('/')
            }}
          >
            Да, остановить
          </Button>
        </div>
      </Modal>

      {/* Intro-модалка — показывается ровно один раз для всех практик. */}
      <Modal
        open={introOpen}
        onClose={dismissIntro}
        title="Практика — это поток"
      >
        <div className="flex flex-col gap-4 text-[14px] text-fg-1">
          <p className="text-fg-2">
            Чтобы голос проводника действительно вёл — мы убрали возможность
            ставить на паузу и перематывать.
          </p>
          <ul className="flex flex-col gap-3 text-[13.5px]">
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lilac"
                style={{
                  border: '1.5px solid #6145c2',
                  boxShadow: '0 0 12px rgba(97,69,194,.7), inset 0 0 6px rgba(97,69,194,.25)',
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span>Жмёшь play — и просто слушаешь. До конца.</span>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lilac"
                style={{
                  border: '1.5px solid #6145c2',
                  boxShadow: '0 0 12px rgba(97,69,194,.7), inset 0 0 6px rgba(97,69,194,.25)',
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </span>
              <span>Если нужно остановить — кнопка завершения в центре, с подтверждением.</span>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lilac"
                style={{
                  border: '1.5px solid #6145c2',
                  boxShadow: '0 0 12px rgba(97,69,194,.7), inset 0 0 6px rgba(97,69,194,.25)',
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 12h2M19 12h2M7 6v12M11 3v18M15 6v12" />
                </svg>
              </span>
              <span>Внизу можно сменить голос проводника и фоновое звучание — это да.</span>
            </li>
          </ul>
        </div>
        <div className="mt-5">
          <Button fullWidth onClick={dismissIntro}>
            Готов
          </Button>
        </div>
      </Modal>
    </ScreenShell>
  )
}
