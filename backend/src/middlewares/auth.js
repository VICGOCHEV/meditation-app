// Attach req.user (full User row) if a valid JWT is presented.
// Usage: register on each protected route with `preHandler: app.authenticate`.
import { db } from '../db.js'

export async function authenticate(req, reply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  const userId = req.user?.id
  if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  req.user = user
}
