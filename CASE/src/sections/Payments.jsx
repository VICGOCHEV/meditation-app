import { Chapter, Split, StoryItem, Cap, Up } from '../components/story'
import { FlowDiagram } from '../components/kit'
import Tariffs from '../components/app/TierCard'

const CARDS = [
  { icon: 'card', title: 'ЮKassa внутри интерфейса', text: 'Оплата без редиректов на внешние домены — пользователь остаётся в атмосфере приложения.' },
  { icon: 'tariff', title: 'Тарифные сетки', text: '«Осознанность» и «Всё включено» плюс поштучный выкуп отдельных практик.' },
  { icon: 'webhook', title: 'Webhook-активация', text: 'Подписка включается по вебхуку оплаты; отмена обрабатывается честно до конца срока.' },
]

function TariffVisual() {
  return (
    <div className="case-card p-6 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <p className="label-mono">Тарифы · реальные карточки приложения</p>
      </div>
      <Tariffs />
    </div>
  )
}

export default function Payments() {
  return (
    <Chapter id="payments" kicker="Платежи" title="Платежная инфраструктура">
      <Split visual={<TariffVisual />}>
        <div className="space-y-12">
          {CARDS.map((c, i) => (
            <StoryItem key={c.title} icon={c.icon} title={c.title} index={`0${i + 1}`} delay={i * 0.06}>
              <Cap size="sm">{c.text}</Cap>
            </StoryItem>
          ))}
        </div>
      </Split>

      <Up delay={0.05}>
        <div className="case-card mt-16 p-7 sm:p-9">
          <p className="label-mono mb-8">Логика активации</p>
          <FlowDiagram steps={['пользователь', 'ЮKassa', 'webhook', 'подписка активна']} />
        </div>
      </Up>
    </Chapter>
  )
}
