// Ненавязчивая юр. подвалка: 3 ссылки на PDF + реквизиты ИП.
// PDF лежат в application/public/docs/ — отдаются Vite напрямую.
// Открываем в новой вкладке (для TG Mini App работает как браузер).
//
// Используется на Profile и Subscription — везде, где юзер видит
// «свой раздел» или принимает оплату (152-ФЗ требует оферту рядом).
export default function LegalLinks() {
  const linkCls =
    'font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 hover:text-fg-1 transition-colors'
  const dot = 'font-mono text-[10px] text-fg-3/30 select-none'
  return (
    <div className="mt-10 mb-2 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2">
        <a
          href="/docs/user-agreement.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className={linkCls}
        >
          Оферта
        </a>
        <span className={dot}>·</span>
        <a
          href="/docs/privacy-policy.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className={linkCls}
        >
          Политика конфиденциальности
        </a>
        <span className={dot}>·</span>
        <a
          href="/docs/personal-data-consent.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className={linkCls}
        >
          Согласие на обработку
        </a>
      </div>
      <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3/60">
        ИП Смирнов А. В. · ИНН 590772796420
      </div>
    </div>
  )
}
