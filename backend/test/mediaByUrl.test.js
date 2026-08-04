import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// config читает UPLOAD_DIR из env на импорте — подменяем ДО импорта media.js.
const TMP = await fs.mkdtemp(path.join(os.tmpdir(), 'medapp-media-'))
process.env.UPLOAD_DIR = TMP
process.env.MEDIA_URL_BASE = '/cms-media'
// config.js падает на старте без JWT_SECRET (>= 32 символов) — это защита
// прода, здесь подставляем фиктивный, чтобы импортировать media.js.
process.env.JWT_SECRET ||= 'test-secret-not-used-anywhere-0123456789'

const { readLocalMediaByUrl } = await import('../src/utils/media.js')

const BASE = 'https://all-relaxme.ru'

test.after(async () => {
  await fs.rm(TMP, { recursive: true, force: true })
})

test('находит файл по публичному URL картинки из CMS', async () => {
  await fs.writeFile(path.join(TMP, 'abc123.jpg'), Buffer.from([0xff, 0xd8, 0xff]))
  const got = await readLocalMediaByUrl(`${BASE}/cms-media/abc123.jpg`)
  assert.ok(got, 'файл должен найтись')
  assert.equal(got.filename, 'abc123.jpg')
  assert.equal(got.contentType, 'image/jpeg')
  assert.equal(got.buffer.length, 3)
})

test('png и webp тоже распознаются', async () => {
  await fs.writeFile(path.join(TMP, 'p.png'), 'x')
  await fs.writeFile(path.join(TMP, 'w.webp'), 'x')
  assert.equal((await readLocalMediaByUrl(`${BASE}/cms-media/p.png`)).contentType, 'image/png')
  assert.equal((await readLocalMediaByUrl(`${BASE}/cms-media/w.webp`)).contentType, 'image/webp')
})

test('чужой домен — не наш файл, но путь тот же: отдаём по имени', async () => {
  // Проверяем именно поведение: резолвим по PATH, домен не важен — картинка
  // всё равно лежит у нас, а имя уникально (crypto.randomBytes).
  await fs.writeFile(path.join(TMP, 'same.jpg'), 'x')
  const got = await readLocalMediaByUrl(`https://example.com/cms-media/same.jpg`)
  assert.ok(got)
})

test('путь не из /cms-media — null', async () => {
  assert.equal(await readLocalMediaByUrl(`${BASE}/uploads/abc123.jpg`), null)
})

test('файла нет на диске — null, без исключения', async () => {
  assert.equal(await readLocalMediaByUrl(`${BASE}/cms-media/missing.jpg`), null)
})

test('не картиночное расширение — null', async () => {
  await fs.writeFile(path.join(TMP, 'note.txt'), 'x')
  assert.equal(await readLocalMediaByUrl(`${BASE}/cms-media/note.txt`), null)
})

test('path traversal обрезается до basename и не выходит за uploadDir', async () => {
  // Секрет кладём В uploadDir, но обращаемся «через ../» — попытка вылезти
  // наружу должна схлопнуться в basename и не найти файл снаружи.
  const outside = path.join(TMP, '..', 'outside-secret.jpg')
  await fs.writeFile(outside, 'secret')
  try {
    const got = await readLocalMediaByUrl(`${BASE}/cms-media/..%2Foutside-secret.jpg`)
    // basename('../outside-secret.jpg') = 'outside-secret.jpg', внутри TMP его нет
    assert.equal(got, null)
  } finally {
    await fs.rm(outside, { force: true })
  }
})

test('не абсолютный URL — null', async () => {
  assert.equal(await readLocalMediaByUrl('/cms-media/abc123.jpg'), null)
  assert.equal(await readLocalMediaByUrl(''), null)
  assert.equal(await readLocalMediaByUrl(null), null)
})
