import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import { getSetting, setSetting, SETTING_KEYS } from '../../utils/appSettings.js'
import { ROTATION_MODES, DEFAULT_ROTATION_MODE } from '../../utils/pushRotation.js'

// CMS: глобальные рубильники, которые владелец переключает без деплоя.
// Сейчас здесь режим ротации push-фраз; сюда же встанет гейт по VPN.
export async function adminSettingsRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // GET /api/admin/settings
  app.get('/admin/settings', async () => ({
    pushRotationMode: await getSetting(
      SETTING_KEYS.pushRotationMode,
      DEFAULT_ROTATION_MODE
    ),
  }))

  // PUT /api/admin/settings { pushRotationMode? }
  app.put('/admin/settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          pushRotationMode: { type: 'string', enum: ROTATION_MODES },
        },
      },
    },
  }, async (req, reply) => {
    if (typeof req.body.pushRotationMode === 'string') {
      await setSetting(SETTING_KEYS.pushRotationMode, req.body.pushRotationMode)
    } else {
      return reply.code(400).send({ error: 'нечего обновлять' })
    }
    return {
      ok: true,
      pushRotationMode: await getSetting(
        SETTING_KEYS.pushRotationMode,
        DEFAULT_ROTATION_MODE
      ),
    }
  })
}
