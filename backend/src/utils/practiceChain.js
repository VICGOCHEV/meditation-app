import { db } from '../db.js'
import { buildChain } from './progressionRules.js'

// Доступ к БД вынесен из progressionRules, чтобы сами правила остались
// чистыми функциями и покрывались тестом (test/progressionRules.test.js)
// без поднятия Prisma.

/** Читает опубликованные практики и строит цепочку прогрессии. */
export async function loadChain() {
  const rows = await db.practice.findMany({
    where: { published: true },
    select: { slug: true, block: true, order: true },
    orderBy: { order: 'asc' },
  })
  return buildChain(rows)
}
