import { Sec, Title, Lead, Tilt3D } from '../components/caseui'
import { Up, StoryItem, Cap } from '../components/story'
import PhoneMockup from '../components/PhoneMockup'
import Icon from '../lib/icons'

// Экран мини-аппа (TG / VK) — реплика: шапка платформы, напоминания,
// управление подпиской, кнопка запуска практики.
function MiniApp({ platform, icon, accent }) {
  return (
    <div className="flex h-full flex-col px-4 pt-9 pb-4 text-fg-1">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: accent }}><Icon name={icon} size={16} /></span>
        <div>
          <p className="text-[13px] text-fg-0">{platform}</p>
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-3">Mini App</p>
        </div>
      </div>

      <p className="mt-5 mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-3">Напоминания</p>
      <div className="space-y-2">
        {[['Утро', '08:00'], ['Вечер', '20:30']].map(([t, v]) => (
          <div key={t} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'rgba(14,10,28,0.85)', boxShadow: 'inset 0 0 0 1px rgba(180,160,255,0.06)' }}>
            <span className="text-[12px] text-fg-1">{t}</span>
            <span className="font-mono text-[11px] text-lilac">{v}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-3">Подписка</p>
      <div className="flex items-center justify-between rounded-xl px-3 py-3" style={{ background: 'rgba(97,69,194,0.14)', border: '1px solid rgba(180,160,255,0.16)' }}>
        <span className="text-[12px] text-fg-0">Всё включено</span>
        <span className="font-mono text-[10px]" style={{ color: '#9ad6b4' }}>активна</span>
      </div>

      <button className="btn-primary-app mt-auto w-full py-3 text-[12px]"><Icon name="play" size={14} className="text-white" /> Открыть практику</button>
    </div>
  )
}

const POINTS = [
  { icon: 'telegram', t: 'Telegram Mini App', d: 'Полный продукт внутри мессенджера: вход в один тап, напоминания через бота.' },
  { icon: 'platforms', t: 'VK Mini App', d: 'Та же экосистема для аудитории VK — авторизация и оплата на месте.' },
  { icon: 'cloud', t: 'Cloudflare relay', d: 'Блокировку Telegram на RU-хостинге обходит отказоустойчивый прокси-релей.' },
  { icon: 'unlock', t: 'Бесшовный вход', d: 'Авто-авторизация по данным платформы — без паролей и форм.' },
]

export default function CommsMini() {
  return (
    <Sec id="comms" num="12" tag="Telegram · VK" ghost="09">
      <div className="max-w-2xl">
        <Title className="text-[clamp(2rem,5vw,3.4rem)]">Практика всегда<br className="hidden sm:block" /> рядом с вами</Title>
        <Lead className="mt-6">Один продукт — три точки входа. Telegram и VK Mini App дают тот же опыт прямо в привычных приложениях, без установки.</Lead>
      </div>

      <div className="mt-16 grid grid-cols-1 items-center gap-14 lg:grid-cols-[auto_1fr] lg:gap-20">
        <Up>
          <div className="flex justify-center gap-6 sm:gap-10">
            <Tilt3D rotY={10} rotX={5}><PhoneMockup width={210} withSphere={false}><MiniApp platform="Telegram" icon="telegram" accent="#2aabee" /></PhoneMockup></Tilt3D>
            <Tilt3D rotY={-10} rotX={5} className="mt-10"><PhoneMockup width={210} withSphere={false}><MiniApp platform="VK" icon="platforms" accent="#0077ff" /></PhoneMockup></Tilt3D>
          </div>
        </Up>

        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2">
          {POINTS.map((p, i) => (
            <StoryItem key={p.t} icon={p.icon} title={p.t} index={`0${i + 1}`} delay={(i % 2) * 0.06}>
              <Cap size="sm">{p.d}</Cap>
            </StoryItem>
          ))}
        </div>
      </div>
    </Sec>
  )
}
