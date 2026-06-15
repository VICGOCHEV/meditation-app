import AmorphSphere from './AmorphSphere'
import Icon from '../lib/icons'

/* ─────────────────────────────────────────────────────────────
   Экраны-реплики приложения. Внешний вид взят строго из продукта:
   тёмная сцена, card-practice, фиолетовый акцент, mono-метки,
   иконки состояния 1:1 из src/pages/Checkin.
   ───────────────────────────────────────────────────────────── */

const SCREEN = 'flex h-full flex-col px-4 pt-9 pb-4 text-fg-1'

// Иконки состояний — скопированы 1:1 из боевого Checkin/index.jsx.
export function StateIcon({ state, size = 88 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 64 64', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
  }
  if (state === 'Шторм')
    return (
      <svg {...common}>
        <path d="M14 30c-3 0-6-2-6-6s2-7 7-7c1-5 6-9 12-9 7 0 12 5 12 11 4 0 8 4 8 8s-3 7-8 7H14z" fill="rgba(216,200,255,.10)" />
        <path d="M22 42l-5 12M32 42l-3 8M42 42l-5 12" stroke="#d8c8ff" strokeWidth={1.7} />
      </svg>
    )
  if (state === 'Ясность')
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="10" fill="rgba(216,200,255,.18)" />
        <path d="M32 8v8M32 48v8M8 32h8M48 32h8M14 14l6 6M44 44l6 6M14 50l6-6M44 20l6-6" stroke="#d8c8ff" />
      </svg>
    )
  if (state === 'Поток')
    return (
      <svg {...common}>
        <path d="M8 34c8-8 16-8 24 0s16 8 24 0M8 22c8-8 16-8 24 0s16 8 24 0M8 46c8-8 16-8 24 0s16 8 24 0" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M18 38c-5 0-9-3-9-8s4-8 9-8c0-5 5-10 11-10 7 0 11 5 12 11 5 0 9 3 9 8s-4 7-9 7H18z" fill="rgba(216,200,255,.18)" />
    </svg>
  )
}

function StatusPill({ kind }) {
  const map = {
    free: { t: 'доступно', c: '#9ad6b4', bg: 'rgba(120,200,150,0.12)' },
    sub: { t: 'по подписке', c: '#b9a7f0', bg: 'rgba(97,69,194,0.16)' },
    done: { t: 'пройдено', c: '#a99ecb', bg: 'rgba(180,160,255,0.08)' },
  }
  const s = map[kind]
  return (
    <span
      className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
      style={{ color: s.c, background: s.bg, border: '1px solid rgba(180,160,255,0.14)' }}
    >
      {s.t}
    </span>
  )
}

function PracticeRow({ title, sub, status, locked }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3"
      style={{ background: 'rgba(14,10,28,0.85)', boxShadow: 'inset 0 0 0 1px rgba(180,160,255,0.06)' }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lilac"
        style={{ background: 'rgba(97,69,194,0.16)' }}
      >
        <Icon name={locked ? 'lock' : 'play'} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-fg-0">{title}</p>
        <p className="truncate font-mono text-[9px] text-fg-3">{sub}</p>
      </div>
      <StatusPill kind={status} />
    </div>
  )
}

/* ── Главный экран: 3 блока ──────────────────────────────────── */
export function ScreenHome() {
  return (
    <div className={SCREEN}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">Сегодня · Ясность</p>
          <p className="mt-0.5 text-[17px] font-light text-fg-0">Добрый вечер</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-lilac" style={{ background: 'rgba(97,69,194,0.16)' }}>
          <Icon name="settings" size={16} />
        </span>
      </div>

      <div className="space-y-3 overflow-hidden">
        <div>
          <p className="mb-1.5 label-mono text-[9px]">Расслабление</p>
          <div className="space-y-1.5">
            <PracticeRow title="Тёплое дыхание" sub="08:20 · голос" status="free" />
            <PracticeRow title="Сканирование тела" sub="12:00 · голос" status="free" />
          </div>
        </div>
        <div>
          <p className="mb-1.5 label-mono text-[9px]">Осознанность</p>
          <div className="space-y-1.5">
            <PracticeRow title="День 04 · Наблюдатель" sub="по подписке" status="sub" locked />
            <PracticeRow title="День 03 · Тишина" sub="14:40" status="done" />
          </div>
        </div>
        <div>
          <p className="mb-1.5 label-mono text-[9px]">Авторские</p>
          <PracticeRow title="Перед сном" sub="по подписке" status="sub" locked />
        </div>
      </div>
    </div>
  )
}

