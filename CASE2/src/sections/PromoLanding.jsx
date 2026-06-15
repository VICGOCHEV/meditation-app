import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import ScrollScrub from '../components/ScrollScrub'
import { Sec, SecTag } from '../components/caseui'
import { StoryItem, Cap } from '../components/story'

// Промо-лендинг = покадровый scroll-scrub видео-влёт (приём с лендинга),
// без depth-map фазы. Никакой аморф-сферы — только «провал внутрь» кадра.
const EASE = [0.25, 1, 0.5, 1]

const POINTS = [
  { icon: 'spark', t: 'WebGL scroll-scrub', d: 'Покадровый видео-влёт по скроллу (приём Apple) — провал внутрь сцены.' },
  { icon: 'sphere', t: 'Огонёк-нарратив', d: 'Сквозная искра ведёт взгляд от секции к секции, зажигая сцены.' },
  { icon: 'rocket', t: 'Шёлковый 60fps', d: 'Ленивые чанки, лёгкий entry-бандл, ноль джанка на скролле.' },
]

export default function PromoLanding() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])
  const cfg = isMobile ? { dir: 'frames-m', count: 97 } : { dir: 'frames', count: 121 }

  const scrub = useTransform(scrollYProgress, [0, 1], [0, 1])
  const textOpacity = useTransform(scrollYProgress, [0, 0.14], [1, 0])
  const textScale = useTransform(scrollYProgress, [0, 0.22], [1, 1.12])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])

  return (
    <>
      {/* scroll-scrub влёт */}
      <section ref={ref} style={{ height: '300vh' }} className="relative">
        <div className="sticky top-0 h-screen overflow-hidden bg-[#0a0714]">
          {/* постер — первый кадр, чтобы секция была видна сразу (до декода AVIF) */}
          <img src={`/${cfg.dir}/0001.avif`} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <ScrollScrub key={cfg.dir} progress={scrub} dir={cfg.dir} count={cfg.count} />

          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: 3, background: 'radial-gradient(120% 90% at 50% 35%, transparent 40%, rgba(10,7,20,0.5) 100%), linear-gradient(180deg, rgba(10,7,20,0.35), transparent 28%, transparent 64%, rgba(10,7,20,0.78))' }} />

          <div className="absolute left-5 top-24 z-[60] sm:left-8">
            <SecTag num="14">Promo Landing</SecTag>
          </div>

          <motion.div className="relative z-[60] mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-center" style={{ opacity: textOpacity, scale: textScale, willChange: 'transform, opacity' }}>
            <h2 className="font-display text-[clamp(2.4rem,7vw,5rem)] font-extralight leading-[0.95] text-fg-0" style={{ textShadow: '0 2px 30px rgba(10,7,20,0.8)' }}>
              Промо-лендинг,<br /><span className="font-medium text-glow-violet">который втягивает</span><span className="text-violet">.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-fg-1" style={{ textShadow: '0 2px 20px rgba(10,7,20,0.9)' }}>
              Скролл проваливает зрителя внутрь сцены — покадровый видео-влёт на WebGL, без единого джанка.
            </p>
          </motion.div>

          <motion.div className="absolute bottom-6 left-1/2 z-[60] -translate-x-1/2" style={{ opacity: hintOpacity }}>
            <p className="eyebrow mb-2 text-center">провались внутрь</p>
            <div className="mx-auto flex h-10 w-6 items-start justify-center rounded-full border border-line p-1">
              <motion.div className="h-2 w-1 rounded-full bg-lilac" animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* приёмы лендинга */}
      <Sec id="promo-points" wide className="!pt-4">
        <div className="grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-3">
          {POINTS.map((p, i) => (
            <motion.div key={p.t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease: EASE, delay: (i % 3) * 0.08 }}>
              <StoryItem icon={p.icon} title={p.t} index={`0${i + 1}`}>
                <Cap size="sm">{p.d}</Cap>
              </StoryItem>
            </motion.div>
          ))}
        </div>
      </Sec>
    </>
  )
}
