import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { fmtDate } from '../lib/format.js'

const TYPE_LABEL = {
  review:   'благодарность',
  question: 'вопрос',
  bug:      'баг',
  other:    'другое',
}

const STATUS_LABEL = {
  new:     'новый',
  read:    'прочитан',
  replied: 'отвечено',
}

function StatusChip({ status }) {
  const color =
    status === 'new'
      ? 'bg-[oklch(0.45_0.18_280/0.3)] text-fg-1'
      : status === 'read'
      ? 'bg-bg-3 text-fg-2'
      : 'bg-[oklch(0.4_0.1_150/0.25)] text-fg-1'
  return <span className={`chip ${color}`}>{STATUS_LABEL[status] || status}</span>
}

function TypeChip({ type }) {
  return <span className="chip bg-bg-3 text-fg-2">{TYPE_LABEL[type] || type}</span>
}

export default function Feedback() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('') // '' | 'new' | 'read' | 'replied'
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/feedback', {
        params: filter ? { status: filter } : {},
      })
      setRows(data || [])
    } catch (e) {
      toast.error(errText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function changeStatus(id, status) {
    try {
      await api.patch(`/admin/feedback/${id}`, { status })
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    } catch (e) {
      toast.error(errText(e))
    }
  }

  const newCount = rows.filter((r) => r.status === 'new').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg-0">Обратная связь</h1>
          <p className="mt-1 text-sm text-fg-3">
            Отзывы и вопросы юзеров из формы в Profile
            {filter ? '' : ` · новых: ${newCount}`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[
            { v: '',        l: 'Все' },
            { v: 'new',     l: 'Новые' },
            { v: 'read',    l: 'Прочитанные' },
            { v: 'replied', l: 'Отвеченные' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={
                'rounded-sm px-3 py-1.5 text-sm transition-colors ' +
                (filter === opt.v
                  ? 'bg-primary-btn text-white'
                  : 'bg-bg-2 text-fg-2 hover:text-fg-0')
              }
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card px-4 py-10 text-center text-fg-3">Загружаем…</div>
      ) : rows.length === 0 ? (
        <div className="card px-4 py-10 text-center text-fg-3">Пусто</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeChip type={r.type} />
                  <StatusChip status={r.status} />
                  <span className="text-xs text-fg-3">{fmtDate(r.createdAt)}</span>
                </div>
                <div className="flex gap-1.5 text-xs">
                  {r.status !== 'read' && (
                    <button
                      onClick={() => changeStatus(r.id, 'read')}
                      className="rounded-sm bg-bg-2 px-2 py-1 text-fg-2 hover:text-fg-0"
                    >
                      прочитано
                    </button>
                  )}
                  {r.status !== 'replied' && (
                    <button
                      onClick={() => changeStatus(r.id, 'replied')}
                      className="rounded-sm bg-bg-2 px-2 py-1 text-fg-2 hover:text-fg-0"
                    >
                      отвечено
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 text-sm font-medium text-fg-0">
                {r.name || 'аноним'}{' '}
                {r.email && <span className="text-fg-3">· {r.email}</span>}
                {r.userId && <span className="text-fg-3"> · user #{r.userId}</span>}
              </div>

              <div className="mt-1 whitespace-pre-wrap text-sm text-fg-1">
                {r.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
