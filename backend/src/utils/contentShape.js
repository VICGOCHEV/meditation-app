// Сериализация контента CMS. Одна форма для админки (полная матрица) и одна
// для аппки (контракт src/api/cms.js — чтобы фронт переключился сменой URL).
import { toPublicMedia } from './media.js'

// 6 ячеек матрицы: голос × музыка. Порядок важен для вычисления длительности
// (берём первую непустую) и для индикатора заполненности.
export const AUDIO_CELLS = [
  { field: 'audioMaleMusic1', idField: 'audioMaleMusic1Id', voice: 'male', music: 1 },
  { field: 'audioMaleMusic2', idField: 'audioMaleMusic2Id', voice: 'male', music: 2 },
  { field: 'audioMaleMusic3', idField: 'audioMaleMusic3Id', voice: 'male', music: 3 },
  { field: 'audioFemaleMusic1', idField: 'audioFemaleMusic1Id', voice: 'female', music: 1 },
  { field: 'audioFemaleMusic2', idField: 'audioFemaleMusic2Id', voice: 'female', music: 2 },
  { field: 'audioFemaleMusic3', idField: 'audioFemaleMusic3Id', voice: 'female', music: 3 },
]

// include для Prisma — тянем все 6 связей + у голоса/музыки full+preview.
export const practiceInclude = AUDIO_CELLS.reduce((acc, c) => {
  acc[c.field] = true
  return acc
}, {})

export const voiceInclude = { audioFull: true, audioPreview: true }
export const musicInclude = { audioFull: true, audioPreview: true }

// Длительность практики = длительность первой непустой дорожки (все варианты
// одной практики одинаковой длины — docs/21 §E).
export function practiceDuration(p) {
  for (const c of AUDIO_CELLS) {
    const m = p[c.field]
    if (m?.durationSec) return m.durationSec
  }
  return 0
}

function fmtDuration(sec) {
  if (!sec || sec < 1) return ''
  return `${Math.round(sec / 60)} мин`
}

// ── АДМИНКА: полная форма практики с матрицей ──────────────────────────────
export function practiceAdminForm(p) {
  const audio = {}
  for (const c of AUDIO_CELLS) {
    audio[`${c.voice}_music${c.music}`] = toPublicMedia(p[c.field])
  }
  const filled = AUDIO_CELLS.filter((c) => p[c.idField]).length
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    block: p.block,
    description: p.description || '',
    price: p.price ?? null,
    order: p.order,
    monthSlot: p.monthSlot ?? null,
    durationSec: p.durationSec,
    published: p.published,
    audio, // { male_music1: media|null, ... }
    audioFilled: filled, // 0..6 — для индикатора в списке
    updatedAt: p.updatedAt,
  }
}

// ── АППКА: контракт, который сейчас отдаёт Strapi (src/api/cms.js) ──────────
// Базовая форма практики + матрица audioByVariant для нового плеера.
export function practicePublicForm(p) {
  const variants = {}
  for (const c of AUDIO_CELLS) {
    const url = p[c.field]?.url
    if (url) variants[`${c.voice}_music${c.music}`] = url
  }
  // обратная совместимость: audioUrl = первая непустая дорожка (male_music1
  // приоритетно), как одиночное поле audio у старого Strapi-контракта.
  const audioUrl = variants.male_music1 || Object.values(variants)[0] || null
  return {
    id: p.slug, // аппка кладёт это в PracticeCompletion.practiceId
    title: p.title,
    duration: fmtDuration(p.durationSec),
    duration_sec: p.durationSec,
    block: p.block,
    description: p.description || undefined,
    price: p.price ? `${p.price} ₽` : undefined,
    audioUrl,
    audioByVariant: variants, // { male_music1: url, female_music2: url, ... }
  }
}

export function voicePublicForm(v) {
  return {
    id: v.code,
    name: v.name,
    fullUrl: v.audioFull?.url || null,
    previewUrl: v.audioPreview?.url || null,
    active: v.active !== false,
  }
}

// id музыки на фронте — порядковый (1..n), назначается при выдаче списком.
export function musicPublicForm(m, index) {
  return {
    id: index + 1,
    title: m.title,
    fullUrl: m.audioFull?.url || null,
    previewUrl: m.audioPreview?.url || null,
  }
}
