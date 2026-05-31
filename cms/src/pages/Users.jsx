import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useAuth } from '../lib/store.js'
import { useToast } from '../ui/Toast.jsx'
import { fmtDate, TIERS } from '../lib/format.js'
import { IconSearch, IconClose, IconUsers, IconCrown } from '../ui/icons.jsx'

function Stat({ label, value }) {
  return (
    <div className="card px-4 py-3">
      <div className="font-mono text-xl font-bold text-fg-0">{value ?? '—'}</div>
      <div className="text-xs text-fg-3">{label}</div>
    </div>
  )
}

function SubChip({ sub }) {
  const active = sub?.active && sub.expiresAt && new Date(sub.expiresAt) > new Date()
  if (!active) return <span className="chip bg-bg-3 text-fg-3">нет</span>
  return (
    <span className="chip bg-[oklch(0.4_0.1_300/0.25)] text-fg-1">
      <span className="h-1.5 w-1.5 rounded-full bg-violet" />
      {sub.tier === 'all-inclusive' ? 'всё вкл.' : 'осозн.'} · до {fmtDate(sub.expiresAt)}
    </span>
  )
}

export default function Users() {
  const isAdmin = useAuth((s) => s.admin?.role === 'admin')
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // user detail

  async function load() {
    setLoading(true)
    try {
      const [s, u] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users', { params: { search, onlyActive: onlyActive ? 'true' : '', pageSize: 50 } }),
      ])
      setStats(s.data)
      setRows(u.data.items)
      setTotal(u.data.total)
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [search, onlyActive])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-5 text-xl font-bold text-fg-0">Юзеры и подписки</h1>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="всего юзеров" value={stats?.users} />
        <Stat label="активных подписок" value={stats?.activeSubs} />
        <Stat label="чек-инов" value={stats?.checkins} />
        <Stat label="КТ-замеров" value={stats?.ktEntries} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3">
            <IconSearch size={16} />
          </span>
          <input
            className="input pl-9"
            placeholder="поиск по email / имени / tg / vk id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-fg-2">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          <span className="relative h-5 w-9 rounded-full bg-bg-3 transition-colors peer-checked:bg-violet after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-fg-0 after:transition-transform peer-checked:after:translate-x-4" />
          только с подпиской
        </label>
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_84px_1fr_96px] items-center gap-2 border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-4">
          <span>ID</span><span>Имя / email</span><span>источник</span><span>подписка</span><span className="text-right">регистр.</span>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-fg-3">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-fg-3">
            <IconUsers size={28} className="mx-auto mb-2 text-fg-4" />
            Никого не нашлось
          </div>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className="grid w-full grid-cols-[48px_1fr_84px_1fr_96px] items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg-2/60"
              >
                <span className="font-mono text-xs text-fg-3">{u.id}</span>
                <span className="min-w-0 truncate text-fg-1">{u.name || u.email || u.tgUserId || u.vkUserId || '—'}</span>
                <span className="text-xs text-fg-3">{u.source}</span>
                <span><SubChip sub={u.subscription} /></span>
                <span className="text-right font-mono text-xs text-fg-3">{fmtDate(u.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 px-1 text-xs text-fg-4">Показано {rows.length} из {total}</div>

      {selected && (
        <UserDrawer
          id={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}

function UserDrawer({ id, isAdmin, onClose, onChanged }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [tier, setTier] = useState('awareness')
  const [months, setMonths] = useState(1)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { data } = await api.get(`/admin/users/${id}`)
      setData(data)
      if (data.user.subscription?.tier) setTier(data.user.subscription.tier)
    } catch (e) {
      toast.err(errText(e))
    }
  }
  useEffect(() => { load() }, [id])

  async function grant() {
    setBusy(true)
    try {
      await api.post(`/admin/users/${id}/subscription/grant`, { tier, months: Number(months) })
      toast.ok('Подписка выдана')
      await load()
      onChanged()
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setBusy(false)
    }
  }
  async function revoke() {
    if (!confirm('Снять подписку у юзера?')) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${id}/subscription/revoke`)
      toast.ok('Подписка снята')
      await load()
      onChanged()
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const u = data?.user

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-in relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-line bg-bg-1 p-5 shadow-shadow-2">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-base font-bold text-fg-0">{u?.name || u?.email || `Юзер #${id}`}</div>
            <div className="font-mono text-xs text-fg-3">id {id} · {u?.source}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-sm text-fg-3 hover:bg-bg-3 hover:text-fg-0">
            <IconClose size={18} />
          </button>
        </div>

        {!data ? (
          <div className="py-16 text-center text-sm text-fg-3">Загрузка…</div>
        ) : (
          <>
            <div className="card mb-4 p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-4">Контакты</div>
              <Field label="email" value={u.email} />
              <Field label="tg id" value={u.tgUserId} />
              <Field label="vk id" value={u.vkUserId} />
              <Field label="регистрация" value={fmtDate(u.createdAt)} />
            </div>

            <div className="card mb-4 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-4">
                <IconCrown size={14} /> Подписка
              </div>
              <div className="mb-3"><SubChip sub={u.subscription} /></div>

              {isAdmin ? (
                <div className="border-t border-line pt-3">
                  <div className="mb-2 text-xs text-fg-3">ручная выдача / продление</div>
                  <div className="mb-2 flex gap-2">
                    <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
                      {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <input
                      className="input w-20"
                      type="number"
                      min="1"
                      max="36"
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                      title="месяцев"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1" onClick={grant} disabled={busy}>
                      Выдать / продлить
                    </button>
                    <button className="btn-danger" onClick={revoke} disabled={busy}>Снять</button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-fg-4">Выдача подписок доступна роли «администратор».</div>
              )}
            </div>

            <div className="card mb-4 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-4">
                Активность
              </div>
              <Field label="пройдено практик" value={data.completions.length} />
              <Field label="дней в трекере" value={data.trackerDays} />
              <Field label="чек-инов (всего показано)" value={data.checkins.length} />
              <Field label="КТ-замеров" value={data.ktEntries.length} />
            </div>

            {data.checkins.length > 0 && (
              <div className="card p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-4">
                  Последние чек-ины
                </div>
                <div className="flex flex-col gap-1.5">
                  {data.checkins.slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-fg-3">{fmtDate(c.createdAt)}</span>
                      <span className="font-mono text-fg-2">
                        q {c.q1}/{c.q2}/{c.q3}/{c.q4} · ИС {c.is}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-fg-3">{label}</span>
      <span className="font-mono text-fg-1">{value || value === 0 ? value : '—'}</span>
    </div>
  )
}
