import { USE_MOCK, delay } from './client'
import { fetchBlocksFromCMS } from './cms'

// Заголовки секций блоков на главной. Правятся в CMS «Блоки», читаются из
// /api/content/blocks. Дефолты держим и тут — чтобы главная рисовалась
// мгновенно (до ответа сети) и в mock-режиме без бэка.
export const BLOCK_DEFAULTS = {
  relaxation: {
    key: 'relaxation',
    eyebrow: '01 · СТАРТ',
    title: 'Точка тишины',
    sub: 'Бесплатные практики расслабления — мягкий вход в тело.',
    chip: 'Бесплатно · 4',
  },
  awareness: {
    key: 'awareness',
    eyebrow: '02 · СИСТЕМА',
    title: 'Пароль от жизни',
    sub: 'Шесть практик осознанности — переход из тревоги в присутствие.',
    chip: 'По подписке · 6 практик/мес',
  },
  awareness2: {
    key: 'awareness2',
    eyebrow: '03 · СИСТЕМА',
    title: 'Глубже в тишину',
    sub: 'Второй цикл практик осознанности — продолжение пути в присутствие.',
    chip: 'По подписке',
  },
  author: {
    key: 'author',
    eyebrow: '04 · АВТОРСКОЕ',
    title: 'Авторские',
    sub: '',
    chip: 'Поштучно',
  },
}

// Всегда резолвится: ошибка/мок → дефолты. Сетевые значения накладываются
// поверх дефолтов, поэтому отсутствующий в ответе ключ не ломает секцию.
export async function fetchBlocks() {
  if (USE_MOCK) {
    await delay(50)
    return BLOCK_DEFAULTS
  }
  try {
    const data = await fetchBlocksFromCMS()
    return { ...BLOCK_DEFAULTS, ...(data || {}) }
  } catch {
    return BLOCK_DEFAULTS
  }
}
