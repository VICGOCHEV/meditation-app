import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import { config } from './config.js'
import { db } from './db.js'
import { authenticate } from './middlewares/auth.js'
import { healthRoute } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { progressRoutes } from './routes/progress.js'
import { practicesRoutes } from './routes/practices.js'
import { checkinRoutes } from './routes/checkin.js'
import { deepAnalysisRoutes } from './routes/deepAnalysis.js'
import { subscriptionRoutes } from './routes/subscription.js'

const app = Fastify({ logger: { level: 'info' }, trustProxy: true })

await app.register(sensible)
await app.register(cors, { origin: true, credentials: true })
await app.register(jwt, { secret: config.jwtSecret })
app.decorate('authenticate', authenticate)

await app.register(healthRoute, { prefix: '/api' })
await app.register(authRoutes, { prefix: '/api' })
await app.register(progressRoutes, { prefix: '/api' })
await app.register(practicesRoutes, { prefix: '/api' })
await app.register(checkinRoutes, { prefix: '/api' })
await app.register(deepAnalysisRoutes, { prefix: '/api' })
await app.register(subscriptionRoutes, { prefix: '/api' })

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
