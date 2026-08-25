import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLegalDocs } from '../../api/legal'
import { FALLBACK_LEGAL_DOCS, LEGAL_REQUISITES_DEFAULT } from '../../constants/legal'

// Ненавязчивая юр. подвалка: ссылки на документы + реквизиты.
//
// Состав больше НЕ захардкожен: документы и реквизиты приходят из CMS
// (раздел «Юр. документы» → /api/content/legal). Пока ответ не пришёл —
// показываем фолбэк из constants/legal.js, чтобы ссылки не мигали и не
// исчезали при обрыве сети.
//
// Документ, который владелец ведёт текстом, открывается страницей приложения
// (/legal/:slug). Документ-файл открывается прямой ссылкой на PDF в новой
// вкладке (в Telegram Mini App это штатный переход в браузер).
//
// Используется на Profile — там, где юзер видит «свой раздел».
export default function LegalLinks() {
  const [docs, setDocs] = useState(FALLBACK_LEGAL_DOCS)
  const [requisites, setRequisites] = useState(LEGAL_REQUISITES_DEFAULT)

  useEffect(() => {
    let alive = true
    fetchLegalDocs().then(({ items, requisites: r }) => {
      if (!alive) return
      setDocs(items)
      setRequisites(r)
    })
    return () => { alive = false }
  }, [])

  const linkCls =
    'font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 hover:text-fg-1 transition-colors'
  const dot = 'font-mono text-[10px] text-fg-3/30 select-none'

  const shown = docs.filter((d) => d.showInFooter !== false)
  if (shown.length === 0 && !requisites) return null

  return (
    <div className="mt-10 mb-2 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2">
        {shown.map((doc, i) => (
          <span key={doc.slug} className="contents">
            {i > 0 && <span className={dot}>·</span>}
            {doc.isPage ? (
              <Link to={doc.href} className={linkCls}>
                {doc.shortTitle || doc.title}
              </Link>
            ) : (
              <a href={doc.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {doc.shortTitle || doc.title}
              </a>
            )}
          </span>
        ))}
      </div>
      {requisites && (
        <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3/60">
          {requisites}
        </div>
      )}
    </div>
  )
}
