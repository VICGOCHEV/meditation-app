// Заливка контента CMS из AUD/2-jun на боевой бэкенд.
//
// Идемпотентно: если voice/music/practice с таким именем (или code/title)
// уже есть — пропускает. То есть скрипт можно запускать повторно без
// риска задвоить данные.
//
// Параметры (env):
//   API_BASE       (default: http://127.0.0.1:3001)
//   ADMIN_EMAIL    обязательно
//   ADMIN_PASSWORD обязательно
//   AUDIO_DIR      (default: /Users/eblan/Desktop/MED/AUD/2-jun)
//
// Запуск (локально, против локального backend):
//   ADMIN_EMAIL=admin@all-relaxme.ru ADMIN_PASSWORD='...' \
//     node backend/scripts/seed-cms-content.js
//
// Запуск (против прода):
//   API_BASE=https://all-relaxme.ru ADMIN_EMAIL=... ADMIN_PASSWORD=... \
//     node backend/scripts/seed-cms-content.js

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3001'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const AUDIO_DIR = process.env.AUDIO_DIR || '/Users/eblan/Desktop/MED/AUD/2-jun'

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('FATAL: задай ADMIN_EMAIL и ADMIN_PASSWORD в env')
  process.exit(1)
}
if (!fs.existsSync(AUDIO_DIR)) {
  console.error(`FATAL: AUDIO_DIR не найден: ${AUDIO_DIR}`)
  process.exit(1)
}

// ─── HTTP helpers ───────────────────────────────────────────────────────
let token = null

