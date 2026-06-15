import Card from './Card'

// Реальные карточки практик приложения (ui/Card) + реальные названия из
// api/mock.js. Со всеми бликами: плавающее фиолетовое свечение, вращающаяся
// conic-обводка, стеклянное преломление, неоновая кнопка play, замки/бейджи.
const BLOCKS = [
  {
    title: 'Расслабление',
    note: 'бесплатно навсегда',
    cards: [
      { title: 'Утреннее погружение', duration: '7 мин', completed: true },
      { title: 'Обращение к себе', duration: '10 мин' },
      { title: 'Практика расслабления', duration: '20 мин' },
    ],
  },
  {
    title: 'Осознанность',
    note: 'системный курс',
    cards: [
      { title: 'Путь к себе', duration: '15 мин' },
      { title: 'Внутреннее тело', duration: '20 мин', completed: true },
      { title: 'Мыслитель', duration: '18 мин', locked: true, lockedLabel: 'По подписке' },
      { title: 'Боль-эмоции', duration: '22 мин', locked: true, lockedLabel: 'По подписке' },
      { title: 'Я здесь', duration: '25 мин', locked: true, lockedLabel: 'По подписке' },
      { title: 'Личность — Серый кардинал', duration: '30 мин', locked: true, lockedLabel: 'По подписке' },
    ],
  },
  {
    title: 'Авторские',
    note: 'голос автора методики',
    cards: [
      { title: 'Знакомство с автором', duration: '12 мин' },
      { title: 'Подкаст', duration: '18 мин', badge: 'Подкаст' },
      { title: 'Авторская · август #1', duration: '22 мин', price: '99 ₽' },
      { title: 'Авторская · август #2', duration: '24 мин', price: '99 ₽' },
    ],
  },
]

export default function PracticeWall() {
  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
      {BLOCKS.map((b) => (
        <div key={b.title}>
          <div className="mb-4 flex items-baseline justify-between">
            <h4 className="text-[18px] font-light text-fg-0">{b.title}</h4>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">{b.note}</span>
          </div>
          <div className="flex flex-col gap-4">
            {b.cards.map((c, i) => (
              <Card key={c.title + i} {...c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
