import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { useAuthStore } from '../../store/useAuthStore'
import { login } from '../../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { token, user } = await login({ identifier, password })
      authLogin(token, user)
      navigate('/')
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        (e?.response?.status >= 500
          ? 'Мы ненадолго замедлились. Пожалуйста, попробуй чуть позже.'
          : null) ||
        e?.message ||
        'Не удалось войти'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Войти">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email или телефон">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="field-input"
            placeholder="you@example.com"
            autoComplete="username"
          />
        </Field>

        <Field label="Пароль">
          <PasswordInput value={password} onChange={setPassword} />
        </Field>

        {err && <div className="text-sm text-err">{err}</div>}

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Присоединиться
        </Button>

        <div className="flex flex-col items-center gap-2 pt-4 text-[13px]">
          <Link to="/auth/register" className="text-fg-2 hover:text-fg-0">
            Нет аккаунта? <span className="text-lilac">Зарегистрироваться</span>
          </Link>
          <Link to="/auth/reset" className="text-fg-3 hover:text-fg-1">
            Забыл пароль?
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
