// Mock-данные. Названия для Осознанности — из таблицы клиента
// (2026-05-20): Путь к себе / Внутреннее тело / Мыслитель /
// Боль-эмоции / Я здесь / Личность - Серый кардинал.
//
// Блок «Авторские» (author) клиент 09.06.2026 поставил на паузу —
// нет ресурса записывать. Структура и роуты /player/auN сохранены
// для быстрого возврата, но Home их не рендерит и мок не отдаёт.
export const mockPractices = {
  relaxation: [
    { id: 'r1', title: 'Утреннее прогружение',  duration: '7 мин',  block: 'relaxation' },
    { id: 'r2', title: 'Обращение к себе',      duration: '10 мин', block: 'relaxation' },
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
  author: [],
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
