import cron from 'node-cron'
import { db } from '../db.js'
import { sendMail } from '../utils/mailer.js'
import { sendMessage, sendPhoto, sendPhotoFile, photoFileId, webAppKeyboard } from '../utils/tgBot.js'
import { readLocalMediaByUrl } from '../utils/media.js'
import { buildEmailWhere, buildTgSubscriberWhere } from '../routes/admin/broadcast.js'

// Сколько адресатов обрабатываем за один тик (каждую минуту).
// Email: Selectel SMTP лимит ~30/мин — берём 25 с запасом.
// Telegram: лимит бота ~30 msg/сек, но relay + вежливость → та же пачка 25.
const BATCH_PER_TICK = 25

// Сколько часов pending-job без единой попытки считается протухшим.
// Защита от «воскрешения»: рассылка, у которой аудитория когда-то посчиталась
// в 0 (старая paid/free-сегментация Telegram), лежала в pending неделями.
// После фикса аудитории такой job на первом же тике улетел бы всем — это
// внезапная рассылка старого текста, которую никто не запускал.
const STALE_PENDING_HOURS = 24

// file_id уже загруженной в Telegram картинки, по jobId.
//
// Картинка уходит байтами (по ссылке Telegram её не заберёт — см. tgBot.js),
// но заливать один и тот же файл каждому получателю не нужно: после первой
// успешной отправки Telegram возвращает file_id, и остальным шлём уже по нему.
// Кеш живёт в памяти процесса — после рестарта файл просто зальётся ещё раз,
// это дешевле, чем колонка в БД ради временного значения.
const photoFileIdByJob = new Map()

