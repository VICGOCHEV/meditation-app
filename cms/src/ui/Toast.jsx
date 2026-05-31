import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { IconCheck, IconClose } from './icons.jsx'

const ToastCtx = createContext({ ok: () => {}, err: () => {} })
export const useToast = () => useContext(ToastCtx)

let seq = 0

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const push = useCallback((message, type = 'ok') => {
    const id = ++seq
    setItems((s) => [...s, { id, message, type }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3500)
  }, [])

  // стабильный объект { ok, err } — компоненты зовут toast.ok / toast.err
  const toast = useMemo(
    () => ({ ok: (m) => push(m, 'ok'), err: (m) => push(m, 'err') }),
    [push],
  )

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in card flex items-start gap-2.5 px-4 py-3 shadow-shadow-2 ${
              t.type === 'err' ? 'border-[oklch(0.5_0.15_20/0.5)]' : 'border-line-2'
            }`}
          >
            <span
              className={`mt-0.5 shrink-0 ${t.type === 'err' ? 'text-err' : 'text-ok'}`}
            >
              {t.type === 'err' ? <IconClose size={16} /> : <IconCheck size={16} />}
            </span>
            <span className="text-sm text-fg-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
