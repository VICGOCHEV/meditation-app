import { motion } from 'framer-motion'

const EASE = [0.25, 1, 0.5, 1]

// Появление секции при скролле — blur + y, как в брифе.
export function Reveal({ children, delay = 0, y = 24, className = '', as = 'div' }) {
  const M = motion[as] || motion.div
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </M>
  )
}

// Медитативная секция — много воздуха, контент по центру колонки.
export function Section({ id, children, className = '', narrow = false }) {
  const w = narrow ? 'max-w-3xl' : 'max-w-6xl'
  return (
    <section id={id} className={`relative mx-auto w-full ${w} px-5 py-28 sm:py-40 ${className}`}>
      {children}
    </section>
  )
}

export function Eyebrow({ children, className = '' }) {
  return <p className={`eyebrow ${className}`}>{children}</p>
}
