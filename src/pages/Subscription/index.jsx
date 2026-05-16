import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import AnimatedSubscribeButton from '../../components/ui/AnimatedSubscribeButton'
import { useProgressStore } from '../../store/useProgressStore'

const BENEFITS = [
  '6 практик «Осознанности»',
  'Новые практики каждый месяц',
  'Трекер прогресса',
  'Система прогрессии и глубокий анализ',
]

export default function Subscription() {
  const navigate = useNavigate()
  const activate = useProgressStore((s) => s.activateSubscription)
  const [stage, setStage] = useState('idle') // idle | loading | success | error

  const onPay = async () => {
    setStage('loading')
    try {
      // `activateSubscription` is the single source of truth. In
      // real-backend mode it POSTs /api/subscription, which flips
      // active=true (+30d) and unlocks 'a1'. In USE_MOCK mode it just
      // mutates local store. The legacy `createSubscription` mock
      // (with random failure rate) is no longer called here.
      await activate(30)
      setStage('success')
    } catch {
      setStage('error')
    }
  }

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
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'oklch(0.72 0.13 160 / 0.2)', border: '1px solid oklch(0.72 0.13 160 / 0.4)' }}>
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="oklch(0.82 0.13 160)" strokeWidth="2">
              <path d="M5 12l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-fg-0">Подписка активирована! 🎉</h1>
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
            Открой все<br />практики
          </h1>

          <ul className="mt-8 flex flex-col gap-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 rounded-md border border-line bg-white/5 px-4 py-3 text-[14px] text-fg-1">
                <span className="text-lilac">✓</span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-8 panel">
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-[36px] text-fg-0">990 ₽</span>
              <span className="text-[13px] text-fg-3">/ месяц</span>
            </div>
            <p className="mt-2 text-[12px] text-fg-3">
              Автоматическое продление · отмена в любой момент
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <AnimatedSubscribeButton
              labelIdle="Оформить подписку"
              labelActive="Обрабатываем платёж"
              generating={stage === 'loading'}
              disabled={stage === 'loading'}
              onClick={onPay}
            />
          </div>

          <div id="yukassa-widget" className="mt-6 rounded-md border border-dashed border-line-2 p-6 text-center text-[12px] text-fg-3">
            Здесь появится форма ЮKassa
          </div>

          {stage === 'error' && (
            <div className="mt-4 flex items-center justify-between rounded-md border border-line-2 bg-err/10 px-4 py-3 text-[13px] text-err">
              <span>Оплата не прошла. Попробуй ещё раз.</span>
              <Button size="sm" variant="secondary" onClick={onPay}>Повторить</Button>
            </div>
          )}
        </>
      )}
    </ScreenShell>
  )
}
