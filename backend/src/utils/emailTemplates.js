// HTML-шаблоны писем в дизайн-системе Meditation.
//
// Принципы:
// - Inline styles (большинство почтовых клиентов вырезают <style> в head)
// - Table-based layout (Gmail/Outlook/Apple Mail работают со старым HTML)
// - Ширина 600px (стандарт для desktop), responsive до мобильных
// - Тёмная палитра + лиловый акцент = совпадает с UI приложения:
//     bg-0   #11101a  (фон письма)
//     bg-1   #1a1626  (карточка/панель)
//     fg-0   #f4f0ff  (заголовки, основной текст)
//     fg-2   #c8bfde  (вторичный текст)
//     fg-3   #847899  (мета, подписи)
//     lilac  #6145c2  (акцент, ссылки, CTA)
//     border rgba(180,160,255,.16)
// - Серифный заголовок: Georgia (web-safe fallback)
// - Sans-serif body: system font stack
// - mono-uppercase лейбл сверху как в аппке

const BRAND = {
  bg0: '#11101a',
  bg1: '#1a1626',
  fg0: '#f4f0ff',
  fg2: '#c8bfde',
  fg3: '#847899',
  lilac: '#6145c2',
  lilacLight: '#a796f0',
  border: 'rgba(180, 160, 255, 0.16)',
}