/* ── Плеер: аморфная сфера + таймкод ─────────────────────────── */
export function ScreenPlayer() {
  return (
    <div className={`${SCREEN} items-center text-center`}>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">Осознанность · День 03</p>
      <p className="mt-1 text-[16px] font-light text-fg-0">Тишина между мыслями</p>

      <div className="relative my-6 flex flex-1 items-center justify-center">
        <AmorphSphere size={190} />
      </div>

      <div className="w-full px-1">
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(180,160,255,0.12)' }}>
          <div className="h-full rounded-full" style={{ width: '42%', background: 'linear-gradient(90deg,#6145c2,#d6c8ff)' }} />
        </div>
        <div className="mb-5 flex justify-between font-mono text-[10px] text-fg-3">
          <span>06:12</span>
          <span>14:40</span>
        </div>
        <div className="flex items-center justify-center gap-7 text-fg-1">
          <Icon name="arrow" size={20} className="-scale-x-100 opacity-50" />
          <span className="flex h-14 w-14 items-center justify-center rounded-full btn-primary-app">
            <Icon name="play" size={24} className="text-white" />
          </span>
          <Icon name="arrow" size={20} className="opacity-50" />
        </div>
      </div>
    </div>
  )
}

/* ── Чек-ин: вопрос + слайдер ────────────────────────────────── */
export function ScreenCheckin() {
  return (
    <div className={`${SCREEN}`}>
      <div className="mb-6 flex items-center justify-between">
        <span className="label-mono text-[9px]">Чек-ин · 15 секунд</span>
        <span className="font-mono text-[10px] text-fg-3">02 / 04</span>
      </div>
      <div className="mb-5 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < 2 ? '#6145c2' : 'rgba(180,160,255,0.14)' }} />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-lilac" style={{ background: 'rgba(97,69,194,0.16)' }}>
          <Icon name="future" size={22} />
        </span>
        <p className="text-[19px] font-light leading-snug text-fg-0">Насколько тревожно тебе думать о будущем прямо сейчас?</p>

        <div className="mt-9">
          <div className="relative h-1.5 w-full rounded-full" style={{ background: 'rgba(180,160,255,0.12)' }}>
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: '64%', background: 'linear-gradient(90deg,#6145c2,#d6c8ff)' }} />
            <span className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full" style={{ left: 'calc(64% - 10px)', background: '#f4f0ff', boxShadow: '0 0 14px rgba(97,69,194,0.8)' }} />
          </div>
          <div className="mt-2.5 flex justify-between font-mono text-[9px] text-fg-3">
            <span>спокойно</span>
            <span>сильно тревожно</span>
          </div>
        </div>
      </div>

      <button className="btn-primary-app w-full py-3 text-[13px]">Дальше</button>
    </div>
  )
}

/* ── Результат чек-ина: статус дня ───────────────────────────── */
export function ScreenResult({ state = 'Ясность' }) {
  const texts = {
    Ясность: 'Ум собран и спокоен. Хорошее окно, чтобы закрепить состояние практикой.',
    Поток: 'Ты в ресурсе. Используй это состояние — оно редкое и ценное.',
    Туман: 'Немного рассеянно. Короткая практика поможет вернуть фокус.',
    Шторм: 'Внутри неспокойно. Это нормально. Давай мягко выдохнем вместе.',
  }
  return (
    <div className={`${SCREEN} items-center justify-center text-center`}>
      <span
        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
        style={{ background: 'rgba(97,69,194,.15)', border: '1px solid rgba(180,160,255,.28)', boxShadow: '0 0 18px -4px rgba(97,69,194,.55)' }}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#d8c8ff', boxShadow: '0 0 8px #6145c2' }} />
        <span className="font-mono text-[10px] uppercase tracking-[.18em] text-lilac">Индекс состояния · 31/40</span>
      </span>

      <div className="my-7 text-lilac" style={{ filter: 'drop-shadow(0 0 26px rgba(97,69,194,0.7))' }}>
        <StateIcon state={state} size={96} />
      </div>
      <h3 className="text-[40px] font-extralight leading-none text-fg-0">{state}</h3>
      <p className="mt-5 max-w-[220px] text-[13px] leading-relaxed text-fg-2">{texts[state]}</p>

      <div className="mt-7 flex items-center gap-1.5 font-mono text-[10px] text-fg-3">
        <Icon name="chart" size={13} className="text-lilac" />
        <span style={{ color: '#9ad6b4' }}>+1.4</span> к прошлому замеру
      </div>
    </div>
  )
}

