import { useEffect, useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useAuth } from '../lib/store.js'
import { useToast } from '../ui/Toast.jsx'
import { IconPlus, IconTrash, IconCheck } from '../ui/icons.jsx'

// Аккаунт CMS: смена своего пароля (доступно всем) + управление списком
// админов (только role: admin). Заменяет ручной запуск prisma/seed-admin.js.

export default function Account() {
  const me = useAuth((s) => s.admin)
  const toast = useToast()
  const isAdmin = me?.role === 'admin'

  // ── смена своего пароля ──
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [next2, setNext2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  async function changePassword(e) {
    e.preventDefault()
    if (next.length < 8) return toast.err('Новый пароль минимум 8 символов')
    if (next !== next2) return toast.err('Пароли не совпадают')
    setPwBusy(true)
    try {
      await api.patch('/admin/password', { currentPassword: cur, newPassword: next })
      setCur(''); setNext(''); setNext2('')
      toast.ok('Пароль изменён')
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setPwBusy(false)
    }
  }

  // ── список админов ──
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(isAdmin)
  const [nEmail, setNEmail] = useState('')
  const [nName, setNName] = useState('')
  const [nPass, setNPass] = useState('')
  const [nRole, setNRole] = useState('editor')
  const [addBusy, setAddBusy] = useState(false)

  async function loadAdmins() {
    try {
      const { data } = await api.get('/admin/admins')
      setAdmins(data.admins || [])
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (isAdmin) loadAdmins() }, []) // eslint-disable-line

  async function addAdmin(e) {
    e.preventDefault()
    if (nPass.length < 8) return toast.err('Пароль минимум 8 символов')
    setAddBusy(true)
    try {
      await api.post('/admin/admins', {
        email: nEmail.trim(),
        password: nPass,
        name: nName.trim() || undefined,
        role: nRole,
      })
      setNEmail(''); setNName(''); setNPass(''); setNRole('editor')
      toast.ok('Доступ выдан')
      loadAdmins()
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setAddBusy(false)
    }
  }

  async function removeAdmin(a) {
    if (!confirm(`Удалить доступ ${a.email}? Этот человек больше не сможет войти в CMS.`)) return
    try {
      await api.delete(`/admin/admins/${a.id}`)
      toast.ok('Доступ удалён')
      loadAdmins()
    } catch (e) {
      toast.err(errText(e))
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-fg-0">Аккаунт</h1>
      <p className="mb-6 text-sm text-fg-3">
        Вход выполнен как <span className="text-fg-1">{me?.email}</span> ·{' '}
        {isAdmin ? 'администратор' : 'редактор'}
      </p>

      {/* смена своего пароля */}
      <form onSubmit={changePassword} className="panel mb-6">
        <h2 className="mb-3 text-sm font-bold text-fg-0">Смена пароля</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Текущий пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              className="input mt-1"
              required
            />
          </label>
          <label className="block">
            <span className="label">Новый пароль</span>
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="минимум 8 символов"
              className="input mt-1"
              required
            />
          </label>
          <label className="block">
            <span className="label">Повторите новый</span>
            <input
              type="password"
              autoComplete="new-password"
              value={next2}
              onChange={(e) => setNext2(e.target.value)}
              className="input mt-1"
              required
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={pwBusy}>
            {pwBusy ? 'Сохраняем…' : 'Сменить пароль'}
          </button>
        </div>
      </form>

      {/* управление доступами — только для админа */}
      {isAdmin && (
        <>
          <form onSubmit={addAdmin} className="panel mb-6">
            <h2 className="mb-1 text-sm font-bold text-fg-0">Выдать доступ</h2>
            <p className="mb-3 text-xs text-fg-3">
              Редактор управляет только контентом. Администратор дополнительно
              может выдавать подписки и управлять доступами.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Email</span>
                <input
                  type="email"
                  value={nEmail}
                  onChange={(e) => setNEmail(e.target.value)}
                  placeholder="editor@all-relaxme.ru"
                  className="input mt-1"
                  required
                />
              </label>
              <label className="block">
                <span className="label">Имя (опц.)</span>
                <input
                  type="text"
                  value={nName}
                  onChange={(e) => setNName(e.target.value)}
                  placeholder="Имя для отображения"
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="label">Пароль</span>
                <input
                  type="text"
                  value={nPass}
                  onChange={(e) => setNPass(e.target.value)}
                  placeholder="минимум 8 символов"
                  className="input mt-1 font-mono"
                  required
                />
              </label>
              <label className="block">
                <span className="label">Роль</span>
                <select
                  value={nRole}
                  onChange={(e) => setNRole(e.target.value)}
                  className="input mt-1"
                >
                  <option value="editor">Редактор</option>
                  <option value="admin">Администратор</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="btn-primary" disabled={addBusy}>
                <IconPlus /> {addBusy ? 'Создаём…' : 'Выдать доступ'}
              </button>
            </div>
          </form>

          <div className="panel">
            <h2 className="mb-3 text-sm font-bold text-fg-0">
              Все доступы {admins.length > 0 && <span className="text-fg-3">· {admins.length}</span>}
            </h2>
            {loading ? (
              <div className="py-8 text-center text-fg-3">Загружаем…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line-2 text-left text-xs uppercase tracking-[0.12em] text-fg-3">
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Имя</th>
                      <th className="py-2 pr-3">Роль</th>
                      <th className="py-2 pr-3">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => (
                      <tr key={a.id} className="border-b border-line">
                        <td className="py-3 pr-3 text-fg-0">
                          {a.email}
                          {a.id === me?.id && <span className="ml-2 text-[11px] text-fg-4">(вы)</span>}
                        </td>
                        <td className="py-3 pr-3 text-fg-2">{a.name || '—'}</td>
                        <td className="py-3 pr-3">
                          {a.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet/15 px-2 py-0.5 text-xs text-violet">
                              <IconCheck /> администратор
                            </span>
                          ) : (
                            <span className="rounded-full bg-fg-3/15 px-2 py-0.5 text-xs text-fg-2">редактор</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          {a.id === me?.id ? (
                            <span className="text-xs text-fg-4">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeAdmin(a)}
                              className="rounded-md border border-line-2 px-3 py-1 text-xs text-fg-1 hover:bg-err/10 hover:text-err"
                            >
                              <IconTrash />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
