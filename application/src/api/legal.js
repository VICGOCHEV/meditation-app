import { api, USE_MOCK } from './client'
import { FALLBACK_LEGAL_DOCS, LEGAL_REQUISITES_DEFAULT } from '../constants/legal'

// Юридические документы из CMS (/api/content/legal).
//
// fetchLegalDocs всегда резолвится: сеть упала, бэка нет, mock-режим — отдаём
// фолбэк-список PDF из constants/legal.js. Ссылки на оферту и политику не
// имеют права пропасть из интерфейса.

const FALLBACK = {
  requisites: LEGAL_REQUISITES_DEFAULT,
  items: FALLBACK_LEGAL_DOCS,
}

export async function fetchLegalDocs() {
  if (USE_MOCK) return FALLBACK
  try {
    const { data } = await api.get('/content/legal')
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      return FALLBACK
    }
    return {
      requisites:
        typeof data.requisites === 'string' ? data.requisites : LEGAL_REQUISITES_DEFAULT,
      items: data.items.filter((d) => d && d.slug && d.href),
    }
  } catch {
    return FALLBACK
  }
}

// Один документ для страницы /legal/:slug. Здесь фолбэка нет: если документа
// не существует, экран должен честно сказать об этом, а не подставить чужой.
// null = не найден, undefined-ситуация невозможна.
export async function fetchLegalDoc(slug) {
  const { data } = await api.get(`/content/legal/${encodeURIComponent(slug)}`)
  return data
}
