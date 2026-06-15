import { motion } from 'framer-motion'
import { Sec, OrbitRing } from '../components/caseui'
import { Up } from '../components/story'
import Icon from '../lib/icons'
import ShinyButton from '../components/ShinyButton'

const MODULES = [
  { icon: 'tokens', label: 'CMS' },
  { icon: 'devices', label: 'App' },
  { icon: 'card', label: 'Payments' },
  { icon: 'telegram', label: 'Telegram' },
  { icon: 'server', label: 'Backend' },
  { icon: 'platforms', label: 'VK' },
  { icon: 'chart', label: 'Analytics' },
  { icon: 'globe', label: 'Landing' },
]

// Логотип приложения в центре орбиты.
function Logo() {
  return (
    <div className="relative grid place-items-center">
      <div className="absolute h-44 w-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(110,80,210,0.55), rgba(97,69,194,0.18) 50%, transparent 70%)', filter: 'blur(10px)' }} />
      <motion.div
        className="relative grid h-32 w-32 place-items-center rounded-full sm:h-36 sm:w-36"
        animate={{ boxShadow: ['0 0 50px -10px rgba(97,69,194,0.7)', '0 0 75px -6px rgba(97,69,194,0.95)', '0 0 50px -10px rgba(97,69,194,0.7)'] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(circle at 50% 32%, rgba(42,32,72,0.9), rgba(12,9,24,0.96))', border: '1px solid rgba(180,160,255,0.34)' }}
      >
        <Icon name="sphere" size={48} className="text-lilac" style={{ filter: 'drop-shadow(0 0 14px rgba(97,69,194,0.95))' }} />
      </motion.div>
    </div>
  )
}

export default function Ecosystem() {
  return (
    <Sec id="ecosystem" num="15" tag="Result · Экосистема" ghost="12" wide>
      <div className="mx-auto max-w-3xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9 }}
          className="text-balance text-[clamp(2rem,5vw,3.6rem)] font-extralight leading-[1.04] text-fg-0" style={{ textShadow: '0 0 48px rgba(97,69,194,0.3)' }}
        >
          Единая экосистема для внутренней тишины и осознанной жизни<span className="text-violet">.</span>
        </motion.h2>
        <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-fg-2">
          Собранные воедино, эти модули превращают набор практик в полноценную wellness-платформу — на всех устройствах и в любимых мессенджерах.
        </p>
      </div>

      {/* орбитальная диаграмма с логотипом в центре */}
      <Up>
        <div className="mt-16 flex justify-center">
          <OrbitRing size={520} spin={90} nodes={MODULES} center={<Logo />} />
        </div>
      </Up>

      {/* CTA */}
      <Up delay={0.1}>
        <div className="mt-20 flex flex-col items-center gap-5 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-lilac">из набора практик — в wellness-платформу</p>
          <ShinyButton as="a" href="https://all-relaxme.ru/" target="_blank" rel="noopener noreferrer">
            all-relaxme.ru <Icon name="arrow" size={16} />
          </ShinyButton>
        </div>
      </Up>
    </Sec>
  )
}
