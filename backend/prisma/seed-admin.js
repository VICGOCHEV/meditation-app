// Создаёт (или обновляет пароль) первого админа CMS.
//
// Запуск:
//   ADMIN_EMAIL=client@all-relaxme.ru ADMIN_PASSWORD='...' node prisma/seed-admin.js
// либо:
//   node prisma/seed-admin.js client@all-relaxme.ru 'СильныйПароль' admin
//
// role: admin (полный, может выдавать подписки) | editor (только контент).
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const db = new PrismaClient()

const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').toLowerCase().trim()
const password = process.env.ADMIN_PASSWORD || process.argv[3] || ''
const role = process.env.ADMIN_ROLE || process.argv[4] || 'admin'

if (!email || !password) {
  console.error('Нужны email и пароль. Пример:')
  console.error("  node prisma/seed-admin.js admin@example.com 'Пароль123' admin")
  process.exit(1)
}
if (password.length < 8) {
  console.error('Пароль минимум 8 символов.')
  process.exit(1)
}

const passwordHash = await bcrypt.hash(password, 12)
const admin = await db.adminUser.upsert({
  where: { email },
  create: { email, passwordHash, role, name: email.split('@')[0] },
  update: { passwordHash, role },
})

console.log(`✓ Админ готов: ${admin.email} (role: ${admin.role}, id: ${admin.id})`)
await db.$disconnect()
