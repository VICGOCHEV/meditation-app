import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import AudioCell from '../ui/AudioCell.jsx'
import { IconPlus, IconTrash, IconGrip } from '../ui/icons.jsx'

// Универсальный менеджер коллекции «текстовые поля + full + preview + active».
// Используется для Голосов и Музыки.
//
// cfg = {
//   title, addLabel, endpoint, itemKey ('voice'|'track'),
//   fields: [{ key, label, placeholder, mono?, required? }],
//   makeDraft: () => ({...поля}),
// }
export default function AudioCollection({ cfg }) {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState([]) // несохранённые новые

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(cfg.endpoint)
      setItems(data.items)
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [cfg.endpoint])

  const addDraft = () =>
    setDrafts((d) => [...d, { _draftId: Math.max(0, ...d.map((x) => x._draftId)) + 1, ...cfg.makeDraft(), active: true, audioFull: null, audioPreview: null }])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-0">{cfg.title}</h1>
        <button className="btn-primary" onClick={addDraft}>
          <IconPlus size={16} /> {cfg.addLabel}
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-fg-3">Загрузка…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.length === 0 && drafts.length === 0 && (
            <button
              onClick={addDraft}
              className="card flex w-full items-center justify-center gap-2 border-dashed py-6 text-sm text-fg-3 transition-colors hover:border-violet/50 hover:text-fg-1"
            >
              <IconPlus size={15} /> {cfg.addLabel}
            </button>
          )}

          {items.map((it) => (
            <Row
              key={it.id}
              cfg={cfg}
              initial={it}
              onSaved={(saved) => setItems((s) => s.map((x) => (x.id === saved.id ? saved : x)))}
              onDeleted={(id) => setItems((s) => s.filter((x) => x.id !== id))}
            />
          ))}

          {drafts.map((d) => (
            <Row
              key={`d${d._draftId}`}
              cfg={cfg}
              initial={d}
              isDraft
              onSaved={(saved) => {
                setItems((s) => [...s, saved])
                setDrafts((s) => s.filter((x) => x._draftId !== d._draftId))
              }}
              onDeleted={() => setDrafts((s) => s.filter((x) => x._draftId !== d._draftId))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ cfg, initial, isDraft = false, onSaved, onDeleted }) {
  const toast = useToast()
  const [form, setForm] = useState(() => {
    const f = { active: initial.active ?? true, audioFull: initial.audioFull || null, audioPreview: initial.audioPreview || null }
    for (const fl of cfg.fields) f[fl.key] = initial[fl.key] ?? ''
    return f
  })
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((s) => ({ ...s, ...patch }))

  async function save() {
    for (const fl of cfg.fields) {
      if (fl.required !== false && !String(form[fl.key]).trim()) {
        toast.err(`Заполните «${fl.label}»`)
        return
      }
    }
    if (!form.audioFull || !form.audioPreview) {
      toast.err('Нужны обе дорожки: полная и превью')
      return
    }
    setSaving(true)
    const payload = { active: form.active, audioFullId: form.audioFull.id, audioPreviewId: form.audioPreview.id }
    for (const fl of cfg.fields) payload[fl.key] = form[fl.key]
    try {
      if (isDraft) {
        const { data } = await api.post(cfg.endpoint, payload)
        toast.ok('Добавлено')
        onSaved(data[cfg.itemKey])
      } else {
        const { data } = await api.put(`${cfg.endpoint}/${initial.id}`, payload)
        toast.ok('Сохранено')
        onSaved(data[cfg.itemKey])
      }
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (isDraft) return onDeleted()
    if (!confirm('Удалить запись?')) return
    try {
      await api.delete(`${cfg.endpoint}/${initial.id}`)
      toast.ok('Удалено')
      onDeleted(initial.id)
    } catch (e) {
      toast.err(errText(e))
    }
  }

  return (
    <div className={`panel p-4 ${isDraft ? 'animate-fade-in border-violet/40' : ''}`}>
      <div className="flex flex-wrap items-end gap-3">
        {!isDraft && <span className="mb-2 hidden text-fg-4 sm:block"><IconGrip size={16} /></span>}

        {cfg.fields.map((fl) => (
          <div key={fl.key} className={fl.grow === false ? 'w-32' : 'min-w-[140px] flex-1'}>
            <label className="label">{fl.label}</label>
            <input
              className={`input ${fl.mono ? 'font-mono' : ''}`}
              value={form[fl.key]}
              onChange={(e) => set({ [fl.key]: e.target.value })}
              placeholder={fl.placeholder}
            />
          </div>
        ))}

        <label className="mb-2 flex cursor-pointer select-none items-center gap-2 text-sm text-fg-2">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={form.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          <span className="relative h-5 w-9 rounded-full bg-bg-3 transition-colors peer-checked:bg-violet after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-fg-0 after:transition-transform peer-checked:after:translate-x-4" />
          активен
        </label>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div>
          <label className="label">Полная дорожка</label>
          <AudioCell value={form.audioFull} onChange={(m) => set({ audioFull: m })} required />
        </div>
        <div>
          <label className="label">Превью (5–10 сек)</label>
          <AudioCell value={form.audioPreview} onChange={(m) => set({ audioPreview: m })} required />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button onClick={remove} className="btn-danger">
          <IconTrash size={15} /> {isDraft ? 'Отмена' : 'Удалить'}
        </button>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Сохраняем…' : isDraft ? 'Добавить' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
