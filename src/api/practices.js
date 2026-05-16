import { api, USE_MOCK, delay } from './client'
import { mockPractices, findPractice as findFromMock } from './mock'
import {
  fetchPracticesFromCMS,
  fetchPracticeFromCMS,
} from './cms'

// VITE_USE_CMS=true → читаем практики из Strapi. Иначе — старая
// двухслойная схема: USE_MOCK ? mock : real-backend.
const USE_CMS = import.meta.env.VITE_USE_CMS === 'true'

let _cmsCache = null
let _cmsCacheTime = 0
const CMS_TTL_MS = 60_000 // минута; контент меняется редко

async function getCmsGrouped() {
  if (_cmsCache && Date.now() - _cmsCacheTime < CMS_TTL_MS) return _cmsCache
  _cmsCache = await fetchPracticesFromCMS()
  _cmsCacheTime = Date.now()
  return _cmsCache
}

export async function fetchPractices() {
  if (USE_CMS) return getCmsGrouped()
  if (USE_MOCK) {
    await delay(100)
    return mockPractices
  }
  const { data } = await api.get('/practices')
  return data
}

export async function fetchPractice(id) {
  if (USE_CMS) {
    // Strapi 5 `documentId` это строка вида `qx9...` — пытаемся найти
    // как через CMS endpoint, так и через закешированный список (если
    // фронт пришёл со старым числовым/строковым id из mock'а).
    const direct = await fetchPracticeFromCMS(id).catch(() => null)
    if (direct) return direct
    const grouped = await getCmsGrouped()
    const flat = [
      ...grouped.relaxation,
      ...grouped.awareness,
      ...grouped.author,
    ]
    return flat.find((p) => p.id === id) || null
  }
  if (USE_MOCK) {
    await delay(100)
    return findFromMock(id)
  }
  const { data } = await api.get(`/practices/${id}`)
  return data
}

export async function completePractice(id) {
  if (USE_MOCK || USE_CMS) {
    // Завершение практики — пользовательское событие, ему место в
    // user-backend (поток 1), а не в CMS. Пока — mock-ответ.
    await delay(120)
    return { ok: true, id }
  }
  const { data } = await api.post(`/practices/${id}/complete`)
  return data
}
