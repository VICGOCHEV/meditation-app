import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import BottomNav from '../../components/ui/BottomNav'
import VoiceMusicModal from '../../components/VoiceMusicModal'
import { mockPractices } from '../../api/mock'
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
const COMP_MAX = Number(import.meta.env.VITE_COMPANIONS_MAX || 312)

function CompanionsCounter() {
  const count = useMemo(
    () => Math.floor(COMP_MIN + Math.random() * (COMP_MAX - COMP_MIN + 1)),
    []
  )
  return (
    <div className="panel flex items-center justify-between">
      <div>
        <div className="label-mono">Соратники</div>
        <div className="mt-1 text-[14px] text-fg-2">Сейчас в практике</div>
      </div>
      <div className="text-right">
        <div className="font-serif text-3xl text-fg-0">{count}</div>
        <div className="text-[12px] text-fg-3">человек</div>
      </div>
    </div>
  )
}

function SectionHead({ num, title, subtitle }) {
  return (
    <div className="mb-4 flex items-end justify-between border-b border-line pb-3">
      <div>
        <div className="label-mono">{num}</div>
        <h2 className="font-serif text-[22px] text-fg-0">{title}</h2>
      </div>
      <div className="text-right text-[12px] text-fg-3">{subtitle}</div>
    </div>
  )
}

function IconButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line-2 bg-white/5 text-fg-0 hover:bg-white/10"
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
    bonusUnlocked,
  } = useProgression()

  const [redirecting, setRedirecting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (!todayDone && !redirecting) {
      setRedirecting(true)
      navigate('/checkin', { replace: true })
    }
  }, [todayDone, redirecting, navigate])

  const goPlay = (id) => navigate(`/player/${id}`)

  return (
    <ScreenShell withBottomNav>
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
        <SectionHead num="01" title="Расслабление" subtitle="Бесплатно · 3–5 практик" />
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {mockPractices.relaxation.map((p) => (
            <motion.div key={p.id} variants={cardItem}>
              <Card title={p.title} duration={p.duration} onPlay={() => goPlay(p.id)} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mt-10">
        <SectionHead num="02" title="Осознанность" subtitle="По подписке · 6 практик" />

        {!subscription.active && (
          <div className="mb-3 rounded-md border border-line-2 bg-white/5 p-4">
            <div className="text-[14px] text-fg-1">
              Оформи подписку, чтобы открыть все практики
            </div>
            <div className="mt-3">
              {/* Excluded from app-wide ShinyButton — kept compact and inline. */}
              <Button size="sm" variant="secondary" onClick={() => navigate('/subscription')}>
                Оформить подписку
              </Button>
            </div>
          </div>
        )}

        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {mockPractices.awareness.map((p, idx) => {
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
        <SectionHead num="03" title="Авторский" subtitle="Авторские практики" />
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {mockPractices.author.map((p) => {
            const isBonus = bonusUnlocked.includes(p.id)
            return (
              <motion.div key={p.id} variants={cardItem}>
                <Card
                  title={p.title}
                  duration={p.duration}
                  badge={isBonus ? 'Бонус 🎁' : undefined}
                  price={isBonus ? undefined : p.price}
                  onPlay={isBonus ? () => goPlay(p.id) : undefined}
                  onBuy={() => navigate('/subscription')}
                />
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      <VoiceMusicModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <BottomNav />
    </ScreenShell>
  )
}
