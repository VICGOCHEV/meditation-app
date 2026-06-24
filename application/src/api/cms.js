import axios from 'axios'

// Контент-API для аппки. С 01.06.2026 читаем из НАШЕЙ CMS
// (`/api/content/*` — Fastify, отдаёт уже плоский готовый shape).
// Раньше тут была обёртка над Strapi v5 с `populate`/`sort`/`status` и
// парсингом `data.data` — Strapi всё ещё крутится на /cms/api, но аппка
// его больше не дёргает.
//
// Базовый URL берём из VITE_CMS_URL (по умолчанию `/api/content`).
// Включается флагом VITE_USE_CMS=true. Иначе фронт продолжает читать
// из mock.js.

const BASE = import.meta.env.VITE_CMS_URL || '/api/content'

const cms = axios.create({
  baseURL: BASE,
  timeout: 10000,
})

// /api/content/* отдаёт абсолютные URL медиа (типа `/cms-media/abc123.mp3`).
// Caddy на проде раздаёт их статикой с диска. Никакого префикса добавлять
// не надо — фронт берёт url как есть.

// `{ relaxation: [...], awareness: [...], author: [...] }` — финальная форма,
// которую ожидает Home. Backend уже группирует по `block`.
export async function fetchPracticesFromCMS() {
  const { data } = await cms.get('/practices')
  return data
}

// `{ relaxation:{eyebrow,title,sub,chip}, awareness:{...}, ... }` — заголовки
// секций блоков на главной (правятся в CMS «Блоки»).
export async function fetchBlocksFromCMS() {
  const { data } = await cms.get('/blocks')
  return data
}

// Одна практика по slug (slug = практика id, кладётся в PracticeCompletion).
export async function fetchPracticeFromCMS(slug) {
  const { data } = await cms.get(`/practices/${slug}`)
  return data
}

// `[{ id: code, name, fullUrl, previewUrl, active }]` — массив голосов.
// `id` намеренно = `code` ('male'/'female'), потому что фронтовый
// `usePlayerStore.selectedVoice` хранит код, не numeric id.
export async function fetchVoicesFromCMS() {
  const { data } = await cms.get('/voices')
  return data
}

// `[{ id: 1..n, title, fullUrl, previewUrl }]` — массив музыки.
// Числовой `id` — чтобы совпадало с `usePlayerStore.selectedMusic` (1/2/3).
export async function fetchMusicFromCMS() {
  const { data } = await cms.get('/music')
  return data
}
