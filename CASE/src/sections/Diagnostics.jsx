import { useState } from 'react'
import { Chapter, Split, Cap, Up, Statement } from '../components/story'
import { StateIcon } from '../components/AppScreens'
import LinearSlider from '../components/app/LinearSlider'
import KTGauge from '../components/app/KTGauge'
import Sparkline from '../components/app/Sparkline'
import CountUpApp from '../components/app/CountUpApp'
import Icon from '../lib/icons'

const CHECKIN_ICONS = [
  { name: 'reflect', label: 'рефлексия о прошлом' },
  { name: 'future', label: 'тревожность о будущем' },
  { name: 'worry', label: 'фоновое беспокойство' },
  { name: 'muscle', label: 'мышечное напряжение' },
]
const STATUSES = ['Шторм', 'Туман', 'Ясность', 'Поток']
const KT_HISTORY = [-3.5, -2, -0.5, 1.2, 0.8, 2.6, 4.2]

// Настоящий чек-ин-слайдер приложения (LinearSlider) — можно подвигать.
function RealCheckin() {
  const [val, setVal] = useState(6)
  return (
    <div className="case-card relative overflow-hidden p-7 sm:p-9">
      <div className="liquid-card-glow" style={{ opacity: 0.14 }} />
      <div className="relative">
        <div className="mb-6 flex items-center justify-between">
          <span className="label-mono">Чек-ин · вопрос 02 / 04</span>
          <span className="font-mono text-[11px] text-fg-3">15 сек</span>
        </div>
        <p className="mb-8 text-[18px] font-light leading-snug text-fg-0">
          Насколько тревожно тебе думать о будущем прямо сейчас?
        </p>
        <LinearSlider value={val} onChange={setVal} min={0} max={10} />
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3">
          реальный компонент LinearSlider — подвигай
        </p>
      </div>
    </div>
  )
}

// Настоящий KTGauge приложения.
function DeepVisual() {
  return (
    <div className="case-card relative overflow-hidden p-7 sm:p-10">
      <div className="liquid-card-glow" style={{ opacity: 0.14 }} />
      <p className="relative label-mono mb-6">Коэффициент трансформации</p>
      <div className="relative mx-auto max-w-sm">
        <KTGauge value={4.2} />
      </div>
      <p className="relative mt-6 text-center">
        <span className="font-mono text-[34px] text-fg-0">+<CountUpApp value={4.2} decimals={1} /></span>
        <span className="ml-2 font-mono text-[12px] uppercase tracking-[0.16em] text-fg-3">КТ</span>
      </p>
    </div>
  )
}

// Настоящие счётчики результата + Sparkline.
function ResultsVisual() {
  return (
    <div className="case-card relative overflow-hidden p-7 sm:p-9">
      <div className="liquid-card-glow" style={{ opacity: 0.14 }} />
      <p className="relative label-mono mb-6">Экран результатов</p>
      <div className="relative grid grid-cols-3 gap-4">
        {[
          { k: 'ИТ', v: 3.2, tone: '#e6a878' },
          { k: 'ИО', v: 6.8, tone: '#7be1a3' },
          { k: 'КТ', v: 4.2, tone: '#9eb5ff' },
        ].map((m, i) => (
          <div key={m.k} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(20,16,42,0.5)', border: '1px solid rgba(180,160,255,0.1)' }}>
            <p className="font-mono text-[28px] leading-none" style={{ color: m.tone }}><CountUpApp value={m.v} decimals={1} delay={i * 120} /></p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">{m.k}</p>
          </div>
        ))}
      </div>
      <div className="relative mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3">История КТ</span>
          <span className="font-mono text-[12px]" style={{ color: '#7be1a3' }}>+1.4 к прошлому замеру</span>
        </div>
        <Sparkline data={KT_HISTORY} height={64} />
      </div>
    </div>
  )
}

