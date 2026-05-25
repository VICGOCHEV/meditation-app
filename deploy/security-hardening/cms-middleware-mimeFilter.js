'use strict'

// Strapi v5 global middleware: reject uploads whose mime type is not in
// the allow-list (audio/* and image/*). Drop at:
//   /opt/meditation-cms/src/middlewares/mimeFilter.js
// then register in config/middlewares.js as the string 'global::mimeFilter'.

const ALLOWED_PREFIXES = ['audio/', 'image/']

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    if (ctx.method !== 'POST' || !ctx.path.startsWith('/upload')) {
      return next()
    }
    const files = ctx.request?.files?.files
    if (files) {
      const list = Array.isArray(files) ? files : [files]
      for (const f of list) {
        const mime = (f.type || f.mimetype || '').toLowerCase()
        const ok = ALLOWED_PREFIXES.some((p) => mime.startsWith(p))
        if (!ok) {
          ctx.status = 415
          ctx.body = { error: { status: 415, name: 'UnsupportedMediaType',
            message: `MIME ${mime || 'unknown'} not allowed (audio/* or image/* only)` } }
          return
        }
      }
    }
    await next()
  }
}
