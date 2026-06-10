import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { resetPasswordConfirm } from '../../api/auth'
import { useAuthStore } from '../../store/useAuthStore'

const PASSWORD_RE = /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*[\d\W_]).{8,}$/

function PasswordHints({ pwd, show }) {
  if (!show) return null
  const c = {
    long: pwd.length >= 8,
    letter: /[A-Za-zА-Яа-яЁё]/.test(pwd),
    nonAlpha: /[\d\W_]/.test(pwd),
  }
  const row = (ok, label) => (
    <li key={label} className="flex items-center gap-2">
      <span
        className={
          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ' +
          (ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-fg-3/20 text-fg-3')
        }
      >
        {ok ? (
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5L20 7" />
          </svg>
        ) : (
          <span className="h-1 w-1 rounded-full bg-current opacity-60" />
        )}
      </span>
      <span className={ok ? 'text-fg-1' : 'text-fg-3'}>{label}</span>
    </li>
  )
  return (
    <ul className="mt-2 flex flex-col gap-1 text-[12px]">
      {row(c.long, 'минимум 8 символов')}
      {row(c.letter, 'хотя бы одна буква')}
      {row(c.nonAlpha, 'хотя бы одна цифра или символ')}
    </ul>
  )
}

export default function ResetPasswordConfirm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const authLogin = useAuthStore((s) => s.login)

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const pwdOk = useMemo(() => PASSWORD_RE.test(password), [password])
  const matchOk = repeat.length > 0 && password === repeat
  const matchBad = repeat.length > 0 && password !== repeat
  const canSubmit = pwdOk && matchOk && token && !loading

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!token) return setErr('Ссылка некорректна. Запроси новое письмо.')
    if (!pwdOk) return setErr('Пароль слишком слабый: 8+ символов, буква и цифра/символ')
    if (!matchOk) return setErr('Пароли не совпадают')
    setLoading(true)
    try {
      const res = await resetPasswordConfirm({ token, password })
      if (res?.token && res?.user) {
        authLogin(res.token, res.user)
        navigate('/', { replace: true })
        return
      }
      setErr('Не удалось обновить пароль. Запроси новое письмо.')
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Ошибка сброса пароля')
    } finally {
      setLoading(false)
    }
  }

  // Если в URL нет token — ссылка битая. Показываем подсказку.
  if (!token) {
    return (
      <AuthShell title="Ссылка устарела">
        <p className="text-[14px] text-fg-2">
          Похоже, ссылка для сброса пароля битая или истекла. Запроси новое
          письмо со страницы восстановления.
        </p>
        <Link to="/auth/reset" className="block pt-4">
          <Button size="lg" fullWidth>
            Запросить новую ссылку
          </Button>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Создать новый пароль"
      back={
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg-0"
        >
          ← Назад ко входу
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-[14px] text-fg-2">
          Придумай новый пароль для своего аккаунта.
        </p>

        <Field label="Новый пароль">
          <PasswordInput
            value={password}
            onChange={(v) => { setPassword(v); setTouched(true) }}
          />
          <PasswordHints pwd={password} show={touched} />
        </Field>

        <Field label="Повтори пароль">
          <PasswordInput
            value={repeat}
            onChange={setRepeat}
            placeholder="Повтор пароля"
          />
          {matchBad && (
            <div className="mt-1 text-[12px] text-rose-400">
              Пароли не совпадают
            </div>
          )}
          {matchOk && (
            <div className="mt-1 text-[12px] text-emerald-400">
              Пароли совпадают
            </div>
          )}
        </Field>

        {err && <div className="text-sm text-err">{err}</div>}

        <Button type="submit" size="lg" fullWidth loading={loading} disabled={!canSubmit}>
          Обновить пароль
        </Button>
      </form>
    </AuthShell>
  )
}