// Базовый layout: фирменная шапка + контент + футер.
// Все блоки в таблицах (для совместимости с почтовыми клиентами).
function shell({ title, intro, contentHtml, ctaLabel, ctaUrl, footer }) {
  const cta = ctaLabel && ctaUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto 0;">
        <tr>
          <td bgcolor="${BRAND.lilac}" style="border-radius: 999px;">
            <a href="${ctaUrl}"
               style="display: inline-block; padding: 14px 32px; color: #ffffff;
                      text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
                      font-size: 15px; font-weight: 600; letter-spacing: 0.01em;
                      border-radius: 999px;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bg0}; color: ${BRAND.fg0};
             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
             -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Preheader (скрытый short-preview для inbox-списка) -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">
    ${escapeHtml(intro || title)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         style="background-color: ${BRAND.bg0};">
    <tr>
      <td align="center" style="padding: 40px 16px 24px;">

        <!-- Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="max-width: 600px; width: 100%; background-color: ${BRAND.bg1};
                      border: 1px solid ${BRAND.border}; border-radius: 16px;
                      box-shadow: 0 4px 32px rgba(0,0,0,0.4);">

          <!-- Brand bar -->
          <tr>
            <td align="center" style="padding: 28px 32px 0;">
              <div style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 11px;
                          letter-spacing: 0.18em; color: ${BRAND.lilacLight}; text-transform: uppercase;">
                Meditation
              </div>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding: 8px 32px 0;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif;
                         font-weight: 400; font-size: 28px; line-height: 1.3;
                         color: ${BRAND.fg0};">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding: 24px 32px 8px; font-size: 15px; line-height: 1.6; color: ${BRAND.fg2};">
              ${contentHtml}
            </td>
          </tr>

          ${cta ? `<tr><td align="center" style="padding: 0 32px;">${cta}</td></tr>` : ''}

          <!-- Spacer -->
          <tr><td style="padding: 16px 32px 32px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; border-top: 1px solid ${BRAND.border};
                       font-size: 12px; color: ${BRAND.fg3}; text-align: center;">
              ${footer || defaultFooter()}
            </td>
          </tr>

        </table>
        <!-- /Container -->

        <!-- Outer footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="max-width: 600px; width: 100%; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 11px; color: ${BRAND.fg3}; line-height: 1.6;">
              <a href="https://all-relaxme.ru/" style="color: ${BRAND.fg3}; text-decoration: none;">
                all-relaxme.ru
              </a>
              &nbsp;·&nbsp;
              <a href="https://t.me/Pause_relax_bot" style="color: ${BRAND.fg3}; text-decoration: none;">
                @Pause_relax_bot
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

function defaultFooter() {
  return `Это письмо отправлено автоматически, отвечать не нужно.<br/>
          Если ты не подписывался на нашу аппку — просто проигнорируй.`
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ────────────────────────────────────────────────────────────────────────
// Шаблоны конкретных писем
// ────────────────────────────────────────────────────────────────────────

/**
 * Письмо восстановления доступа.
 * Сейчас без одноразового токена — обычная информашка с CTA на /login.
 * Когда добавим reset-token flow — заменим ctaUrl на ссылку с токеном.
 */
export function passwordReset({ name } = {}) {
  const hello = name ? `Привет, ${escapeHtml(name)}.` : 'Привет.'
  return {
    subject: 'Восстановление доступа · Meditation',
    text:
      `${name ? `Привет, ${name}.` : 'Привет.'}\n\n` +
      'Кто-то запросил восстановление доступа к твоему аккаунту в Meditation.\n\n' +
      'Если это ты — открой приложение и попробуй войти снова:\n' +
      'https://all-relaxme.ru/auth/login\n\n' +
      'Если это не ты — просто проигнорируй это письмо. Ничего не произошло.',
    html: shell({
      title: 'Восстановление доступа',
      intro: 'Кто-то запросил восстановление пароля',
      contentHtml: `
        <p style="margin: 0 0 16px;">${hello}</p>
        <p style="margin: 0 0 16px;">
          Кто-то запросил восстановление доступа к твоему аккаунту в Meditation.
          Если это был ты — открой приложение и попробуй войти снова.
        </p>
        <p style="margin: 0; color: ${BRAND.fg3};">
          Если это не ты — просто проигнорируй это письмо. Ничего не произошло,
          твой аккаунт в безопасности.
        </p>
      `,
      ctaLabel: 'Открыть приложение',
      ctaUrl: 'https://all-relaxme.ru/auth/login',
    }),
  }
}

/**
 * Welcome-письмо после успешной регистрации через email/пароль.
 * Тёплый, короткий, с CTA на главный экран приложения.
 */
export function welcomeEmail({ name } = {}) {
  const hello = name
    ? `Привет, ${escapeHtml(name)}.`
    : 'Привет.'
  return {
    subject: 'Добро пожаловать в Meditation',
    text:
      `${name ? `Привет, ${name}.` : 'Привет.'}\n\n` +
      'Ты с нами — рады знакомству.\n\n' +
      'Внутри тебя ждут три блока:\n' +
      '  · «Точка тишины» — четыре бесплатные практики расслабления, доступны сразу.\n' +
      '  · «Пароль от жизни» — шесть практик осознанности по подписке.\n' +
      '  · «Поток из пространства» — авторские медитации и подкаст.\n\n' +
      'Войти и начать:\n' +
      'https://all-relaxme.ru/\n\n' +
      'Если возникнут вопросы — просто ответь на это письмо, мы прочитаем.',
    html: shell({
      title: 'Добро пожаловать',
      intro: 'Спасибо что присоединились к Meditation',
      contentHtml: `
        <p style="margin: 0 0 16px;">${hello}</p>
        <p style="margin: 0 0 18px;">
          Ты с нами — рады знакомству. Внутри тебя ждут <b>три блока практик</b>,
          выстроенные как путь: от мягкого расслабления до глубокой осознанности.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
               style="margin: 8px 0 18px;">
          <tr>
            <td style="padding: 12px 14px; background: rgba(180,160,255,0.05);
                       border: 1px solid ${BRAND.border}; border-radius: 10px;">
              <div style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 10px;
                          letter-spacing: 0.18em; color: ${BRAND.lilacLight}; text-transform: uppercase;
                          margin-bottom: 6px;">
                01 · Точка тишины
              </div>
              <div style="font-size: 14px; line-height: 1.55; color: ${BRAND.fg1};">
                Четыре бесплатные практики расслабления. Можно начать прямо сейчас.
              </div>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 14px; background: rgba(180,160,255,0.05);
                       border: 1px solid ${BRAND.border}; border-radius: 10px;">
              <div style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 10px;
                          letter-spacing: 0.18em; color: ${BRAND.lilacLight}; text-transform: uppercase;
                          margin-bottom: 6px;">
                02 · Пароль от жизни
              </div>
              <div style="font-size: 14px; line-height: 1.55; color: ${BRAND.fg1};">
                Шесть практик осознанности — по подписке. Переход из тревоги в присутствие.
              </div>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 14px; background: rgba(180,160,255,0.05);
                       border: 1px solid ${BRAND.border}; border-radius: 10px;">
              <div style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 10px;
                          letter-spacing: 0.18em; color: ${BRAND.lilacLight}; text-transform: uppercase;
                          margin-bottom: 6px;">
                03 · Поток из пространства
              </div>
              <div style="font-size: 14px; line-height: 1.55; color: ${BRAND.fg1};">
                Авторские медитации и подкаст. Глубина — для тех, кто готов.
              </div>
            </td>
          </tr>
        </table>
        <p style="margin: 0; color: ${BRAND.fg3}; font-size: 13px;">
          Если возникнут вопросы — просто ответь на это письмо, мы прочитаем.
        </p>
      `,
      ctaLabel: 'Открыть приложение',
      ctaUrl: 'https://all-relaxme.ru/',
    }),
  }
}

/**
 * Уведомление админу о новом фидбеке через форму ОС в Profile.
 */
export function feedbackNotification({ type, message, fromName, fromEmail, userId }) {
  const typeLabel = {
    review: 'Благодарность',
    question: 'Вопрос',
    bug: 'Баг-репорт',
    other: 'Сообщение',
  }[type] || 'Сообщение'

  const fromLine = fromName
    ? `${escapeHtml(fromName)}${fromEmail ? ` &lt;${escapeHtml(fromEmail)}&gt;` : ''}`
    : (fromEmail || 'аноним')

  return {
    subject: `Meditation · ${typeLabel.toLowerCase()} от ${fromName || fromEmail || 'аноним'}`,
    text:
      `Тип: ${typeLabel}\n` +
      `От: ${fromName || ''}${fromEmail ? ` <${fromEmail}>` : ''}\n` +
      (userId ? `User ID: ${userId}\n` : '') +
      `Время: ${new Date().toISOString()}\n\n` +
      `Сообщение:\n${message}`,
    html: shell({
      title: typeLabel,
      intro: `${typeLabel} от ${fromName || fromEmail || 'юзера'}`,
      contentHtml: `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
               style="margin-bottom: 24px;">
          <tr>
            <td style="padding-bottom: 8px;">
              <div style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 10px;
                          letter-spacing: 0.18em; color: ${BRAND.fg3}; text-transform: uppercase;">
                От
              </div>
              <div style="margin-top: 4px; font-size: 15px; color: ${BRAND.fg0};">
                ${fromLine}
              </div>
            </td>
          </tr>
          ${userId ? `
          <tr>
            <td style="padding-top: 8px;">
              <div style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 10px;
                          letter-spacing: 0.18em; color: ${BRAND.fg3}; text-transform: uppercase;">
                User ID
              </div>
              <div style="margin-top: 4px; font-size: 14px; color: ${BRAND.fg2}; font-family: monospace;">
                #${userId}
              </div>
            </td>
          </tr>` : ''}
        </table>

        <div style="background: rgba(180,160,255,0.06); border: 1px solid ${BRAND.border};
                    border-radius: 12px; padding: 18px 20px;">
          <div style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 10px;
                      letter-spacing: 0.18em; color: ${BRAND.fg3}; text-transform: uppercase;
                      margin-bottom: 10px;">
            Сообщение
          </div>
          <div style="font-size: 15px; line-height: 1.65; color: ${BRAND.fg0};
                      white-space: pre-wrap;">
            ${escapeHtml(message)}
          </div>
        </div>
      `,
      ctaLabel: 'Открыть в админке',
      ctaUrl: 'https://all-relaxme.ru/manage/feedback',
      footer: `Управление откликами — <a href="https://all-relaxme.ru/manage/feedback"
                                          style="color: ${BRAND.lilacLight}; text-decoration: none;">/manage/feedback</a>`,
    }),
  }
}
