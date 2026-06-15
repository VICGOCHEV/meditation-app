import AmorphSphere from './AmorphSphere'
import Icon from '../lib/icons'
import ShinyButton from './app/ShinyButton'
import KTGauge from './app/KTGauge'
import Sparkline from './app/Sparkline'

/* ─────────────────────────────────────────────────────────────
   Экраны-реплики приложения — собраны 1:1 по исходникам
   application/src/pages (Home, Player, Onboarding, Checkin,
   DeepAnalysis, Profile). Те же тексты, иерархия, компоненты.
   ───────────────────────────────────────────────────────────── */

const SCREEN = 'flex h-full flex-col px-4 pt-9 pb-4 text-fg-1'

// Иконки состояний — 1:1 из Checkin/index.jsx.
export function StateIcon({ state, size = 88 }) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (state === 'Шторм')
    return (<svg {...common}><path d="M14 30c-3 0-6-2-6-6s2-7 7-7c1-5 6-9 12-9 7 0 12 5 12 11 4 0 8 4 8 8s-3 7-8 7H14z" fill="rgba(216,200,255,.10)" /><path d="M22 42l-5 12M32 42l-3 8M42 42l-5 12" stroke="#d8c8ff" strokeWidth={1.7} /></svg>)
  if (state === 'Ясность')
    return (<svg {...common}><circle cx="32" cy="32" r="10" fill="rgba(216,200,255,.18)" /><path d="M32 8v8M32 48v8M8 32h8M48 32h8M14 14l6 6M44 44l6 6M14 50l6-6M44 20l6-6" stroke="#d8c8ff" /></svg>)
  if (state === 'Поток')
    return (<svg {...common}><path d="M8 34c8-8 16-8 24 0s16 8 24 0M8 22c8-8 16-8 24 0s16 8 24 0M8 46c8-8 16-8 24 0s16 8 24 0" /></svg>)
  return (<svg {...common}><path d="M18 38c-5 0-9-3-9-8s4-8 9-8c0-5 5-10 11-10 7 0 11 5 12 11 5 0 9 3 9 8s-4 7-9 7H18z" fill="rgba(216,200,255,.18)" /></svg>)
}

