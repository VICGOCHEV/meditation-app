import { motion } from 'framer-motion'
import Icon from '../lib/icons'
import { Reveal } from './primitives'

const EASE = [0.25, 1, 0.5, 1]

/* ── Floating-бейдж (Web / TG Mini App / ...) ─────────────────── */
export function Badge({ children, icon, className = '', active = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] ${className}`}
      style={{
        color: active ? '#f4f0ff' : '#b9a7f0',
        background: active ? 'rgba(97,69,194,0.18)' : 'rgba(180,160,255,0.06)',
        border: '1px solid rgba(180,160,255,0.18)',
        boxShadow: active ? '0 0 18px -4px rgba(97,69,194,0.55)' : 'none',
        backdropFilter: 'blur(8px)',
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}

/* ── Иконка в фирменной «капле» ──────────────────────────────── */
export function IconChip({ name, size = 'md' }) {
  const dim = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-2xl text-lilac`}
      style={{
        background: 'rgba(97,69,194,0.14)',
        border: '1px solid rgba(180,160,255,0.18)',
        boxShadow: 'inset 0 0 18px rgba(97,69,194,0.18)',
      }}
    >
      <Icon name={name} size={size === 'lg' ? 26 : 20} />
    </span>
  )
}

/* ── Заголовок секции с mono-номером ─────────────────────────── */
export function SectionHead({ eyebrow, number, title, intro, align = 'left' }) {
  const center = align === 'center'
  return (
    <Reveal className={center ? 'text-center' : ''}>
      {eyebrow && (
        <div className={`mb-4 flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
          {number && (
            <span
              className="font-mono text-sm text-lilac"
              style={{ letterSpacing: '0.1em' }}
            >
              {number}
            </span>
          )}
          <span className="eyebrow">{eyebrow}</span>
        </div>
      )}
      <h2 className="text-balance text-3xl font-extralight leading-[1.1] sm:text-[42px]">
        {title}
      </h2>
      {intro && (
        <p
          className={`mt-6 text-[17px] leading-relaxed text-fg-2 ${center ? 'mx-auto max-w-3xl' : 'max-w-3xl'}`}
        >
          {intro}
        </p>
      )}
    </Reveal>
  )
}

/* ── Плашка-цитата (акцентная) ───────────────────────────────── */
export function QuotePlate({ label, children, icon }) {
  return (
    <div className="case-card relative overflow-hidden p-7 sm:p-9">
      <div className="liquid-card-glow" style={{ opacity: 0.28 }} />
      <div className="relative">
        {label && (
          <div className="mb-4 flex items-center gap-3">
            {icon && <IconChip name={icon} />}
            <span className="label-mono">{label}</span>
          </div>
        )}
        <p className="text-[17px] leading-relaxed text-fg-1">{children}</p>
      </div>
    </div>
  )
}

/* ── Карточка контента с иконкой ─────────────────────────────── */
export function ContentCard({ icon, title, children, tag, className = '' }) {
  return (
    <div className={`case-card case-card--hover flex h-full flex-col p-6 sm:p-7 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        {icon && <IconChip name={icon} />}
        {tag && <span className="label-mono">{tag}</span>}
      </div>
      {title && <h3 className="mb-3 text-xl font-light text-fg-0">{title}</h3>}
      {children && <p className="text-[15px] leading-relaxed text-fg-2">{children}</p>}
    </div>
  )
}

/* ── Чип-метка стека ─────────────────────────────────────────── */
export function StackChip({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-lg px-3.5 py-2 font-mono text-[13px] text-fg-1"
      style={{
        background: 'rgba(180,160,255,0.06)',
        border: '1px solid rgba(180,160,255,0.12)',
      }}
    >
      {children}
    </span>
  )
}

/* ── Схема-поток: A → B → C ──────────────────────────────────── */
export function FlowDiagram({ steps, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-3 ${className}`}>
      {steps.map((s, i) => (
        <motion.div
          key={s + i}
          className="flex items-center gap-2"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
        >
          <span
            className="rounded-xl px-3.5 py-2.5 font-mono text-[12px] sm:text-[13px]"
            style={{
              color: '#e7deff',
              background: 'rgba(24,19,48,0.9)',
              border: '1px solid rgba(180,160,255,0.16)',
              boxShadow: 'inset 0 0 16px rgba(97,69,194,0.14)',
            }}
          >
            {s}
          </span>
          {i < steps.length - 1 && (
            <Icon name="arrow" size={18} className="text-lilac/60" />
          )}
        </motion.div>
      ))}
    </div>
  )
}
