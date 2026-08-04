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
import { isDonateAllowed, openDonate } from '../../lib/donate'
import { reachGoal, GOALS } from '../../lib/metrika'
import {
  APP_TEXT_DEFAULTS,
  donateBannerText,
  DONATE_BANNER_SUPPORT_LABEL,
  DONATE_BANNER_CONTINUE_LABEL,
} from '../../constants/texts'
import { fetchAppTexts } from '../../api/texts'

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
  const [completed, setCompleted] = useState(false)
  // Практика была последней в сквозной цепочке — плашка не обещает следующую.
  const [isLastInChain, setIsLastInChain] = useState(false)
  // Тексты из CMS; до ответа сети — утверждённые дефолты.
  const [texts, setTexts] = useState(APP_TEXT_DEFAULTS)
  const [finishConfirm, setFinishConfirm] = useState(false)
  // Донат показываем только там, где это разрешает площадка (не в VK).
  const donateAllowed = isDonateAllowed()
  // Intro-модалка с правилами «без паузы и перемотки». Клиент 10.06:
  // показывать её КАЖДЫЙ раз при заходе в плеер, а не только при первом
  // (раньше localStorage-флаг хоронил её после первого закрытия). Юзер
  // должен пере-согласиться с условием перед каждой практикой.
  const [introOpen, setIntroOpen] = useState(true)
  const dismissIntro = () => setIntroOpen(false)
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
    let alive = true
    fetchAppTexts().then((t) => alive && setTexts(t))
    return () => { alive = false }
  }, [])

  // Показ плашки — один раз на завершённое прослушивание (модалка живёт внутри
  // одного маунта плеера, повторный вход в практику монтирует его заново).
  useEffect(() => {
    if (completed) reachGoal(GOALS.donateBannerShown, { practiceId: id })
  }, [completed, id])

  // Раньше при сохранённой позиции > 10c показывалась модалка «Продолжить?»
  // Клиент 04.06: убрать — практика всегда начинается с начала.
  // savePosition в фоне продолжает писать (используем как трекинг сколько
  // прослушано), но resume больше не предлагается.

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
      const res = await markComplete(id)
      setIsLastInChain(!!res?.isLastInChain)
    } catch {
      /* progress saved locally even on network failure */
    }
    setCompleted(true)
  }

  // Обе кнопки плашки уводят с экрана, поэтому цель шлём до навигации.
  const onSupportClick = () => {
    reachGoal(GOALS.donateBannerSupportClick, { practiceId: id })
    openDonate()
  }
  const onContinueClick = () => {
    reachGoal(GOALS.donateBannerContinueClick, { practiceId: id })
    exit('/')
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
          Сетка 2 колонки — равные ширины, выровнены по top baseline лейбла.
          Высоты совпадают (label-mono сверху + 44px buttons-row снизу).
          Music switcher скрываем если у практики только одна музыка. */}
      <div className="mt-3 grid shrink-0 grid-cols-2 items-start gap-4">
        <div className="flex flex-col items-start gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">
            Голос
          </span>
          <div className="flex h-11 items-center rounded-full border border-line-2 bg-white/5 p-1">
            {[{ id: 'male', label: 'М' }, { id: 'female', label: 'Ж' }].map((v) => {
              const on = selectedVoice === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoice(v.id)}
                  className={[
                    'h-9 w-10 rounded-full text-[13px] font-medium transition',
                    on ? 'bg-lilac/25 text-fg-0' : 'text-fg-2 hover:text-fg-0',
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

        <div className="flex flex-col items-end">
          {showMusicSwitcher ? (
            <MusicSwitcher practiceId={id} available={availableMusics} />
          ) : (
            <div /> /* placeholder если у практики 1 музыка */
          )}
        </div>
      </div>

      {/* Финал практики. Донат добровольный и на открытие следующей практики
          не влияет — формулировки клиента 2026-07-30. В VK-запуске блок
          доната не рендерится совсем (правила ВК 5.4.1/5.4.2, см. lib/donate). */}
      <Modal
        open={completed}
        onClose={onContinueClick}
        title="Практика завершена"
      >
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-fg-1">
          {donateBannerText(texts, { donateAllowed, isLastInChain })}
        </p>

        {donateAllowed ? (
          <div className="mt-5 flex flex-col gap-3">
            <Button fullWidth onClick={onSupportClick}>
              {DONATE_BANNER_SUPPORT_LABEL}
            </Button>
            <Button variant="secondary" fullWidth onClick={onContinueClick}>
              {DONATE_BANNER_CONTINUE_LABEL}
            </Button>
          </div>
        ) : (
          <div className="mt-5">
            <Button fullWidth onClick={onContinueClick}>
              {DONATE_BANNER_CONTINUE_LABEL}
            </Button>
          </div>
        )}
      </Modal>

      {/* Confirm «остановить практику» — клиент 03.06: при клике на ×
          посреди плеера юзер должен явно подтвердить. */}
      <Modal
        open={finishConfirm}
        onClose={() => setFinishConfirm(false)}
        title="Завершить практику?"
      >
        <p className="text-[14px] text-fg-1">
          Ты действительно хочешь остановить практику?
        </p>
        <p className="mt-2 text-[13px] text-fg-2">
          Тогда она не будет завершена и следующая практика не откроется.
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

      {/* Intro — показывается один раз. Стиль: serif заголовок,
          eyebrow «ВВЕДЕНИЕ», три строки с тонкими иконками без жирных
          обводок, разделённые hairline-линиями. */}
      <Modal
        open={introOpen}
        onClose={dismissIntro}
        title=""
      >
        <div className="flex flex-col items-center text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-lilac/70">
            Введение
          </div>
          <h2 className="mt-3 font-serif text-[28px] leading-tight text-fg-0">
            Практика — <span className="text-lilac">это поток</span>
          </h2>
          <p className="mt-4 max-w-[36ch] text-[13.5px] leading-relaxed text-fg-2">
            Вы можете выбрать голос и вариант звучания. Перемотка во время
            практики недоступна. Прослушайте её до конца, чтобы завершить
            практику и открыть следующую.
          </p>

          <div className="mt-7 w-full max-w-sm">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ),
                text: 'Нажимаете play — и слушаете до конца: так практика засчитывается и открывает следующую.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                ),
                text: 'Остановить раньше можно крестиком в центре, с подтверждением — но практика не будет завершена.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 12h2M19 12h2M7 6v12M11 3v18M15 6v12" />
                  </svg>
                ),
                text: 'Голос проводника и вариант звучания выбираются ниже на плеере.',
              },
            ].map((row, i, arr) => (
              <div key={i}>
                <div className="flex items-start gap-4 py-3 text-left">
                  <span className="mt-[2px] shrink-0 text-lilac">{row.icon}</span>
                  <span className="text-[13.5px] leading-relaxed text-fg-1">
                    {row.text}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className="h-px w-full"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(180,160,255,0.18), transparent)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-7 w-full max-w-sm">
            <Button fullWidth onClick={dismissIntro}>
              Готов
            </Button>
          </div>
        </div>
      </Modal>
    </ScreenShell>
  )
}
