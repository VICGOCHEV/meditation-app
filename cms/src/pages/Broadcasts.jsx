import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { IconPlus, IconCheck, IconClose } from '../ui/icons.jsx'

// Массовые email-рассылки. Поток: создаёшь job с subject/body/audience,
// он попадает в очередь, воркер бэка шлёт пачками по 25 писем в минуту.
// Прогресс виден в списке (sent/totalCount), статус пуллится каждые 5 сек
// для активной рассылки.

const AUDIENCES = [
  { value: 'all', label: 'Все юзеры', desc: 'Все, у кого есть email.' },
  { value: 'paid', label: 'С активной подпиской', desc: 'Только платящие.' },
  { value: 'free', label: 'Без подписки', desc: 'Зарегистрированные, но без активной подписки.' },
]

export default function Broadcasts() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { data } = await api.get('/admin/broadcasts')
      setJobs(data.jobs || [])
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  // Пуллим прогресс активных рассылок каждые 5 сек
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'running' || j.status === 'pending')
    if (!hasActive) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line
  }, [jobs])

  async function fetchPreview(aud) {
    setAudience(aud)
    try {
      const { data } = await api.post('/admin/broadcasts/preview', { audience: aud })
      setPreview(data.totalCount)
    } catch {
      setPreview(null)
    }
  }

  useEffect(() => { fetchPreview('all') }, []) // eslint-disable-line

  async function create(e) {
    e?.preventDefault?.()
    if (!subject.trim() || !body.trim()) return
    if (!confirm(`Точно отправить рассылку «${subject.trim()}» на ${preview ?? '?'} получателей?`)) return
    setBusy(true)
    try {
      await api.post('/admin/broadcasts', { subject: subject.trim(), body: body.trim(), audience })
      setSubject(''); setBody('')
      toast.ok('Рассылка создана — отправка пошла')
      load()
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-2 text-xl font-bold text-fg-0">Email-рассылки</h1>
      <p className="mb-5 text-sm text-fg-3">
        Массовое письмо всем юзерам или сегменту. Отправляется пачками
        по 25 писем в минуту, чтобы не упереться в лимиты SMTP-провайдера.
        Прогресс видишь ниже.
      </p>

      <form onSubmit={create} className="panel mb-6">
        <h2 className="mb-3 text-sm font-bold text-fg-0">Новая рассылка</h2>
        <div className="grid grid-cols-1 gap-3">
          <label className="block">
            <span className="label">Кому</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => fetchPreview(a.value)}
                  className={[
                    'rounded-md border px-3 py-2 text-left transition',
                    audience === a.value
                      ? 'border-lilac bg-lilac/15 text-fg-0'
                      : 'border-line-2 text-fg-2 hover:bg-white/5',
                  ].join(' ')}
                >
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="mt-0.5 text-[11px] text-fg-3">{a.desc}</div>
                </button>
              ))}
            </div>
            {preview !== null && (
              <div className="mt-2 text-xs text-fg-2">
                Улетит писем: <span className="font-mono text-fg-0">{preview}</span>
              </div>
            )}
          </label>
          <label className="block">
            <span className="label">Тема письма</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Новая практика в каталоге"
              maxLength={200}
              className="input mt-1"
              required
            />
          </label>
          <label className="block">
            <span className="label">Текст письма</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={5000}
              placeholder="Привет! Мы добавили новую практику…"
              className="input mt-1 resize-none"
              required
            />
            <span className="mt-1 block text-xs text-fg-3">
              Plain text — мы автоматически обернём в HTML в дизайне аппки.
              Переносы строк сохраняются.
            </span>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            <IconPlus /> Запустить рассылку
          </button>
        </div>
      </form>

      <div className="panel">
        <h2 className="mb-3 text-sm font-bold text-fg-0">
          История рассылок {jobs.length > 0 && <span className="text-fg-3">· {jobs.length}</span>}
        </h2>
        {loading ? (
          <div className="py-8 text-center text-fg-3">Загружаем…</div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-fg-3">Рассылок пока не было.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((j) => {
              const pct = j.totalCount > 0
                ? Math.round((j.sentCount + j.failedCount) / j.totalCount * 100)
                : 0
              return (
                <div key={j.id} className="rounded-md border border-line-2 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-fg-0 truncate">{j.subject}</div>
                      <div className="mt-1 text-xs text-fg-3">
                        {AUDIENCES.find((a) => a.value === j.audience)?.label || j.audience}
                        {' · '}{new Date(j.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div>{statusChip(j.status)}</div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-fg-2">
                      <span>{j.sentCount} отправлено{j.failedCount > 0 && ` · ${j.failedCount} ошибок`}</span>
                      <span className="font-mono">{j.sentCount + j.failedCount} / {j.totalCount}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: j.status === 'done'
                            ? 'linear-gradient(90deg, #7be1a3, #b4a0ff)'
                            : 'linear-gradient(90deg, #b4a0ff, #7be1a3)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function statusChip(status) {
  const map = {
    pending: ['в очереди', 'bg-fg-3/15 text-fg-2'],
    running: ['идёт', 'bg-lilac/15 text-lilac'],
    done: ['готово', 'bg-emerald-500/15 text-emerald-300'],
    failed: ['ошибка', 'bg-err/15 text-err'],
  }
  const [label, cls] = map[status] || [status, 'bg-fg-3/15 text-fg-2']
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {status === 'done' ? <IconCheck /> : status === 'failed' ? <IconClose /> : null}
      {label}
    </span>
  )
}