/* ── Глубокий анализ: 10 пунктов / 2 кластера ────────────────── */
export function ScreenDeep() {
  const rows = [
    'Я легко отвлекаюсь на тревожные мысли',
    'Мне трудно оставаться в моменте',
    'Я замечаю напряжение в теле',
    'Я успеваю заметить свои эмоции',
    'Я возвращаю внимание мягко',
  ]
  return (
    <div className={SCREEN}>
      <div className="mb-4 flex items-center justify-between">
        <span className="label-mono text-[9px]">Глубокий анализ</span>
        <span className="font-mono text-[10px] text-fg-3">07 / 10</span>
      </div>
      <div className="mb-4 flex gap-2">
        <span className="flex-1 rounded-lg px-2 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: '#b9a7f0', background: 'rgba(97,69,194,0.14)' }}>тревожность</span>
        <span className="flex-1 rounded-lg px-2 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: '#9ad6b4', background: 'rgba(120,200,150,0.1)' }}>осознанность</span>
      </div>
      <div className="flex-1 space-y-2.5">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl p-2.5" style={{ background: 'rgba(14,10,28,0.85)', boxShadow: 'inset 0 0 0 1px rgba(180,160,255,0.06)' }}>
            <p className="mb-2 text-[11px] leading-snug text-fg-1">{r}</p>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((d) => (
                <span key={d} className="h-1.5 flex-1 rounded-full" style={{ background: d <= (i % 4) ? '#6145c2' : 'rgba(180,160,255,0.12)' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Дашборд: календарь-трекер + страйк ──────────────────────── */
export function ScreenDashboard() {
  const days = Array.from({ length: 28 }, (_, i) => i)
  const done = new Set([1, 2, 3, 4, 8, 9, 10, 14, 15, 16, 17, 18, 22, 23, 24])
  return (
    <div className={SCREEN}>
      <p className="label-mono text-[9px]">Прогресс</p>
      <div className="mt-3 mb-4 flex items-end justify-between rounded-2xl p-4" style={{ background: 'rgba(97,69,194,0.12)', border: '1px solid rgba(180,160,255,0.14)' }}>
        <div>
          <p className="text-[34px] font-extralight leading-none text-fg-0">12</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-lilac">дней подряд</p>
        </div>
        <Icon name="pulse" size={30} className="text-lilac" />
      </div>

      <p className="mb-2 label-mono text-[9px]">Январь</p>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <span
            key={d}
            className="aspect-square rounded-md"
            style={{
              background: done.has(d) ? 'linear-gradient(180deg,#6145c2,#4a35a0)' : 'rgba(180,160,255,0.07)',
              boxShadow: done.has(d) ? '0 0 10px -2px rgba(97,69,194,0.7)' : 'none',
            }}
          />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(14,10,28,0.85)' }}>
        <span className="text-[11px] text-fg-1">Подписка «Всё включено»</span>
        <span className="font-mono text-[9px]" style={{ color: '#9ad6b4' }}>активна</span>
      </div>
    </div>
  )
}

/* ── Подписка: тарифы + ЮKassa внутри ────────────────────────── */
export function ScreenSubscription() {
  return (
    <div className={SCREEN}>
      <p className="label-mono text-[9px]">Подписка</p>
      <p className="mt-1 mb-4 text-[16px] font-light text-fg-0">Открой полный курс</p>

      <div className="space-y-2.5">
        <div className="rounded-2xl p-3.5" style={{ background: 'rgba(180,160,255,0.04)', border: '1px solid rgba(180,160,255,0.14)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-fg-0">Осознанность</span>
            <span className="font-mono text-[13px] text-fg-1">199 ₽<span className="text-fg-3"> / мес</span></span>
          </div>
          <p className="mt-1 font-mono text-[9px] text-fg-3">Системный курс · 7 дней бесплатно</p>
        </div>
        <div className="rounded-2xl p-3.5" style={{ background: 'rgba(97,69,194,0.16)', border: '1px solid rgba(180,160,255,0.3)', boxShadow: '0 0 28px -8px rgba(97,69,194,0.55)' }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-fg-0">
              Всё включено
              <span className="rounded-full px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-lilac" style={{ background: 'rgba(180,160,255,0.16)' }}>полный доступ</span>
            </span>
            <span className="font-mono text-[13px] text-fg-0">299 ₽<span className="text-fg-3"> / мес</span></span>
          </div>
          <p className="mt-1 font-mono text-[9px] text-fg-3">Курс + все авторские медитации</p>
        </div>
      </div>

      {/* ЮKassa-виджет, встроенный inline */}
      <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(8,6,16,0.7)', border: '1px solid rgba(180,160,255,0.1)' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-3">Оплата · ЮKassa</span>
          <Icon name="card" size={15} className="text-lilac" />
        </div>
        <div className="mb-2 h-7 rounded-md" style={{ background: 'rgba(180,160,255,0.07)' }} />
        <div className="flex gap-2">
          <div className="h-7 flex-1 rounded-md" style={{ background: 'rgba(180,160,255,0.07)' }} />
          <div className="h-7 w-12 rounded-md" style={{ background: 'rgba(180,160,255,0.07)' }} />
        </div>
      </div>

      <button className="btn-primary-app mt-3 w-full py-3 text-[13px]">Оформить за 299 ₽</button>
    </div>
  )
}

/* ── Онбординг (4 экрана, превью) ────────────────────────────── */
export function ScreenOnboarding() {
  return (
    <div className={`${SCREEN} items-center text-center`}>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative mb-7"><AmorphSphere size={150} /></div>
        <p className="label-mono text-[9px]">Шаг 03 · Голос проводника</p>
        <p className="mt-3 text-[19px] font-light leading-snug text-fg-0">Кто будет вести тебя в практике?</p>
        <div className="mt-6 flex gap-2.5">
          <span className="rounded-full px-4 py-2 text-[12px] text-fg-0" style={{ background: 'rgba(97,69,194,0.2)', border: '1px solid rgba(180,160,255,0.3)' }}>Женский</span>
          <span className="rounded-full px-4 py-2 text-[12px] text-fg-2" style={{ background: 'rgba(180,160,255,0.06)', border: '1px solid rgba(180,160,255,0.12)' }}>Мужской</span>
        </div>
      </div>
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 rounded-full" style={{ width: i === 2 ? 18 : 6, background: i === 2 ? '#6145c2' : 'rgba(180,160,255,0.2)' }} />
        ))}
      </div>
    </div>
  )
}

/* ── Авторизация по Email ────────────────────────────────────── */
export function ScreenAuth() {
  return (
    <div className={`${SCREEN} justify-center`}>
      <div className="relative mx-auto mb-7"><AmorphSphere size={110} /></div>
      <p className="text-center text-[18px] font-light text-fg-0">С возвращением</p>
      <p className="mt-1 mb-7 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-fg-3">Вход по Email</p>
      <div className="space-y-2.5">
        <div className="rounded-xl px-3.5 py-3 text-[12px] text-fg-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,160,255,0.16)' }}>you@email.com</div>
        <div className="rounded-xl px-3.5 py-3 text-[12px] text-fg-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,160,255,0.16)' }}>••••••••</div>
      </div>
      <button className="btn-primary-app mt-4 w-full py-3 text-[13px]">Войти</button>
      <p className="mt-4 text-center font-mono text-[10px] text-lilac">Восстановить пароль</p>
    </div>
  )
}
