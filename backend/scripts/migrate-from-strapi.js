// Одноразовая миграция контента Strapi → своя CMS (Postgres + /uploads).
//
// Запуск на проде (где доступны и Strapi, и наш Postgres):
//   STRAPI_BASE=https://all-relaxme.ru/cms \
//   DATABASE_URL=postgresql://... \
//   node scripts/migrate-from-strapi.js
//
// Идемпотентность: практики матчатся по slug (= Strapi documentId), голоса —
// по code, музыка — по title. Повторный прогон обновляет, не плодит дубли.
// Файлы скачиваются в UPLOAD_DIR один раз (по originalName+url не дедупим —
// при повторе перезальёт; для разового переезда это ок).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { parseStream } from 'music-metadata'
import { createReadStream, createWriteStream } from 'node:fs'
import { config } from '../src/config.js'

const db = new PrismaClient()
const STRAPI = (process.env.STRAPI_BASE || 'https://all-relaxme.ru/cms').replace(/\/$/, '')

async function strapiGet(pathname) {
  const res = await fetch(`${STRAPI}/api${pathname}`)
  if (!res.ok) throw new Error(`Strapi ${pathname} → ${res.status}`)
  return res.json()
}

function mediaAbsUrl(media) {
  if (!media?.url) return null
  return media.url.startsWith('http') ? media.url : `${STRAPI}${media.url}`
}

// Скачивает файл в UPLOAD_DIR, парсит длительность, создаёт MediaFile.
async function importMedia(media) {
  const url = mediaAbsUrl(media)
  if (!url) return null
  await fs.mkdir(config.uploadDir, { recursive: true })
  const filename = `${crypto.randomBytes(12).toString('hex')}.mp3`
  const absPath = path.join(config.uploadDir, filename)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`)
  await new Promise((resolve, reject) => {
    const ws = createWriteStream(absPath)
    res.body.pipe(ws)
    res.body.on('error', reject)
    ws.on('finish', resolve)
    ws.on('error', reject)
  })

  const stat = await fs.stat(absPath)
  let durationSec = null
  try {
    const meta = await parseStream(createReadStream(absPath), { mimeType: 'audio/mpeg', size: stat.size }, { duration: true })
    if (meta?.format?.duration) durationSec = Math.round(meta.format.duration)
  } catch { /* пропускаем */ }

  const row = await db.mediaFile.create({
    data: {
      path: filename,
      url: `${config.mediaUrlBase}/${filename}`,
      originalName: media.name || null,
      mime: 'audio/mpeg',
      sizeBytes: stat.size,
      durationSec,
    },
  })
  console.log(`  ↳ media #${row.id} ← ${media.name || url} (${durationSec ?? '?'}s)`)
  return row
}

async function migratePractices() {
  const { data } = await strapiGet('/practices?populate=audio&pagination[pageSize]=200&status=published')
  console.log(`\nПрактики: ${data.length}`)
  for (const row of data) {
    const slug = row.documentId || `p${row.id}`
    const audio = row.audio ? await importMedia(row.audio) : null
    const durationSec = audio?.durationSec || row.duration_sec || 0
    const base = {
      title: row.title,
      block: row.block,
      description: row.description || null,
      price: row.price ?? null,
      order: row.order ?? 0,
      monthSlot: row.month_slot ?? null,
      durationSec,
      published: true,
      // одиночное Strapi-audio кладём в male_music1 — оно же fallback audioUrl
      audioMaleMusic1Id: audio?.id ?? null,
    }
    await db.practice.upsert({ where: { slug }, create: { slug, ...base }, update: base })
    console.log(`✓ practice «${row.title}» (slug ${slug})`)
  }
}

async function migrateVoices() {
  const { data } = await strapiGet('/voices?populate=*&status=published')
  console.log(`\nГолоса: ${data.length}`)
  for (const v of data) {
    const full = await importMedia(v.audio_full)
    const preview = await importMedia(v.audio_preview)
    if (!full || !preview) { console.warn(`! голос ${v.code}: нет аудио, пропуск`); continue }
    const base = { name: v.name, audioFullId: full.id, audioPreviewId: preview.id, active: v.active !== false, order: v.order ?? 0 }
    await db.voice.upsert({ where: { code: v.code }, create: { code: v.code, ...base }, update: base })
    console.log(`✓ voice «${v.name}» (${v.code})`)
  }
}

async function migrateMusic() {
  const { data } = await strapiGet('/music-tracks?populate=*&status=published')
  console.log(`\nМузыка: ${data.length}`)
  for (const m of data) {
    const full = await importMedia(m.audio_full)
    const preview = await importMedia(m.audio_preview)
    if (!full || !preview) { console.warn(`! трек ${m.title}: нет аудио, пропуск`); continue }
    const existing = await db.musicTrack.findFirst({ where: { title: m.title } })
    const base = { title: m.title, audioFullId: full.id, audioPreviewId: preview.id, active: m.active !== false, order: m.order ?? 0 }
    if (existing) await db.musicTrack.update({ where: { id: existing.id }, data: base })
    else await db.musicTrack.create({ data: base })
    console.log(`✓ music «${m.title}»`)
  }
}

try {
  console.log(`Миграция из Strapi: ${STRAPI}`)
  await migratePractices()
  await migrateVoices()
  await migrateMusic()
  console.log('\n✅ Готово. Проверь /admin перед переключением фронта.')
} catch (e) {
  console.error('\n❌ Ошибка миграции:', e.message)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
