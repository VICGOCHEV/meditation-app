export const mockPractices = {
  relaxation: [
    { id: 'r1', title: 'Дыхание 4-7-8', duration: '10 мин', block: 'relaxation' },
    { id: 'r2', title: 'Сканирование тела', duration: '15 мин', block: 'relaxation' },
    { id: 'r3', title: 'Пауза посреди дня', duration: '7 мин', block: 'relaxation' },
  ],
  awareness: [
    { id: 'a1', title: 'Осознанность: начало', duration: '15 мин', block: 'awareness' },
    { id: 'a2', title: 'Наблюдатель', duration: '20 мин', block: 'awareness' },
    { id: 'a3', title: 'Мысли как облака', duration: '18 мин', block: 'awareness' },
    { id: 'a4', title: 'Внутренняя тишина', duration: '22 мин', block: 'awareness' },
    { id: 'a5', title: 'Присутствие', duration: '25 мин', block: 'awareness' },
    { id: 'a6', title: 'Глубокое погружение', duration: '30 мин', block: 'awareness' },
  ],
  author: [
    { id: 'au1', title: 'Авторская: Поток', duration: '20 мин', block: 'author', price: '290 ₽' },
    { id: 'au2', title: 'Авторская: Источник', duration: '25 мин', block: 'author', price: '290 ₽' },
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
