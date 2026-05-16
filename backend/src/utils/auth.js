import bcrypt from 'bcrypt'

const ROUNDS = 10

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS)
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)

// Map a User row to the public {id, email, name} shape the frontend expects.
export const toPublicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name || (u.email ? u.email.split('@')[0] : 'Практик'),
})
