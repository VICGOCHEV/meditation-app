// Аутентификация админа CMS. Отдельный контур от юзеров аппки.
//
// Админ-токен подписан тем же @fastify/jwt секретом, но несёт claim
// `kind: 'admin'` и `aid` (admin id) ВМЕСТО `id`. Это намеренно:
//  - юзерский authenticate() ищет payload.id → у админ-токена его нет → 401.
//  - adminAuthenticate() требует kind==='admin' → юзерский токен (только id)
//    сюда не пройдёт.
// Так два контура не пересекаются даже при совпадении числовых id.
import { db } from '../db.js'

export async function adminAuthenticate(req, reply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  const p = req.user // @fastify/jwt кладёт payload в req.user
  if (!p || p.kind !== 'admin' || !p.aid) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  const admin = await db.adminUser.findUnique({ where: { id: p.aid } })
  if (!admin) return reply.code(401).send({ error: 'Unauthorized' })
  req.admin = admin
}

// Гейт по роли. Деструктив (выдача подписок, удаление админов) — только 'admin'.
// async-хук: возврат reply корректно останавливает lifecycle.
export async function requireAdmin(req, reply) {
  if (req.admin?.role !== 'admin') {
    return reply.code(403).send({ error: 'Недостаточно прав' })
  }
}
