import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sec, Title, Lead } from '../components/caseui'
import { Up } from '../components/story'
import Card from '../components/app/Card'
import Button from '../components/app/Button'
import LinearSlider from '../components/app/LinearSlider'
import { demoTrackerDays } from '../components/RealUI'
import { monthGrid, todayISO } from '../lib/dateHelpers'
import Icon from '../lib/icons'

// Visual Foundation = дизайн-система из Design System.html (реальные компоненты).

function DSHead({ num, title, tail }) {
  return (
    <Up>
      <div className="mb-9">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-lilac">{num}</span>
        <h3 className="mt-3 font-display text-[clamp(1.6rem,3.6vw,2.4rem)] font-extralight leading-[1.05] text-fg-0">{title}</h3>
        {tail && <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-fg-3">{tail}</p>}
      </div>
    </Up>
  )
}
function Panel({ label, children, className = '' }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`} style={{ background: '#110c20', border: '1px solid rgba(180,160,255,0.09)' }}>
      {label && <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">{label}</p>}
      {children}
    </div>
  )
}
function Swatch({ bg, tag, name, val, dark }) {
  return (
    <div>
      <div className="relative flex aspect-[1.7] items-start rounded-xl p-2.5" style={{ background: bg, border: '1px solid rgba(180,160,255,0.12)' }}>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: dark ? 'rgba(0,0,0,0.5)' : 'rgba(244,240,255,0.7)' }}>{tag}</span>
      </div>
      <div className="mt-2"><div className="text-[12px] text-fg-1">{name}</div><div className="font-mono text-[10px] text-fg-3">{val}</div></div>
    </div>
  )
}
const COLORS = {
  bg: [['#0a0714', 'bg-0', 'Night', '#0A0714'], ['#110c20', 'bg-1', 'Deep Indigo', '#110C20'], ['#1a1330', 'bg-2', 'Raised', '#1A1330'], ['#231a42', 'bg-3', 'Overlay', '#231A42']],
  fg: [['#f4f0ff', 'fg-0', 'Moonlight', '#F4F0FF', true], ['#d9d2f0', 'fg-1', 'Body', '#D9D2F0', true], ['#a99ecb', 'fg-2', 'Muted', '#A99ECB'], ['#6e6290', 'fg-3', 'Subtle', '#6E6290']],
  acc: [['oklch(0.66 0.18 300)', 'primary', 'Violet', 'oklch(.66 .18 300)'], ['oklch(0.60 0.17 278)', 'secondary', 'Indigo', 'oklch(.60 .17 278)'], ['oklch(0.78 0.12 312)', 'soft', 'Lilac', 'oklch(.78 .12 312)', true], ['oklch(0.78 0.14 60)', 'warm', 'Ember', 'oklch(.78 .14 60)', true]],
}
const TYPE = [
  { l: 'Display', s: 'Возвращайся к себе', spec: 'Manrope · 300\n64 / 64 / -0.02', style: { fontWeight: 300, fontSize: 'clamp(34px,5vw,60px)', lineHeight: 1, letterSpacing: '-0.02em' } },
  { l: 'H1', s: 'Твой путь к внутреннему покою', spec: 'Manrope · 400\n40 / 42 / -0.02', style: { fontWeight: 400, fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.05, letterSpacing: '-0.02em' } },
  { l: 'H2', s: 'Расслабление и осознанность', spec: 'Manrope · 400\n28 / 32', style: { fontWeight: 400, fontSize: 'clamp(20px,2.6vw,28px)', lineHeight: 1.15 } },
  { l: 'H3 · section', s: 'Быстрый доступ', spec: 'Manrope · 500\n20 / 28', style: { fontWeight: 500, fontSize: 20 } },
  { l: 'Body L', s: 'Каждые три дня открывается новая практика. Осознанность нельзя поторопить.', spec: 'Manrope · 400\n17 / 27', style: { fontSize: 17, lineHeight: 1.6, color: '#d9d2f0' } },
  { l: 'Body', s: 'Оцени свой текущий уровень фонового беспокойства. 0 — спокойствие, 10 — тревога.', spec: 'Manrope · 400\n15 / 23', style: { fontSize: 15, lineHeight: 1.55 } },
  { l: 'Caption', s: '7 мин · Начальный уровень', spec: 'Manrope · 400\n13 / 18', style: { fontSize: 13, color: '#a99ecb' } },
  { l: 'Label · mono', s: 'PRACTICE · 00:07:15', spec: 'JetBrains Mono · 500\n11 / .22', mono: true, style: { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6e6290' } },
]

// Трекер 1:1 из приложения; дни загораются по одному (зацикленно).
function AnimatedTracker() {
  const now = new Date()
  const days = monthGrid(now.getFullYear(), now.getMonth())
  const doneArr = demoTrackerDays(15).map((d) => d.slice(0, 10)).sort()
  const order = new Map(doneArr.map((iso, i) => [iso, i]))
  const today = todayISO()
  const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

  const ref = useRef(null)
  const [lit, setLit] = useState(0)
  const [run, setRun] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setRun(e.isIntersecting), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!run) return
    const total = doneArr.length
    const id = setInterval(() => setLit((l) => (l >= total + 6 ? 0 : l + 1)), 240)
    return () => clearInterval(id)
  }, [run, doneArr.length])

  return (
    <div ref={ref} className="panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl text-fg-0">{MONTHS[now.getMonth()]} {now.getFullYear()}</h3>
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={{ background: 'oklch(0.78 0.14 60 / 0.12)', borderColor: 'oklch(0.78 0.14 60 / 0.3)', color: 'oklch(0.78 0.14 60)' }}>12 дн. подряд</div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {DOW.map((d) => <div key={d} className="pb-2 pt-1 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-fg-4">{d}</div>)}
        {days.map(({ iso, day, inMonth }) => {
          const isDone = order.has(iso)
          const isLit = isDone && order.get(iso) < lit
          const isToday = iso === today
          return (
            <motion.div key={iso}
              className={['relative flex aspect-square items-center justify-center rounded-lg text-[13px]', inMonth ? 'text-fg-2' : 'text-fg-4', isToday && !isLit ? 'border border-lilac text-fg-0' : ''].join(' ')}
              animate={isLit ? { scale: [0.6, 1.12, 1], opacity: 1 } : { scale: 1, opacity: isDone ? 0.18 : 1 }}
              transition={{ duration: 0.42, ease: [0.22, 0.9, 0.3, 1] }}
              style={isLit ? { background: 'linear-gradient(135deg, oklch(0.50 0.2 290), oklch(0.65 0.17 310))', color: '#fff', boxShadow: '0 4px 20px -4px oklch(0.55 0.2 290 / 0.55)' } : undefined}
            >{day}</motion.div>
          )
        })}
      </div>
    </div>
  )
}

function Tabs({ items, on }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full p-1" style={{ background: 'rgba(26,19,48,0.7)', border: '1px solid rgba(180,160,255,0.12)' }}>
      {items.map((t) => (
        <span key={t} className="rounded-full px-3.5 py-1.5 text-[12px]" style={t === on ? { background: 'rgba(180,160,255,0.22)', color: '#f4f0ff' } : { color: '#a99ecb' }}>{t}</span>
      ))}
    </div>
  )
}

export default function Foundation() {
  const [val, setVal] = useState(7)
  return (
    <Sec id="foundation" num="04" tag="Visual Foundation" ghost="04" wide>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <Title className="text-[clamp(2.4rem,7vw,5rem)]">Visual<br /><span className="font-medium">Foundation</span></Title>
        <Lead className="max-w-md lg:pb-3">Дизайн-система мобильного приложения медитаций: ночное небо, мягкие туманности, один акцент. Ниже — её код 1:1.</Lead>
      </div>

      {/* 01 / Colors */}
      <div className="mt-20">
        <DSHead num="01 / Colors" title="Палитра" tail="Ночное небо — восемь оттенков индиго-фиолетового. Один акцент (лиловый), один тёплый (янтарь, только для streak)." />
        <div className="space-y-8">
          {[['Background · canvas', COLORS.bg], ['Foreground · text', COLORS.fg], ['Accents — single hue family', COLORS.acc]].map(([label, group]) => (
            <div key={label}>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">{label}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {group.map(([bg, tag, name, val2, dark]) => <Swatch key={tag} bg={bg} tag={tag} name={name} val={val2} dark={dark} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 02 / Type */}
      <div className="mt-24">
        <DSHead num="02 / Type" title="Типографика" tail="Manrope везде — заголовки, body, UI. Светлые начертания для крупных H1, 500 для UI. JetBrains Mono — только цифры, eyebrows и спек-метки." />
        <Panel>
          {TYPE.map((t, i) => (
            <div key={t.l} className="grid grid-cols-1 items-center gap-3 py-5 sm:grid-cols-[90px_1fr_auto] sm:gap-6" style={i ? { borderTop: '1px solid rgba(180,160,255,0.045)' } : undefined}>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3">{t.l}</span>
              <span className={t.mono ? 'mono' : ''} style={{ color: '#f4f0ff', ...t.style }}>{t.s}</span>
              <span className="whitespace-pre font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-4 sm:text-right">{t.spec}</span>
            </div>
          ))}
        </Panel>
      </div>

      {/* 03 / Buttons */}
      <div className="mt-24">
        <DSHead num="03 / Components — Buttons" title="Кнопки" tail="Pill-форма. Primary — фиолетовый с бегущей conic-обводкой. Secondary — полупрозрачный. Ghost — только текст." />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Panel label="Primary"><div className="flex flex-col gap-3"><Button fullWidth>Начать практику</Button><Button fullWidth>Получить ключи</Button></div></Panel>
          <Panel label="Secondary"><div className="flex flex-col gap-3"><Button variant="secondary" fullWidth>Продолжить позже</Button><Button variant="secondary" fullWidth>Все практики</Button><Button variant="secondary" fullWidth size="sm">Отмена</Button></div></Panel>
          <Panel label="Ghost / icon">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost">Забыл пароль?</Button>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lilac" style={{ background: 'rgba(97,69,194,0.16)' }}><Icon name="settings" size={18} /></span>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lilac" style={{ border: '1.5px solid #6145c2', boxShadow: '0 0 16px rgba(97,69,194,.8)' }}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="rounded-full px-3 py-1.5 font-mono text-[10px] text-fg-1" style={{ background: 'rgba(180,160,255,0.08)', border: '1px solid rgba(180,160,255,0.16)' }}>7 мин</span>
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[10px]" style={{ background: 'rgba(123,225,163,0.16)', color: '#9ce8b9' }}><Icon name="check" size={11} /> Активна</span>
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[10px] text-lilac" style={{ background: 'rgba(97,69,194,0.16)' }}><Icon name="gift" size={11} /> Бонус</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* 04 / Cards */}
      <div className="mt-24">
        <DSHead num="04 / Components — Cards" title="Карточки практик" tail="Liquid-glass поверхность, мягкое свечение и вращающаяся conic-обводка. Солнце — доступно, замок — по подписке." />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card title="Утреннее погружение" duration="7 мин" completed />
          <Card title="Обращение к себе" duration="10 мин" />
          <Card title="Путь к себе" duration="15 мин" locked lockedLabel="Заблокировано" />
          <Card title="Авторская · #1" duration="22 мин" price="99 ₽" />
        </div>
      </div>

      {/* 05 / Slider */}
      <div className="mt-24">
        <DSHead num="05 / Slider" title="Слайдер чекина" tail="Перетаскивается, мягкая пружина, крупная цифра состояния — основной инструмент ежедневного замера." />
        <Up><div className="mx-auto max-w-2xl"><Panel><LinearSlider value={val} onChange={setVal} min={0} max={10} /></Panel></div></Up>
      </div>

      {/* 06 / Tracker */}
      <div className="mt-24">
        <DSHead num="06 / Tracker" title="Трекер-календарь" tail="1:1 из приложения. Дни прослушивания загораются по одному; streak-бейдж янтарём — единственный тёплый акцент." />
        <Up><div className="mx-auto max-w-md"><AnimatedTracker /></div></Up>
      </div>

      {/* 07 / Forms */}
      <div className="mt-24">
        <DSHead num="07 / Forms" title="Поля и табы" tail="Поля ввода, сегмент-контролы и табы фильтров." />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <Panel label="Auth form">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">Email или телефон</label>
                <div className="rounded-[10px] px-3.5 py-3 text-[14px] text-fg-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,160,255,0.16)' }}>anna@example.ru</div>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">Пароль</label>
                <div className="rounded-[10px] px-3.5 py-3 text-[14px] text-fg-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,160,255,0.16)' }}>••••••••••</div>
                <p className="mt-1.5 font-mono text-[10px] text-fg-4">Минимум 8 символов</p>
              </div>
              <Button fullWidth>Присоединиться</Button>
              <div className="text-center"><Button variant="ghost">Забыл пароль?</Button></div>
            </div>
          </Panel>
          <Panel label="Tabs & segmented">
            <div className="flex flex-col gap-5">
              {[
                ['Фильтр блоков', ['Расслабление', 'Осознанность', 'Авторские'], 'Расслабление'],
                ['Длительность', ['Всё', '5 мин', '10 мин', '30+ мин'], '5 мин'],
                ['Голос', ['Мужской', 'Женский'], 'Мужской'],
                ['Фон', ['Лес', 'Вода', 'Огонь', 'Тишина'], 'Вода'],
              ].map(([cap, items, on]) => (
                <div key={cap}>
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-4">{cap}</p>
                  <Tabs items={items} on={on} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Sec>
  )
}
