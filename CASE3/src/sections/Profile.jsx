import { Sec, Title, Lead, OrbitRing } from '../components/caseui'
import { Up, StoryItem, Cap } from '../components/story'
import PhoneMockup from '../components/PhoneMockup'
import ScreenVideo from '../components/ScreenVideo'
import Icon from '../lib/icons'

// Лёгкий экран профиля (реплика настроек аппки).
function ScreenProfile() {
  const rows = [
    { icon: 'droplet', t: 'Тема', v: 'Авто · по времени' },
    { icon: 'clock', t: 'Часовой пояс', v: 'GMT+3' },
    { icon: 'telegram', t: 'Push в Telegram', v: 'вкл' },
    { icon: 'calendar', t: 'Напоминания', v: '08 · 12 · 16 · 20' },
  ]
  return (
    <div className="flex h-full flex-col px-4 pt-9 pb-4 text-fg-1">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">Профиль</p>
      <div className="mt-4 flex items-center gap-3.5">
        <span className="grid h-14 w-14 place-items-center rounded-full text-[18px] text-fg-0" style={{ background: 'linear-gradient(140deg,#6145c2,#9a8cf0)', boxShadow: '0 0 22px -6px rgba(97,69,194,0.8)' }}>М</span>
        <div>
          <p className="text-[16px] font-light text-fg-0">Мария</p>
          <p className="font-mono text-[10px] text-lilac">Всё включено · активна</p>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between rounded-2xl p-4" style={{ background: 'rgba(97,69,194,0.12)', border: '1px solid rgba(180,160,255,0.14)' }}>
        <div><p className="text-[28px] font-extralight leading-none text-fg-0">12</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-lilac">дней подряд</p></div>
        <Icon name="pulse" size={26} className="text-lilac" />
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'rgba(14,10,28,0.85)', boxShadow: 'inset 0 0 0 1px rgba(180,160,255,0.06)' }}>
            <span className="grid h-8 w-8 place-items-center rounded-lg text-lilac" style={{ background: 'rgba(97,69,194,0.16)' }}><Icon name={r.icon} size={15} /></span>
            <span className="flex-1 text-[12px] text-fg-1">{r.t}</span>
            <span className="font-mono text-[10px] text-fg-3">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: 'droplet', t: 'Тема', d: 'Авто по времени суток или ручная фиксация слота.' },
  { icon: 'clock', t: 'Часовой пояс', d: 'Напоминания приходят в локальном времени пользователя.' },
  { icon: 'telegram', t: 'Push в Telegram', d: 'Мягкие напоминания о практике через бота.' },
  { icon: 'shield', t: 'Управление аккаунтом', d: 'Смена пароля, выгрузка и удаление данных по запросу.' },
]

export default function Profile() {
  return (
    <Sec id="profile" num="09" tag="Profile & Control" ghost="06">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <div>
          <Title className="text-[clamp(2rem,5vw,3.4rem)]">Профиль<br className="hidden sm:block" /> и управление ритмом</Title>
          <Lead className="mt-6 mb-10">Пользователь управляет тем, как продукт входит в его день: тема, часовой пояс, каналы напоминаний и слоты утро/день/вечер/ночь.</Lead>
          <div className="space-y-9">
            {FEATURES.map((f, i) => (
              <StoryItem key={f.t} icon={f.icon} title={f.t} index={`0${i + 1}`} delay={(i % 2) * 0.06}>
                <Cap size="sm">{f.d}</Cap>
              </StoryItem>
            ))}
          </div>
        </div>

        <Up delay={0.1}>
          <OrbitRing
            size={460}
            spin={80}
            nodes={[{ value: '08' }, { value: '12' }, { value: '16' }, { value: '20' }]}
            center={<PhoneMockup width={236} withSphere={false}><ScreenVideo src={`${import.meta.env.BASE_URL}screens/profile.mp4`}><ScreenProfile /></ScreenVideo></PhoneMockup>}
          />
        </Up>
      </div>
    </Sec>
  )
}
