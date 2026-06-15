import { motion } from 'framer-motion'
import { Chapter, Split, Cap, Up } from '../components/story'
import LandingPlate from '../components/LandingPlate'
import Icon from '../lib/icons'

const PATH = [
  { name: 'enter', label: 'вход' },
  { name: 'checkin', label: 'замер состояния' },
  { name: 'reflect', label: 'интерпретация' },
  { name: 'play', label: 'практика' },
  { name: 'chart', label: 'динамика прогресса' },
]

const CONCEPTS = [
  { n: '01', sub: 'Метод', badge: 'Цифры + слова', title: 'Измерять, а не уговаривать.', text: 'Быстрый замер состояния и честная интерпретация — вместо мотивационных лозунгов.' },
  { n: '02', sub: 'Атмосфера', badge: 'Тёмная сцена', title: 'Интерфейс как тишина.', text: 'Тёмная сцена, живой дым, аморфная сфера. Палитра синхронна со временем суток.' },
  { n: '03', sub: 'Доступ', badge: 'Подписка', title: 'Мягкий онбординг.', text: 'Базовые практики — бесплатно навсегда. Курс и авторское — по подписке внутри интерфейса.' },
  { n: '04', sub: 'Дистрибуция', badge: 'Web · TG · VK', title: 'В экосистеме пользователя.', text: 'Web, Telegram Mini App и VK Mini App. Без скачивания и установки.' },
]

function PathVisual() {
  return (
    <div className="case-card relative overflow-hidden p-7 sm:p-9">
      <div className="liquid-card-glow" style={{ opacity: 0.18 }} />
      <p className="label-mono relative mb-8">Схема пользовательского пути</p>
      <ol className="relative space-y-1">
        <span className="absolute left-[23px] top-4 bottom-4 w-px" style={{ background: 'linear-gradient(180deg, rgba(180,160,255,0.35), transparent)' }} />
        {PATH.map((p, i) => (
          <motion.li
            key={p.label}
            className="relative flex items-center gap-5 py-3"
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <span className="z-10 flex h-12 w-12 items-center justify-center rounded-2xl text-lilac" style={{ background: 'rgba(24,19,48,0.95)', border: '1px solid rgba(180,160,255,0.22)' }}>
              <Icon name={p.name} size={20} />
            </span>
            <span className="text-[16px] text-fg-1">{p.label}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

export default function Architecture() {
  return (
    <Chapter id="architecture" index="01" kicker="Архитектура и идея" title="Архитектура и фундаментальная идея продукта">
      <Split visual={<PathVisual />}>
        <div className="space-y-10">
          <div>
            <span className="idx-chip">Что это за продукт</span>
            <h3 className="mt-3 text-[22px] font-light leading-snug text-fg-0 sm:text-[26px]">Не «таймер для медитации», а интерактивный проводник.</h3>
            <Cap className="mt-3 max-w-md">Измеряет внутреннее состояние, говорит на человеческом языке и показывает динамику ментального шума от недели к неделе.</Cap>
          </div>
          <div>
            <span className="idx-chip">Для кого</span>
            <h3 className="mt-3 text-[22px] font-light leading-snug text-fg-0 sm:text-[26px]">Системность и честная обратная связь в практике.</h3>
            <Cap className="mt-3 max-w-md">А для автора методики — инструмент масштабирования экспертизы на тысячи людей без потери тепла.</Cap>
          </div>
        </div>
      </Split>

      <div className="mt-28">
        <Up><span className="font-mono text-[11px] uppercase tracking-[0.22em] text-lilac">Стратегические концепты продукта</span></Up>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2" style={{ perspective: 1200 }}>
          {CONCEPTS.map((c, i) => (
            <motion.div
              key={c.n}
              initial={{ opacity: 0, y: 40, rotateX: 12, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              viewport={{ once: true, margin: '-12% 0px' }}
              transition={{ duration: 0.9, ease: [0.22, 0.8, 0.36, 1], delay: (i % 2) * 0.12 }}
            >
              <motion.div animate={{ y: [0, i % 2 ? 7 : -7, 0] }} transition={{ duration: 7 + i, ease: 'easeInOut', repeat: Infinity }}>
                <LandingPlate num={c.n} sub={c.sub} badge={c.badge} title={c.title} rotY={i % 2 ? 12 : -12}>
                  {c.text}
                </LandingPlate>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </Chapter>
  )
}
