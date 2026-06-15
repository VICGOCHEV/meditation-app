import { motion } from 'framer-motion'
import AmorphSphere from '../components/AmorphSphere'

const EASE = [0.25, 1, 0.5, 1]

export default function FinalCta() {
  return (
    <section id="final" className="relative mx-auto w-full max-w-5xl px-5 py-40 text-center">
      {/* фон: абстрактная сфера, уходящая в тёмный дым */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-60">
        <AmorphSphere size={520} />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: 'radial-gradient(60% 60% at 50% 60%, transparent, #0a0714 80%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1, ease: EASE }}
      >
        <p className="eyebrow mb-6">Полный цикл</p>
        <h2 className="text-balance text-4xl font-extralight leading-[1.1] text-fg-0 sm:text-6xl">
          Полный цикл. <span className="text-lilac text-glow-violet">От идеи до продакшна.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-fg-2">
          Проектирование, дизайн, frontend, backend, CMS, платежи, уведомления и инфраструктура в
          единой системе.
        </p>
      </motion.div>

      <p className="mt-28 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
        Я собрал работающий цифровой продукт — от настроения интерфейса до продакшн-деплоя
      </p>
    </section>
  )
}
