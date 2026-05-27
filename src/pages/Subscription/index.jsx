import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import AnimatedSubscribeButton from '../../components/ui/AnimatedSubscribeButton'
import { useProgressStore } from '../../store/useProgressStore'
import { api, USE_MOCK } from '../../api/client'

// Подгружает скрипт ЮKassa виджета один раз (или возвращает true если уже).
function loadYookassaScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.YooMoneyCheckoutWidget) return Promise.resolve(true)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js'
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => reject(new Error('Не удалось загрузить ЮKassa SDK'))
    document.head.appendChild(s)
  })
}

// Два тарифа клиента от 2026-05-26:
//   awareness     — только курс Осознанности, авторские по 99₽ поштучно
//   all-inclusive — курс + все авторские (текущие и будущие месячные)
//
// Бесплатное Расслабление и 2 бесплатных авторских доступны без подписки,
// поэтому на этом экране не упоминаем — это про апгрейд.
const TIERS = [
  {
    id: 'awareness',
    name: 'Осознанность',
    price: 199,
    currency: '₽',
    period: '/ мес',
    trial: '7 дней бесплатно',
    benefits: [
      '6 практик «Осознанности»',
      'Новые практики каждый месяц',
      'Трекер прогресса',
      'Система прогрессии + глубокий анализ',
    ],
    bonus: null,
  },
  {
    id: 'all-inclusive',
    name: 'Всё включено',
    price: 299,
    currency: '₽',
    period: '/ мес',
    trial: '7 дней бесплатно',
    badge: 'Полный доступ',
    benefits: [
      'Всё из «Осознанности»',
      'Доступ ко всем авторским практикам',
      'Новые авторские каждый месяц без доплат',
      'Без поштучных покупок 99 ₽',
    ],
    bonus: 'выгоднее, если слушаешь авторские',
  },
]

