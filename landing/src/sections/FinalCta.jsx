import { motion } from 'framer-motion'
import Embers from '../components/Embers'
import ShinyButton from '../components/ShinyButton'
import MouseFloat from '../components/MouseFloat'

const EASE = [0.25, 1, 0.5, 1]

export default function FinalCta() {
  return (
    <section id="final" className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-28 text-center">
      {/* поле поднимающихся углей */}
      <Embers count={48} />
      {/* тёплое свечение-источник снизу (аддитивное, сливается с общим фоном —
          единое полотно, без затемняющих полос-швов сверху/снизу) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3" style={{ background: 'radial-gradient(80% 100% at 50% 125%, rgba(150,110,255,0.3), rgba(97,69,194,0.1) 45%, transparent 70%)' }} />

      <MouseFloat strength={9} className="relative z-10 max-w-3xl">
        <motion.p
          className="eyebrow mb-6"
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}
        >
          Один вдох — и ты внутри
        </motion.p>

        <motion.h2
          className="font-display text-[3.2rem] font-extralight leading-[0.98] sm:text-[6.5rem]"
          initial={{ opacity: 0, y: 30, filter: 'blur(14px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 1.3, ease: EASE }}
          style={{ textShadow: '0 0 60px rgba(150,110,255,0.45)' }}
        >
          Начни с одного
          <br />
          <span className="font-medium text-glow-violet">вдоха</span>
        </motion.h2>

        <motion.p
          className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-fg-2"
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
        >
          Первые семь дней — бесплатно. Дальше решаешь сам.
        </motion.p>

        <motion.div
          className="mt-11 flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
        >
          <ShinyButton as="a" href="https://all-relaxme.ru" target="_blank" rel="noreferrer">Присоединиться</ShinyButton>
          <div className="flex items-center gap-6">
            <a href="https://t.me/Pause_relax_bot/Relaxme" target="_blank" rel="noreferrer" className="text-fg-2 underline-offset-4 transition-colors hover:text-lilac hover:underline" data-hover>Telegram</a>
            <span className="text-fg-4">·</span>
            <a href="https://vk.com/app54600947" target="_blank" rel="noreferrer" className="text-fg-2 underline-offset-4 transition-colors hover:text-lilac hover:underline" data-hover>ВКонтакте</a>
          </div>
        </motion.div>
      </MouseFloat>
    </section>
  )
}
