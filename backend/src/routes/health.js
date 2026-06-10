import { db } from '../db.js'

// Два endpoint'а:
//   GET /api/health  — лёгкий, для high-frequency пингов (UptimeRobot).
//                      Только подтверждает что процесс жив, без БД-запросов.
//   GET /api/health/full — глубокий, проверяет БД (SELECT 1) и возвращает
//                      uptime + версию node. Дороже, для self-watchdog'а
//                      раз в 5 минут.
export async function healthRoute(app) {
  app.get('/health', async () => ({ ok: true, ts: Date.now() }))

  app.get('/health/full', async (req, reply) => {
    const start = Date.now()
    let db_ok = false
    let db_ms = null
    try {
      const t0 = Date.now()
      await db.$queryRaw`SELECT 1`
      db_ms = Date.now() - t0
      db_ok = true
    } catch (e) {
      req.log?.warn({ err: e?.message }, 'health: db ping failed')
    }
    const status = db_ok ? 200 : 503
    return reply.code(status).send({
      ok: db_ok,
      ts: Date.now(),
      uptime_sec: Math.round(process.uptime()),
      node: process.version,
      db: { ok: db_ok, ms: db_ms },
      took_ms: Date.now() - start,
    })
  })
}