function TierCard({ tier, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tier.id)}
      aria-pressed={selected}
      className={[
        'relative w-full overflow-hidden rounded-lg border p-5 text-left transition',
        selected
          ? 'border-lilac bg-white/[0.07]'
          : 'border-line-2 bg-white/[0.03] hover:bg-white/[0.06]',
      ].join(' ')}
      style={
        selected
          ? { boxShadow: '0 0 32px -8px rgba(97,69,194,.55), inset 0 0 0 1px rgba(180,160,255,.18)' }
          : undefined
      }
    >
      {tier.badge && (
        <span className="absolute right-3 top-3 rounded-full border border-lilac/40 bg-lilac/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-lilac">
          {tier.badge}
        </span>
      )}

      <div className="label-mono text-fg-3">{tier.name}</div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-serif text-[36px] leading-none text-fg-0">
          {tier.price}
        </span>
        <span className="text-[18px] text-fg-1">{tier.currency}</span>
        <span className="ml-1 text-[13px] text-fg-3">{tier.period}</span>
      </div>

      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-lilac/80">
        {tier.trial}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {tier.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[13px] text-fg-1">
            <span className="mt-[2px] text-lilac">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {tier.bonus && (
        <div className="mt-3 border-t border-line pt-3 text-[12px] italic text-fg-2">
          {tier.bonus}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-[12px]">
        <span
          className={[
            'flex h-4 w-4 items-center justify-center rounded-full border-2 transition',
            selected ? 'border-lilac bg-lilac/30' : 'border-line-2',
          ].join(' ')}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-lilac" />}
        </span>
        <span className={selected ? 'text-fg-0' : 'text-fg-2'}>
          {selected ? 'Выбран этот тариф' : 'Выбрать'}
        </span>
      </div>
    </button>
  )
}

export default function Subscription() {
  const navigate = useNavigate()
  const loadFromServer = useProgressStore((s) => s.loadFromServer)
  const activate = useProgressStore((s) => s.activateSubscription)
  const [stage, setStage] = useState('idle') // idle | loading | widget | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [tier, setTier] = useState('awareness') // awareness | all-inclusive
  const widgetRef = useRef(null)

  // Cleanup виджета при размонтировании / уходе со страницы.
  useEffect(() => {
    return () => {
      try {
        widgetRef.current?.destroy?.()
      } catch {
        /* ignore */
      }
      widgetRef.current = null
    }
  }, [])

  const onPay = async () => {
    setStage('loading')
    setErrorMsg('')

    // USE_MOCK: эмулируем мгновенную активацию без виджета — для локалки.
    if (USE_MOCK) {
      try {
        await activate(30, tier)
        setStage('success')
      } catch {
        setStage('error')
        setErrorMsg('Mock-активация не удалась')
      }
      return
    }

    try {
      // 1. Создаём платёж на бэке → получаем confirmation_token
      const { data } = await api.post('/payments/yookassa/create', { tier })
      if (!data?.confirmationToken) throw new Error('Нет confirmation_token')

      // 2. Подгружаем виджет (один раз за сессию)
      await loadYookassaScript()
      if (!window.YooMoneyCheckoutWidget) throw new Error('Виджет недоступен')

      // 3. Создаём и рендерим виджет в контейнер
      const widget = new window.YooMoneyCheckoutWidget({
        confirmation_token: data.confirmationToken,
        // return_url не нужен для embedded — оплата завершается inline
        customization: {
          modal: true,
          colors: { control_primary: '#6145c2', background: '#11101a' },
        },
        error_callback: (err) => {
          // eslint-disable-next-line no-console
          console.warn('YooKassa widget error', err)
          setStage('error')
          setErrorMsg('Ошибка платёжной формы')
        },
      })
      widget.on('success', async () => {
        widget.destroy()
        widgetRef.current = null
        // Виджет показал «оплата прошла». На сервере webhook ЮKassa должен
        // уже активировать подписку. Подтянем актуальное состояние:
        try {
          await loadFromServer()
        } catch {
          /* fallback ниже */
        }
        setStage('success')
      })
      widget.on('fail', () => {
        widget.destroy()
        widgetRef.current = null
        setStage('error')
        setErrorMsg('Платёж не прошёл')
      })
      widgetRef.current = widget
      widget.render('yukassa-widget')
      setStage('widget')
    } catch (err) {
      setStage('error')
      setErrorMsg(err?.response?.data?.error || err?.message || 'Не удалось начать оплату')
    }
  }

  const selectedTier = TIERS.find((t) => t.id === tier)

  return (
    <ScreenShell>
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line-2 bg-white/5 text-fg-0 hover:bg-white/10"
          aria-label="Назад"
        >
          ←
        </button>
      </div>

      {stage === 'success' ? (
        <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center animate-fade-in">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: 'oklch(0.72 0.13 160 / 0.2)',
              border: '1px solid oklch(0.72 0.13 160 / 0.4)',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="none"
              stroke="oklch(0.82 0.13 160)"
              strokeWidth="2"
            >
              <path d="M5 12l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-fg-0">
            {selectedTier?.name} активирован
          </h1>
          <p className="mt-4 max-w-xs text-[15px] text-fg-2">
            Первая практика уже ждёт тебя.
          </p>
          <div className="mt-10 w-full max-w-sm">
            <Button size="lg" fullWidth onClick={() => navigate('/player/a1')}>
              Начать практику
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="label-mono text-lilac">Подписка</div>
          <h1 className="mt-2 font-serif text-[34px] leading-tight text-fg-0">
            Выбери глубину
            <br />
            пути.
          </h1>

          <div className="mt-6 flex flex-col gap-3">
            {TIERS.map((t) => (
              <TierCard
                key={t.id}
                tier={t}
                selected={tier === t.id}
                onSelect={setTier}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-[12px] text-fg-3">
            Или покупай авторские поштучно — 99 ₽ каждая.
            <br />
            Расслабление — всегда бесплатно.
          </p>

          <div className="mt-6 flex justify-center">
            <AnimatedSubscribeButton
              labelIdle="Получить ключи к жизни"
              labelActive={stage === 'widget' ? 'Открываем оплату…' : 'Обрабатываем платёж'}
              generating={stage === 'loading' || stage === 'widget'}
              disabled={stage === 'loading' || stage === 'widget'}
              onClick={onPay}
            />
          </div>

          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
            Автопродление · отмена в любой момент
          </p>

          {/* Контейнер для embedded-виджета ЮKassa. До запуска оплаты —
              просто плашка-плейсхолдер. Виджет открывается модальным окном
              благодаря customization.modal=true. */}
          <div
            id="yukassa-widget"
            className={[
              'mt-6 rounded-md p-6 text-center text-[12px]',
              stage === 'widget'
                ? 'border border-line-2 bg-bg-1/40 text-fg-1'
                : 'border border-dashed border-line-2 text-fg-3',
            ].join(' ')}
          >
            {stage === 'widget'
              ? 'Форма оплаты открыта в модальном окне'
              : 'Форма ЮKassa появится тут после нажатия кнопки выше'}
          </div>

          {stage === 'error' && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-line-2 bg-err/10 px-4 py-3 text-[13px] text-err">
              <span>
                {errorMsg ||
                  'Что-то пошло не так с оплатой. Попробуй другую карту или посмотри, всё ли в порядке в банке.'}
              </span>
              <Button size="sm" variant="secondary" onClick={onPay}>
                Повторить
              </Button>
            </div>
          )}
        </>
      )}
    </ScreenShell>
  )
}
