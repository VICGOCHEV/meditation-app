import { sendMessage, webAppKeyboard } from '../utils/tgBot.js'

// Webhook от Telegram → /api/tg/webhook. Принимает updates (см.
// https://core.telegram.org/bots/api#update). Реагируем на:
//   - /start (любые варианты, в т.ч. с deep-link параметром)
//   - /help, /menu — алиасы
//   - на остальные сообщения отвечаем тем же приветствием с кнопкой
//
// Безопасность: Telegram присылает заголовок X-Telegram-Bot-Api-Secret-Token,
// если при setWebhook был указан secret_token. Сравниваем — отбиваем
// поддельные вызовы.
//
// Откуда `MINI_APP_URL`: t.me/Pause_relax_bot/Relaxme (см. CLAUDE.md).
// Прямой web_app URL = тот же `all-relaxme.ru` (Mini App открывает корень
// фронта; через web_app initData backend сразу логинит юзера, см.
// /api/auth/tg-init).

const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru/'
const WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || ''

const WELCOME_TEXT = `<b>Привет 👋</b>

Это <b>Meditation</b> — твой путь к внутренней тишине. Мягкие практики
расслабления и осознанности, дыхание, ежедневный трекер состояния.

Жми кнопку ниже — приложение откроется прямо здесь, без регистрации
(твой Telegram-аккаунт распознается автоматически).`

const HELP_TEXT = `<b>Что я умею:</b>

/start — открыть приложение
/help — это сообщение

Внутри приложения:
• 3 бесплатные практики расслабления
• Курс осознанности по подписке (199 ₽/мес)
• «Всё включено» с авторскими (299 ₽/мес)
• Трекер состояния и глубокий анализ`

function isCommand(text, name) {
  if (!text) return false
  return text === `/${name}` || text.startsWith(`/${name} `) || text.startsWith(`/${name}@`)
}

export async function tgRoutes(app) {
  app.post('/tg/webhook', async (req, reply) => {
    // Проверка подписи (если задан секрет)
    if (WEBHOOK_SECRET) {
      const got = req.headers['x-telegram-bot-api-secret-token']
      if (got !== WEBHOOK_SECRET) {
        return reply.code(401).send({ ok: false })
      }
    }

    const update = req.body
    const msg = update?.message
    if (!msg?.chat?.id) {
      // Не сообщение (callback_query или прочее) — пока игнорируем,
      // отвечаем 200 чтобы TG не повторял.
      return { ok: true }
    }

    const chatId = msg.chat.id
    const text = msg.text || ''

    try {
      if (isCommand(text, 'start')) {
        await sendMessage(chatId, WELCOME_TEXT, {
          reply_markup: webAppKeyboard(MINI_APP_URL, 'Открыть приложение'),
        })
      } else if (isCommand(text, 'help') || isCommand(text, 'menu')) {
        await sendMessage(chatId, HELP_TEXT, {
          reply_markup: webAppKeyboard(MINI_APP_URL, 'Открыть приложение'),
        })
      } else {
        // На любое другое сообщение — тоже приветствие с кнопкой.
        // Не раздражаем, но и не молчим: юзер должен видеть путь к аппке.
        await sendMessage(chatId, 'Жми кнопку ниже — приложение откроется здесь же.', {
          reply_markup: webAppKeyboard(MINI_APP_URL, 'Открыть приложение'),
        })
      }
    } catch (e) {
      app.log.error({ err: e.message, chatId }, 'tg webhook handler failed')
      // 200 чтобы Telegram не ретраил — отдельный ретрай нам ни к чему.
    }

    return { ok: true }
  })
}
