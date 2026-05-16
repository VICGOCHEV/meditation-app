import 'dotenv/config'

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT) || 3001,
  env: process.env.NODE_ENV || 'production',
  jwtSecret: process.env.JWT_SECRET,
  jwtTtl: process.env.JWT_TTL || '7d',
}

if (!config.jwtSecret) {
  console.error('FATAL: JWT_SECRET not set in .env')
  process.exit(1)
}
