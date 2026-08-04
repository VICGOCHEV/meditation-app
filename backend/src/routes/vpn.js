import { checkIp, vpnCheckConfigured } from '../utils/vpnCheck.js'
import { getSetting, SETTING_KEYS } from '../utils/appSettings.js'

// GET /api/vpn-check — публичный: заглушка показывается ДО онбординга и
// авторизации, токена на этот момент ещё нет.
//
// Отвечает { gateEnabled, blocked }. Если рубильник в CMS выключен или
// провайдер не сконфигурирован — внешний сервис не дёргается вообще, лимиты
// платного API не тратятся.
//
// Ключ идемпотентности не нужен: ответ кешируется по IP на 15 минут внутри
// utils/vpnCheck.js.

const rateLimited = {
  config: {
    // Заглушка показывается один раз за сессию + кнопка «Обновить».
    // 20/мин на IP с запасом, поверх глобальных 120/мин.
    rateLimit: { max: 20, timeWindow: '1 minute' },
  },
}

export async function vpnRoutes(app) {
  app.get('/vpn-check', rateLimited, async (req) => {
    const enabled = (await getSetting(SETTING_KEYS.vpnGateEnabled, '0')) === '1'
    if (!enabled || !vpnCheckConfigured()) {
      return { gateEnabled: false, blocked: false }
    }

    const verdict = await checkIp(req.ip)

    // Логируем каждое срабатывание и каждую ошибку детекции — по этим строкам
    // потом решается, не слишком ли агрессивен порог.
    if (verdict.blocked || verdict.source === 'error') {
      app.log.warn(
        {
          ip: req.ip,
          source: verdict.source,
          flags: verdict.flags,
          blocked: verdict.blocked,
          err: verdict.error,
        },
        verdict.blocked ? 'vpn gate triggered' : 'vpn gate check failed (fail-open)'
      )
    }

    return { gateEnabled: true, blocked: verdict.blocked }
  })
}
