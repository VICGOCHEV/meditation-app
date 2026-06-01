// Регистрация webhook'а Telegram-бота — запускать вручную после
// каждого изменения URL или secret'а. Идемпотентно: TG просто
// перезапишет registration. Можно гонять сколько хочешь.
//
// Запуск:
//   cd /opt/meditation-app/backend
//   TG_WEBHOOK_URL=https://all-relaxme.ru/api/tg/webhook node scripts/tg-set-webhook.js
//
// Проверить что зарегано:
//   curl https://api.telegram.org/bot${TG_BOT_TOKEN}/getWebhookInfo
//
// Очистить (например при отладке через polling):
//   curl https://api.telegram.org/bot${TG_BOT_TOKEN}/deleteWebhook

import 'dotenv/config'
import { setWebhook, getWebhookInfo } from '../src/utils/tgBot.js'

const url = process.env.TG_WEBHOOK_URL
if (!url) {
  console.error('FATAL: TG_WEBHOOK_URL не задан. Пример:')
  console.error('  TG_WEBHOOK_URL=https://all-relaxme.ru/api/tg/webhook node scripts/tg-set-webhook.js')
  process.exit(1)
}

const secret = process.env.TG_WEBHOOK_SECRET || undefined

try {
  console.log(`Регистрирую webhook: ${url}`)
  if (secret) console.log('  + secret-token: установлен (TG будет слать в заголовке)')

  await setWebhook(url, secret)
  console.log('✓ setWebhook OK')

  const info = await getWebhookInfo()
  console.log('\nТекущий статус:')
  console.log(JSON.stringify(info, null, 2))
} catch (e) {
  console.error('FATAL:', e.message)
  process.exit(1)
}
