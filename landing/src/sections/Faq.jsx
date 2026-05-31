import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Section, Reveal, Eyebrow } from '../components/primitives'
import MouseFloat from '../components/MouseFloat'

const QA = [
  {
    q: 'Нужен ли опыт медитации?',
    a: 'Нет. Практики ведут голосом шаг за шагом — с первого дня ты просто слушаешь и следуешь. Ничего не нужно знать заранее.',
  },
  {
    q: 'Сколько времени это занимает?',
    a: 'От нескольких минут в день. Чек-ин — меньше минуты, практика — столько, сколько ты готов уделить себе сегодня.',
  },
  {
    q: 'Что после 7 бесплатных дней?',
    a: 'Если понравится — подписка 199 ₽/мес. Если нет — отменяешь в один тап, без звонков и удержаний. Оплаченный период всегда дослушаешь до конца.',
  },
  {
    q: 'На каких устройствах работает?',
    a: 'В браузере, в Telegram и во ВКонтакте — заходишь там, где удобно, прогресс синхронизируется.',
  },
]

function Item({ q, a, open, onClick }) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
        data-hover
      >
        <span className="font-display text-xl font-light text-fg-0">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0 text-2xl font-extralight text-lilac"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-10 leading-relaxed text-fg-2">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <Section id="faq" narrow>
      <MouseFloat strength={10}>
        <Reveal className="mb-12 text-center">
          <Eyebrow className="mb-4">Вопросы</Eyebrow>
          <h2 className="font-display text-4xl font-extralight sm:text-5xl">Коротко о главном</h2>
        </Reveal>
      </MouseFloat>
      <Reveal delay={0.1}>
        <div className="mx-auto max-w-2xl border-t border-line">
          {QA.map((item, i) => (
            <Item key={i} {...item} open={open === i} onClick={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </Reveal>
    </Section>
  )
}
