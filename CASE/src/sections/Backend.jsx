import { Chapter, StoryItem, Cap, Up } from '../components/story'
import { FlowDiagram } from '../components/kit'

const CARDS = [
  { icon: 'server', title: 'Fastify + PostgreSQL', text: 'Аккаунты, трекеры, замеры и подписки — на сервере. Бесшовно между устройствами.' },
  { icon: 'shield', title: 'Безопасная авторизация', text: 'Криптошифрование паролей и защищённые сессионные токены.' },
  { icon: 'trash', title: 'Удаление аккаунта', text: 'В один клик с подтверждением кодовым словом — данные всегда можно забрать.' },
  { icon: 'contract', title: 'API-контракты', text: 'Строгая спецификация — переход с заглушек на боевой бэкенд без рефакторинга.' },
]

export default function Backend() {
  return (
    <Chapter id="backend" kicker="Серверная логика" title="Backend-архитектура и серверная логика">
      <Up>
        <div className="case-card overflow-hidden p-7 sm:p-10">
          <p className="label-mono mb-8">Архитектурная схема</p>
          <FlowDiagram steps={['Frontend', 'API', 'Fastify', 'PostgreSQL', 'CMS', 'Payment Webhook', 'Telegram Bot']} />
        </div>
      </Up>

      <div className="mt-16 grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-2">
        {CARDS.map((c, i) => (
          <StoryItem key={c.title} icon={c.icon} title={c.title} index={`0${i + 1}`} delay={(i % 2) * 0.08}>
            <Cap size="sm">{c.text}</Cap>
          </StoryItem>
        ))}
      </div>
    </Chapter>
  )
}
