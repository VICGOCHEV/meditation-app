import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { BLOCKS, fmtMinutes } from '../lib/format.js'
import AudioCell from '../ui/AudioCell.jsx'
import { IconBack } from '../ui/icons.jsx'

const VOICES = [
  { code: 'male', label: 'Мужской' },
  { code: 'female', label: 'Женский' },
]
const MUSICS = [1, 2, 3]
const cellKey = (voice, m) => `${voice}_music${m}`

const emptyAudio = () => {
  const a = {}
  for (const v of VOICES) for (const m of MUSICS) a[cellKey(v.code, m)] = null
  return a
}

const blankForm = () => ({
  title: '',
  block: 'relaxation',
  description: '',
  price: '',
  monthSlot: '',
  published: false,
  audio: emptyAudio(),
})

export default function PracticeEditor({ mode }) {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(blankForm())
  const [durationSec, setDurationSec] = useState(0)
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (mode !== 'edit') return
    ;(async () => {
      try {
        const { data } = await api.get(`/admin/practices/${id}`)
        const p = data.practice
        const audio = emptyAudio()
        for (const k of Object.keys(audio)) audio[k] = p.audio[k] || null
        setForm({
          title: p.title,
          block: p.block,
          description: p.description || '',
          price: p.price ?? '',
          monthSlot: p.monthSlot ?? '',
          published: p.published,
          audio,
        })
        setDurationSec(p.durationSec)
      } catch (e) {
        toast.err(errText(e))
        nav('/practices')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, mode])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setCell = (key, media) =>
    setForm((f) => ({ ...f, audio: { ...f.audio, [key]: media } }))

  const filled = useMemo(
    () => Object.values(form.audio).filter(Boolean).length,
    [form.audio],
  )

  function buildPayload(published) {
    const audio = {}
    for (const [k, v] of Object.entries(form.audio)) audio[k] = v?.id ?? null
    const payload = {
      title: form.title.trim(),
      block: form.block,
      description: form.description.trim() || null,
      audio,
      published,
    }
    payload.price = form.block === 'author' && form.price !== '' ? Number(form.price) : null
    payload.monthSlot = (form.block === 'awareness' || form.block === 'awareness2') && form.monthSlot !== '' ? Number(form.monthSlot) : null
    return payload
  }

  async function save(published) {
    if (!form.title.trim()) {
      toast.err('Введите название')
      return
    }
    // Перед публикацией проверяем что есть аудио — UI помечал music1
    // как required, но publish раньше пропускал практику без дорожек.
    // Авторский блок может быть без матрицы, но хотя бы одна дорожка
    // (любая ячейка) должна быть.
    if (published) {
      const hasAnyAudio = Object.values(form.audio).some(Boolean)
      if (!hasAnyAudio) {
        toast.err('Загрузи хотя бы одну дорожку перед публикацией')
        return
      }
      if (form.block !== 'author') {
        // Для relaxation / awareness обязательна music1 у обоих голосов
        // (это минимальная конфигурация — без неё плеер не сработает).
        const mm1 = form.audio?.male_music1
        const fm1 = form.audio?.female_music1
        if (!mm1 || !fm1) {
          toast.err('Для публикации нужны минимум male_music1 и female_music1')
          return
        }
      }
    }
    setSaving(true)
    try {
      const payload = buildPayload(published)
      if (mode === 'new') {
        const { data } = await api.post('/admin/practices', payload)
        toast.ok(published ? 'Практика опубликована' : 'Черновик сохранён')
        nav(`/practices/${data.practice.id}`, { replace: true })
      } else {
        const { data } = await api.put(`/admin/practices/${id}`, payload)
        setDurationSec(data.practice.durationSec)
        set({ published: data.practice.published })
        toast.ok(published ? 'Опубликовано' : 'Сохранено')
      }
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-sm text-fg-3">Загрузка…</div>

  const colFilled = (m) => VOICES.some((v) => form.audio[cellKey(v.code, m)])

  return (
    <div className="mx-auto max-w-4xl">
      {/* шапка */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          onClick={() => nav('/practices')}
          className="flex items-center gap-1.5 text-sm text-fg-2 transition-colors hover:text-fg-0"
        >
          <IconBack size={16} /> Практики
        </button>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" disabled={saving} onClick={() => save(form.published)}>
            Сохранить
          </button>
          <button className="btn-primary" disabled={saving} onClick={() => save(true)}>
            {form.published ? 'Опубликовано' : 'Опубликовать'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* основное */}
        <div className="panel p-5">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-fg-4">Основное</div>
          <label className="label">Название</label>
          <input
            className="input mb-4"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Например, Путь к себе"
            autoFocus={mode === 'new'}
          />
          <label className="label">Описание</label>
          <textarea
            className="input min-h-[96px] resize-y"
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Короткое описание под названием на карточке"
          />
        </div>

        {/* параметры */}
        <div className="panel h-fit p-5">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-fg-4">Параметры</div>
          <label className="label">Блок</label>
          <select
            className="input mb-4"
            value={form.block}
            onChange={(e) => set({ block: e.target.value })}
          >
            {BLOCKS.map((b) => (
              <option key={b.key} value={b.key}>{b.title}</option>
            ))}
          </select>

          {form.block === 'author' && (
            <div className="animate-fade-in">
              <label className="label">Цена, ₽ (поштучно)</label>
              <input
                className="input mb-4"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set({ price: e.target.value })}
                placeholder="99"
              />
            </div>
          )}
          {(form.block === 'awareness' || form.block === 'awareness2') && (
            <div className="animate-fade-in">
              <label className="label">Слот месяца</label>
              <input
                className="input mb-4"
                type="number"
                min="0"
                value={form.monthSlot}
                onChange={(e) => set({ monthSlot: e.target.value })}
                placeholder="1"
              />
            </div>
          )}

          <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-fg-3">Длительность</span>
            <span className="font-mono text-fg-1">{fmtMinutes(durationSec)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-fg-3">Дорожек</span>
            <span className="font-mono text-fg-1">{filled}/6</span>
          </div>
        </div>
      </div>

      {/* ── МАТРИЦА ── */}
      <div className="panel mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-4">
            Аудио-дорожки · голос × музыка
          </div>
          <div className="text-xs text-fg-3">
            mp3 · перетащи файл в ячейку или нажми «загрузить»
          </div>
        </div>

        <div className="grid grid-cols-[88px_1fr_1fr_1fr] gap-2.5">
          {/* заголовки столбцов */}
          <div />
          {MUSICS.map((m) => (
            <div key={m} className="flex items-center gap-1.5 px-1 pb-1 text-xs font-medium text-fg-2">
              Музыка {m}
              <span
                className={`h-1.5 w-1.5 rounded-full ${colFilled(m) ? 'bg-violet' : 'bg-fg-4'}`}
                title={colFilled(m) ? 'есть дорожки' : 'пусто'}
              />
              {m === 1 && <span className="text-[10px] text-fg-4">· обязат.</span>}
            </div>
          ))}

          {/* строки голосов */}
          {VOICES.map((v) => (
            <FragmentRow key={v.code}>
              <div className="flex items-center text-sm font-medium text-fg-1">{v.label}</div>
              {MUSICS.map((m) => (
                <AudioCell
                  key={cellKey(v.code, m)}
                  value={form.audio[cellKey(v.code, m)]}
                  onChange={(media) => setCell(cellKey(v.code, m), media)}
                  required={m === 1}
                />
              ))}
            </FragmentRow>
          ))}
        </div>
      </div>
    </div>
  )
}

// helper, чтобы класть 4 ячейки в grid без обёртки-дива (grid-контекст общий)
function FragmentRow({ children }) {
  return <>{children}</>
}
