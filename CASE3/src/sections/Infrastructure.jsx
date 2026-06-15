import { motion } from 'framer-motion'
import { Sec, Title, Lead, Tilt3D, Tech } from '../components/caseui'
import { Up } from '../components/story'
import PhoneMockup from '../components/PhoneMockup'
import { ScreenDashboard } from '../components/AppScreens'
import ScreenVideo from '../components/ScreenVideo'
import Icon from '../lib/icons'

const NODES = [
  { icon: 'database', t: 'PostgreSQL', x: 6, y: 12 },
  { icon: 'chart', t: 'Прогресс · замеры', x: 82, y: 14 },
  { icon: 'webhook', t: 'Платежи', x: 5, y: 78 },
  { icon: 'telegram', t: 'Push · уведомления', x: 84, y: 80 },
]

// Граф без подложки — узлы и линии прямо на фоне секции.
function ArchGraph() {
  return (
    <div className="relative">
      <p className="label-mono mb-6">Архитектура · серверное ядро</p>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md">
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {NODES.map((n, i) => (
            <g key={i}>
              <line x1="50%" y1="50%" x2={`${n.x + 7}%`} y2={`${n.y + 7}%`} stroke="rgba(180,160,255,0.16)" strokeWidth="1" />
              <motion.line x1="50%" y1="50%" x2={`${n.x + 7}%`} y2={`${n.y + 7}%`} stroke="#d6c8ff" strokeWidth="1.5" strokeDasharray="3 12" strokeLinecap="round"
                initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: [0, -30] }} transition={{ repeat: Infinity, duration: 1.1 + i * 0.2, ease: 'linear' }} style={{ filter: 'drop-shadow(0 0 4px rgba(214,200,255,0.8))' }} />
            </g>
          ))}
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {[0, 1, 2].map((r) => (
            <motion.span key={r} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 92 + r * 28, height: 92 + r * 28, border: '1px solid rgba(180,160,255,0.16)' }}
              animate={{ opacity: [0.4, 0.1, 0.4], scale: [1, 1.06, 1] }} transition={{ duration: 3 + r, repeat: Infinity, ease: 'easeInOut' }} />
          ))}
          <motion.div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full text-center sm:h-28 sm:w-28"
            animate={{ boxShadow: ['0 0 40px -6px rgba(97,69,194,0.7)', '0 0 70px -2px rgba(97,69,194,0.95)', '0 0 40px -6px rgba(97,69,194,0.7)'] }} transition={{ duration: 3.5, repeat: Infinity }}
            style={{ background: 'radial-gradient(circle, rgba(97,69,194,0.5), rgba(24,19,48,0.97))', border: '1px solid rgba(180,160,255,0.36)' }}>
            <Icon name="server" size={24} className="text-fg-0" />
            <span className="mt-1.5 text-[11px] text-fg-0">Fastify</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-lilac">ядро API</span>
          </motion.div>
        </div>
        {NODES.map((n, i) => (
          <motion.div key={n.t} className="absolute flex flex-col items-center gap-1.5" style={{ left: `${n.x}%`, top: `${n.y}%` }}
            initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl text-lilac sm:h-14 sm:w-14" style={{ background: 'rgba(20,16,42,0.92)', border: '1px solid rgba(180,160,255,0.26)', boxShadow: '0 0 24px -6px rgba(97,69,194,0.8), inset 0 0 16px rgba(97,69,194,0.2)' }}>
              <Icon name={n.icon} size={20} />
            </span>
            <span className="whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.12em] text-fg-3">{n.t}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

const BLOCKS = [
  { icon: 'shield', t: 'Аккаунты и сессии', d: 'JWT-токены, шифрование паролей, удаление данных по запросу.' },
  { icon: 'chart', t: 'Прогресс на сервере', d: 'Замеры, трекер и история КТ — синхронны между устройствами.' },
  { icon: 'webhook', t: 'Платежи', d: 'ЮKassa и webhook-активация подписок без ручных действий.' },
  { icon: 'telegram', t: 'Уведомления', d: 'Telegram-бот через Cloudflare-relay в обход блокировки на RU-хостинге.' },
]

export default function Infrastructure() {
  return (
    <Sec id="backend" num="11" tag="Backend · Infrastructure" ghost="08" wide>
      <div className="max-w-3xl">
        <Title className="text-[clamp(2rem,5.4vw,3.6rem)]">Красота держится<br className="hidden sm:block" /> на системе</Title>
        <Lead className="mt-6">За мягким интерфейсом — строгая серверная логика. Вот что под капотом.</Lead>
      </div>

      {/* схема + телефон */}
      <div className="mt-16 grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-16">
        <Up><ArchGraph /></Up>
        <Up delay={0.1}>
          <div className="relative flex justify-center">
            <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[110%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(97,69,194,0.4), transparent 64%)', filter: 'blur(44px)' }} />
            <Tilt3D rotY={-12} rotX={6}>
              <PhoneMockup width={280} withSphere={false}><ScreenVideo src={`${import.meta.env.BASE_URL}screens/profile.mp4`}><ScreenDashboard /></ScreenVideo></PhoneMockup>
            </Tilt3D>
          </div>
        </Up>
      </div>

      {/* мини-абзацы «что сделали» */}
      <div className="mt-20 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
        {BLOCKS.map((b, i) => (
          <Up key={b.t} delay={(i % 2) * 0.06}>
            <div className="flex gap-4">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lilac" style={{ background: 'rgba(97,69,194,0.12)', border: '1px solid rgba(180,160,255,0.18)', boxShadow: 'inset 0 0 16px rgba(97,69,194,0.16)' }}>
                <Icon name={b.icon} size={20} />
              </span>
              <div>
                <h3 className="text-[18px] font-light text-fg-0">{b.t}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{b.d}</p>
              </div>
            </div>
          </Up>
        ))}
      </div>

      <Up>
        <div className="mt-12 flex flex-wrap gap-2">
          {['Fastify', 'Prisma', 'PostgreSQL', 'JWT', 'webhook', 'REST API', 'Selectel', 'Caddy + SSL'].map((t) => <Tech key={t}>{t}</Tech>)}
        </div>
      </Up>
    </Sec>
  )
}
