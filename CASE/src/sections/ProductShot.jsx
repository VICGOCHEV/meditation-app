import { motion } from 'framer-motion'
import { Up, Kicker } from '../components/story'
import { Badge } from '../components/kit'
import TiltCard from '../components/TiltCard'
import PhoneMockup from '../components/PhoneMockup'
import AmorphSphere from '../components/AmorphSphere'
import ShinyButton from '../components/ShinyButton'
import { AppFilm } from '../components/RealUI'

const META = [
  { k: 'Роль', v: 'Проектирование + Дизайн + Frontend + Backend + Инфраструктура.' },
  { k: 'Платформы', v: 'Web + Telegram Mini App + VK Mini App.' },
  { k: 'Формат', v: 'Заказная продуктовая разработка полного цикла «под ключ».' },
  { k: 'Продакшн-релиз', v: 'all-relaxme.ru.' },
]

const FLOAT_BADGES = [
  { t: 'Web', x: '-22%', y: '4%', d: 0 },
  { t: 'TG Mini App', x: '78%', y: '-4%', d: 0.6 },
  { t: 'VK Mini App', x: '86%', y: '40%', d: 1.1 },
  { t: 'CMS', x: '-26%', y: '54%', d: 1.6 },
  { t: 'Payments', x: '70%', y: '88%', d: 2.1 },
]

function PhoneStage() {
  return (
    <div className="relative flex items-center justify-center py-10">
      {/* halo-сфера за телефоном */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-70">
        <AmorphSphere size={460} />
      </div>
      {/* вращающееся conic-кольцо */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(97,69,194,0.0) 60%, rgba(214,200,255,0.5) 80%, rgba(97,69,194,0.0) 92%, transparent)',
          maskImage: 'radial-gradient(circle, transparent 58%, #000 59%, #000 63%, transparent 64%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 58%, #000 59%, #000 63%, transparent 64%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      />

      {/* телефон с 3D-наклоном за курсором */}
      <div className="relative z-10">
        <TiltCard baseRotX={6} baseRotY={-12} max={9} glare={false}>
          <div className="relative">
            <PhoneMockup width={300} withSphere={false} float={false}>
              <AppFilm slot="evening" rounded="0" className="h-full" />
            </PhoneMockup>
            {/* отражение-подставка */}
            <div className="pointer-events-none absolute -bottom-10 left-1/2 h-16 w-[70%] -translate-x-1/2 rounded-[50%]"
              style={{ background: 'radial-gradient(ellipse at center, rgba(97,69,194,0.45), transparent 70%)', filter: 'blur(12px)' }} />
          </div>
        </TiltCard>

        {/* floating-бейджи */}
        {FLOAT_BADGES.map((b) => (
          <motion.div key={b.t} className="absolute hidden sm:block" style={{ left: b.x, top: b.y }}>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5 + b.d, repeat: Infinity, ease: 'easeInOut' }}>
              <Badge>{b.t}</Badge>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default function ProductShot() {
  return (
    <section id="product" className="relative mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-12 px-5 py-28 sm:py-36 lg:grid-cols-[1.05fr_0.95fr]">
      <Up><PhoneStage /></Up>

      <div>
        <Up><Kicker>Продукт</Kicker></Up>
        <Up delay={0.05}>
          <h2 className="mt-6 text-[32px] font-extralight leading-[1.05] text-fg-0 sm:text-[46px]">
            Один продукт — <span className="grad-text">три входа</span> и весь цикл за ним.
          </h2>
        </Up>
        <Up delay={0.1}>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-fg-2">
            Web, Telegram и VK Mini App поверх единого бэкенда, платежей, CMS и уведомлений.
          </p>
        </Up>

        <Up delay={0.15}>
          <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {META.map((m) => (
              <div key={m.k} className="border-t pt-3" style={{ borderColor: 'rgba(180,160,255,0.14)' }}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-lilac">{m.k}</dt>
                <dd className="mt-1 text-[13px] leading-snug text-fg-2">{m.v}</dd>
              </div>
            ))}
          </dl>
        </Up>

        <Up delay={0.2}>
          <div className="mt-10">
            <ShinyButton as="a" href="https://all-relaxme.ru/" target="_blank" rel="noopener noreferrer">Смотреть проект</ShinyButton>
          </div>
        </Up>
      </div>
    </section>
  )
}