async function api(method, route, body, extra = {}) {
  const headers = { ...extra.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (body instanceof FormData) {
    payload = body // browser FormData → fetch автоматически выставит boundary
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${API_BASE}/api${route}`, { method, headers, body: payload })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!res.ok) {
    throw new Error(`${method} ${route} → ${res.status}: ${json.error || text.slice(0, 200)}`)
  }
  return json
}

async function login() {
  const { token: t } = await api('POST', '/admin/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  token = t
  console.log('✓ admin login OK')
}

// Загружает один файл, возвращает {id, url, durationSec, ...}
async function uploadAudio(filePath) {
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) throw new Error(`not a file: ${filePath}`)
  const buf = fs.readFileSync(filePath)
  const blob = new Blob([buf], { type: 'audio/mpeg' })
  const fd = new FormData()
  fd.append('file', blob, path.basename(filePath))
  const { media } = await api('POST', '/admin/media', fd)
  console.log(`  ↑ ${path.basename(filePath)} → media #${media.id} (${media.durationSec}s)`)
  return media
}

// Идемпотентно создать или найти voice по code.
async function ensureVoice({ name, code, fullPath, previewPath, order }) {
  const { items } = await api('GET', '/admin/voices')
  const existing = items.find((v) => v.code === code)
  if (existing) {
    console.log(`  · voice "${code}" уже есть — пропускаю`)
    return existing
  }
  const full = await uploadAudio(fullPath)
  const preview = previewPath === fullPath
    ? full
    : await uploadAudio(previewPath)
  const { voice } = await api('POST', '/admin/voices', {
    name, code,
    audioFullId: full.id,
    audioPreviewId: preview.id,
    active: true,
    order,
  })
  console.log(`✓ voice "${code}" → #${voice.id}`)
  return voice
}

async function ensureMusic({ title, fullPath, previewPath, order }) {
  const { items } = await api('GET', '/admin/music')
  const existing = items.find((m) => m.title === title)
  if (existing) {
    console.log(`  · music "${title}" уже есть — пропускаю`)
    return existing
  }
  const full = await uploadAudio(fullPath)
  const preview = previewPath === fullPath
    ? full
    : await uploadAudio(previewPath)
  const { music } = await api('POST', '/admin/music', {
    title,
    audioFullId: full.id,
    audioPreviewId: preview.id,
    active: true,
    order,
  })
  console.log(`✓ music "${title}" → #${music.id}`)
  return music
}

// Идемпотентно создать практику по (title, block) — если такая есть, пропустить.
// audioByVariant — карта {male_music1: '/path/to/file.mp3', female_music2: ...}
async function ensurePractice({ title, block, description, order, audioByVariant, price }) {
  const { items } = await api('GET', '/admin/practices')
  const existing = items.find((p) => p.title === title && p.block === block)
  if (existing) {
    console.log(`  · practice "${title}" (${block}) уже есть — пропускаю`)
    return existing
  }
  // Загружаем все файлы и собираем audio matrix
  const audio = {}
  for (const [key, filePath] of Object.entries(audioByVariant)) {
    if (!filePath) continue
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ файл не найден для ${key}: ${filePath}`)
      continue
    }
    const media = await uploadAudio(filePath)
    audio[key] = media.id
  }
  const { practice } = await api('POST', '/admin/practices', {
    title, block,
    description: description || null,
    price: price ?? null,
    order: order ?? 0,
    published: true,
    audio,
  })
  console.log(`✓ practice "${title}" (${block}) → #${practice.id}`)
  return practice
}

// ─── Маппинг файлов (из practice.csv + структуры AUD/2-jun) ─────────────
const F = (...parts) => path.join(AUDIO_DIR, ...parts)

// Голос проводника — превью отдельных файлов нет, используем тот же файл.
const VOICES = [
  {
    name: 'Мужской',
    code: 'male',
    fullPath: F('Мужской_голос проводника.mp3'),
    previewPath: F('Мужской_голос проводника.mp3'),
    order: 0,
  },
  {
    name: 'Женский',
    code: 'female',
    fullPath: F('Женский_голос проводника.mp3'),
    previewPath: F('Женский_голос проводника.mp3'),
    order: 1,
  },
]

// Музыка (порядок и id для фронта: 1/2/3).
const MUSIC = [
  {
    title: 'Лёгкость',
    fullPath: F('Выбор музыки_Легкость_энергия созидания.mp3'),
    previewPath: F('Выбор музыки_Легкость_энергия созидания.mp3'),
    order: 0,
  },
  {
    title: 'Покой',
    fullPath: F('Выбор музыки_Покой_энергия очищения.mp3'),
    previewPath: F('Выбор музыки_Покой_энергия очищения.mp3'),
    order: 1,
  },
  {
    title: 'Заземление',
    fullPath: F('Выбор музыки_Заземление_энергия жизни.mp3'),
    previewPath: F('Выбор музыки_Заземление_энергия жизни.mp3'),
    order: 2,
  },
]

// Практики «Расслабление». 2 из 4 — одна музыка (только music1).
const RELAXATION_PRACTICES = [
  {
    title: 'Утреннее прогружение',
    description:
      'Утром, при пробуждении, оставаясь в постели, включи и почувствуй всё, что говорится. ' +
      'Это даст тебе возможность начать день не торопясь и без лишнего думанья.',
    order: 0,
    // Одна музыка — кладём только music1; music2/music3 пустыми.
    audioByVariant: {
      male_music1: F('Мужской', 'БЛОК_Расслабление', 'Утреннее прогружение.mp3'),
      female_music1: F('Женский', 'БЛОК_Расслабление ', 'Утреннее прогружение.mp3'),
    },
  },
  {
    title: 'Обращение к себе',
    description:
      'Днём, устройся удобно, закрой глаза и ощущай всё то, что будет говориться. ' +
      'Это поможет тебе вернуть своё внимание в «здесь и сейчас».',
    order: 1,
    audioByVariant: {
      male_music1: F('Мужской', 'БЛОК_Расслабление', 'Обращение к себе.mp3'),
      female_music1: F('Женский', 'БЛОК_Расслабление ', 'Обращение к себе.mp3'),
    },
  },
  {
    title: 'Изучи свой ум',
    description:
      'Днём или вечером, устройся удобно, лёжа на спине или сидя, руки и ноги не скрещивай, ' +
      'слушай и не иди за мыслями, иди в ощущения.',
    order: 2,
    audioByVariant: {
      male_music1: F('Мужской', 'БЛОК_Расслабление', 'Изучи ум_Легкость.mp3'),
      male_music2: F('Мужской', 'БЛОК_Расслабление', 'Изучи ум_Покой.mp3'),
      male_music3: F('Мужской', 'БЛОК_Расслабление', 'Изучи ум_Заземление.mp3'),
      female_music1: F('Женский', 'БЛОК_Расслабление ', 'Исследуй ум_Легкость.mp3'),
      female_music2: F('Женский', 'БЛОК_Расслабление ', 'Исследуй ум_Покой.mp3'),
      female_music3: F('Женский', 'БЛОК_Расслабление ', 'Исследуй ум_Заземление.mp3'),
    },
  },
  {
    title: 'Практика расслабления',
    description:
      'Вечером, или в любое другое время устройся лёжа на спине или сидя, руки и ноги не скрещивай, ' +
      'слушай и воспроизводи все эти ощущения у себя. Не иди за мыслями, иди в ощущения.',
    order: 3,
    audioByVariant: {
      male_music1: F('Мужской', 'БЛОК_Расслабление', 'Расслабление_Легкость.mp3'),
      male_music2: F('Мужской', 'БЛОК_Расслабление', 'Расслабление_Покой.mp3'),
      male_music3: F('Мужской', 'БЛОК_Расслабление', 'Расслабление_Заземление.mp3'),
      female_music1: F('Женский', 'БЛОК_Расслабление ', 'Расслабление_Легкость.mp3'),
      female_music2: F('Женский', 'БЛОК_Расслабление ', 'Расслабление_Покой.mp3'),
      female_music3: F('Женский', 'БЛОК_Расслабление ', 'Расслабление_Заземление.mp3'),
    },
  },
]

// Практики «Пароль от жизни» (он же awareness). 6 штук × 2 голоса × 3 музыки.
function awarenessPractice(title, namePart, description, order) {
  return {
    title,
    description,
    order,
    audioByVariant: {
      male_music1: F('Мужской', 'БЛОК_осознанность_1', `Александр_${namePart}_Легкость.mp3`),
      male_music2: F('Мужской', 'БЛОК_осознанность_1', `Александр_${namePart}_Покой.mp3`),
      male_music3: F('Мужской', 'БЛОК_осознанность_1', `Александр_${namePart}_Заземление.mp3`),
      female_music1: F('Женский', 'БЛОК_Осознанность_1', `Алена_${namePart}_Легкость.mp3`),
      female_music2: F('Женский', 'БЛОК_Осознанность_1', `Алена_${namePart}_Покой.mp3`),
      female_music3: F('Женский', 'БЛОК_Осознанность_1', `Алена_${namePart}_Заземление.mp3`),
    },
  }
}

const AWARENESS_PRACTICES = [
  awarenessPractice(
    'Путь к себе', 'Путь к себе',
    'Практика нацелена на осознание той лёгкости, которая уже есть в тебе.', 0,
  ),
  awarenessPractice(
    'Внутреннее тело', 'Внутреннее тело',
    'Практика нацелена на чувствование своего внутреннего тела.', 1,
  ),
  awarenessPractice(
    'Мыслитель', 'Мыслитель',
    'Практика нацелена на осознание, что ты не тот, кто думает.', 2,
  ),
  awarenessPractice(
    'Боль и эмоции', 'Боль эмоции',
    'Практика нацелена на обнаружение боли и проживание её, а не избегание.', 3,
  ),
  awarenessPractice(
    'Я здесь', 'Я здесь',
    'Практика нацелена на осознание значимости жизни в моменте «здесь и сейчас».', 4,
  ),
  awarenessPractice(
    'Личность — Серый кардинал', 'Личность_Серый кардинал',
    'Практика нацелена на осознание того, что ты всю жизнь считал «собой» — оказалось ' +
    'лишь набором программ.', 5,
  ),
]

// ─── main ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`API_BASE: ${API_BASE}`)
  console.log(`AUDIO_DIR: ${AUDIO_DIR}`)
  console.log()

  await login()

  console.log('\n── Voices ─────────────────────────────')
  for (const v of VOICES) {
    await ensureVoice(v)
  }

  console.log('\n── Music tracks ──────────────────────')
  for (const m of MUSIC) {
    await ensureMusic(m)
  }

  console.log('\n── Practices · Расслабление ──────────')
  for (const p of RELAXATION_PRACTICES) {
    await ensurePractice({ ...p, block: 'relaxation' })
  }

  console.log('\n── Practices · Пароль от жизни ───────')
  for (const p of AWARENESS_PRACTICES) {
    await ensurePractice({ ...p, block: 'awareness' })
  }

  console.log('\n✓ Готово. Открой /manage/practices и проверь.')
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
