import { motion } from 'framer-motion'
import Icon from '../lib/icons'

const EASE = [0.22, 0.9, 0.3, 1]

/* ── Reveal: мягкое появление (blur + y) ─────────────────────── */
export function Up({ children, delay = 0, y = 26, className = '', as = 'div' }) {
  const M = motion[as] || motion.div
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-90px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </M>
  )
}

/* ── Prose: разбивает verbatim-текст на абзацы по предложениям ──
   Текст не меняется — только дробится визуально (как разрешает ТЗ). */
function toSentences(text) {
  return text
    .split(/(?<=[.!?»])\s+(?=[А-ЯЁA-Z«])/)
    .map((s) => s.trim())
    .filter(Boolean)
}
// Текст не меняется — только дробится и расставляется по весу:
// первое предложение звучит крупно (лид), остальные — тише и мельче,
// как подпись. Экран перестаёт быть стеной текста.
export function Prose({ text, className = '', size = 'base', lead = false, stagger = true }) {
  const parts = toSentences(text)
  // ведущее предложение
  const leadCls = lead
    ? 'lead text-[21px] sm:text-[26px] !leading-snug text-fg-0'
    : size === 'lg'
      ? 'text-[18px] sm:text-[21px] text-fg-1'
      : 'text-[16px] sm:text-[17px] text-fg-1'
  // поддерживающие предложения — тише и мельче
  const restCls =
    size === 'sm' ? 'text-[13.5px] text-fg-3' : 'text-[14.5px] text-fg-3'
  return (
    <div className={`prose-col ${className}`}>
      {parts.map((p, i) => (
        <motion.p
          key={i}
          className={`leading-relaxed ${i === 0 ? leadCls : restCls}`}
          initial={stagger ? { opacity: 0, y: 12 } : false}
          whileInView={stagger ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: EASE, delay: i * 0.05 }}
        >
          {p}
        </motion.p>
      ))}
    </div>
  )
}

/* ── Короткая подпись (визуал-first: текст вторичен) ─────────── */
export function Cap({ children, className = '', size = 'base' }) {
  const s = size === 'sm' ? 'text-[13.5px]' : size === 'lg' ? 'text-[17px]' : 'text-[15px]'
  return <p className={`${s} leading-relaxed text-fg-2 ${className}`}>{children}</p>
}

/* ── Eyebrow с ведущей чертой ────────────────────────────────── */
export function Kicker({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="h-px w-8 bg-lilac/40" />
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-lilac">{children}</span>
    </span>
  )
}

/* ── Заголовок секции-главы: гигантский номер + крупный титул ──
   Один смысл на экран: много воздуха, асимметрия. */
export function Chapter({ id, index, kicker, title, intro, children, className = '' }) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-[1180px] px-5 py-28 sm:py-40 ${className}`}>
      <header className="relative">
        {index && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 right-0 ghost-num text-[120px] sm:text-[200px]"
          >
            {index}
          </div>
        )}
        <Up>
          {kicker && <Kicker className="mb-7">{kicker}</Kicker>}
          <h2
            className="max-w-4xl text-balance text-[32px] font-extralight leading-[1.02] text-fg-0 sm:text-[clamp(40px,5.4vw,68px)]"
            style={{ textShadow: '0 0 48px rgba(97,69,194,0.35)' }}
          >
            {title}
          </h2>
        </Up>
        {intro && (
          <Up delay={0.1}>
            <div className="mt-7 max-w-2xl">
              <Prose text={intro} size="lg" />
            </div>
          </Up>
        )}
      </header>
      <div className="mt-16 sm:mt-20">{children}</div>
    </section>
  )
}

/* ── Сплит «липкий визуал ↔ проза» с чередованием сторон ─────── */
export function Split({ visual, reverse = false, children, sticky = true, ratio = '1fr 1fr', gap = 'gap-12 lg:gap-16' }) {
  return (
    <div className={`grid grid-cols-1 items-center ${gap} lg:grid-cols-2`} style={{ gridTemplateColumns: undefined }}>
      <div className={`${reverse ? 'lg:order-2' : ''} ${sticky ? 'lg:sticky lg:top-24' : ''}`}>
        <Up>{visual}</Up>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{children}</div>
    </div>
  )
}

/* ── Крупная цитата-утверждение ──────────────────────────────── */
export function Statement({ children, mark }) {
  return (
    <Up>
      <figure className="relative mx-auto max-w-4xl py-6">
        <div className="absolute left-0 top-2 bottom-2 accent-bar" />
        <blockquote className="statement pl-7 text-[26px] sm:text-[36px]">{children}</blockquote>
        {mark && <figcaption className="mt-5 pl-7 font-mono text-[11px] uppercase tracking-[0.2em] text-lilac">{mark}</figcaption>}
      </figure>
    </Up>
  )
}

/* ── Нумерованный блок-абзац (для списков-историй) ───────────── */
export function StoryItem({ index, title, icon, children, delay = 0 }) {
  return (
    <Up delay={delay}>
      <div className="group relative grid grid-cols-[auto_1fr] gap-5 sm:gap-7">
        <div className="flex flex-col items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lilac transition-colors group-hover:text-fg-0" style={{ background: 'rgba(97,69,194,0.12)', border: '1px solid rgba(180,160,255,0.16)' }}>
            {icon ? <Icon name={icon} size={20} /> : <span className="font-mono text-[13px]">{index}</span>}
          </span>
        </div>
        <div className="pb-2">
          {index && icon && <span className="idx-chip mb-1 block">{index}</span>}
          {title && <h3 className="mb-3 text-[20px] font-light text-fg-0 sm:text-[22px]">{title}</h3>}
          {children}
        </div>
      </div>
    </Up>
  )
}

/* ── Тонкая разделительная строка с меткой ───────────────────── */
export function Rule({ label }) {
  return (
    <div className="mx-auto flex max-w-[1180px] items-center gap-5 px-5">
      <span className="hairline flex-1" />
      {label && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3">{label}</span>}
      <span className="hairline flex-1" style={{ background: 'linear-gradient(270deg, rgba(180,160,255,0.22), transparent)' }} />
    </div>
  )
}
