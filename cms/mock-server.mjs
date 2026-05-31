// Dev-only mock бэка CMS — чтобы потыкать дизайн SPA без Postgres.
// Чистый node:http, ноль зависимостей. In-memory данные, любой логин проходит.
// Запуск: node admin/mock-server.mjs  (слушает :3001, vite проксирует на него)
import http from 'node:http'

let mediaSeq = 100
function fakeMedia(name = 'audio.mp3', dur = 1180) {
  const id = ++mediaSeq
  return {
    id,
    url: `/cms-media/sample-${id}.mp3`,
    originalName: name,
    durationSec: dur,
    sizeBytes: Math.round((dur / 60) * 1.4 * 1024 * 1024),
  }
}

const cell = (dur) => fakeMedia('track.mp3', dur)

// ── seed ──
let practices = [
  mkP(1, 'Утреннее погружение', 'relaxation', { male_music1: cell(1080), female_music1: cell(1080) }, true, { description: 'Утреннее погружение себя в Жизнь' }),
  mkP(2, 'Обращение к себе', 'relaxation', { male_music1: cell(720), female_music1: cell(720) }, true),
  mkP(3, 'Практика расслабления', 'relaxation', { male_music1: cell(1320), male_music2: cell(1320), male_music3: cell(1320), female_music1: cell(1320), female_music2: cell(1320), female_music3: cell(1320) }, false),
  mkP(4, 'Путь к себе', 'awareness', { male_music1: cell(1200), female_music1: cell(1200) }, true, { monthSlot: 1 }),
  mkP(5, 'Внутреннее тело', 'awareness', { male_music1: cell(1260) }, true, { monthSlot: 1 }),
  mkP(6, 'Мыслитель', 'awareness', {}, false, { monthSlot: 2 }),
]
let voices = [
  mkV(1, 'Мужской', 'male'),
  mkV(2, 'Женский', 'female'),
]
let music = [
  mkM(1, 'Энергия созидания'),
  mkM(2, 'Энергия очищения'),
  mkM(3, 'Энергия жизни'),
]
let users = Array.from({ length: 14 }, (_, i) => mkU(i + 1))

function mkP(id, title, block, audioCells, published, extra = {}) {
  const audio = {}
  for (const v of ['male', 'female']) for (const m of [1, 2, 3]) audio[`${v}_music${m}`] = audioCells[`${v}_music${m}`] || null
  const filled = Object.values(audio).filter(Boolean).length
  const first = Object.values(audio).find(Boolean)
  return {
    id, slug: `p${id}`, title, block,
    description: extra.description || '', price: extra.price ?? null,
    order: id, monthSlot: extra.monthSlot ?? null,
    durationSec: first?.durationSec || 0, published,
    audio, audioFilled: filled, updatedAt: new Date(0).toISOString(),
  }
}
function mkV(id, name, code) {
  return { id, name, code, active: true, order: id, audioFull: fakeMedia('voice-full.mp3', 1180), audioPreview: fakeMedia('voice-prev.mp3', 8) }
}
function mkM(id, title) {
  return { id, title, active: true, order: id, audioFull: fakeMedia('music-full.mp3', 600), audioPreview: fakeMedia('music-prev.mp3', 9) }
}
function mkU(id) {
  const src = id % 3 === 0 ? 'TG' : id % 3 === 1 ? 'VK' : 'email'
  const active = id % 2 === 0
  return {
    id,
    name: src === 'email' ? `user${id}` : src === 'TG' ? `Аня ${id}` : null,
    email: src === 'email' ? `user${id}@mail.ru` : null,
    tgUserId: src === 'TG' ? `88${id}1234` : null,
    vkUserId: src === 'VK' ? `7${id}40021` : null,
    source: src,
    createdAt: new Date(1746000000000 + id * 86400000).toISOString(),
    subscription: active ? { active: true, tier: id % 4 === 0 ? 'all-inclusive' : 'awareness', expiresAt: new Date(1780000000000 + id * 86400000).toISOString() } : null,
  }
}

