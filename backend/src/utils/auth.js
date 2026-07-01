import bcrypt from 'bcrypt'

// OWASP 2024: 12 rounds for production. Roughly 250 ms per hash on a
// modern x86 core — slow enough to make brute-force impractical, fast
// enough to keep login latency invisible.
const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS)
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)

// Map a User row to the public {id, email, name, source} shape the
// frontend expects. `source` — как юзер вошёл в аппку:
//   'vk' — VK Mini App (у него BigInt vkUserId, менять аккаунт нельзя,
//          требование модерации VK: «Пользователь не должен иметь
//          возможность выхода из аккаунта в сервисе»)
//   'tg' — Telegram Mini App
//   'email' — обычный email/пароль
export const toPublicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name || (u.email ? u.email.split('@')[0] : 'Практик'),
  source: u.vkUserId ? 'vk' : u.tgUserId ? 'tg' : 'email',
})