function SunIcon({ size = 18 }) {
  return (<svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M4.9 19.1l2-2M17.1 6.9l2-2" /></svg>)
}
function LockIcon({ size = 18 }) {
  return (<svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>)
}

// Карточка практики — реплика ui/Card (liquid-glass, солнце/замок, неон-play).
function PracticeCard({ title, duration, locked, completed, lockedLabel = 'Скоро' }) {
  return (
    <div className={`relative isolate flex min-h-[136px] flex-col justify-between overflow-hidden rounded-lg p-3.5 ${locked ? 'opacity-75' : ''}`}
      style={{ boxShadow: '0 0 24px -8px rgba(97,69,194,.5), inset 0 0 0 1px rgba(180,160,255,.05)' }}>
      <span className="liquid-card-glow" />
      <span className="liquid-card-border" />
      <div className="relative z-10 flex items-start justify-between">
        <span className={locked ? 'text-fg-3' : 'text-lilac'} style={locked ? undefined : { filter: 'drop-shadow(0 0 6px #6145c2)' }}>
          {locked ? <LockIcon size={20} /> : <SunIcon size={20} />}
        </span>
        {completed && (
          <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: 'oklch(0.55 0.2 160 / 0.35)', border: '1px solid oklch(0.72 0.13 160 / 0.3)' }}>
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
          </span>
        )}
      </div>
      <div className="relative z-10">
        <h4 className={`text-[12.5px] font-medium leading-tight ${locked ? 'text-fg-2' : 'text-fg-0'}`}>{title}</h4>
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-[11px] ${locked ? 'text-fg-3' : 'text-lilac'}`}>{duration}</span>
          {locked ? (
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-fg-3">{lockedLabel}</span>
          ) : (
            <span className="grid h-7 w-7 place-items-center rounded-full text-lilac" style={{ border: '1.5px solid #6145c2', boxShadow: '0 0 14px rgba(97,69,194,.9), inset 0 0 8px rgba(97,69,194,.35)' }}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHead({ eyebrow, title, sub, chip }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-lilac" style={{ boxShadow: '0 0 10px rgba(180,160,255,0.7)' }} />
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-lilac/80">{eyebrow}</span>
        </div>
        {chip && <span className="rounded-full border border-lilac/30 bg-lilac/10 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-lilac">{chip}</span>}
      </div>
      <h2 className="mt-2 font-serif text-[19px] leading-tight text-fg-0">{title}</h2>
      {sub && <p className="mt-1 text-[10.5px] leading-snug text-fg-2">{sub}</p>}
      <div className="mt-2.5 h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(180,160,255,0.5), rgba(180,160,255,0.1) 40%, transparent)' }} />
    </div>
  )
}

/* ── Главный экран (Home) ────────────────────────────────────── */
export function ScreenHome() {
  return (
    <div className={`${SCREEN} overflow-hidden`}>
      <header className="mb-3 flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-full text-lilac" style={{ background: 'rgba(17,12,32,0.6)', boxShadow: '0 0 22px -4px rgba(97,69,194,.45)' }}><Icon name="settings" size={16} /></span>
        <span className="grid h-9 w-9 place-items-center rounded-full text-lilac" style={{ background: 'rgba(17,12,32,0.6)', boxShadow: '0 0 22px -4px rgba(97,69,194,.45)' }}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
        </span>
      </header>

      <div className="mb-4 flex items-center justify-between rounded-2xl px-3.5 py-3" style={{ background: '#110c20', border: '1px solid rgba(180,160,255,0.09)' }}>
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-lilac/80">В моменте</p>
          <p className="mt-0.5 text-[11px] text-lilac/80">Сейчас расслабляются</p>
        </div>
        <div className="text-right"><span className="font-serif text-[26px] text-fg-0">248</span><p className="text-[10px] text-lilac">человек</p></div>
      </div>

      <SectionHead eyebrow="01 · СТАРТ" title="Точка тишины" sub="Бесплатные практики расслабления." chip="Бесплатно · 4" />
      <div className="grid grid-cols-2 gap-2.5">
        <PracticeCard title="Утреннее погружение" duration="7 мин" completed />
        <PracticeCard title="Обращение к себе" duration="10 мин" />
      </div>

      <div className="mt-4">
        <SectionHead eyebrow="02 · СИСТЕМА" title="Пароль от жизни" sub="Шесть практик осознанности." chip="По подписке" />
        <div className="grid grid-cols-2 gap-2.5">
          <PracticeCard title="Путь к себе" duration="15 мин" locked lockedLabel="Заблокировано" />
          <PracticeCard title="Внутреннее тело" duration="20 мин" locked />
        </div>
      </div>
    </div>
  )
}

/* ── Плеер (AudioPlayer) ─────────────────────────────────────── */
export function ScreenPlayer({ title = 'Внутреннее тело', block = 'ОСОЗНАННОСТЬ', duration = '20:00' }) {
  return (
    <div className="flex h-full flex-col px-4 pt-9 pb-4 text-fg-1">
      <button className="flex h-9 w-9 items-center justify-center rounded-full border text-fg-0" style={{ borderColor: 'rgba(180,160,255,0.16)', background: 'rgba(255,255,255,0.05)' }} aria-label="Назад">←</button>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-between py-4">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="aspect-square w-full max-w-[230px]"><AmorphSphere /></div></div>
        <h1 className="relative z-10 px-4 text-center font-serif text-[22px] leading-tight text-fg-0">{title}</h1>
        <button className="relative z-10 grid h-[110px] w-[110px] place-items-center rounded-full text-lilac" style={{ border: '2px solid #6145c2', boxShadow: '0 0 46px rgba(97,69,194,.95), 0 0 90px rgba(97,69,194,.5), inset 0 0 30px rgba(97,69,194,.35)' }} aria-label="Играть">
          <svg viewBox="0 0 24 24" className="h-12 w-12" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </button>
        <div className="relative z-10 text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-lilac">{block}</p>
          <p className="mt-1 text-[13px] text-fg-1">{duration}</p>
        </div>
      </div>

      <div className="mt-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full" style={{ width: '38%', background: 'linear-gradient(90deg, oklch(0.62 0.18 290), oklch(0.78 0.14 310), oklch(0.82 0.12 280))', boxShadow: '0 0 14px rgba(180,160,255,.85)' }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-fg-3"><span>07:36</span><span>{duration}</span></div>
      </div>

      <div className="mt-3 grid grid-cols-2 items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-fg-3">Голос</span>
          <div className="flex h-10 items-center rounded-full border p-1" style={{ borderColor: 'rgba(180,160,255,0.16)', background: 'rgba(255,255,255,0.05)' }}>
            <span className="grid h-8 w-9 place-items-center rounded-full bg-lilac/25 text-[12px] font-medium text-fg-0">М</span>
            <span className="grid h-8 w-9 place-items-center rounded-full text-[12px] text-fg-2">Ж</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-fg-3">Музыка</span>
          <div className="flex h-10 items-center gap-2 rounded-full border px-3" style={{ borderColor: 'rgba(180,160,255,0.16)', background: 'rgba(255,255,255,0.05)' }}>
            {[1, 2, 3].map((m) => <span key={m} className="h-2.5 w-2.5 rounded-full" style={{ background: m === 2 ? '#d6c8ff' : 'rgba(180,160,255,0.25)', boxShadow: m === 2 ? '0 0 10px #d6c8ff' : 'none' }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Онбординг · шаг 01 (Пролог) ─────────────────────────────── */
export function ScreenOnboarding() {
  return (
    <div className={SCREEN}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-5 bg-lilac' : 'w-1.5 bg-white/20'}`} />)}
        </div>
        <span className="text-[10px] text-fg-3">Пропустить</span>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-lilac/80">Пролог · 01</p>
        <h1 className="mt-4 font-serif text-[34px] leading-[1.02] tracking-tight text-fg-0">
          <span className="block font-extralight">Твой путь</span>
          <span className="block font-extralight text-fg-1">к внутренней</span>
          <span className="block pl-8 font-medium">тишине<span className="text-violet">.</span></span>
        </h1>
        <p className="mt-7 max-w-[28ch] pl-8 text-[12px] leading-relaxed text-fg-2">Мягкие практики расслабления и осознанности. Открывай новые уровни по мере роста.</p>
      </div>

      <ShinyButton fullWidth>Начать</ShinyButton>
    </div>
  )
}

