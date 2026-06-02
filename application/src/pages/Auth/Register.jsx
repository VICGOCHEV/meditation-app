import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { register, verifyCode } from '../../api/auth'
import { useAuthStore } from '../../store/useAuthStore'

// Те же правила что и на бэке (см. backend/src/routes/auth.js):
// 8+ символов, хотя бы одна буква и одна цифра.
const PASSWORD_RE = /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d).{8,}$/

function passwordChecks(pwd) {
  return {
    long: pwd.length >= 8,
    letter: /[A-Za-zА-Яа-яЁё]/.test(pwd),
    digit: /\d/.test(pwd),
  }
}

function PasswordHints({ pwd, show }) {
  const c = passwordChecks(pwd)
  if (!show) return null
  const row = (ok, label) => (
    <li className="flex items-center gap-2">
      <span
        className={
          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold ' +
          (ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-fg-3/20 text-fg-3')
        }
      >
        {ok ? '✓' : '·'}
      </span>
      <span className={ok ? 'text-fg-1' : 'text-fg-3'}>{label}</span>
    </li>
  )
  return (
    <ul className="mt-2 flex flex-col gap-1 text-[12px]">
      {row(c.long, 'минимум 8 символов')}
      {row(c.letter, 'хотя бы одна буква')}
      {row(c.digit, 'хотя бы одна цифра')}
    </ul>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)

  const [stage, setStage] = useState('form')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [pwdTouched, setPwdTouched] = useState(false)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const pwdOk = useMemo(() => PASSWORD_RE.test(password), [password])
  const matchOk = passwordRepeat.length > 0 && password === passwordRepeat
  const matchBad = passwordRepeat.length > 0 && password !== passwordRepeat
  const canSubmit = identifier.trim().length > 2 && pwdOk && matchOk && !loading

  const onRegister = async (e) => {
    e.preventDefault()
    setErr('')
    if (!identifier.trim()) return setErr('Введи email или телефон')
    if (!pwdOk) return setErr('Пароль слишком слабый: нужны 8+ символов, буква и цифра')
    if (!matchOk) return setErr('Пароли не совпадают')
    setLoading(true)
    try {
      const res = await register({ identifier: identifier.trim(), password })
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
              autoComplete="username"
            />
          </Field>

          <Field label="Пароль">
            <PasswordInput
              value={password}
              onChange={(v) => { setPassword(v); setPwdTouched(true) }}
            />
            <PasswordHints pwd={password} show={pwdTouched} />
          </Field>

          <Field label="Повтори пароль">
            <PasswordInput
              value={passwordRepeat}
              onChange={setPasswordRepeat}
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
