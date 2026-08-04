// Хелперы медиа-библиотеки CMS: сохранение загруженного аудио на диск,
// парс длительности из mp3, нормализация в публичную форму для аппки/админки.
import { promises as fs, createWriteStream, createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { parseStream } from 'music-metadata'
import { config } from '../config.js'

const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/mpeg3'])

export function isAllowedAudio(mime) {
  return AUDIO_MIME.has((mime || '').toLowerCase())
}

// Картинки для broadcast-пушей (оффлайн-мероприятия). jpeg/png/webp.
const IMAGE_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function isAllowedImage(mime) {
  return !!IMAGE_MIME[(mime || '').toLowerCase()]
}

// Стримит загруженную картинку в UPLOAD_DIR. Возвращает { filename, sizeBytes }.
export async function saveImageStream(fileStream, mime) {
  await ensureUploadDir()
  const ext = IMAGE_MIME[(mime || '').toLowerCase()] || 'jpg'
  const filename = `${crypto.randomBytes(12).toString('hex')}.${ext}`
  const absPath = path.join(config.uploadDir, filename)
  try {
    await pipeline(fileStream, createWriteStream(absPath))
  } catch (e) {
    await deleteAudioFile(filename)
    throw e
  }
  const stat = await fs.stat(absPath)
  return { filename, absPath, sizeBytes: stat.size }
}

// MIME по расширению — для отдачи файла в Telegram multipart'ом.
const EXT_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/**
 * Достаёт локальный файл по публичному URL картинки из CMS.
 *
 * Нужен broadcast'у: картинку в Telegram приходится слать байтами, потому что
 * по ссылке её скачивает сам Telegram, а до нашего хоста он не доходит
 * (см. utils/tgBot.js).
 *
 * Возвращает { buffer, filename, contentType } или null, если URL не наш,
 * файла нет или расширение не картиночное. null — сигнал вызывающему
 * откатиться на прежнее поведение, а не падать.
 *
 * @param {string} url — например https://all-relaxme.ru/cms-media/ab12.jpg
 */
export async function readLocalMediaByUrl(url) {
  if (!url || typeof url !== 'string') return null

  let pathname
  try {
    pathname = new URL(url).pathname
  } catch {
    return null // не абсолютный URL
  }

  const prefix = `${config.mediaUrlBase.replace(/\/+$/, '')}/`
  if (!pathname.startsWith(prefix)) return null

  // Только базовое имя: защита от ../ в пути. path.basename срезает любые
  // сегменты, поэтому выйти за uploadDir нельзя даже подделанным URL'ом.
  const filename = path.basename(decodeURIComponent(pathname.slice(prefix.length)))
  if (!filename || filename.startsWith('.')) return null

  const ext = filename.split('.').pop()?.toLowerCase()
  const contentType = EXT_MIME[ext]
  if (!contentType) return null

  try {
    const buffer = await fs.readFile(path.join(config.uploadDir, filename))
    return { buffer, filename, contentType }
  } catch {
    return null // файла нет на диске
  }
}

// Гарантируем, что папка загрузок существует (idempotent).
export async function ensureUploadDir() {
  await fs.mkdir(config.uploadDir, { recursive: true })
}

// Случайное безопасное имя файла, расширение .mp3.
function randomName() {
  return `${crypto.randomBytes(12).toString('hex')}.mp3`
}

// Стримит multipart-файл в UPLOAD_DIR и считает длительность из записанного
// файла. Возвращает { filename, absPath, sizeBytes, durationSec }.
// Превышение лимита размера НЕ проверяется здесь — это делает @fastify/multipart
// (limits.fileSize), а вызывающий смотрит part.file.truncated и удаляет файл.
// При любой ошибке записи — чистим за собой.
export async function saveAudioStream(fileStream) {
  await ensureUploadDir()
  const filename = randomName()
  const absPath = path.join(config.uploadDir, filename)

  try {
    await pipeline(fileStream, createWriteStream(absPath))
  } catch (e) {
    await deleteAudioFile(filename)
    throw e
  }

  const stat = await fs.stat(absPath)
  let durationSec = null
  try {
    const meta = await parseStream(
      createReadStream(absPath),
      { mimeType: 'audio/mpeg', size: stat.size },
      { duration: true },
    )
    if (meta?.format?.duration) durationSec = Math.round(meta.format.duration)
  } catch {
    // длительность не критична — оставляем null, UI покажет «—»
  }

  return { filename, absPath, sizeBytes: stat.size, durationSec }
}

// Удаляет файл с диска по относительному пути (молча, если уже нет).
export async function deleteAudioFile(relPath) {
  try {
    await fs.unlink(path.join(config.uploadDir, relPath))
  } catch {
    /* файла нет — ок */
  }
}

// Публичная форма MediaFile для ответов API.
export function toPublicMedia(m) {
  if (!m) return null
  return {
    id: m.id,
    url: m.url,
    originalName: m.originalName || null,
    durationSec: m.durationSec ?? null,
    sizeBytes: m.sizeBytes,
  }
}
