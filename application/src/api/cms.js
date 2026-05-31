import axios from 'axios'

// Тонкая обёртка над Strapi v5 REST. Базовый URL берём из
// VITE_CMS_URL (по умолчанию `/cms` — раздаётся Caddy reverse-proxy
// на тот же хост, что и фронт). В Strapi 5 ответы уже плоские
// (без `attributes`-обёртки v4) — поля лежат прямо в entity.
//
// Включается флагом VITE_USE_CMS=true. Иначе фронт продолжает
// читать из mock.js, как раньше — деплой Strapi можно выкатить
// независимо.

const BASE = import.meta.env.VITE_CMS_URL || '/cms'

const cms = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 10000,
})

function audioUrl(media) {
  if (!media?.url) return null
  return media.url.startsWith('http') ? media.url : `${BASE}${media.url}`
}

function formatDuration(sec) {
  if (!sec || sec < 1) return ''
  const m = Math.round(sec / 60)
  return `${m} мин`
}

// Возвращает практики в той же форме, что и `mockPractices`:
// `{ relaxation: [...], awareness: [...], author: [...] }`.
// Каждый элемент: `{ id, title, duration, block, price?, audioUrl }`.
export async function fetchPracticesFromCMS() {
  const { data } = await cms.get('/practices', {
    params: {
      populate: 'audio',
      'sort[0]': 'order:asc',
      'pagination[pageSize]': 100,
      status: 'published',
    },
  })

  const groups = { relaxation: [], awareness: [], author: [] }
  for (const row of data?.data || []) {
    if (!groups[row.block]) continue
    groups[row.block].push({
      id: row.documentId || String(row.id),
      title: row.title,
      duration: formatDuration(row.duration_sec),
      duration_sec: row.duration_sec,
      block: row.block,
      description: row.description || undefined,
      price: row.price ? `${row.price} ₽` : undefined,
      audioUrl: audioUrl(row.audio),
    })
  }
  return groups
}

export async function fetchPracticeFromCMS(documentId) {
  const { data } = await cms.get(`/practices/${documentId}`, {
    params: { populate: 'audio' },
  })
  const row = data?.data
  if (!row) return null
  return {
    id: row.documentId,
    title: row.title,
    duration: formatDuration(row.duration_sec),
    duration_sec: row.duration_sec,
    block: row.block,
    description: row.description || undefined,
    price: row.price ? `${row.price} ₽` : undefined,
    audioUrl: audioUrl(row.audio),
  }
}

// Один голос = `{ id: code, name, fullUrl, previewUrl, active }`.
// `id` намеренно равен `code` ('male'/'female'), потому что фронтовый
// `usePlayerStore.selectedVoice` хранит именно код, не documentId.
export async function fetchVoicesFromCMS() {
  const { data } = await cms.get('/voices', {
    params: {
      populate: '*',
      'sort[0]': 'order:asc',
      status: 'published',
    },
  })
  return (data?.data || [])
    .filter((v) => v.active !== false)
    .map((v) => ({
      id: v.code,
      name: v.name,
      fullUrl: audioUrl(v.audio_full),
      previewUrl: audioUrl(v.audio_preview),
      active: v.active !== false,
    }))
}

// Один трек = `{ id (1..n по порядку), title, fullUrl, previewUrl }`.
// Числовой `id` — чтобы совпадало с тем, как `usePlayerStore.selectedMusic`
// хранит выбор (1/2/3). Если контента поменяется состав — фронт продолжит
// работать, главное чтобы порядок был задан в Strapi.
export async function fetchMusicFromCMS() {
  const { data } = await cms.get('/music-tracks', {
    params: {
      populate: '*',
      'sort[0]': 'order:asc',
      status: 'published',
    },
  })
  return (data?.data || [])
    .filter((m) => m.active !== false)
    .map((m, i) => ({
      id: i + 1,
      title: m.title,
      fullUrl: audioUrl(m.audio_full),
      previewUrl: audioUrl(m.audio_preview),
    }))
}
