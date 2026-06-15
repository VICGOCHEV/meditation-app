import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { PASSWORD_RE, passwordChecks } from './passwordRules'
import { register, verifyCode } from '../../api/auth'
import { useAuthStore } from '../../store/useAuthStore'

// Те же правила что и на бэке (backend/src/routes/auth.js):
// 8+ символов, хотя бы одна буква и хотя бы одна цифра ИЛИ символ.
// Раньше фронт требовал именно цифру — backend пропускал «Password!»,
// фронт нет → юзер думал что правильный пароль отвергают.

function PasswordHints({ pwd, show }) {
  const c = passwordChecks(pwd)
  if (!show) return null
  const row = (ok, label) => (
    <li className="flex items-center gap-2">
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
  // Чекбокс согласия с офертой/политикой/согласием на ОПД — обязателен
  // для регистрации (152-ФЗ + Закон о защите прав потребителей). Без
  // галки кнопка «Присоединиться» задизейблена.
  const [legalOk, setLegalOk] = useState(false)

  const pwdOk = useMemo(() => PASSWORD_RE.test(password), [password])
  const matchOk = passwordRepeat.length > 0 && password === passwordRepeat
  const matchBad = passwordRepeat.length > 0 && password !== passwordRepeat
  const canSubmit = identifier.trim().length > 2 && pwdOk && matchOk && legalOk && !loading

  const onRegister = async (e) => {
    e.preventDefault()
    setErr('')
    if (!identifier.trim()) return setErr('Введи email')
    if (!pwdOk) return setErr('Пароль слишком слабый: нужны 8+ символов, хотя бы одна буква и одна цифра или символ')
    if (!matchOk) return setErr('Пароли не совпадают')
    if (!legalOk) return setErr('Чтобы продолжить, подтверди согласие с документами')
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
          <Field label="Email">
            <input
              type="email"
              inputMode="email"
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

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={legalOk}
              onChange={(e) => setLegalOk(e.target.checked)}
              className="mt-[3px] h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-line-2 bg-white/5 checked:border-lilac checked:bg-lilac/30 transition focus:outline-none focus:ring-2 focus:ring-lilac/40"
              style={{
                backgroundImage: legalOk
                  ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%23f4f0ff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E\")"
                  : 'none',
                backgroundSize: '12px 12px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            <span className="text-[12px] leading-snug text-fg-2">
              Я ознакомился и принимаю{' '}
              <a href="/docs/user-agreement.pdf" target="_blank" rel="noopener noreferrer" className="text-lilac underline-offset-2 hover:underline">оферту</a>,{' '}
              <a href="/docs/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" className="text-lilac underline-offset-2 hover:underline">политику&nbsp;конфиденциальности</a>{' '}
              и даю{' '}
              <a href="/docs/personal-data-consent.pdf" target="_blank" rel="noopener noreferrer" className="text-lilac underline-offset-2 hover:underline">согласие&nbsp;на&nbsp;обработку&nbsp;персональных&nbsp;данных</a>.
            </span>
          </label>

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
