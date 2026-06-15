import { motion } from 'framer-motion'
import PhoneMockup from '../components/PhoneMockup'
import { ScreenHome } from '../components/AppScreens'
import ScreenVideo from '../components/ScreenVideo'
import { Tilt3D } from '../components/caseui'
import LiveCounter from '../components/LiveCounter'

const EASE = [0.22, 0.9, 0.3, 1]
const TAGS = ['Product Design', 'Web App', 'Custom CMS', 'Telegram', 'VK Mini App']

// Обложка: один телефон с главным экраном + светящаяся сфера на фоне леса,
// справа крупный титул RELAX ME. На мобайле — стек.
export default function Cover() {
  return (
    <section id="cover" className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-24 sm:px-8">
      {/* фон: лесной кадр из аппки + затемнение */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <img src="/frames/0121.avif" alt="" className="h-full w-full object-cover opacity-[0.55]" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 70% 30%, transparent 30%, rgba(10,7,20,0.85) 100%), linear-gradient(180deg, rgba(10,7,20,0.5), transparent 35%, rgba(10,7,20,0.85))' }} />
        {/* фиолетовый ореол сферы сверху */}
        <div className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(110,80,210,0.45), transparent 62%)', filter: 'blur(30px)' }} />
      </div>

      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        {/* телефон */}
        <motion.div
          className="order-2 flex justify-center lg:order-1"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
        >
          <Tilt3D rotY={-16} rotX={7}>
            <div className="float-soft relative" style={{ transformStyle: 'preserve-3d' }}>
              {/* боковая грань-толщина (объём) */}
              <div aria-hidden className="absolute inset-0 rounded-[44px]" style={{ transform: 'translateZ(-26px)', background: 'linear-gradient(125deg, #07050f, #1c1730 55%, #07050f)', boxShadow: '0 0 0 1px rgba(0,0,0,0.7)' }} />
              {/* мягкие «рёбра» торца */}
              <div aria-hidden className="absolute inset-0 rounded-[44px]" style={{ transform: 'translateZ(-13px)', background: 'linear-gradient(125deg, #0a0714, #2a2050 55%, #0a0714)' }} />
              {/* отбрасываемая тень под устройством */}
              <div aria-hidden className="absolute -bottom-10 left-1/2 h-16 w-[78%] -translate-x-1/2 rounded-full" style={{ transform: 'translateZ(-30px)', background: 'radial-gradient(closest-side, rgba(0,0,0,0.75), transparent)', filter: 'blur(26px)' }} />

              <PhoneMockup width={290}><ScreenVideo src="/screens/home.mp4"><ScreenHome /></ScreenVideo></PhoneMockup>

              {/* глянцевый блик стекла поверх — читается как объём */}
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[44px]" style={{ transform: 'translateZ(3px)', background: 'linear-gradient(118deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 26%, transparent 46%, transparent 88%, rgba(255,255,255,0.08) 100%)', mixBlendMode: 'screen' }} />
              {/* световой кант по левому ребру */}
              <div aria-hidden className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-full" style={{ transform: 'translateZ(4px)', background: 'linear-gradient(180deg, transparent, rgba(214,200,255,0.55), transparent)' }} />
            </div>
          </Tilt3D>
        </motion.div>

        {/* текст */}
        <div className="order-1 text-center lg:order-2 lg:text-left">
          <motion.p
            className="eyebrow mb-6"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
          >
            Meditation App · 2026
          </motion.p>

          <motion.h1
            className="font-display text-[clamp(3.4rem,13vw,9rem)] font-extralight leading-[0.86] tracking-tight text-fg-0"
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
          >
            <motion.span className="block" variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 1, ease: EASE } } }}>RELAX</motion.span>
            <motion.span className="block font-medium text-glow-violet lg:pl-[0.6em]" variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { duration: 1, ease: EASE } } }}>ME<span className="text-violet">.</span></motion.span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-7 max-w-md text-[17px] leading-relaxed text-fg-1 lg:mx-0 lg:max-w-lg"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
          >
            Tech-wellness — цифровое пространство для расслабления и осознанности с системой прогрессии, диагностикой состояния и живым звуком.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap justify-center gap-2.5 lg:justify-start"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
          >
            {TAGS.map((t) => (
              <span key={t} className="rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-2" style={{ background: 'rgba(20,16,42,0.55)', border: '1px solid rgba(180,160,255,0.18)', backdropFilter: 'blur(8px)' }}>
                {t}
              </span>
            ))}
          </motion.div>

          <motion.div className="mt-9 flex justify-center lg:justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.9 }}>
            <LiveCounter />
          </motion.div>
        </div>
      </div>

      {/* подсказка скролла */}
      <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ delay: 1.2 }}>
        <div className="mx-auto flex h-10 w-6 items-start justify-center rounded-full border border-line p-1">
          <motion.div className="h-2 w-1 rounded-full bg-lilac" animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        </div>
      </motion.div>
    </section>
  )
}
