import * as Sentry from '@sentry/node'

// Лёгкая обёртка: Sentry активируется ТОЛЬКО если в env есть SENTRY_DSN.
// Без DSN init — no-op, никаких сетевых походов, ничего не ломается.
// Когда DSN появится, нужен лишь рестарт meditation-api.
let _initialized = false
export function initSentry() {
  if (_initialized) return
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.0, // только ошибки, без performance
    // PII: режем заголовки/тела запросов, чтобы не утекли JWT/initData/пароли.
    sendDefaultPii: false,
  })
  _initialized = true
}

// Fastify error-hook — отправляет в Sentry любые 5xx исключения.
export function sentryErrorHandler(app) {
  if (!_initialized) return
  app.setErrorHandler((err, req, reply) => {
    const status = reply.statusCode >= 400 ? reply.statusCode : err.statusCode || 500
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('route', req.routeOptions?.url || req.url)
        scope.setTag('method', req.method)
        scope.setUser({ id: req.user?.id ? String(req.user.id) : undefined })
        Sentry.captureException(err)
      })
    }
    reply.send(err)
  })
}
