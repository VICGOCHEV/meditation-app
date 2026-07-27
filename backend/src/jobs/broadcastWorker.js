import cron from 'node-cron'
import { db } from '../db.js'
import { sendMail } from '../utils/mailer.js'
import { sendMessage, sendPhoto, webAppKeyboard } from '../utils/tgBot.js'
import { buildEmailWhere, buildTgSubscriberWhere } from '../routes/admin/broadcast.js'

// Сколько адресатов обрабатываем за один тик (каждую минуту).
// Email: Selectel SMTP лимит ~30/мин — берём 25 с запасом.
// Telegram: лимит бота ~30 msg/сек, но relay + вежливость → та же пачка 25.
const BATCH_PER_TICK = 25

const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru/'

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

// Текст telegram-пуша: жирный заголовок (subject) + тело.
function buildTgText({ subject, body }) {
  return `<b>${escapeHtml(subject)}</b>\n\n${escapeHtml(body)}`
}

// Шаблон-обёртка для broadcast'а: subject + plain body → HTML письмо
// в дизайн-системе аппки. Минимум разметки чтобы Mail.ru не порезал.
function buildHtml({ subject, body }) {
  const escape = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Перевод строк → <br>
  const safeBody = escape(body).replace(/\n/g, '<br>')
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0a0714;font-family:Arial,sans-serif;color:#f4f0ff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="padding:24px;background:#110c20;border-radius:12px;border:1px solid rgba(180,160,255,0.16);">
      <div style="font-family:'SF Mono','Courier New',monospace;font-size:10px;letter-spacing:0.18em;
                  color:#b4a0ff;text-transform:uppercase;margin-bottom:14px;">
        ● RELAX ME
      </div>
      <h1 style="margin:0 0 16px;font-size:22px;color:#f4f0ff;line-height:1.25;">${escape(subject)}</h1>
      <div style="font-size:15px;line-height:1.55;color:#d9d2f0;">${safeBody}</div>
      <hr style="margin:24px 0;border:none;border-top:1px solid rgba(180,160,255,0.16);">
      <p style="margin:0;font-size:12px;color:#6e6290;">
        Сообщение от команды Relax Me · <a href="https://all-relaxme.ru/" style="color:#b4a0ff;text-decoration:none;">all-relaxme.ru</a>
      </p>
    </td></tr>
  </table>
</body></html>`
}

/**
 * Background-воркер для broadcast'ов. Каждую минуту:
 *  1. Берёт следующий pending или running job
 *  2. Выгребает batch из аудитории, исключая уже получивших (через
 *     отдельный sentTo лог — но мы упрощаем: используем sentCount + offset)
 *  3. Шлёт пачку через SMTP
 *  4. Обновляет sentCount / failedCount
 *  5. Если sent+failed >= totalCount — помечает status=done
 */
export function startBroadcastWorker(app) {
  cron.schedule('* * * * *', () => tick(app).catch((e) =>
    app.log.warn({ err: e?.message }, 'broadcast tick failed')
  ))
  app.log.info('broadcast worker started (every minute)')
}

// Ручной прогон одного тика (для скриптов/тестов) — как runOnce у notifier.js.
export { tick as runOnce }

async function tick(app) {
  // Берём один активный job (pending или running с самой ранней датой создания).
  const job = await db.broadcastJob.findFirst({
    where: { status: { in: ['pending', 'running'] } },
    orderBy: { createdAt: 'asc' },
  })
  if (!job) return

  // Переводим в running при первом тике
  if (job.status === 'pending') {
    await db.broadcastJob.update({
      where: { id: job.id },
      data: { status: 'running', lastTickAt: new Date() },
    })
  }

  const isTelegram = job.channel === 'telegram'

  // Выгребаем следующих получателей. Offset = sentCount + failedCount.
  // Telegram-канал шлёт ПОДПИСЧИКАМ БОТА (все, кто в боте), email — юзерам
  // с почтой. Пагинация по стабильному set'у (enabled не мутируем в процессе).
  const offset = job.sentCount + job.failedCount
  const recipients = isTelegram
    ? await db.tgSubscriber.findMany({
        where: buildTgSubscriberWhere(job.audience),
        select: { id: true, chatId: true },
        orderBy: { id: 'asc' },
        skip: offset,
        take: BATCH_PER_TICK,
      })
    : await db.user.findMany({
        where: buildEmailWhere(job.audience),
        select: { id: true, email: true, name: true },
        orderBy: { id: 'asc' },
        skip: offset,
        take: BATCH_PER_TICK,
      })

  if (recipients.length === 0) {
    // Аудитория исчерпана — помечаем как done
    await db.broadcastJob.update({
      where: { id: job.id },
      data: { status: 'done', finishedAt: new Date(), lastTickAt: new Date() },
    })
    app.log.info({ jobId: job.id, sent: job.sentCount, failed: job.failedCount }, 'broadcast done')
    return
  }

  let sent = 0
  let failed = 0

  if (isTelegram) {
    const text = buildTgText({ subject: job.subject, body: job.body })
    const keyboard = webAppKeyboard(MINI_APP_URL, 'Открыть приложение')
    for (const r of recipients) {
      try {
        if (job.imageUrl) {
          await sendPhoto(Number(r.chatId), job.imageUrl, text, {
            reply_markup: keyboard,
          })
        } else {
          await sendMessage(Number(r.chatId), text, { reply_markup: keyboard })
        }
        sent++
      } catch (e) {
        // Мёртвые чаты НЕ гасим здесь: пагинация тика идёт по skip/offset над
        // enabled-set'ом — если убрать строки в процессе, окно съедет и живые
        // получатели пропустятся. Заблокировавших вычистит notifier по фазам.
        failed++
        app.log.warn({ err: e?.message, subId: r.id }, 'broadcast tg send failed')
      }
    }
  } else {
    const html = buildHtml({ subject: job.subject, body: job.body })
    for (const r of recipients) {
      try {
        await sendMail({
          to: r.email,
          subject: job.subject,
          text: job.body,
          html,
        })
        sent++
      } catch (e) {
        failed++
        app.log.warn({ err: e?.message, userId: r.id }, 'broadcast send failed')
      }
    }
  }

  await db.broadcastJob.update({
    where: { id: job.id },
    data: {
      sentCount: { increment: sent },
      failedCount: { increment: failed },
      lastTickAt: new Date(),
    },
  })
}
