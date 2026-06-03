import { useEffect, useMemo, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { IconPlus, IconTrash, IconCheck, IconClose } from '../ui/icons.jsx'

// Тексты пушей — раздел CMS для редактирования фраз, которые крон-воркер
// шлёт юзерам в Telegram (потом VK/MAX когда добавим эти каналы).
// Структура: 4 слота (08/12/16/20) × 2 аудитории (free/paid).
// notifier.js каждую минуту выбирает случайную active фразу из (slot, audience).

const SLOTS = ['08:00', '12:00', '16:00', '20:00']
const SLOT_TIME_LABEL = {
  '08:00': 'утро',
  '12:00': 'полдень',
  '16:00': 'день',
  '20:00': 'вечер',
}
const AUDIENCES = [
  {
    value: 'paid',
    label: 'Подписчики «Осознанность»',
    desc: 'Юзеры с активной подпиской — получают мотивирующие фразы.',
  },
  {
    value: 'free',
    label: 'Без подписки',
    desc: 'Мягкие напоминания открыть бесплатные практики «Расслабления».',
  },
]

function PhraseRow({ phrase, onEdit, onToggle, onDelete }) {
  return (
    <div
      className={
        'card flex items-start gap-3 px-4 py-3 transition ' +
        (phrase.active ? '' : 'opacity-50')
      }
    >
      <div className="grow min-w-0">
        <div className="text-sm leading-relaxed text-fg-0 whitespace-pre-wrap">
          {phrase.text}
        </div>
        {!phrase.active && (
          <div className="mt-1 text-[10px] uppercase tracking-wider text-fg-3">
            выключена
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-1 text-xs">
        <button
          onClick={() => onToggle(phrase)}
          className="rounded-sm bg-bg-2 px-2 py-1 text-fg-2 hover:text-fg-0"
          title={phrase.active ? 'выключить' : 'включить'}
        >
          {phrase.active ? '−' : '+'}
        </button>
        <button
          onClick={() => onEdit(phrase)}
          className="rounded-sm bg-bg-2 px-2 py-1 text-fg-2 hover:text-fg-0"
        >
          править
        </button>
        <button
          onClick={() => onDelete(phrase)}
          className="rounded-sm bg-bg-2 px-2 py-1 text-fg-2 hover:text-rose-300"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  )
}

function PhraseEditor({ phrase, slot, audience, onSave, onClose }) {
  const [text, setText] = useState(phrase?.text || '')
  const [chosenSlot, setChosenSlot] = useState(phrase?.slot || slot)
  const [chosenAudience, setChosenAudience] = useState(phrase?.audience || audience)
  const [active, setActive] = useState(phrase?.active !== false)
  const [saving, setSaving] = useState(false)

  const isNew = !phrase
  const canSave = text.trim().length > 0 && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        text: text.trim(),
        slot: chosenSlot,
        audience: chosenAudience,
        active,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-line bg-bg-1 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-lg font-semibold text-fg-0">
            {isNew ? 'Новая фраза' : `Редактировать фразу #${phrase.id}`}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-fg-3 hover:bg-bg-2 hover:text-fg-0"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Текст пуша</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Например: «Полдень. Самое время остановить гонку ума…»"
              rows={5}
              maxLength={2000}
              className="w-full rounded-sm border border-line bg-bg-2 px-3 py-2 text-sm text-fg-0 placeholder:text-fg-3 focus:border-violet focus:outline-none"
            />
            <div className="mt-1 text-[11px] text-fg-3">
              {text.length} / 2000 символов
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Время дня</label>
              <select
                value={chosenSlot}
                onChange={(e) => setChosenSlot(e.target.value)}
                className="w-full rounded-sm border border-line bg-bg-2 px-3 py-2 text-sm text-fg-0 focus:border-violet focus:outline-none"
              >
                {SLOTS.map((s) => (
                  <option key={s} value={s}>{s} · {SLOT_TIME_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Аудитория</label>
              <select
                value={chosenAudience}
                onChange={(e) => setChosenAudience(e.target.value)}
                className="w-full rounded-sm border border-line bg-bg-2 px-3 py-2 text-sm text-fg-0 focus:border-violet focus:outline-none"
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-fg-1">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-violet"
            />
            Активна (включена в ротацию)
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <button
            onClick={onClose}
            className="rounded-sm bg-bg-2 px-4 py-2 text-sm text-fg-2 hover:text-fg-0"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!canSave}
            className="rounded-sm bg-primary-btn px-4 py-2 text-sm text-white shadow-btn-primary hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Сохраняем…' : isNew ? 'Создать' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PushPhrases() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [activeAudience, setActiveAudience] = useState('paid')
  const [loading, setLoading] = useState(true)
  // null — закрыто; {phrase, slot, audience} — открыт редактор
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/push-phrases')
      setRows(data?.items || [])
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    const out = {}
    for (const slot of SLOTS) out[slot] = []
    for (const r of rows) {
      if (r.audience !== activeAudience) continue
      out[r.slot] = out[r.slot] || []
      out[r.slot].push(r)
    }
    return out
  }, [rows, activeAudience])

  async function savePhrase(data) {
    try {
      if (editing.phrase) {
        await api.put(`/admin/push-phrases/${editing.phrase.id}`, data)
        toast.ok('Фраза обновлена')
      } else {
        await api.post('/admin/push-phrases', data)
        toast.ok('Фраза создана')
      }
      setEditing(null)
      await load()
    } catch (e) {
      toast.err(errText(e))
    }
  }

  async function togglePhrase(phrase) {
    try {
      await api.put(`/admin/push-phrases/${phrase.id}`, { active: !phrase.active })
      setRows((rs) => rs.map((r) => (r.id === phrase.id ? { ...r, active: !phrase.active } : r)))
    } catch (e) {
      toast.err(errText(e))
    }
  }

  async function deletePhrase(phrase) {
    if (!confirm(`Удалить эту фразу? Текст:\n\n«${phrase.text.slice(0, 100)}…»`)) return
    try {
      await api.delete(`/admin/push-phrases/${phrase.id}`)
      toast.ok('Удалено')
      setRows((rs) => rs.filter((r) => r.id !== phrase.id))
    } catch (e) {
      toast.err(errText(e))
    }
  }

  const audienceObj = AUDIENCES.find((a) => a.value === activeAudience)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-0">Тексты пушей</h1>
          <p className="mt-1 text-sm text-fg-3">
            Сообщения, которые бот шлёт юзерам в Telegram в фиксированные моменты
            дня. Для каждого слота крон-воркер каждую минуту выбирает случайную
            <span className="text-fg-1"> active</span> фразу.
          </p>
        </div>
      </div>

      {/* Переключатель аудитории */}
      <div className="grid grid-cols-2 gap-3">
        {AUDIENCES.map((a) => (
          <button
            key={a.value}
            onClick={() => setActiveAudience(a.value)}
            className={
              'rounded-md border px-4 py-3 text-left transition ' +
              (activeAudience === a.value
                ? 'border-violet bg-violet/10'
                : 'border-line bg-bg-1 hover:border-fg-3/40')
            }
          >
            <div
              className={
                'text-sm font-semibold ' +
                (activeAudience === a.value ? 'text-fg-0' : 'text-fg-1')
              }
            >
              {a.label}
            </div>
            <div className="mt-1 text-[12px] text-fg-3">{a.desc}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card px-4 py-10 text-center text-fg-3">Загружаем…</div>
      ) : (
        <div className="space-y-6">
          {SLOTS.map((slot) => (
            <div key={slot}>
              <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
                <div>
                  <div className="text-lg font-semibold text-fg-0">
                    {slot} · <span className="text-fg-3">{SLOT_TIME_LABEL[slot]}</span>
                  </div>
                  <div className="text-[11px] text-fg-3">
                    {grouped[slot].length} {grouped[slot].length === 1 ? 'фраза' :
                     grouped[slot].length >= 2 && grouped[slot].length <= 4 ? 'фразы' : 'фраз'}
                    {' · '}
                    {grouped[slot].filter((r) => r.active).length} активн
                    {grouped[slot].filter((r) => r.active).length === 1 ? 'а' : 'ых'}
                  </div>
                </div>
                <button
                  onClick={() => setEditing({ phrase: null, slot, audience: activeAudience })}
                  className="flex items-center gap-1.5 rounded-sm bg-primary-btn px-3 py-1.5 text-sm text-white shadow-btn-primary hover:opacity-90"
                >
                  <IconPlus size={14} /> Добавить
                </button>
              </div>

              {grouped[slot].length === 0 ? (
                <div className="card px-4 py-6 text-center text-fg-3 text-sm">
                  Нет фраз для этого слота. Notifier пропустит этот час до тех пор,
                  пока не добавишь хотя бы одну.
                </div>
              ) : (
                <div className="space-y-2">
                  {grouped[slot].map((p) => (
                    <PhraseRow
                      key={p.id}
                      phrase={p}
                      onEdit={(ph) => setEditing({ phrase: ph, slot, audience: activeAudience })}
                      onToggle={togglePhrase}
                      onDelete={deletePhrase}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PhraseEditor
          phrase={editing.phrase}
          slot={editing.slot}
          audience={editing.audience}
          onSave={savePhrase}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
