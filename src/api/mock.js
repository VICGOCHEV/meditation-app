// Mock-данные. Названия и `month_slot` для Осознанности — из таблицы
// клиента (2026-05-20): Путь к себе / Внутреннее тело / Мыслитель /
// Боль-эмоции / Я здесь / Личность - Серый кардинал.
// Авторские: первые 2 (Знакомство, Подкаст) — всегда бесплатны, остальные
// добавляются по 2 в месяц по 99₽ за штуку (клиент 2026-05-20).
export const mockPractices = {
  relaxation: [
    { id: 'r1', title: 'Утреннее погружение',  duration: '7 мин',  block: 'relaxation' },
    { id: 'r2', title: 'Обращение к себе',     duration: '10 мин', block: 'relaxation' },
    { id: 'r3', title: 'Практика расслабления', duration: '20 мин', block: 'relaxation' },
  ],
  awareness: [
    { id: 'a1', title: 'Путь к себе',                  duration: '15 мин', block: 'awareness' },
    { id: 'a2', title: 'Внутреннее тело',              duration: '20 мин', block: 'awareness' },
    { id: 'a3', title: 'Мыслитель',                    duration: '18 мин', block: 'awareness' },
    { id: 'a4', title: 'Боль-эмоции',                  duration: '22 мин', block: 'awareness' },
    { id: 'a5', title: 'Я здесь',                      duration: '25 мин', block: 'awareness' },
    { id: 'a6', title: 'Личность — Серый кардинал',    duration: '30 мин', block: 'awareness' },
  ],
  author: [
    { id: 'au1', title: 'Знакомство с автором', duration: '12 мин', block: 'author', free: true },
    { id: 'au2', title: 'Подкаст',              duration: '18 мин', block: 'author', free: true },
    // Платные авторские — клиент добавляет минимум 2 новые в месяц.
    // Цена за штучную покупку — 99₽ (фиксированно, клиент 2026-05-20).
    { id: 'au3', title: 'Авторская · август #1', duration: '22 мин', block: 'author', price: '99 ₽' },
    { id: 'au4', title: 'Авторская · август #2', duration: '24 мин', block: 'author', price: '99 ₽' },
  ],
}

export function findPractice(id) {
  const all = [
    ...mockPractices.relaxation,
    ...mockPractices.awareness,
    ...mockPractices.author,
  ]
  return all.find((p) => p.id === id) || null
}

export const mockAudioUrl =
  'https://cdn.jsdelivr.net/gh/anars/blank-audio@master/10-minutes-of-silence.mp3'
