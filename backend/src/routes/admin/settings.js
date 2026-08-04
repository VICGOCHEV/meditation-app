import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import { getSetting, setSetting, SETTING_KEYS } from '../../utils/appSettings.js'
import { ROTATION_MODES, DEFAULT_ROTATION_MODE } from '../../utils/pushRotation.js'

// CMS: глобальные рубильники, которые владелец переключает без деплоя.
// Сейчас здесь режим ротации push-фраз; сюда же встанет гейт по VPN.
export async function adminSettingsRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  const readAll = async () => ({
    pushRotationMode: await getSetting(
      SETTING_KEYS.pushRotationMode,
      DEFAULT_ROTATION_MODE
    ),
    // Гейт по умолчанию выключен: включать фичу, которая может закрыть вход,
    // должен человек осознанно.
    vpnGateEnabled: (await getSetting(SETTING_KEYS.vpnGateEnabled, '0')) === '1',
  })

  // GET /api/admin/settings
  app.get('/admin/settings', readAll)

  // PUT /api/admin/settings { pushRotationMode?, vpnGateEnabled? }
  app.put('/admin/settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          pushRotationMode: { type: 'string', enum: ROTATION_MODES },
          vpnGateEnabled: { type: 'boolean' },
        },
      },
    },
  }, async (req, reply) => {
    let touched = false
    if (typeof req.body.pushRotationMode === 'string') {
      await setSetting(SETTING_KEYS.pushRotationMode, req.body.pushRotationMode)
      touched = true
    }
    if (typeof req.body.vpnGateEnabled === 'boolean') {
      await setSetting(SETTING_KEYS.vpnGateEnabled, req.body.vpnGateEnabled ? '1' : '0')
      touched = true
    }
    if (!touched) return reply.code(400).send({ error: 'нечего обновлять' })
    return { ok: true, ...(await readAll()) }
  })
}
