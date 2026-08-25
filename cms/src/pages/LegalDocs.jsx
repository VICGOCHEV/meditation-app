import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errText } from '../lib/api.js'
import { useAuth } from '../lib/store.js'
import { useToast } from '../ui/Toast.jsx'
import { IconPlus, IconTrash } from '../ui/icons.jsx'

// Юридические документы: оферта, политика конфиденциальности, согласие на
// обработку персональных данных и любые новые. До этого раздела они были
// тремя PDF внутри сборки приложения и менялись только деплоем.
//
// Режим документа не выбирается тумблером — он следует из содержимого:
// есть текст → документ открывается страницей в приложении, текста нет, но
// загружен PDF → ссылка ведёт на файл.

function ModeBadge({ doc }) {
  if (doc.isPage) {
    return (
      <span className="chip bg-violet/15 text-violet">страница в приложении</span>
    )
  }
  if (doc.fileUrl) {
    return <span className="chip bg-bg-3 text-fg-2">PDF-файл</span>
  }
  return (
    <span className="chip bg-amber-400/15 text-amber-300">пусто — не показывается</span>
  )
}

export default function LegalDocs() {
  const toast = useToast()
  const navigate = useNavigate()
  const role = useAuth((s) => s.admin?.role)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [requisites, setRequisites] = useState('')
  const [savedRequisites, setSavedRequisites] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { data } = await api.get('/admin/legal')
      setItems(data.items || [])
      setRequisites(data.requisites || '')
      setSavedRequisites(data.requisites || '')
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  // Порядок задаём кнопками, а не перетаскиванием: список короткий (3-6
  // документов), а drag-and-drop в этой CMS нигде больше не заведён.
  async function move(index, delta) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next) // оптимистично — порядок сразу виден
    try {
      await api.put('/admin/legal/reorder', { ids: next.map((d) => d.id) })
    } catch (e) {
      toast.err(errText(e))
      load()
    }
  }

  // Тумблеры прямо из списка — переключать «в подвале / на регистрации»
  // удобнее здесь, чем заходя в каждый документ.
  async function toggle(doc, field) {
    try {
      const { data } = await api.put(`/admin/legal/${doc.id}`, { [field]: !doc[field] })
      setItems((list) => list.map((d) => (d.id === doc.id ? { ...d, ...data.doc } : d)))
    } catch (e) {
      toast.err(errText(e))
    }
  }

  async function remove(doc) {
    if (!confirm(`Удалить «${doc.title}»? Ссылка на документ исчезнет из приложения.`)) return
    try {
      await api.delete(`/admin/legal/${doc.id}`)
      toast.ok('Документ удалён')
      load()
    } catch (e) {
      toast.err(errText(e))
    }
  }

  async function saveRequisites() {
    setBusy(true)
    try {
      await api.put('/admin/legal/requisites', { requisites })
      setSavedRequisites(requisites)
      toast.ok('Реквизиты сохранены')
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-xl font-bold text-fg-0">Юридические документы</h1>
          <p className="text-sm text-fg-3">
            Оферта, политика конфиденциальности, согласие на обработку данных.
            Правятся без деплоя — приложение подхватывает изменения в течение минуты.
          </p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={() => navigate('/legal/new')}>
          <IconPlus /> Документ
        </button>
      </div>

      <div className="panel mb-6">
        {loading ? (
          <div className="py-8 text-center text-fg-3">Загружаем…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-fg-3">Пока ни одного документа.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((doc, i) => (
              <div key={doc.id} className="card flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    title="Выше"
                    className="rounded-sm border border-line-2 px-1.5 text-xs text-fg-2 hover:bg-white/5 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    title="Ниже"
                    className="rounded-sm border border-line-2 px-1.5 text-xs text-fg-2 hover:bg-white/5 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <Link to={`/legal/${doc.id}`} className="text-sm font-semibold text-fg-0 hover:text-violet">
                    {doc.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-fg-3">
                    <span className="font-mono">/legal/{doc.slug}</span>
                    {doc.version && <span>· {doc.version}</span>}
                    <span>· изменён {new Date(doc.updatedAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ModeBadge doc={doc} />
                  {!doc.published && (
                    <span className="chip bg-fg-3/15 text-fg-3">черновик</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(doc, 'showInFooter')}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      doc.showInFooter
                        ? 'border-violet/50 bg-violet/10 text-fg-0'
                        : 'border-line-2 text-fg-3 hover:bg-white/5'
                    }`}
                    title="Ссылка в подвале профиля"
                  >
                    в подвале
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(doc, 'showAtSignup')}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      doc.showAtSignup
                        ? 'border-violet/50 bg-violet/10 text-fg-0'
                        : 'border-line-2 text-fg-3 hover:bg-white/5'
                    }`}
                    title="Ссылка в чекбоксе согласия на регистрации"
                  >
                    на регистрации
                  </button>
                  <Link
                    to={`/legal/${doc.id}`}
                    className="rounded-md border border-line-2 px-3 py-1 text-xs text-fg-1 hover:bg-white/5"
                  >
                    Открыть
                  </Link>
                  {role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => remove(doc)}
                      className="rounded-md border border-line-2 px-3 py-1 text-xs text-fg-1 hover:bg-err/10 hover:text-err"
                      title="Удалить документ"
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="mb-1 text-sm font-bold text-fg-0">Реквизиты под ссылками</h2>
        <p className="mb-3 text-xs text-fg-3">
          Строка мелким шрифтом под юр. ссылками в приложении.
        </p>
        <input
          type="text"
          value={requisites}
          onChange={(e) => setRequisites(e.target.value)}
          maxLength={300}
          placeholder="ИП Смирнов А. В. · ИНН 590772796420"
          className="input font-mono text-xs"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={saveRequisites}
            disabled={busy || requisites === savedRequisites}
          >
            {busy ? 'Сохраняем…' : 'Сохранить реквизиты'}
          </button>
        </div>
      </div>
    </div>
  )
}
