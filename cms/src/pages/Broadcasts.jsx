import { useEffect, useRef, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { IconPlus, IconCheck, IconClose } from '../ui/icons.jsx'

// Пуш/email рассылка. Два канала:
//   • email    — фирменное HTML-письмо всем/сегменту с email.
//   • telegram — пуш об оффлайн-мероприятии всем/сегменту, привязавшим TG,
//                опционально с картинкой.
// Поток: создаёшь job → очередь → воркер шлёт пачками по 25 в минуту.
// Прогресс пуллится каждые 5 сек для активной рассылки.

const CHANNELS = [
  { value: 'email', label: 'Email-письмо', desc: 'Фирменное HTML-письмо на почту.' },
  { value: 'telegram', label: 'Telegram-пуш', desc: 'Пуш в бота (можно с картинкой).' },
]

const AUDIENCES = [
  { value: 'all', label: 'Все', desc: 'Все с этим каналом.' },
  { value: 'paid', label: 'С подпиской', desc: 'Только платящие.' },
  { value: 'free', label: 'Без подписки', desc: 'Без активной подписки.' },
]

export default function Broadcasts() {
  const toast = useToast()
  const fileRef = useRef(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const isTg = channel === 'telegram'

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

  async function fetchPreview(aud, ch) {
    try {
      const { data } = await api.post('/admin/broadcasts/preview', {
        audience: aud,
        channel: ch,
      })
      setPreview(data.totalCount)
    } catch {
      setPreview(null)
    }
  }

  // Пересчитываем охват при смене аудитории/канала
  useEffect(() => { fetchPreview(audience, channel) }, [audience, channel]) // eslint-disable-line

  async function onPickImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/admin/broadcasts/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImageUrl(data.url)
      toast.ok('Картинка загружена')
    } catch (err) {
      toast.err(errText(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function create(e) {
    e?.preventDefault?.()
    if (!subject.trim() || !body.trim()) return
    const chLabel = CHANNELS.find((c) => c.value === channel)?.label
    if (!confirm(`Точно отправить «${chLabel}» — «${subject.trim()}» на ${preview ?? '?'} получателей?`)) return
    setBusy(true)
    try {
      await api.post('/admin/broadcasts', {
        subject: subject.trim(),
        body: body.trim(),
        audience,
        channel,
        imageUrl: isTg && imageUrl ? imageUrl : undefined,
      })
      setSubject(''); setBody(''); setImageUrl('')
      toast.ok('Рассылка создана — отправка пошла')
      load()
    } catch (err) {
      toast.err(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-2 text-xl font-bold text-fg-0">Пуш/email рассылка</h1>
      <p className="mb-5 text-sm text-fg-3">
        Массовое сообщение всем или сегменту — фирменным письмом на email или
        пушем в Telegram (например, об оффлайн-мероприятии, с картинкой).
        Отправляется пачками по 25 в минуту, прогресс виден ниже.
      </p>

      <form onSubmit={create} className="panel mb-6">
        <h2 className="mb-3 text-sm font-bold text-fg-0">Новая рассылка</h2>

        {/* Канал */}
        <label className="mb-3 block">
          <span className="label">Канал</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setChannel(c.value)}
                className={[
                  'rounded-md border px-3 py-2 text-left transition',
                  channel === c.value
                    ? 'border-lilac bg-lilac/15 text-fg-0'
                    : 'border-line-2 text-fg-2 hover:bg-white/5',
                ].join(' ')}
              >
                <div className="text-sm font-medium">{c.label}</div>
                <div className="mt-0.5 text-[11px] text-fg-3">{c.desc}</div>
              </button>
            ))}
          </div>
        </label>

        <div className="grid grid-cols-1 gap-3">
          <label className="block">
            <span className="label">Кому</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
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
                Получателей: <span className="font-mono text-fg-0">{preview}</span>
                {isTg && (
                  <span className="text-fg-3"> · только те, кто привязал Telegram</span>
                )}
              </div>
            )}
          </label>

          <label className="block">
            <span className="label">{isTg ? 'Заголовок' : 'Тема письма'}</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isTg ? 'Оффлайн-встреча в субботу' : 'Новая практика в каталоге'}
              maxLength={200}
              className="input mt-1"
              required
            />
          </label>

          <label className="block">
            <span className="label">Текст</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={isTg ? 5 : 8}
              maxLength={5000}
              placeholder={isTg ? 'Ждём вас в субботу в 18:00…' : 'Привет! Мы добавили новую практику…'}
              className="input mt-1 resize-none"
              required
            />
            <span className="mt-1 block text-xs text-fg-3">
              {isTg
                ? 'Уйдёт как пуш в бота с кнопкой «Открыть приложение».'
                : 'Plain text — обернём в HTML в дизайне аппки. Переносы строк сохраняются.'}
            </span>
          </label>

          {/* Картинка — только для Telegram */}
          {isTg && (
            <div className="block">
              <span className="label">Картинка (опционально)</span>
              <div className="mt-1 flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPickImage}
                  className="text-xs text-fg-2 file:mr-3 file:rounded-md file:border-0 file:bg-bg-2 file:px-3 file:py-1.5 file:text-fg-1"
                />
                {uploading && <span className="text-xs text-fg-3">Загрузка…</span>}
              </div>
              {imageUrl && (
                <div className="mt-2 flex items-start gap-2">
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-20 w-20 rounded-md border border-line-2 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="rounded-sm bg-bg-2 px-2 py-1 text-xs text-fg-2 hover:text-rose-300"
                  >
                    убрать
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy || uploading}>
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
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-2">
                          {j.channel === 'telegram' ? 'Telegram' : 'Email'}
                        </span>
                        <span className="truncate text-sm font-medium text-fg-0">{j.subject}</span>
                      </div>
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
