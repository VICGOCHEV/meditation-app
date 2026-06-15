import { Chapter, StoryItem, Cap, Up } from '../components/story'
import { FlowDiagram } from '../components/kit'
import Icon from '../lib/icons'

const SATELLITES = [
  { i: 'telegram', t: 'Telegram-бот' },
  { i: 'mail', t: 'email' },
  { i: 'feedback', t: 'форма обратной связи' },
  { i: 'server', t: 'сервер' },
  { i: 'cloud', t: 'Cloudflare proxy relay' },
]

function CommMap() {
  return (
    <div className="case-card relative overflow-hidden p-8 sm:p-12">
      <div className="liquid-card-glow" style={{ opacity: 0.16 }} />
      <p className="label-mono relative mb-10">Коммуникационная карта</p>
      <div className="relative flex flex-col items-center gap-8">
        <div className="relative z-10 flex h-28 w-28 flex-col items-center justify-center rounded-full text-center" style={{ background: 'radial-gradient(circle, rgba(97,69,194,0.42), rgba(24,19,48,0.95))', border: '1px solid rgba(180,160,255,0.3)', boxShadow: '0 0 50px -8px rgba(97,69,194,0.6)' }}>
          <Icon name="enter" size={24} className="text-fg-0" />
          <span className="mt-1.5 text-[12px] text-fg-0">Пользователь</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SATELLITES.map((s) => (
            <span key={s.t} className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] text-fg-1" style={{ background: 'rgba(20,16,42,0.7)', border: '1px solid rgba(180,160,255,0.16)' }}>
              <Icon name={s.i} size={16} className="text-lilac" /> {s.t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Comms() {
  return (
    <Chapter id="comms" kicker="Коммуникации" title="Каналы и система нотификаций">
      <Up><CommMap /></Up>

      <div className="mt-16 grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-2">
        <StoryItem icon="telegram" title="Telegram-бот" index="01">
          <Cap size="sm">Напоминания с настройкой часового пояса и слотов утро/день/вечер/ночь.</Cap>
        </StoryItem>
        <StoryItem icon="cloud" title="Cloudflare proxy relay" index="02" delay={0.08}>
          <Cap size="sm">Блокировка Telegram на RU-хостинге обойдена отказоустойчивым прокси-релеем.</Cap>
          <div className="mt-4"><FlowDiagram steps={['сервер', 'Cloudflare', 'Telegram']} className="justify-start" /></div>
        </StoryItem>
        <StoryItem icon="mail" title="HTML-письма" index="03">
          <Cap size="sm">Адаптивные письма в фирменном стиле — корректно в Gmail и Outlook.</Cap>
        </StoryItem>
        <StoryItem icon="feedback" title="Форма обратной связи" index="04" delay={0.08}>
          <Cap size="sm">Нативная форма для инсайтов, вопросов и благодарностей автору методики.</Cap>
        </StoryItem>
      </div>
    </Chapter>
  )
}
