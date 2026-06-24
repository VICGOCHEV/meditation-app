import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { IconCheck } from '../ui/icons.jsx'

// CMS «Блоки» — заголовки секций на главной экране приложения.
// Правит eyebrow (надзаголовок), title (название), sub (подпись) и chip
// (бейдж справа). key структурный, не редактируется. Изменения видны в
// аппке без деплоя (аппка читает /api/content/blocks).

// Короткая подсказка про назначение блока — чисто для ориентира в CMS,
// в аппку не уходит.
const BLOCK_NOTE = {
  relaxation: 'Бесплатный блок — виден всем.',
  awareness: 'По подписке — первый цикл осознанности.',
  awareness2: 'По подписке — второй цикл осознанности.',
  author: 'Авторский блок (поштучно). Сейчас скрыт на главной.',
}

function Field({ label, hint, value, onChange, placeholder, textarea }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? (
        <textarea
          className="input min-h-[68px] resize-y"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint && <span className="mt-1 block text-xs text-fg-3">{hint}</span>}
    </label>
  )
}

function BlockCard({ block, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    eyebrow: block.eyebrow || '',
    title: block.title || '',
    sub: block.sub || '',
    chip: block.chip || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function save() {
    if (!form.title.trim()) {
      toast.err('Название блока не может быть пустым')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/blocks/${block.key}`, {
        eyebrow: form.eyebrow,
        title: form.title,
        sub: form.sub,
        chip: form.chip,
      })
      toast.ok('Блок сохранён')
      onSaved?.(data.block)
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg-0">{form.title || block.key}</h2>
          <div className="mt-0.5 text-xs text-fg-3">{BLOCK_NOTE[block.key] || block.key}</div>
        </div>
        <span className="chip bg-bg-3 font-mono text-[10px] text-fg-3">{block.key}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Надзаголовок"
          hint="Мелкая строка над названием. Напр. «02 · СИСТЕМА»."
          value={form.eyebrow}
          onChange={(v) => set({ eyebrow: v })}
          placeholder="02 · СИСТЕМА"
        />
        <Field
          label="Бейдж справа"
          hint="Маленький лейбл-условие. Напр. «По подписке»."
          value={form.chip}
          onChange={(v) => set({ chip: v })}
          placeholder="По подписке"
        />
      </div>
      <div className="mt-4">
        <Field
          label="Название"
          hint="Крупный заголовок секции."
          value={form.title}
          onChange={(v) => set({ title: v })}
          placeholder="Пароль от жизни"
        />
      </div>
      <div className="mt-4">
        <Field
          label="Подпись"
          hint="Строка-описание под названием."
          value={form.sub}
          onChange={(v) => set({ sub: v })}
          placeholder="Короткое описание блока"
          textarea
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button className="btn-primary" disabled={saving} onClick={save}>
          <IconCheck size={16} /> {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </section>
  )
}

export default function Blocks() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/blocks')
      setItems(data.items)
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function onSaved(updated) {
    setItems((s) => s.map((b) => (b.key === updated.key ? { ...b, ...updated } : b)))
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-0">Блоки</h1>
      </div>
      <p className="mb-6 text-sm text-fg-3">
        Заголовки секций на главном экране приложения. Сам набор блоков и
        принадлежность практик задаются в разделе «Практики» — здесь меняются
        только тексты.
      </p>

      {loading ? (
        <div className="py-20 text-center text-sm text-fg-3">Загрузка…</div>
      ) : (
        <div className="flex flex-col gap-5">
          {items.map((b) => (
            <BlockCard key={b.key} block={b} onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  )
}
