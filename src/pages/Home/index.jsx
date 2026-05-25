import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import VoiceMusicModal from '../../components/VoiceMusicModal'
import OnboardingFog from '../../components/OnboardingFog'
import AnimatedSubscribeButton from '../../components/ui/AnimatedSubscribeButton'
import { mockPractices } from '../../api/mock'
import { fetchPractices } from '../../api/practices'
import { useCheckinStore } from '../../store/useCheckinStore'
import { useProgression } from '../../hooks/useProgression'

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
function SectionHead({ eyebrow, title, sub, chip }) {
  return (
    <div className="mb-4 border-b border-line pb-3">
      {/* Топ-строка: eyebrow слева, chip справа — на одной горизонтальной
          линии, выровнены по baseline. Заголовок ниже занимает всю ширину. */}
      <div className="flex items-center justify-between gap-3">
        <div className="label-mono text-fg-3">{eyebrow}</div>
        {chip && (
          <span className="shrink-0 rounded-full border border-line-2 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-lilac/90">
            {chip}
          </span>
        )}
      </div>
      <h2 className="mt-2 font-serif text-[24px] leading-tight text-fg-0">{title}</h2>
      {sub && (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
          {sub}
        </div>
      )}
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
  const {
    subscription,
    isPracticeUnlocked,
    isPracticeCompleted,
  } = useProgression()

  const [redirecting, setRedirecting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Initial paint uses static mockPractices so the page never blanks.
  // Once fetchPractices() resolves (CMS or real-backend), we swap.
  const [practices, setPractices] = useState(mockPractices)

  useEffect(() => {
    if (!todayDone && !redirecting) {
      setRedirecting(true)
      navigate('/checkin', { replace: true })
    }
  }, [todayDone, redirecting, navigate])

  useEffect(() => {
    let alive = true
    fetchPractices()
      .then((p) => {
        if (!alive || !p) return
        const hasContent =
          (p.relaxation?.length || 0) +
            (p.awareness?.length || 0) +
            (p.author?.length || 0) >
          0
        if (hasContent) setPractices(p)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const goPlay = (id) => navigate(`/player/${id}`)

  return (
    <ScreenShell withBottomNav>
      <OnboardingFog density={1.2} />
      <header className="mb-6 flex items-center justify-between">
        <IconButton onClick={() => setSettingsOpen(true)} label="Настройки">
          <SettingsIcon />
        </IconButton>
        <IconButton onClick={() => navigate('/profile')} label="Профиль">
          <ProfileIcon />
        </IconButton>
      </header>

      <CompanionsCounter />

      <section className="mt-8">
        <SectionHead
          eyebrow="01 · СТАРТ"
          title="Точка тишины"
          sub="ВХОД В РАССЛАБЛЕНИЕ"
          chip="Бесплатно · 3"
        />
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {practices.relaxation.map((p) => (
            <motion.div key={p.id} variants={cardItem}>
              <Card
                title={p.title}
                duration={p.duration}
                onPlay={() => goPlay(p.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mt-10">
        <SectionHead
          eyebrow="02 · СИСТЕМА"
          title="Архитектура состояний"
          sub="ПЕРЕХОД В ОСОЗНАННОСТЬ · ПАРОЛЬ ОТ ЖИЗНИ"
          chip="По подписке · 6/мес"
        />

        {!subscription.active && (
          <div className="mb-3 rounded-md border border-line-2 bg-white/5 p-4">
            <div className="text-[14px] text-fg-1">
              Оформи подписку, чтобы открыть все практики
            </div>
            <div className="mt-3">
              <AnimatedSubscribeButton onClick={() => navigate('/subscription')} />
            </div>
          </div>
        )}

        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {practices.awareness.map((p, idx) => {
            const unlocked = subscription.active && isPracticeUnlocked(p.id)
            const completed = isPracticeCompleted(p.id)
            return (
              <motion.div key={p.id} variants={cardItem}>
                <Card
                  title={p.title}
                  duration={p.duration}
                  locked={!unlocked}
                  completed={completed}
                  lockedLabel={idx === 0 ? 'Заблокировано' : 'Скоро'}
                  onPlay={() => goPlay(p.id)}
                />
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      <section className="mt-10">
        <SectionHead
          eyebrow="03 · ГЛУБИНА"
          title="Поток из пространства"
          sub="ПОГРУЖЕНИЕ В АВТОРСКИЕ"
          chip="2 бесплатные · 99 ₽"
        />
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {practices.author.map((p) => {
            // Авторские: первые 2 («Знакомство», «Подкаст») — всегда
            // бесплатны (flag `free`). Остальные — поштучно за 99₽.
            // Бонусная механика убрана в правках клиента 2026-05-20.
            const isFree = p.free === true
            return (
              <motion.div key={p.id} variants={cardItem}>
                <Card
                  title={p.title}
                  duration={p.duration}
                  badge={isFree ? 'Бесплатно' : undefined}
                  price={isFree ? undefined : p.price}
                  onPlay={isFree ? () => goPlay(p.id) : undefined}
                  onBuy={() => navigate('/subscription')}
                />
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      <VoiceMusicModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </ScreenShell>
  )
}
