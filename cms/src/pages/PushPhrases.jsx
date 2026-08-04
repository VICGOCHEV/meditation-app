import { useEffect, useMemo, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { IconPlus, IconTrash, IconClose, IconCheck } from '../ui/icons.jsx'

// Тексты пушей на «начало практики» — раздел CMS для редактирования фраз,
// которые крон-воркер шлёт юзерам в Telegram по фазам дня.
// Фаза дня: утро / день / вечер (чекбоксы — одна фраза может относиться к
// нескольким фазам). Аудитория: без подписки / подписчики.
// notifier.js в наступившую фазу выбирает случайную active-фразу (phase, audience).

const PHASES = [
  { key: 'morning', label: 'утро', time: '09:00' },
  { key: 'day', label: 'день', time: '14:00' },
  { key: 'evening', label: 'вечер', time: '20:00' },
]
const PHASE_LABEL = Object.fromEntries(PHASES.map((p) => [p.key, p.label]))

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

const ROTATION_MODES = [
  {
    value: 'shuffled',
    label: 'Вперемешку',
    desc: 'Случайный порядок без повторов, пока не кончится пул. Затем новый круг.',
  },
  {
    value: 'sequential',
    label: 'По порядку',
    desc: 'Строго сверху вниз по списку, затем сначала.',
  },
]

// Режим ротации — глобальный, хранится в AppSetting. Порядок считается на
// каждого подписчика отдельно, поэтому смена режима не сбивает чужие курсоры:
// текущий круг доигрывается, следующий собирается уже по новому режиму.
function RotationMode() {
  const toast = useToast()
  const [mode, setMode] = useState(null)
  const [vpnGate, setVpnGate] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => {
        setMode(data?.pushRotationMode || 'shuffled')
        setVpnGate(!!data?.vpnGateEnabled)
      })
      .catch(() => { setMode('shuffled'); setVpnGate(false) })
  }, [])

  async function save(patch, revert) {
    setSaving(true)
    try {
      await api.put('/admin/settings', patch)
      toast.ok('Сохранено')
    } catch (e) {
      revert()
      toast.err(errText(e))
    } finally {
      setSaving(false)
    }
  }

  function changeMode(next) {
    if (saving || next === mode) return
    const prev = mode
    setMode(next)
    save({ pushRotationMode: next }, () => setMode(prev))
  }

  function toggleVpnGate() {
    if (saving || vpnGate === null) return
    const prev = vpnGate
    setVpnGate(!prev)
    save({ vpnGateEnabled: !prev }, () => setVpnGate(prev))
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-fg-0">Порядок выдачи</div>
        <div className="mt-1 text-[12px] text-fg-3">
          Один и тот же текст не приходит два дня подряд ни в одном из режимов.
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {ROTATION_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={saving || mode === null}
              onClick={() => changeMode(m.value)}
              className={
                'rounded-md border px-4 py-3 text-left transition disabled:opacity-60 ' +
                (mode === m.value
                  ? 'border-violet bg-violet/10'
                  : 'border-line bg-bg-1 hover:border-fg-3/40')
              }
            >
              <div
                className={
                  'text-sm font-semibold ' + (mode === m.value ? 'text-fg-0' : 'text-fg-1')
                }
              >
                {m.label}
              </div>
              <div className="mt-1 text-[12px] text-fg-3">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={!!vpnGate}
            disabled={saving || vpnGate === null}
            onChange={toggleVpnGate}
            className="mt-0.5 h-4 w-4 rounded border-line accent-violet"
          />
          <span>
            <span className="text-sm font-semibold text-fg-0">
              Заглушка при включённом VPN
            </span>
            <span className="mt-1 block text-[12px] text-fg-3">
              Показывать на входе просьбу отключить VPN. Выключено — проверка не
              выполняется вообще. Заглушка не блокирует наглухо: у пользователя
              есть кнопка «Продолжить без отключения», а при недоступности
              сервиса детекции вход открыт всем.
            </span>
          </span>
        </label>
      </div>
    </div>
  )
}

function PhaseChips({ phases }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {PHASES.filter((p) => phases.includes(p.key)).map((p) => (
        <span
          key={p.key}
          className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet"
        >
          {p.label} · {p.time}
        </span>
      ))}
    </div>
  )
}

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
        <PhaseChips phases={phrase.phases} />
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

