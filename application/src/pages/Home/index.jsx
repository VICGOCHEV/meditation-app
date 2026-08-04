import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import VoiceMusicModal from '../../components/VoiceMusicModal'
import OnboardingFog from '../../components/OnboardingFog'
import { mockPractices } from '../../api/mock'
import { fetchPractices } from '../../api/practices'
import { fetchBlocks, BLOCK_DEFAULTS } from '../../api/blocks'
import { useCheckinStore } from '../../store/useCheckinStore'
import { useProgression, LOCKED_HINT } from '../../hooks/useProgression'
import { fetchAppTexts } from '../../api/texts'
import { APP_TEXT_DEFAULTS } from '../../constants/texts'

const EASE = [0.22, 0.8, 0.36, 1]
const gridContainer = {
  animate: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}
const cardItem = {
  initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.85, ease: EASE },
  },
}

const COMP_MIN = Number(import.meta.env.VITE_COMPANIONS_MIN || 47)
const COMP_MAX = Number(import.meta.env.VITE_COMPANIONS_MAX || 740)

// Russian pluralisation for «человек»:
// 1 → человек, 2–4 → человека, 5–20 → человек, etc.
function declineLudei(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'человек'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'человека'
  return 'человек'
}

function CompanionsCounter() {
  const initial = useMemo(
    () => Math.floor(COMP_MIN + Math.random() * (COMP_MAX - COMP_MIN + 1)),
    []
  )
  const [count, setCount] = useState(initial)
  const [bumpKey, setBumpKey] = useState(0)
  const prevRef = useRef(initial)

  // Live drift: every 4-7 s the counter shifts by a small random delta,
  // skewed slightly upward so the average inches up over a session.
  // On increase the digit pops (scale 1 → 1.18 → 1) for a beat.
  useEffect(() => {
    let cancelled = false
    function schedule() {
      const wait = 4000 + Math.random() * 3000
      setTimeout(() => {
        if (cancelled) return
        // Skew: ±[2..3] down, +[1..4] up — slight positive bias.
        const r = Math.random()
        const delta = r < 0.45
          ? -(2 + Math.floor(Math.random() * 2)) // −2..−3
          : 1 + Math.floor(Math.random() * 4)     // +1..+4
        setCount((c) => {
          const next = Math.max(COMP_MIN, Math.min(COMP_MAX, c + delta))
          if (next > prevRef.current) setBumpKey((k) => k + 1)
          prevRef.current = next
          return next
        })
        schedule()
      }, wait)
    }
    schedule()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="panel flex items-center justify-between">
      <div>
        <div className="label-mono">В моменте</div>
        <div className="mt-1 text-[14px] text-lilac/80">Сейчас расслабляются</div>
      </div>
      <div className="text-right">
        <motion.div
          key={bumpKey}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 0.55, ease: [0.22, 0.8, 0.36, 1], times: [0, 0.45, 1] }}
          className="font-serif text-3xl text-fg-0 inline-block"
          style={{ transformOrigin: 'right center' }}
        >
          {count}
        </motion.div>
        <div className="text-[12px] text-lilac">{declineLudei(count)}</div>
      </div>
    </div>
  )
}

// Чистая 3-уровневая иерархия:
//   eyebrow (mono uppercase, мелкий)
//     "02 · СИСТЕМА"
//   title (serif, крупный)
//     "Архитектура состояний"
//   meta-строка (mono uppercase, ещё мельче, серый) — опционально
//     "ПЕРЕХОД В ОСОЗНАННОСТЬ · ПАРОЛЬ ОТ ЖИЗНИ"
//
// Справа — один компактный chip с условием доступа: "ПО ПОДПИСКЕ · 6/мес"
// (вместо двух конкурирующих мини-строк).
// Шапка секции на главной — крупная, с лиловой обводкой акцент-точкой,
// читаемым sub'ом. eyebrow + chip на топ-строке, заголовок крупно, sub
// чуть мельче но достаточно контрастный.
function SectionHead({ eyebrow, title, sub, chip }) {
  return (
    <div className="mb-5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-lilac shadow-[0_0_10px_rgba(180,160,255,0.7)]" />
          <div className="label-mono text-lilac/80">{eyebrow}</div>
        </div>
        {chip && (
          <span className="shrink-0 rounded-full border border-lilac bg-lilac/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-lilac">
            {chip}
          </span>
        )}
      </div>
      <h2 className="mt-3 font-serif text-[30px] leading-[1.1] text-fg-0">
        {title}
      </h2>
      {sub && (
        <div className="mt-2 text-[13px] leading-snug text-fg-2">
          {sub}
        </div>
      )}
      <div
        className="mt-4 h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, rgba(180,160,255,0.5) 0%, rgba(180,160,255,0.1) 40%, transparent 100%)',
        }}
      />
    </div>
  )
}

