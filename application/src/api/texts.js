import { api, USE_MOCK } from './client'
import { APP_TEXT_DEFAULTS } from '../constants/texts'

// Тексты приложения, редактируемые в CMS (/api/content/texts).
// Всегда резолвится: ошибка сети, мок или отсутствующий ключ → дефолт из
// constants/texts.js. Экран рисуется мгновенно на дефолтах, серверные значения
// накладываются поверх.
export async function fetchAppTexts() {
  if (USE_MOCK) return { ...APP_TEXT_DEFAULTS }
  try {
    const { data } = await api.get('/content/texts')
    if (!data || typeof data !== 'object') return { ...APP_TEXT_DEFAULTS }
    const out = { ...APP_TEXT_DEFAULTS }
    for (const key of Object.keys(APP_TEXT_DEFAULTS)) {
      // Пустая строка — валидное «не показывать», поэтому проверяем на тип,
      // а не на truthy.
      if (typeof data[key] === 'string') out[key] = data[key]
    }
    return out
  } catch {
    return { ...APP_TEXT_DEFAULTS }
  }
}
