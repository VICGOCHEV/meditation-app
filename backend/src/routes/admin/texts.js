import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import { setSetting } from '../../utils/appSettings.js'
import {
  APP_TEXT_KEYS,
  APP_TEXT_NAMES,
  APP_TEXT_FIELDS,
  APP_TEXT_DEFAULTS,
  mergeTexts,
} from '../../utils/appTexts.js'

const MAX_LEN = 1000

// CMS: тексты приложения (подсказки прогрессии, финальная плашка практики).
// Хранятся в AppSetting под префиксом `text.`, отдаются аппке публичным
// /api/content/texts.
export async function adminTextsRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // GET /api/admin/texts → { items: [{name,label,hint,value,default}] }
  app.get('/admin/texts', async () => {
    const rows = await db.appSetting.findMany({
      where: { key: { startsWith: 'text.' } },
    })
    const values = mergeTexts(rows)
    return {
      items: APP_TEXT_FIELDS.map((f) => ({
        ...f,
        value: values[f.name],
        default: APP_TEXT_DEFAULTS[f.name],
      })),
    }
  })

  // PUT /api/admin/texts { <name>: string, ... }
  // Пустая строка — валидное значение: «не показывать этот текст».
  app.put('/admin/texts', async (req, reply) => {
    const patch = req.body || {}
    const names = APP_TEXT_NAMES.filter((n) => typeof patch[n] === 'string')
    if (names.length === 0) {
      return reply.code(400).send({ error: 'нечего обновлять' })
    }
    const tooLong = names.find((n) => patch[n].length > MAX_LEN)
    if (tooLong) {
      return reply.code(400).send({ error: `«${tooLong}»: больше ${MAX_LEN} символов` })
    }

    for (const name of names) {
      await setSetting(APP_TEXT_KEYS[name], patch[name])
    }

    const rows = await db.appSetting.findMany({
      where: { key: { startsWith: 'text.' } },
    })
    return { ok: true, values: mergeTexts(rows) }
  })
}
