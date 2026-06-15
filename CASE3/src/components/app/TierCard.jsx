import { useState } from 'react'

// Реальные тарифные карточки из приложения (Subscription/TierCard) — 1:1.
// Данные тарифов клиента от 2026-05-26.
export const TIERS = [
  {
    id: 'awareness', name: 'Осознанность', price: 199, currency: '₽', period: '/ мес', trial: '7 дней бесплатно',
    benefits: ['6 практик «Осознанности»', 'Новые практики каждый месяц', 'Трекер прогресса', 'Система прогрессии + глубокий анализ'],
    bonus: null,
  },
  {
    id: 'all-inclusive', name: 'Всё включено', price: 299, currency: '₽', period: '/ мес', trial: '7 дней бесплатно', badge: 'Полный доступ',
    benefits: ['Всё из «Осознанности»', 'Доступ ко всем авторским практикам', 'Новые авторские каждый месяц без доплат', 'Без поштучных покупок 99 ₽'],
    bonus: 'выгоднее, если слушаешь авторские',
  },
]

export function TierCard({ tier, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tier.id)}
      aria-pressed={selected}
      className={[
        'relative w-full overflow-hidden rounded-lg border p-5 text-left transition',
        selected ? 'border-lilac bg-white/[0.07]' : 'border-line-2 bg-white/[0.03] hover:bg-white/[0.06]',
      ].join(' ')}
      style={selected ? { boxShadow: '0 0 32px -8px rgba(97,69,194,.55), inset 0 0 0 1px rgba(180,160,255,.18)' } : undefined}
    >
      {tier.badge && (
        <span className="absolute right-3 top-3 rounded-full border border-lilac/40 bg-lilac/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-lilac">
          {tier.badge}
        </span>
      )}

      <div className="label-mono text-fg-3">{tier.name}</div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-serif text-[36px] leading-none text-fg-0">{tier.price}</span>
        <span className="text-[18px] text-fg-1">{tier.currency}</span>
        <span className="ml-1 text-[13px] text-fg-3">{tier.period}</span>
      </div>

      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-lilac/80">{tier.trial}</div>

      <ul className="mt-4 flex flex-col gap-2">
        {tier.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[13px] text-fg-1">
            <svg viewBox="0 0 24 24" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-lilac" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {tier.bonus && (
        <div className="mt-3 border-t border-line pt-3 text-[12px] italic text-fg-2">{tier.bonus}</div>
      )}

      <div className="mt-4 flex items-center gap-2 text-[12px]">
        <span className={['flex h-4 w-4 items-center justify-center rounded-full border-2 transition', selected ? 'border-lilac bg-lilac/30' : 'border-line-2'].join(' ')}>
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-lilac" />}
        </span>
        <span className={selected ? 'text-fg-0' : 'text-fg-2'}>{selected ? 'Выбран этот тариф' : 'Выбрать'}</span>
      </div>
    </button>
  )
}

// Интерактивный блок выбора тарифа (как на экране подписки).
export default function Tariffs() {
  const [tier, setTier] = useState('all-inclusive')
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      {TIERS.map((t) => (
        <TierCard key={t.id} tier={t} selected={tier === t.id} onSelect={setTier} />
      ))}
    </div>
  )
}
