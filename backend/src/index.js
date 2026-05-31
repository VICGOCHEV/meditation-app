import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { config } from './config.js'
import { db } from './db.js'
import { authenticate } from './middlewares/auth.js'
import { ensureUploadDir } from './utils/media.js'
import { healthRoute } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { progressRoutes } from './routes/progress.js'
import { practicesRoutes } from './routes/practices.js'
import { checkinRoutes } from './routes/checkin.js'
import { deepAnalysisRoutes } from './routes/deepAnalysis.js'
import { subscriptionRoutes } from './routes/subscription.js'
import { paymentRoutes } from './routes/payments.js'
import { contentRoutes } from './routes/content.js'
import { adminAuthRoutes } from './routes/admin/auth.js'
import { adminMediaRoutes } from './routes/admin/media.js'
import { adminPracticesRoutes } from './routes/admin/practices.js'
import { adminVoicesRoutes } from './routes/admin/voices.js'
import { adminMusicRoutes } from './routes/admin/music.js'
import { adminDashboardRoutes } from './routes/admin/dashboard.js'
import { adminSubscriptionsRoutes } from './routes/admin/subscriptions.js'

const app = Fastify({ logger: { level: 'info' }, trustProxy: true })

await app.register(sensible)
await app.register(helmet, {
  // API serves JSON only — disable CSP and frame-ancestors flag is enough.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
})

// CORS — explicit allow-list. CORS_ORIGINS in .env is comma-separated:
//   CORS_ORIGINS=http://212.43.148.208:8081,https://meditation.app
// In dev we fall back to localhost-only so curl/postman still work without
// an Origin header (those send none and the callback signals "skip CORS").
const allowedOrigins = (config.corsOrigins || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // server-to-server, curl, mobile native
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return cb(null, true)
    }
    // Don't throw — that becomes a noisy 500. Just signal "don't add CORS
    // headers" and the browser will block the response on its own.
    return cb(null, false)
  },
  credentials: true,
})

// Global rate-limit: gentle ceiling everywhere, tighter caps on auth routes
// applied via per-route config inside auth.js. Default error shape is
// { statusCode: 429, error: 'Too Many Requests', message: ... } which the
// frontend already handles like any other error response.
await app.register(rateLimit, {
  global: true,
  max: 120,
  timeWindow: '1 minute',
})

await app.register(jwt, { secret: config.jwtSecret })
app.decorate('authenticate', authenticate)

// CMS: загрузка аудио (multipart) + статика медиа. На проде статику отдаёт
// Caddy на /cms-media; локально (и как fallback) отдаёт Fastify.
await app.register(multipart, {
  limits: { fileSize: config.maxAudioBytes, files: 1 },
})
await ensureUploadDir()
await app.register(fastifyStatic, {
  root: config.uploadDir,
  prefix: `${config.mediaUrlBase}/`,
  decorateReply: false,
})

await app.register(healthRoute, { prefix: '/api' })
await app.register(authRoutes, { prefix: '/api' })
await app.register(progressRoutes, { prefix: '/api' })
await app.register(practicesRoutes, { prefix: '/api' })
await app.register(checkinRoutes, { prefix: '/api' })
await app.register(deepAnalysisRoutes, { prefix: '/api' })
await app.register(subscriptionRoutes, { prefix: '/api' })
await app.register(paymentRoutes, { prefix: '/api' })

// Публичный контент для аппки (замена Strapi)
await app.register(contentRoutes, { prefix: '/api' })

// CMS admin API
await app.register(adminAuthRoutes, { prefix: '/api' })
await app.register(adminMediaRoutes, { prefix: '/api' })
await app.register(adminPracticesRoutes, { prefix: '/api' })
await app.register(adminVoicesRoutes, { prefix: '/api' })
await app.register(adminMusicRoutes, { prefix: '/api' })
await app.register(adminDashboardRoutes, { prefix: '/api' })
await app.register(adminSubscriptionsRoutes, { prefix: '/api' })

const close = async () => {
  app.log.info('shutting down...')
  await app.close()
  await db.$disconnect()
  process.exit(0)
}
process.on('SIGINT', close)
process.on('SIGTERM', close)

app.listen({ host: config.host, port: config.port }).then(() => {
  app.log.info({ host: config.host, port: config.port }, 'meditation-api up')
})
