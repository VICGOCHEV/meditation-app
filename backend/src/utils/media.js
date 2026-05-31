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
