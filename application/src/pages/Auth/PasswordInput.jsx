import { useState } from 'react'

export default function PasswordInput({ value, onChange, placeholder = 'Пароль' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input pr-12"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-fg-3 hover:text-fg-1"
        aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}
