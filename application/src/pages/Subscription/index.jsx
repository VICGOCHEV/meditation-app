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

// Тариф клиента от 2026-06-09:
//   awareness — единственный тариф, курс Осознанности (199₽/мес).
// До 09.06 был ещё all-inclusive (299₽) + поштучные авторские 99₽;
// блок «Авторские» поставлен на паузу, тариф убран из UI. Бэкенд
// продолжает принимать all-inclusive webhook'и, чтобы существующие
// подписки не сломались.
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
            <svg viewBox="0 0 24 24" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-lilac" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
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
  // С 09.06 тариф единственный — `awareness`. State оставлен, потому что
  // ниже всё ещё стоят проверки `selectedTier?.name` и `metadata.tier`
  // и success-экран ссылается на «Пакет ‹название›». Если в будущем
  // вернётся второй тариф — достаточно расширить TIERS, ничего больше
  // переписывать не надо.
  const [tier] = useState('awareness')
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

      // 3. Создаём виджет. БЕЗ modal:true — рендерим inline в div #yukassa-widget,
      // чтобы юзер видел форму прямо на странице, а не в всплывающем окне.
      // Полная dark-кастомизация: control_primary + background + text + border
      // + control_primary_content. Без них ЮКасса рисует свой дефолтный
      // светлый фон вокруг dark-карточек выбора способа оплаты.
      const widget = new window.YooMoneyCheckoutWidget({
        confirmation_token: data.confirmationToken,
        customization: {
          colors: {
            control_primary:         '#6145c2', // фиолетовая CTA
            control_primary_content: '#f4f0ff', // текст на CTA
            background:              '#11101a', // фон формы (вся подложка)
            text:                    '#f4f0ff', // основной текст внутри виджета
            border:                  '#2a1f4d', // обводки полей/карточек
          },
        },
        error_callback: (err) => {
          // eslint-disable-next-line no-console
          console.warn('YooKassa widget error', err)
          setStage('error')
          setErrorMsg('Не удалось загрузить форму оплаты. Попробуй ещё раз.')
        },
      })
      widget.on('success', async () => {
        try { widget.destroy() } catch { /* ignore */ }
        widgetRef.current = null
        // YooKassa webhook прилетает к нам после success'а виджета — но
        // с лагом (обычно 1-3 сек, иногда до 10). Раньше мы показывали
        // success мгновенно, даже если loadFromServer падал или ещё не
        // активировал подписку. Юзер мог увидеть «оплачено» и ничего
        // в Profile.
        // Теперь: показываем «проверяем оплату» и пуллим subscription
        // до 12 секунд. Если active=true — успех. Если нет — даём retry.
        setStage('verifying')
        const deadline = Date.now() + 12000
        let confirmed = false
        while (Date.now() < deadline) {
          try {
            await loadFromServer()
            const sub = useProgressStore.getState().subscription
            if (sub?.active) { confirmed = true; break }
          } catch { /* пробуем ещё */ }
          await new Promise((r) => setTimeout(r, 1200))
        }
        if (confirmed) {
          setStage('success')
        } else {
          setStage('verifying-timeout')
        }
      })
      widget.on('fail', () => {
        try { widget.destroy() } catch { /* ignore */ }
        widgetRef.current = null
        setStage('error')
        setErrorMsg('Платёж не прошёл. Проверь карту или попробуй другую.')
      })
      widgetRef.current = widget

      // Переводим в stage='widget' СНАЧАЛА, чтобы React отрендерил
      // контейнер, ПОТОМ дёргаем render. Иначе element ещё не в DOM.
      setStage('widget')
      // React 18 concurrent: один rAF не гарантирует commit (rAF может
      // отстреляться до flush). Полл-чек ждём пока контейнер реально
      // появится в DOM — максимум ~500мс (30 кадров).
      let tries = 0
      while (!document.getElementById('yukassa-widget') && tries < 30) {
        await new Promise((r) => requestAnimationFrame(r))
        tries++
      }
      if (!document.getElementById('yukassa-widget')) {
        throw new Error('Форма не успела загрузиться, попробуй ещё раз')
      }
      widget.render('yukassa-widget')
    } catch (err) {
      setStage('error')
      setErrorMsg(err?.response?.data?.error || err?.message || 'Не удалось начать оплату')
    }
  }

  const cancelPayment = () => {
    try {
      widgetRef.current?.destroy?.()
    } catch {
      /* ignore */
    }
    widgetRef.current = null
    setStage('idle')
    setErrorMsg('')
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

      {/* ─── 0. VERIFYING — пуллим subscription пока webhook долетает ─── */}
      {stage === 'verifying' && (
        <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center animate-fade-in">
          <div className="mb-6 h-10 w-10 animate-spin rounded-full border-2 border-lilac/30 border-t-lilac" />
          <h1 className="font-serif text-3xl text-fg-0">Проверяем оплату…</h1>
          <p className="mt-3 max-w-xs text-[14px] text-fg-2">
            Банк подтверждает платёж. Это займёт несколько секунд.
          </p>
        </div>
      )}

      {/* ─── 0b. VERIFYING TIMEOUT — оплата прошла, но статус ещё не докатился ─── */}
      {stage === 'verifying-timeout' && (
        <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center animate-fade-in">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: 'oklch(0.72 0.13 80 / 0.18)',
              border: '1px solid oklch(0.72 0.13 80 / 0.4)',
            }}
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="oklch(0.82 0.13 80)" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6l4 2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-fg-0">Оплата в обработке</h1>
          <p className="mt-3 max-w-sm text-[14px] text-fg-2">
            Банк уже подтвердил платёж, но мы пока не получили окончательное
            уведомление. Подписка активируется в течение пары минут — обнови
            страницу или зайди заново.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <Button
              size="lg"
              fullWidth
              onClick={async () => {
                setStage('verifying')
                try {
                  await loadFromServer()
                  const sub = useProgressStore.getState().subscription
                  if (sub?.active) { setStage('success'); return }
                } catch { /* ignore */ }
                setStage('verifying-timeout')
              }}
            >
              Проверить ещё раз
            </Button>
            <Button size="lg" fullWidth variant="secondary" onClick={() => navigate('/')}>
              На главную
            </Button>
          </div>
        </div>
      )}

      {/* ─── 1. SUCCESS — полноэкранный финал, без выбора ─── */}
      {stage === 'success' && (
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
            Пакет «{selectedTier?.name}» активирован
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
      )}

      {/* ─── 2. WIDGET — оплата идёт. Прячем тариф-карты, рисуем сводку
              и контейнер для виджета. ─── */}
      {stage === 'widget' && (
        <div className="animate-fade-in">
          <div className="label-mono text-lilac">Оплата подписки</div>
          <h1 className="mt-2 font-serif text-[28px] leading-tight text-fg-0">
            {selectedTier?.name}
          </h1>

          <div className="mt-4 flex items-baseline justify-between gap-3 rounded-md border border-line-2 bg-white/[0.04] px-4 py-3">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                К списанию через 7 дней
              </span>
              <span className="mt-1 font-serif text-[22px] text-fg-0">
                {selectedTier?.price} ₽ <span className="text-[13px] text-fg-2">/ мес</span>
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-lilac/80">
              7 дней бесплатно
            </span>
          </div>

          {/* ВЖНО: контейнер всегда в DOM с фиксированным ID, чтобы
              widget.render('yukassa-widget') нашёл элемент. min-height
              ~480 чтобы форма карты помещалась без скачка лейаута.
              bg-bg-0 (НЕ /40) — чтобы белый фон ЮКассы не просвечивал
              если кастомизация не сработает 100%; overflow-hidden — чтобы
              iframe ровно заполнил контейнер без полей. */}
          <div
            id="yukassa-widget"
            className="mt-6 min-h-[480px] overflow-hidden rounded-lg border border-line-2 bg-bg-0"
            style={{ colorScheme: 'dark' }}
          />

          <button
            type="button"
            onClick={cancelPayment}
            className="mt-4 w-full text-center text-[13px] text-fg-3 hover:text-fg-1 transition-colors"
          >
            ← Отменить и вернуться к выбору
          </button>
        </div>
      )}

      {/* ─── 3. IDLE / LOADING / ERROR — выбор тарифа + CTA ─── */}
      {stage !== 'success' && stage !== 'widget' &&
       stage !== 'verifying' && stage !== 'verifying-timeout' && (
        <>
          <div className="label-mono text-lilac">Подписка</div>
          <h1 className="mt-2 font-serif text-[34px] leading-tight text-fg-0">
            Открой курс
            <br />
            осознанности.
          </h1>

          <div className="mt-6 flex flex-col gap-3">
            {TIERS.map((t) => (
              <TierCard
                key={t.id}
                tier={t}
                selected={tier === t.id}
                onSelect={() => {}}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-[12px] text-fg-3">
            Расслабление — всегда бесплатно.
          </p>

          {stage === 'error' && (
            <div className="mt-6 rounded-md border border-line-2 bg-err/10 px-4 py-3 text-[13px] text-err">
              {errorMsg ||
                'Что-то пошло не так с оплатой. Проверь данные карты или попробуй другую.'}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <AnimatedSubscribeButton
              labelIdle={stage === 'error' ? 'Попробовать снова' : 'Оплатить и начать'}
              labelActive="Открываем оплату…"
              generating={stage === 'loading'}
              disabled={stage === 'loading'}
              onClick={onPay}
            />
          </div>

          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
            7 дней бесплатно · отмена в любой момент
          </p>
        </>
      )}
    </ScreenShell>
  )
}
