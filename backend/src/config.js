import 'dotenv/config'

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT) || 3001,
  env: process.env.NODE_ENV || 'production',
  jwtSecret: process.env.JWT_SECRET,
  jwtTtl: process.env.JWT_TTL || '7d',
  // Comma-separated allow-list of Origin headers for CORS.
  // Empty = same-origin only; curl/native still work (no Origin sent).
  corsOrigins: process.env.CORS_ORIGINS || '',
}

if (!config.jwtSecret) {
  console.error('FATAL: JWT_SECRET not set in .env')
  process.exit(1)
}

if (config.jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long')
  process.exit(1)
}
