import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import { resetPassword } from '../../api/auth'

export default function ResetPassword() {
  const [identifier, setIdentifier] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword({ identifier })
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Восстановить пароль"
      back={
        <Link to="/auth/login" className="inline-flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg-0">
          ← Назад ко входу
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-md border border-line-2 bg-white/5 p-5 text-center text-[14px] text-fg-1">
          Проверь почту или SMS — ссылка для восстановления отправлена.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email или телефон">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="field-input"
              placeholder="you@example.com"
            />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Отправить ссылку
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
