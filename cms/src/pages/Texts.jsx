import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'

// Тексты приложения: подсказки прогрессии на главной и плашка в финале
// практики. Правятся без деплоя — аппка читает их из /api/content/texts.
//
// Пустое поле — валидное значение: «не показывать этот текст». Кнопка
// «вернуть исходный» возвращает утверждённую формулировку.

function Field({ item, value, onChange, onReset }) {
  const changed = value !== item.value
  const isDefault = value === item.default

  return (
    <div className="card px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-fg-0">{item.label}</span>
            {item.awaitingClient && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                ждёт текста
              </span>
            )}
            {changed && (
              <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet">
                не сохранено
              </span>
            )}
          </div>
          <div className="mt-1 text-[12px] text-fg-3">{item.hint}</div>
        </div>
        {!isDefault && (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-sm bg-bg-2 px-2 py-1 text-xs text-fg-2 hover:text-fg-0"
            title="Вернуть утверждённую формулировку"
          >
            вернуть исходный
          </button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Пусто — текст не показывается"
        className="mt-3 w-full rounded-sm border border-line bg-bg-2 px-3 py-2 text-sm text-fg-0 placeholder:text-fg-3 focus:border-violet focus:outline-none"
      />
      <div className="mt-1 text-[11px] text-fg-3">{value.length} / 1000</div>
    </div>
  )
}

export default function Texts() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/texts')
      const list = data?.items || []
      setItems(list)
      setDraft(Object.fromEntries(list.map((i) => [i.name, i.value])))
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const dirty = items.some((i) => draft[i.name] !== i.value)

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      await api.put('/admin/texts', draft)
      toast.ok('Тексты сохранены')
      await load()
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-0">Тексты приложения</h1>
        <p className="mt-1 text-sm text-fg-3">
          Подсказки о порядке открытия практик и текст в финале прослушивания.
          Меняются без деплоя — приложение подхватывает их в течение минуты.
        </p>
      </div>

      {loading ? (
        <div className="card px-4 py-10 text-center text-fg-3">Загружаем…</div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((i) => (
              <Field
                key={i.name}
                item={i}
                value={draft[i.name] ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, [i.name]: v }))}
                onReset={() => setDraft((d) => ({ ...d, [i.name]: i.default }))}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              onClick={() => setDraft(Object.fromEntries(items.map((i) => [i.name, i.value])))}
              disabled={!dirty || saving}
              className="rounded-sm bg-bg-2 px-4 py-2 text-sm text-fg-2 hover:text-fg-0 disabled:opacity-50"
            >
              Отменить
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="rounded-sm bg-primary-btn px-4 py-2 text-sm text-white shadow-btn-primary hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