/* ── Результат чек-ина (Индекс состояния) ────────────────────── */
export function ScreenResult({ state = 'Ясность' }) {
  const texts = {
    Ясность: 'Ум собран и спокоен. Хорошее окно, чтобы закрепить состояние практикой.',
    Поток: 'Ты в ресурсе. Используй это состояние — оно редкое и ценное.',
    Туман: 'Немного рассеянно. Короткая практика поможет вернуть фокус.',
    Шторм: 'Внутри неспокойно. Это нормально. Давай мягко выдохнем вместе.',
  }
  return (
    <div className={`${SCREEN} items-center justify-center text-center`}>
      <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5" style={{ background: 'rgba(97,69,194,.15)', border: '1px solid rgba(180,160,255,.28)', boxShadow: '0 0 18px -4px rgba(97,69,194,.55)' }}>
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#d8c8ff', boxShadow: '0 0 8px #6145c2' }} />
        <span className="font-mono text-[10px] uppercase tracking-[.18em] text-lilac">Индекс состояния · 31/40</span>
      </span>
      <h1 className="mt-7 font-serif text-[52px] font-light leading-none text-fg-0">{state}</h1>
      <div className="mt-7 text-lilac" style={{ filter: 'drop-shadow(0 0 26px rgba(97,69,194,0.7))' }}><StateIcon state={state} size={90} /></div>
      <p className="mt-8 max-w-[230px] text-[13px] leading-relaxed text-fg-1">{texts[state]}</p>
      <div className="mt-8 w-full"><ShinyButton fullWidth>Начать практику</ShinyButton></div>
    </div>
  )
}

