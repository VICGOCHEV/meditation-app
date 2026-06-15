import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { IconPlus, IconTrash, IconCheck, IconClose } from '../ui/icons.jsx'

// Промокоды — раздел CMS для управления скидками на /subscription.
// Поток юзера: вводит код → бэк проверяет → платёж создаётся с финальной
// суммой → при оплате код помечается как использованный.

export default function PromoCodes() {
  const toast = useToast()
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [newPercent, setNewPercent] = useState(20)
  const [newMax, setNewMax] = useState('')
  const [newUntil, setNewUntil] = useState('')
  const [newNote, setNewNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { data } = await api.get('/admin/promocodes')
      setCodes(data.codes || [])
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  async function create(e) {
    e?.preventDefault?.()
    if (!newCode.trim()) return
    setBusy(true)
    try {
      await api.post('/admin/promocodes', {
        code: newCode.trim().toUpperCase(),
        percent: Number(newPercent),
        maxUses: newMax ? Number(newMax) : 0,
        validUntil: newUntil ? new Date(newUntil).toISOString() : undefined,
        note: newNote.trim() || undefined,
      })
      setNewCode(''); setNewPercent(20); setNewMax(''); setNewUntil(''); setNewNote('')
      toast.ok('Промокод создан')
      load()
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(id) {
    try {
      await api.post(`/admin/promocodes/${id}/toggle`)
      load()
    } catch (e) {
      toast.err(errText(e))
    }
  }

  async function remove(id) {
    if (!confirm('Удалить промокод? Юзеры с применённым промо сохраняют доступ — операция влияет только на новые попытки.')) return
    try {
      await api.delete(`/admin/promocodes/${id}`)
      load()
    } catch (e) {
      toast.err(errText(e))
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-2 text-xl font-bold text-fg-0">Промокоды</h1>
      <p className="mb-5 text-sm text-fg-3">
        Скидка на подписку. Код вводится на экране /subscription.
        100%-промокод активирует подписку сразу, без захода в ЮKassa.
        Один юзер может применить один и тот же код только раз.
      </p>

      <form onSubmit={create} className="panel mb-6">
        <h2 className="mb-3 text-sm font-bold text-fg-0">Новый промокод</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Код</span>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              placeholder="NEWYEAR2026"
              className="input mt-1 font-mono tracking-[0.1em]"
              required
            />
          </label>
          <label className="block">
            <span className="label">Скидка, %</span>
            <input
              type="number"
              min={1} max={100}
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              className="input mt-1"
              required
            />
          </label>
          <label className="block">
            <span className="label">Максимум использований (0 = без лимита)</span>
            <input
              type="number"
              min={0}
              value={newMax}
              onChange={(e) => setNewMax(e.target.value)}
              placeholder="0"
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="label">Действует до (опц.)</span>
            <input
              type="date"
              value={newUntil}
              onChange={(e) => setNewUntil(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Заметка для себя (опц.)</span>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Акция к Новому году"
              maxLength={200}
              className="input mt-1"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            <IconPlus /> Создать
          </button>
        </div>
      </form>

      <div className="panel">
        <h2 className="mb-3 text-sm font-bold text-fg-0">
          Все промокоды {codes.length > 0 && <span className="text-fg-3">· {codes.length}</span>}
        </h2>
        {loading ? (
          <div className="py-8 text-center text-fg-3">Загружаем…</div>
        ) : codes.length === 0 ? (
          <div className="py-8 text-center text-fg-3">Пока ни одного промокода.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-2 text-left text-xs uppercase tracking-[0.12em] text-fg-3">
                  <th className="py-2 pr-3">Код</th>
                  <th className="py-2 pr-3">Скидка</th>
                  <th className="py-2 pr-3">Использовано</th>
                  <th className="py-2 pr-3">До</th>
                  <th className="py-2 pr-3">Статус</th>
                  <th className="py-2 pr-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-line">
                    <td className="py-3 pr-3 font-mono text-fg-0">{c.code}</td>
                    <td className="py-3 pr-3 text-fg-1">−{c.percent}%</td>
                    <td className="py-3 pr-3 text-fg-1">
                      {c.usedCount}{c.maxUses > 0 ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="py-3 pr-3 text-fg-2">
                      {c.validUntil
                        ? new Date(c.validUntil).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    <td className="py-3 pr-3">
                      {c.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                          <IconCheck /> активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-fg-3/15 px-2 py-0.5 text-xs text-fg-3">
                          <IconClose /> выключен
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggle(c.id)}
                          className="rounded-md border border-line-2 px-3 py-1 text-xs text-fg-1 hover:bg-white/5"
                        >
                          {c.active ? 'Выключить' : 'Включить'}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          className="rounded-md border border-line-2 px-3 py-1 text-xs text-fg-1 hover:bg-err/10 hover:text-err"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
