import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import { resetPassword } from '../../api/auth'

// Простая email-валидация (точные правила всё равно на бэке).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ResetPassword() {
  const [identifier, setIdentifier] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    const v = identifier.trim().toLowerCase()
    if (!EMAIL_RE.test(v)) {
      setErr('Введи корректный email — на него придёт письмо.')
      return
    }
    setLoading(true)
    try {
      await resetPassword({ identifier: v })
      setSent(true)
    } catch {
      // Бэк всегда возвращает 200 (anti-enumeration), сюда не должны
      // попасть, но на всякий случай.
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Восстановить пароль"
      back={
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg-0"
        >
          ← Назад ко входу
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-line-2 bg-white/5 px-4 py-5 text-center">
            <div className="mb-2 text-[15px] text-fg-0">Письмо отправлено</div>
            <p className="text-[14px] text-fg-2">
              Если такая почта зарегистрирована, на неё уйдёт письмо с
              инструкцией. Проверь входящие и папку «Спам».
            </p>
          </div>
          <Link to="/auth/login" className="block">
            <Button size="lg" fullWidth variant="secondary">
              ← Вернуться ко входу
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-[14px] text-fg-2">
            Введи email от своего аккаунта — на него придёт письмо с инструкцией
            по сбросу пароля.
          </p>
          <Field label="Email">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="field-input"
              placeholder="you@example.com"
            />
          </Field>
          {err && <div className="text-sm text-err">{err}</div>}
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Отправить ссылку
          </Button>
          <div className="pt-2 text-center text-[13px] text-fg-3">
            Вспомнил пароль?{' '}
            <Link to="/auth/login" className="text-lilac">Войти</Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
