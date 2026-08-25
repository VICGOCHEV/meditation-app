import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ScreenShell from '../../components/ui/ScreenShell'
import LegalBody from '../../components/ui/LegalBody'
import { fetchLegalDoc } from '../../api/legal'

// Страница юридического документа: /legal/:slug.
//
// Публичный роут — открывается в том числе с экрана регистрации, до входа.
// Документы, которые владелец ведёт файлом (PDF), сюда не ведут вообще:
// у них ссылка сразу указывает на файл (см. utils/legalDocs.js на бэке).

export default function Legal() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing

  useEffect(() => {
    let alive = true
    setState('loading')
    fetchLegalDoc(slug)
      .then((d) => {
        if (!alive) return
        setDoc(d)
        setState('ready')
      })
      .catch(() => {
        if (alive) setState('missing')
      })
    return () => { alive = false }
  }, [slug])

  return (
    <ScreenShell>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 transition-colors hover:text-fg-1"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Назад
      </button>

      {state === 'loading' && (
        <div className="py-16 text-center text-[13px] text-fg-3">Загружаем документ…</div>
      )}

      {state === 'missing' && (
        <div className="py-16 text-center">
          <div className="text-[15px] text-fg-1">Документ не найден</div>
          <div className="mt-2 text-[13px] text-fg-3">
            Возможно, он был переименован или снят с публикации.
          </div>
        </div>
      )}

      {state === 'ready' && doc && (
        <>
          <h1 className="text-[22px] font-semibold leading-tight text-fg-0">{doc.title}</h1>
          {doc.version && (
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
              {doc.version}
            </div>
          )}

          <div className="mt-7">
            <LegalBody text={doc.body} />
          </div>

          {/* Документ может вестись и текстом, и подписанным файлом сразу —
              тогда даём скачать оригинал. */}
          {doc.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-line-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-2 transition-colors hover:text-fg-0"
            >
              Скачать PDF
            </a>
          )}
        </>
      )}
    </ScreenShell>
  )
}
