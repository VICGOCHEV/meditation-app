import 'dotenv/config'
import path from 'node:path'

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT) || 3001,
  env: process.env.NODE_ENV || 'production',
  jwtSecret: process.env.JWT_SECRET,
  jwtTtl: process.env.JWT_TTL || '7d',
  // Comma-separated allow-list of Origin headers for CORS.
  // Empty = same-origin only; curl/native still work (no Origin sent).
  corsOrigins: process.env.CORS_ORIGINS || '',

  // ── CMS (своя, замена Strapi) ──────────────────────────────────────────
  // Папка на диске для загруженного аудио. На проде — /opt/meditation-app/uploads.
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  // Публичный префикс URL медиа. Caddy на проде отдаёт его статикой; локально
  // отдаёт сам Fastify через @fastify/static.
  mediaUrlBase: process.env.MEDIA_URL_BASE || '/cms-media',
  // TTL админ-токена CMS (короче пользовательского).
  adminJwtTtl: process.env.ADMIN_JWT_TTL || '12h',
  // TTL для логина с галкой «Запомнить меня» — длиннее, чтобы клиент
  // не вводил пароль каждый день в собственный кабинет.
  adminJwtTtlRemember: process.env.ADMIN_JWT_TTL_REMEMBER || '30d',
  // Лимит размера одного аудиофайла (байт). По умолчанию 60 МБ.
  maxAudioBytes: Number(process.env.MAX_AUDIO_BYTES) || 60 * 1024 * 1024,
}

if (!config.jwtSecret) {
  console.error('FATAL: JWT_SECRET not set in .env')
  process.exit(1)
}

if (config.jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long')
  process.exit(1)
}