// Лимит Telegram на подпись к фото. У обычного сообщения лимит 4096.
const TG_CAPTION_LIMIT = 1024

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
  // noOverlap: пачка из 25 отправок может не уложиться в минуту (Telegram
  // отвечает не мгновенно). Без опции следующий тик стартовал бы поверх
  // текущего и увёл бы курсор пагинации — часть получателей пропустилась бы.
  const task = cron.schedule('* * * * *', () => tick(app).catch((e) =>
    app.log.warn({ err: e?.message }, 'broadcast tick failed')
  ), { noOverlap: true })
  task.on?.('execution:overlap', () => {
    app.log.warn('broadcast tick skipped: предыдущий ещё выполняется')
  })
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

  // Протухший pending (создан давно, не отправлено ни одного сообщения) —
  // закрываем как failed, не рассылая. Иначе он забьёт очередь собой и/или
  // выстрелит устаревшим текстом. running не трогаем: большая рассылка
  // легально идёт сутками (25/мин).
  const staleBefore = new Date(Date.now() - STALE_PENDING_HOURS * 3600_000)
  if (job.status === 'pending' && job.createdAt < staleBefore) {
    await db.broadcastJob.update({
      where: { id: job.id },
      data: { status: 'failed', finishedAt: new Date(), lastTickAt: new Date() },
    })
    app.log.warn(
      { jobId: job.id, channel: job.channel, audience: job.audience, createdAt: job.createdAt },
      'broadcast skipped as stale pending'
    )
    return
  }

  // Переводим в running при первом тике
  if (job.status === 'pending') {
    await db.broadcastJob.update({
      where: { id: job.id },
      data: { status: 'running', lastTickAt: new Date() },
    })
  }

  const isTelegram = job.channel === 'telegram'

  // Выгребаем следующих получателей ПО КУРСОРУ, а не через skip.
  //
  // skip = sentCount + failedCount считал позицию в живой выборке: стоило
  // кому-то отписаться или подписаться посреди рассылки, и окно съезжало —
  // часть людей пропускалась, часть получала сообщение второй раз. Курсор по
  // id от изменений состава не зависит.
  //
  // Дополнительно не выходим за totalCount, посчитанный при создании job:
  // тот, кто подписался уже после запуска, не должен получить старую рассылку.
  const cursor = job.lastRecipientId || 0
  const processed = job.sentCount + job.failedCount
  const remaining = Math.max(0, job.totalCount - processed)
  const take = Math.min(BATCH_PER_TICK, remaining)

  const recipients = take === 0 ? [] : isTelegram
    ? await db.tgSubscriber.findMany({
        where: { AND: [buildTgSubscriberWhere(job.audience), { id: { gt: cursor } }] },
        select: { id: true, chatId: true },
        orderBy: { id: 'asc' },
        take,
      })
    : await db.user.findMany({
        where: { AND: [buildEmailWhere(job.audience), { id: { gt: cursor } }] },
        select: { id: true, email: true, name: true },
        orderBy: { id: 'asc' },
        take,
      })

  if (recipients.length === 0) {
    // Аудитория исчерпана. Рассылка, у которой не ушло ни одного сообщения,
    // это не «готово»: раньше такой job показывался в CMS зелёным `done`,
    // хотя все отправки упали (или получателей не нашлось вовсе).
    // Три исхода вместо двух: часть получателей могла не получить сообщение,
    // и зелёное «готово» это скрывало.
    const status =
      job.failedCount === 0 ? 'done'
        : job.sentCount === 0 ? 'failed'
          : 'partial'
    await db.broadcastJob.update({
      where: { id: job.id },
      data: { status, finishedAt: new Date(), lastTickAt: new Date() },
    })
    photoFileIdByJob.delete(job.id)
    app.log.info(
      {
        jobId: job.id,
        channel: job.channel,
        audience: job.audience,
        sent: job.sentCount,
        failed: job.failedCount,
        status,
      },
      'broadcast finished'
    )
    return
  }

  let sent = 0
  let failed = 0

  if (isTelegram) {
    const text = buildTgText({ subject: job.subject, body: job.body })
    const keyboard = webAppKeyboard(MINI_APP_URL, 'Открыть приложение')

    // Картинку читаем с диска ОДИН раз на тик, а не на каждого получателя.
    // null означает «URL не наш или файла нет» — тогда работаем как раньше,
    // ссылкой: для внешней картинки это по-прежнему рабочий путь.
    // Подпись к фото Telegram режет на 1024 символах. Раньше это происходило
    // молча — админ не знал, что часть текста не дошла.
    if (job.imageUrl && text.length > TG_CAPTION_LIMIT) {
      app.log.warn(
        { jobId: job.id, length: text.length, limit: TG_CAPTION_LIMIT },
        'broadcast caption truncated by Telegram limit'
      )
    }

    let fileId = job.imageUrl ? photoFileIdByJob.get(job.id) || null : null
    let localFile = null
    if (job.imageUrl && !fileId) {
      localFile = await readLocalMediaByUrl(job.imageUrl)
      if (!localFile) {
        app.log.warn(
          { jobId: job.id, imageUrl: job.imageUrl },
          'broadcast image not found locally, falling back to URL'
        )
      }
    }

    for (const r of recipients) {
      try {
        if (!job.imageUrl) {
          await sendMessage(Number(r.chatId), text, { reply_markup: keyboard })
        } else if (fileId) {
          // Уже залита — шлём по file_id, без повторной заливки.
          await sendPhoto(Number(r.chatId), fileId, text, { reply_markup: keyboard })
        } else if (localFile) {
          const msg = await sendPhotoFile(Number(r.chatId), localFile, text, {
            reply_markup: keyboard,
          })
          const id = photoFileId(msg)
          if (id) {
            fileId = id
            photoFileIdByJob.set(job.id, id)
          }
        } else {
          await sendPhoto(Number(r.chatId), job.imageUrl, text, {
            reply_markup: keyboard,
          })
        }
        sent++
      } catch (e) {
        // Мёртвые чаты НЕ гасим здесь: пагинация тика идёт по skip/offset над
        // enabled-set'ом — если убрать строки в процессе, окно съедет и живые
        // получатели пропустятся. Заблокировавших вычистит notifier по фазам.
        failed++
        app.log.warn({ err: e?.message, jobId: job.id, subId: r.id }, 'broadcast tg send failed')
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
        app.log.warn({ err: e?.message, jobId: job.id, userId: r.id }, 'broadcast send failed')
      }
    }
  }

  await db.broadcastJob.update({
    where: { id: job.id },
    data: {
      sentCount: { increment: sent },
      failedCount: { increment: failed },
      lastTickAt: new Date(),
      // Двигаем курсор на последнего обработанного — и при успехе, и при
      // ошибке: иначе упавший получатель блокировал бы всю очередь.
      lastRecipientId: recipients[recipients.length - 1].id,
    },
  })
}
