import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.22, 0.8, 0.36, 1]

const TelegramIcon = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" {...p}>
    <path d="M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.18c-.25.25-.46.46-.94.46l.34-4.78 8.7-7.86c.38-.34-.08-.53-.59-.19l-10.75 6.77-4.63-1.45c-1-.31-1.02-1 .21-1.48L20.65 3.2c.84-.31 1.57.2 1.29 1.4Z" />
  </svg>
)
const VkIcon = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" {...p}>
    <path d="M13.16 17.2c-5.07 0-7.96-3.48-8.08-9.26h2.54c.08 4.25 1.95 6.05 3.44 6.42V7.94h2.39v3.66c1.47-.16 3.01-1.84 3.53-3.66h2.39c-.4 2.24-2.07 3.92-3.26 4.61 1.19.56 3.09 2.02 3.81 4.65h-2.63c-.56-1.76-1.97-3.12-3.84-3.31v3.31h-.29Z" />
  </svg>
)
const MaxIcon = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" {...p}>
    <path d="M4 19V5h2.6L12 13l5.4-8H20v14h-2.5V9.3L12 17 6.5 9.3V19H4Z" />
  </svg>
)

const PROVIDERS = [
  { id: 'tg', name: 'Telegram', hint: 'Mini App в Telegram', href: 'https://t.me/Pause_relax_bot/Relaxme', Icon: TelegramIcon, color: '#2aabee' },
  { id: 'vk', name: 'ВКонтакте', hint: 'VK Mini App', href: 'https://vk.com/app54600947', Icon: VkIcon, color: '#4a76a8' },
  { id: 'max', name: 'MAX', hint: 'скоро', href: null, Icon: MaxIcon, color: '#7b61ff' },
]

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
const panel = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE, staggerChildren: 0.07, delayChildren: 0.12 } },
  exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.3, ease: EASE } },
}
const row = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }

export default function LoginOverlay({ open, onClose }) {
  // блокируем фоновый скролл (Lenis + body), пока открыт
  useEffect(() => {
    if (!open) return
    const lenis = window.__lenis
    lenis?.stop?.()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      lenis?.start?.()
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-5"
          variants={backdrop} initial="hidden" animate="visible" exit="exit"
          transition={{ duration: 0.35, ease: EASE }}
        >
          {/* затемнение + блюр фона */}
          <div className="absolute inset-0 bg-[#080611]/80 backdrop-blur-md" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-md rounded-3xl border border-line p-8 sm:p-10"
            style={{ background: 'linear-gradient(180deg, rgba(22,17,46,0.92), rgba(12,9,24,0.94))', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)' }}
            variants={panel} initial="hidden" animate="visible" exit="exit"
          >
            {/* мягкое свечение сверху панели */}
            <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2" style={{ background: 'linear-gradient(90deg, transparent, rgba(214,200,255,0.6), transparent)' }} />

            <button onClick={onClose} aria-label="Закрыть" data-hover
              className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-line text-fg-2 transition-colors hover:bg-white/5 hover:text-fg-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>

            <motion.div variants={row} className="text-center">
              <p className="eyebrow mb-3">Вход</p>
              <h2 className="font-display text-3xl font-extralight leading-tight text-fg-0 sm:text-4xl">
                Открой Meditation<span className="text-violet">.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-fg-2">
                Выбери, где тебе удобнее — приложение откроется там же.
              </p>
            </motion.div>

            <div className="mt-8 flex flex-col gap-3">
              {PROVIDERS.map(({ id, name, hint, href, Icon, color }) => {
                const disabled = !href
                const inner = (
                  <>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${color}22`, color }}>
                      <Icon />
                    </span>
                    <span className="flex flex-col text-left">
                      <span className="font-medium text-fg-0">{name}</span>
                      <span className="text-xs text-fg-3">{hint}</span>
                    </span>
                    {!disabled && (
                      <svg className="ml-auto text-fg-3 transition-transform group-hover:translate-x-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    )}
                    {disabled && <span className="ml-auto rounded-full border border-line px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-4">скоро</span>}
                  </>
                )
                const cls = 'group flex items-center gap-4 rounded-2xl border border-line px-4 py-3.5 transition-all'
                return (
                  <motion.div key={id} variants={row}>
                    {disabled ? (
                      <div className={`${cls} cursor-not-allowed opacity-55`} aria-disabled>{inner}</div>
                    ) : (
                      <a href={href} target="_blank" rel="noreferrer" data-hover
                        className={`${cls} hover:border-lilac/50 hover:bg-white/[0.04]`}
                        style={{ ['--tw-shadow-color']: color }}>
                        {inner}
                      </a>
                    )}
                  </motion.div>
                )
              })}
            </div>

            <motion.p variants={row} className="mt-7 text-center text-xs leading-relaxed text-fg-4">
              Нажимая, ты переходишь в выбранный мессенджер. Аккаунт не нужен — вход в один тап.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