function PhraseEditor({ phrase, audience, onSave, onClose }) {
  const [text, setText] = useState(phrase?.text || '')
  const [phases, setPhases] = useState(phrase?.phases?.length ? phrase.phases : ['morning'])
  const [chosenAudience, setChosenAudience] = useState(phrase?.audience || audience)
  const [active, setActive] = useState(phrase?.active !== false)
  const [saving, setSaving] = useState(false)

  const isNew = !phrase
  const canSave = text.trim().length > 0 && phases.length > 0 && !saving

  function togglePhase(key) {
    setPhases((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    )
  }

  async function submit() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        text: text.trim(),
        phases,
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
              placeholder="Например: «Время остановиться и выдохнуть. Загляни на пару минут…»"
              rows={5}
              maxLength={2000}
              className="w-full rounded-sm border border-line bg-bg-2 px-3 py-2 text-sm text-fg-0 placeholder:text-fg-3 focus:border-violet focus:outline-none"
            />
            <div className="mt-1 text-[11px] text-fg-3">
              {text.length} / 2000 символов
            </div>
          </div>

          <div>
            <label className="label">Фазы дня</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {PHASES.map((p) => {
                const on = phases.includes(p.key)
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePhase(p.key)}
                    className={
                      'flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm transition ' +
                      (on
                        ? 'border-violet bg-violet/10 text-fg-0'
                        : 'border-line bg-bg-2 text-fg-2 hover:border-fg-3/40')
                    }
                  >
                    <span
                      className={
                        'grid h-4 w-4 place-items-center rounded-[4px] border ' +
                        (on ? 'border-violet bg-violet text-white' : 'border-fg-3')
                      }
                    >
                      {on && <IconCheck size={11} />}
                    </span>
                    <span className="capitalize">{p.label}</span>
                    <span className="text-[10px] text-fg-3">{p.time}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-1 text-[11px] text-fg-3">
              Фраза уйдёт юзеру в каждую отмеченную фазу дня (по его часовому поясу).
            </div>
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
  // null — закрыто; {phrase, audience} — открыт редактор
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

  const visible = useMemo(
    () => rows.filter((r) => r.audience === activeAudience),
    [rows, activeAudience]
  )

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

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-0">Тексты пушей</h1>
          <p className="mt-1 text-sm text-fg-3">
            Напоминания «начать практику», которые бот шлёт в Telegram по фазам
            дня — <span className="text-fg-1">утро {PHASES[0].time}</span>,{' '}
            <span className="text-fg-1">день {PHASES[1].time}</span>,{' '}
            <span className="text-fg-1">вечер {PHASES[2].time}</span> (по часовому
            поясу юзера). Для наступившей фазы крон выдаёт{' '}
            <span className="text-fg-1">следующую по ротации</span> active-фразу —
            у каждого пользователя свой порядок, без повторов внутри круга.
          </p>
        </div>
      </div>

      <div className="card px-4 py-4">
        <RotationMode />
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

      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="text-[11px] text-fg-3">
          {visible.length} {visible.length === 1 ? 'фраза' :
            visible.length >= 2 && visible.length <= 4 ? 'фразы' : 'фраз'}
          {' · '}
          {visible.filter((r) => r.active).length} в ротации
        </div>
        <button
          onClick={() => setEditing({ phrase: null, audience: activeAudience })}
          className="flex items-center gap-1.5 rounded-sm bg-primary-btn px-3 py-1.5 text-sm text-white shadow-btn-primary hover:opacity-90"
        >
          <IconPlus size={14} /> Добавить фразу
        </button>
      </div>

      {loading ? (
        <div className="card px-4 py-10 text-center text-fg-3">Загружаем…</div>
      ) : visible.length === 0 ? (
        <div className="card px-4 py-8 text-center text-fg-3 text-sm">
          Нет фраз для этой аудитории. Добавь хотя бы одну — иначе бот не пришлёт
          напоминание в эти фазы дня.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <PhraseRow
              key={p.id}
              phrase={p}
              onEdit={(ph) => setEditing({ phrase: ph, audience: activeAudience })}
              onToggle={togglePhrase}
              onDelete={deletePhrase}
            />
          ))}
        </div>
      )}

      {editing && (
        <PhraseEditor
          phrase={editing.phrase}
          audience={editing.audience}
          onSave={savePhrase}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