/* ── Глубокий анализ · КТ (DeepAnalysis result) ──────────────── */
export function ScreenKT() {
  return (
    <div className={SCREEN}>
      <button className="flex h-9 w-9 items-center justify-center rounded-full border text-fg-0" style={{ borderColor: 'rgba(180,160,255,0.16)', background: 'rgba(255,255,255,0.05)' }} aria-label="Назад">←</button>
      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-lilac/80">Результат</p>
      <h1 className="mt-1 font-serif text-[24px] text-fg-0">Прогресс за 4 дня</h1>

      <div className="mt-5 rounded-2xl p-4" style={{ background: '#110c20', border: '1px solid rgba(180,160,255,0.09)' }}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-lilac/80">Коэффициент трансформации</span>
          <span className="rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em]" style={{ background: 'rgba(123,225,163,.16)', color: '#9ce8b9', border: '1px solid rgba(180,160,255,.18)' }}>↑ +2.1 vs прошлый</span>
        </div>
        <p className="mt-2 font-serif text-[44px] font-light leading-none text-fg-0">+6.4</p>
        <div className="mt-3"><KTGauge value={6.4} /></div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {[['ИТ · тревога', '−4.2', '#9ce8b9'], ['ИО · осознанность', '+5.8', '#d6c8ff']].map(([t, v, c]) => (
          <div key={t} className="rounded-xl p-3" style={{ background: 'rgba(14,10,28,0.85)', border: '1px solid rgba(180,160,255,0.08)' }}>
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-3">{t}</p>
            <p className="mt-1 font-mono text-[20px]" style={{ color: c }}>{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3"><Sparkline data={[-3, -1, 0, 2, 3, 5, 6.4]} height={44} /></div>
    </div>
  )
}

/* ── Дашборд / Профиль (Profile) ─────────────────────────────── */
export function ScreenDashboard() {
  const done = new Set([1, 2, 3, 4, 8, 9, 10, 14, 15, 16, 17, 18, 22, 23, 24])
  return (
    <div className={SCREEN}>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full text-[16px] text-fg-0" style={{ background: 'linear-gradient(140deg,#6145c2,#9a8cf0)', boxShadow: '0 0 22px -6px rgba(97,69,194,0.8)' }}>М</span>
        <div><p className="font-serif text-[18px] text-fg-0">Мария</p><p className="font-mono text-[9px] text-lilac">Всё включено · активна</p></div>
      </div>

      <div className="mt-4 flex items-end justify-between rounded-2xl p-3.5" style={{ background: 'rgba(97,69,194,0.12)', border: '1px solid rgba(180,160,255,0.14)' }}>
        <div><p className="font-serif text-[30px] leading-none text-fg-0">12</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-lilac">дней подряд</p></div>
        <Icon name="pulse" size={26} className="text-lilac" />
      </div>

      <p className="mt-4 mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">Трекер · Июнь</p>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }, (_, i) => i).map((d) => (
          <span key={d} className="aspect-square rounded-md" style={{ background: done.has(d) ? 'linear-gradient(180deg,#6145c2,#4a35a0)' : 'rgba(180,160,255,0.07)', boxShadow: done.has(d) ? '0 0 10px -2px rgba(97,69,194,0.7)' : 'none' }} />
        ))}
      </div>
      <div className="mt-3"><Sparkline data={[-2, 0, 1, 3, 2, 5, 4, 6]} height={40} /></div>
    </div>
  )
}

/* ── Подписка (Subscription) ─────────────────────────────────── */
export function ScreenSubscription() {
  return (
    <div className={SCREEN}>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">Подписка</p>
      <p className="mt-1 mb-4 font-serif text-[18px] text-fg-0">Открой полный курс</p>
      <div className="space-y-2.5">
        <div className="rounded-2xl p-3.5" style={{ background: 'rgba(180,160,255,0.04)', border: '1px solid rgba(180,160,255,0.14)' }}>
          <div className="flex items-center justify-between"><span className="text-[13px] text-fg-0">Осознанность</span><span className="font-mono text-[13px] text-fg-1">199 ₽<span className="text-fg-3"> /мес</span></span></div>
        </div>
        <div className="rounded-2xl p-3.5" style={{ background: 'rgba(97,69,194,0.16)', border: '1px solid rgba(180,160,255,0.3)', boxShadow: '0 0 28px -8px rgba(97,69,194,0.55)' }}>
          <div className="flex items-center justify-between"><span className="text-[13px] text-fg-0">Всё включено</span><span className="font-mono text-[13px] text-fg-0">299 ₽<span className="text-fg-3"> /мес</span></span></div>
        </div>
      </div>
      <div className="mt-auto"><ShinyButton fullWidth>Оформить за 299 ₽</ShinyButton></div>
    </div>
  )
}
