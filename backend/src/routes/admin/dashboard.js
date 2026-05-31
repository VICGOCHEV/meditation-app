import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'

// BigInt (tg/vk id) не сериализуется в JSON — приводим к строке.
function subForm(s) {
  if (!s) return null
  return {
    active: s.active,
    tier: s.tier,
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
  }
}

function userRow(u) {
  const source = u.tgUserId ? 'TG' : u.vkUserId ? 'VK' : u.email ? 'email' : '—'
  return {
    id: u.id,
    name: u.name || null,
    email: u.email || null,
    tgUserId: u.tgUserId ? u.tgUserId.toString() : null,
    vkUserId: u.vkUserId ? u.vkUserId.toString() : null,
    source,
    createdAt: u.createdAt.toISOString(),
    subscription: subForm(u.subscription),
  }
}

export async function adminDashboardRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // GET /api/admin/stats — карточки сверху дашборда.
  app.get('/admin/stats', async () => {
    const now = new Date()
    const [users, activeSubs, checkins, ktEntries] = await Promise.all([
      db.user.count(),
      db.subscription.count({ where: { active: true, expiresAt: { gt: now } } }),
      db.checkin.count(),
      db.ktEntry.count(),
    ])
    return { users, activeSubs, checkins, ktEntries }
  })

  // GET /api/admin/users?search=&page=&pageSize=&onlyActive=
  app.get('/admin/users', async (req) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 30))
    const search = (req.query.search || '').trim()
    const onlyActive = req.query.onlyActive === 'true'

    const where = {}
    if (search) {
      const or = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
      // поиск по числовому tg/vk id
      if (/^\d+$/.test(search)) {
        const big = BigInt(search)
        or.push({ tgUserId: big }, { vkUserId: big })
      }
      where.OR = or
    }
    if (onlyActive) {
      where.subscription = { is: { active: true, expiresAt: { gt: new Date() } } }
    }

    const [rows, total] = await Promise.all([
      db.user.findMany({
        where,
        include: { subscription: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ])
    return { items: rows.map(userRow), total, page, pageSize }
  })

  // GET /api/admin/users/:id — детальная карточка: подписка + последние замеры.
  app.get('/admin/users/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const u = await db.user.findUnique({
      where: { id },
      include: { subscription: true },
    })
    if (!u) return reply.code(404).send({ error: 'Юзер не найден' })

    const [checkins, ktEntries, completions, trackerDays] = await Promise.all([
      db.checkin.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.ktEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.practiceCompletion.findMany({ where: { userId: id }, orderBy: { completedAt: 'desc' } }),
      db.trackerDay.count({ where: { userId: id } }),
    ])

    return {
      user: userRow(u),
      checkins: checkins.map((c) => ({
        id: c.id, q1: c.q1, q2: c.q2, q3: c.q3, q4: c.q4, is: c.is_,
        createdAt: c.createdAt.toISOString(),
      })),
      ktEntries: ktEntries.map((k) => ({
        id: k.id, it: k.it, io: k.io, kt: k.kt, createdAt: k.createdAt.toISOString(),
      })),
      completions: completions.map((c) => ({
        practiceId: c.practiceId, completedAt: c.completedAt.toISOString(),
      })),
      trackerDays,
    }
  })
}