// Подсказка возле заблокированных практик. Заменила блок «Оформи подписку»
// после отказа от платного доступа (клиент 2026-07-30). Показывается только
// если в секции реально есть закрытые карточки.
function LockedHint({ text = LOCKED_HINT }) {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-md border border-line-2 bg-white/5 px-4 py-3">
      <svg
        viewBox="0 0 24 24"
        className="mt-[2px] h-4 w-4 shrink-0 text-lilac"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 1 1 8 0v3" />
      </svg>
      <span className="text-[13px] leading-snug text-fg-1">{text}</span>
    </div>
  )
}

function IconButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-bg-1/60 text-lilac transition hover:bg-bg-1/80"
      style={{ boxShadow: '0 0 22px -4px rgba(97,69,194,.45)' }}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const todayDone = useCheckinStore((s) => s.todayCheckinDone)
  const { isPracticeUnlocked, isPracticeCompleted } = useProgression()

  const [redirecting, setRedirecting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Initial paint uses static mockPractices so the page never blanks.
  // Once fetchPractices() resolves (CMS or real-backend), we swap.
  const [practices, setPractices] = useState(mockPractices)
  // Заголовки секций (eyebrow/title/sub/chip) — редактируются в CMS «Блоки».
  // Стартуем с дефолтов, чтобы не было мигания, затем подменяем сетевыми.
  const [blocks, setBlocks] = useState(BLOCK_DEFAULTS)
  // Тексты прогрессии — редактируются в CMS «Тексты приложения».
  const [texts, setTexts] = useState(APP_TEXT_DEFAULTS)

  useEffect(() => {
    if (!todayDone && !redirecting) {
      setRedirecting(true)
      navigate('/checkin', { replace: true })
    }
  }, [todayDone, redirecting, navigate])

  const [contentError, setContentError] = useState(false)
  useEffect(() => {
    let alive = true
    fetchPractices()
      .then((p) => {
        if (!alive || !p) return
        const hasContent =
          (p.relaxation?.length || 0) +
            (p.awareness?.length || 0) +
            (p.awareness2?.length || 0) +
            (p.author?.length || 0) >
          0
        if (hasContent) {
          setPractices(p)
          setContentError(false)
        }
      })
      .catch((e) => {
        // Раньше ошибка тихо проглатывалась и юзер видел mock-практики
        // как настоящие. Теперь логируем + поднимаем флаг для лёгкого
        // info-баннера (без блокировки UI).
        if (!alive) return
        // eslint-disable-next-line no-console
        console.warn('fetchPractices failed, using cached/mock list', e?.message || e)
        setContentError(true)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetchBlocks().then((b) => {
      if (alive && b) setBlocks(b)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetchAppTexts().then((t) => alive && setTexts(t))
    return () => {
      alive = false
    }
  }, [])

  // Вход в сквозную цепочку закрыт, пока не пройден весь блок «Точка тишины»
  // (backend/src/utils/progressionRules.js, reason 'free-not-completed').
  // Пользователь видит замок на ПЕРВОЙ практике «Осознанности» и без отдельной
  // подсказки не понимает причину: обычный LOCKED_HINT говорит про предыдущую
  // практику, а её тут нет.
  const chainEntryLocked =
    (practices.awareness?.length || 0) > 0 &&
    !isPracticeUnlocked(practices.awareness[0].id) &&
    (practices.relaxation || []).some((p) => !isPracticeCompleted(p.id))

  // Текст правила объясняет замки — значит живёт ровно столько, сколько они
  // есть. Считаем по ВСЕЙ сквозной цепочке, а не по одному блоку: замок может
  // остаться в «Авторских», когда «Осознанность» уже пройдена целиком.
  // Прошёл всё и вернулся переслушать — объяснения про закрытые практики уже
  // не показываем.
  const chainHasLocked = [
    ...(practices.awareness || []),
    ...(practices.awareness2 || []),
    ...(practices.author || []),
  ].some((p) => !isPracticeUnlocked(p.id))

  const goPlay = (id) => navigate(`/player/${id}`)

  return (
    <ScreenShell withBottomNav>
      {/* Дым на Home — клиент 03.06: «слишком дохуя». Снижаю density 1.2 → 0.45. */}
      <OnboardingFog density={0.45} />
      <header className="mb-6 flex items-center justify-between">
        <IconButton onClick={() => setSettingsOpen(true)} label="Настройки">
          <SettingsIcon />
        </IconButton>
        <IconButton onClick={() => navigate('/profile')} label="Профиль">
          <ProfileIcon />
        </IconButton>
      </header>

      <CompanionsCounter />

      {contentError && (
        <div className="mb-4 mt-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12px] text-amber-200/90">
          Не удалось обновить список практик. Показаны последние сохранённые
          данные — потяни вниз или обнови страницу.
        </div>
      )}

      <section className="mt-8">
        <SectionHead
          eyebrow={blocks.relaxation?.eyebrow}
          title={blocks.relaxation?.title}
          sub={blocks.relaxation?.sub}
          chip={blocks.relaxation?.chip}
        />
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {/* Стартовый блок открыт целиком, порядок прослушивания любой.
              Галочка «пройдено» здесь важна: пока не прослушаны все практики
              блока, не открывается первая практика «Пароля от жизни». */}
          {practices.relaxation.map((p) => (
            <motion.div key={p.id} variants={cardItem}>
              <Card
                title={p.title}
                duration={p.duration}
                completed={isPracticeCompleted(p.id)}
                onPlay={() => goPlay(p.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mt-10">
        <SectionHead
          eyebrow={blocks.awareness?.eyebrow}
          title={blocks.awareness?.title}
          sub={blocks.awareness?.sub}
          chip={blocks.awareness?.chip}
        />

        {/* Правило прогрессии — ОДИН раз, перед первым блоком цепочки.
            awareness → awareness2 → author это одна сквозная цепочка, а не три
            независимые: повтор обещания в шапке каждого блока читался бы как
            ошибка вёрстки. В «Точке тишины» текста нет — там прогрессии нет. */}
        {chainHasLocked && texts.chainIntro && (
          <p className="mb-3 text-[13px] leading-relaxed text-fg-2">
            {texts.chainIntro}
          </p>
        )}

        {practices.awareness.some((p) => !isPracticeUnlocked(p.id)) && (
          <LockedHint
            text={
              // Закрыт сам вход в цепочку — причина другая, и для неё свой
              // текст. Пока клиент его не прислал (пустая строка), показываем
              // прежнюю подсказку, а не выдуманную формулировку.
              chainEntryLocked && texts.chainLockedEntry
                ? texts.chainLockedEntry
                : LOCKED_HINT
            }
          />
        )}

        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {practices.awareness.map((p) => {
            const unlocked = isPracticeUnlocked(p.id)
            const completed = isPracticeCompleted(p.id)
            return (
              <motion.div key={p.id} variants={cardItem}>
                <Card
                  title={p.title}
                  duration={p.duration}
                  locked={!unlocked}
                  completed={completed}
                  lockedLabel="Закрыто"
                  onPlay={() => goPlay(p.id)}
                />
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Второй блок «Осознанность» (block = 'awareness2'). Структура
          зеркалит секцию 02; записи добавляются через CMS. Продолжает ту же
          сквозную цепочку открытия — карточка locked, пока id не пришёл
          в unlockedPractices.
          Секция не рендерится, пока в блоке нет ни одной практики. */}
      {(practices.awareness2?.length || 0) > 0 && (
        <section className="mt-10">
          <SectionHead
            eyebrow={blocks.awareness2?.eyebrow}
            title={blocks.awareness2?.title}
            sub={blocks.awareness2?.sub}
            chip={blocks.awareness2?.chip}
          />

          {practices.awareness2.some((p) => !isPracticeUnlocked(p.id)) && <LockedHint />}

          <motion.div
            className="grid grid-cols-2 gap-3"
            variants={gridContainer}
            initial="initial"
            animate="animate"
          >
            {practices.awareness2.map((p) => {
              const unlocked = isPracticeUnlocked(p.id)
              const completed = isPracticeCompleted(p.id)
              return (
                <motion.div key={p.id} variants={cardItem}>
                  <Card
                    title={p.title}
                    duration={p.duration}
                    locked={!unlocked}
                    completed={completed}
                    lockedLabel="Закрыто"
                    onPlay={() => goPlay(p.id)}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        </section>
      )}

      {/* Блок «Авторские» (вкл. подкаст) — клиент 09.06.2026 поставил
          на паузу до появления ресурса записывать новый контент.
          Секцию скрываем из UI, код/роуты /player/auN не трогаем —
          вернётся одним рендером когда будет готов. */}

      <VoiceMusicModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </ScreenShell>
  )
}