export default function Diagnostics() {
  return (
    <Chapter
      id="diagnostics"
      kicker="Ядро системы"
      title="Диагностика и замер состояний"
      intro="Два модуля диагностики превращают субъективные ощущения в измеримые цифры и персональную поддержку — это и отличает продукт от обычного плеера."
    >
      {/* Блок 01 — реальный чек-ин-слайдер */}
      <Split visual={<RealCheckin />} reverse>
        <span className="idx-chip">Блок 01</span>
        <h3 className="mt-3 text-[24px] font-light text-fg-0 sm:text-[30px]">Экспресс-чек-ин <span className="text-lilac">15 секунд</span></h3>
        <Cap className="mt-3 max-w-md">4 вопроса о прошлом, будущем, беспокойстве и теле. На выходе — статус дня с поддерживающим текстом.</Cap>
        <div className="mt-7 grid grid-cols-2 gap-3">
          {CHECKIN_ICONS.map((c) => (
            <div key={c.label} className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: 'rgba(20,16,42,0.5)', border: '1px solid rgba(180,160,255,0.1)' }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lilac" style={{ background: 'rgba(97,69,194,0.14)' }}><Icon name={c.name} size={18} /></span>
              <span className="text-[12.5px] leading-tight text-fg-2">{c.label}</span>
            </div>
          ))}
        </div>
      </Split>

      {/* Статусы — реальные иконки состояний приложения */}
      <Up delay={0.05}>
        <div className="mt-20">
          <p className="mb-7 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-lilac">Статусы результата</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATUSES.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-4 rounded-3xl p-8" style={{ background: 'rgba(16,12,32,0.6)', border: '1px solid rgba(180,160,255,0.12)' }}>
                <span className="text-lilac" style={{ filter: 'drop-shadow(0 0 22px rgba(97,69,194,0.65))' }}><StateIcon state={s} size={72} /></span>
                <span className="text-[19px] font-extralight text-fg-0">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </Up>

      {/* Блок 02 — реальный KTGauge */}
      <div className="mt-28">
        <Split visual={<DeepVisual />}>
          <span className="idx-chip">Блок 02</span>
          <h3 className="mt-3 text-[24px] font-light text-fg-0 sm:text-[30px]">Глубокий анализ</h3>
          <Cap className="mt-3 max-w-md">10 пунктов в двух кластерах — тревожность и осознанность. Алгоритм считает коэффициент трансформации.</Cap>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: '#e6a878', background: 'rgba(230,168,120,0.1)' }}>уровень тревожности</span>
            <span className="rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: '#7be1a3', background: 'rgba(123,225,163,0.1)' }}>глубина осознанности</span>
          </div>
        </Split>
      </div>

      {/* Блок 03 + 04 — реальные счётчики и Sparkline */}
      <div className="mt-28">
        <Split visual={<ResultsVisual />} reverse>
          <span className="idx-chip">Блок 03 · Результаты</span>
          <h3 className="mt-3 text-[22px] font-light text-fg-0 sm:text-[26px]">Счётчики, дельта и микро-графики.</h3>
          <Cap className="mt-3 max-w-md">Реальные `CountUp` и `Sparkline` из приложения: значения доезжают, история КТ рисуется линией.</Cap>
          <div className="mt-9 flex items-start gap-4 rounded-2xl p-5" style={{ background: 'rgba(20,16,42,0.5)', border: '1px solid rgba(180,160,255,0.1)' }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lilac" style={{ background: 'rgba(97,69,194,0.14)' }}><Icon name="formula" size={20} /></span>
            <div>
              <p className="text-[15px] text-fg-0">Корректная математическая логика <span className="idx-chip">· Блок 04</span></p>
              <Cap size="sm" className="mt-1">Вопросы с инвертированной семантикой считаются верно — высокая валидность диагностики.</Cap>
            </div>
          </div>
        </Split>
      </div>

      <div className="mt-28">
        <Statement mark="Почему это важно · Retention">
          Именно замеры держат Retention. Человек возвращается не ради аудио, а ради мониторинга
          личного климата.
        </Statement>
      </div>
    </Chapter>
  )
}