// ── helpers ──
const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}
const readBody = (req) =>
  new Promise((resolve) => {
    let d = ''
    req.on('data', (c) => (d += c))
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}) } catch { resolve({}) } })
  })
const drain = (req) => new Promise((r) => { req.on('data', () => {}); req.on('end', r) })

const ADMIN = { id: 1, email: 'demo@all-relaxme.ru', name: 'Демо-админ', role: 'admin' }

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x')
  const m = req.method
  const seg = pathname.replace(/^\/api\//, '').split('/')
  await new Promise((r) => setTimeout(r, 120)) // лёгкая задержка как у живого API

  try {
    // auth
    if (pathname === '/api/admin/login' && m === 'POST') { await readBody(req); return json(res, 200, { token: 'mock.token', admin: ADMIN }) }
    if (pathname === '/api/admin/me') return json(res, 200, { admin: ADMIN })

    // media upload
    if (pathname === '/api/admin/media' && m === 'POST') { await drain(req); return json(res, 200, { media: fakeMedia('uploaded.mp3', 600 + Math.floor((mediaSeq % 5) * 120)) }) }

    // practices
    if (pathname === '/api/admin/practices' && m === 'GET') return json(res, 200, { items: practices })
    if (pathname === '/api/admin/practices' && m === 'POST') {
      const b = await readBody(req); const id = Math.max(0, ...practices.map((p) => p.id)) + 1
      const p = mkP(id, b.title, b.block, mapAudio(b.audio), !!b.published, b); practices.push(p); return json(res, 200, { practice: p })
    }
    if (pathname === '/api/admin/practices/reorder' && m === 'POST') { const b = await readBody(req); b.orderedIds?.forEach((id, i) => { const p = practices.find((x) => x.id === id); if (p) p.order = i }); return json(res, 200, { ok: true }) }
    if (seg[1] === 'admin' && seg[2] === 'practices' && seg[3]) {
      const id = Number(seg[3]); const idx = practices.findIndex((p) => p.id === id)
      if (m === 'GET') return idx < 0 ? json(res, 404, { error: 'нет' }) : json(res, 200, { practice: practices[idx] })
      if (m === 'PUT') { const b = await readBody(req); const cur = practices[idx]; const audio = b.audio ? mapAudio(b.audio) : audioFromForm(cur); const np = mkP(id, b.title ?? cur.title, b.block ?? cur.block, audio, b.published ?? cur.published, b); practices[idx] = np; return json(res, 200, { practice: np }) }
      if (m === 'DELETE') { practices = practices.filter((p) => p.id !== id); return json(res, 200, { ok: true }) }
    }

    // voices
    if (pathname === '/api/admin/voices' && m === 'GET') return json(res, 200, { items: voices })
    if (pathname === '/api/admin/voices' && m === 'POST') { const b = await readBody(req); const id = Math.max(0, ...voices.map((v) => v.id)) + 1; const v = { id, name: b.name, code: b.code, active: b.active ?? true, order: id, audioFull: b.audioFullId ? fakeMedia() : null, audioPreview: b.audioPreviewId ? fakeMedia('p.mp3', 8) : null }; voices.push(v); return json(res, 200, { voice: v }) }
    if (pathname === '/api/admin/voices/reorder') { await readBody(req); return json(res, 200, { ok: true }) }
    if (seg[1] === 'admin' && seg[2] === 'voices' && seg[3]) { const id = Number(seg[3]); const idx = voices.findIndex((v) => v.id === id); if (m === 'PUT') { const b = await readBody(req); voices[idx] = { ...voices[idx], ...b, audioFull: voices[idx].audioFull, audioPreview: voices[idx].audioPreview }; return json(res, 200, { voice: voices[idx] }) } if (m === 'DELETE') { voices = voices.filter((v) => v.id !== id); return json(res, 200, { ok: true }) } }

    // music
    if (pathname === '/api/admin/music' && m === 'GET') return json(res, 200, { items: music })
    if (pathname === '/api/admin/music' && m === 'POST') { const b = await readBody(req); const id = Math.max(0, ...music.map((x) => x.id)) + 1; const t = { id, title: b.title, active: b.active ?? true, order: id, audioFull: fakeMedia(), audioPreview: fakeMedia('p.mp3', 9) }; music.push(t); return json(res, 200, { track: t }) }
    if (pathname === '/api/admin/music/reorder') { await readBody(req); return json(res, 200, { ok: true }) }
    if (seg[1] === 'admin' && seg[2] === 'music' && seg[3]) { const id = Number(seg[3]); const idx = music.findIndex((x) => x.id === id); if (m === 'PUT') { const b = await readBody(req); music[idx] = { ...music[idx], ...b, audioFull: music[idx].audioFull, audioPreview: music[idx].audioPreview }; return json(res, 200, { track: music[idx] }) } if (m === 'DELETE') { music = music.filter((x) => x.id !== id); return json(res, 200, { ok: true }) } }

    // dashboard
    if (pathname === '/api/admin/stats') return json(res, 200, { users: users.length, activeSubs: users.filter((u) => u.subscription?.active).length, checkins: 312, ktEntries: 87 })
    if (pathname === '/api/admin/users' && m === 'GET') { const u = new URL(req.url, 'http://x'); const s = (u.searchParams.get('search') || '').toLowerCase(); const onlyA = u.searchParams.get('onlyActive') === 'true'; let list = users; if (s) list = list.filter((x) => [x.name, x.email, x.tgUserId, x.vkUserId].some((v) => String(v || '').toLowerCase().includes(s))); if (onlyA) list = list.filter((x) => x.subscription?.active); return json(res, 200, { items: list, total: list.length, page: 1, pageSize: 50 }) }
    if (seg[1] === 'admin' && seg[2] === 'users' && seg[3] && seg[4] === 'subscription') { await readBody(req); const u = users.find((x) => x.id === Number(seg[3])); if (u) { if (seg[5] === 'grant') u.subscription = { active: true, tier: 'awareness', expiresAt: new Date(1790000000000).toISOString() }; if (seg[5] === 'revoke' && u.subscription) u.subscription.active = false } return json(res, 200, { ok: true }) }
    if (seg[1] === 'admin' && seg[2] === 'users' && seg[3]) { const u = users.find((x) => x.id === Number(seg[3])); if (!u) return json(res, 404, { error: 'нет' }); return json(res, 200, { user: u, checkins: [{ id: 1, q1: 7, q2: 6, q3: 8, q4: 5, is: 4, createdAt: u.createdAt }, { id: 2, q1: 6, q2: 7, q3: 7, q4: 6, is: 3, createdAt: u.createdAt }], ktEntries: [{ id: 1, it: 0.6, io: 0.4, kt: 1.5, createdAt: u.createdAt }], completions: [{ practiceId: 'p1', completedAt: u.createdAt }, { practiceId: 'p4', completedAt: u.createdAt }], trackerDays: 12 }) }

    json(res, 404, { error: `mock: нет роута ${m} ${pathname}` })
  } catch (e) {
    json(res, 500, { error: String(e?.message || e) })
  }
})

function mapAudio(a = {}) {
  const out = {}
  for (const v of ['male', 'female']) for (const mm of [1, 2, 3]) {
    const k = `${v}_music${mm}`
    out[k] = a[k] ? fakeMedia('cell.mp3', 1180) : null
  }
  return out
}
function audioFromForm(p) {
  const a = {}
  for (const k of Object.keys(p.audio)) a[k] = p.audio[k] ? p.audio[k].id : null
  return a
}

server.listen(3001, '127.0.0.1', () => console.log('mock CMS API → http://127.0.0.1:3001'))
