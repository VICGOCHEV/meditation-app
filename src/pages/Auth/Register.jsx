import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { register, verifyCode } from '../../api/auth'
import { useAuthStore } from '../../store/useAuthStore'

export default function Register() {
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)

  const [stage, setStage] = useState('form')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const onRegister = async (e) => {
    e.preventDefault()
    setErr('')
    if (!identifier || !password) {
      setErr('Заполни все поля')
      return
    }
    if (password !== passwordRepeat) {
      setErr('Пароли не совпадают')
      return
    }
    setLoading(true)
    try {
      const res = await register({ identifier, password })
      // Email-registration returns a ready token — drop straight into
      // the app, no SMS step. Phone-registration (when wired) will
      // omit the token and fall through to the verify stage.
      if (res?.token && res?.user) {
        authLogin(res.token, res.user)
        navigate('/')
        return
      }
      setStage('verify')
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        (e?.response?.status >= 500
          ? 'Мы ненадолго замедлились. Пожалуйста, попробуй чуть позже.'
          : null) ||
        e?.message ||
        'Ошибка регистрации'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  const onVerify = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { token, user } = await verifyCode({ code })
      authLogin(token, user)
      navigate('/')
    } catch (e) {
      setErr(e.message || 'Неверный код')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={stage === 'form' ? 'Создать аккаунт' : 'Подтверди номер'}>
      {stage === 'form' ? (
        <form onSubmit={onRegister} className="flex flex-col gap-4">
          <Field label="Email или телефон">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="field-input"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Пароль">
            <PasswordInput value={password} onChange={setPassword} />
          </Field>
          <Field label="Повтори пароль">
            <PasswordInput value={passwordRepeat} onChange={setPasswordRepeat} placeholder="Повтор пароля" />
          </Field>
          {err && <div className="text-sm text-err">{err}</div>}
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Присоединиться
          </Button>
          <div className="pt-2 text-center text-[13px] text-fg-2">
            Уже есть аккаунт?{' '}
            <Link to="/auth/login" className="text-lilac">Войти</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={onVerify} className="flex flex-col gap-4">
          <p className="text-center text-[14px] text-fg-2">
            Введи код из SMS или email
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="field-input text-center font-mono text-2xl tracking-[0.5em]"
            placeholder="••••••"
          />
          {err && <div className="text-sm text-err">{err}</div>}
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Подтвердить
          </Button>
          <button
            type="button"
            onClick={() => setStage('form')}
            className="text-center text-[13px] text-fg-3 hover:text-fg-1"
          >
            Отправить повторно
          </button>
        </form>
      )}
    </AuthShell>
  )
}
