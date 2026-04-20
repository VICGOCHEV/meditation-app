import { useEffect } from 'react'

export default function Modal({ open, onClose, children, title }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-20 backdrop-blur-sm sm:items-center sm:pb-20">
      <div
        className="w-full max-w-md animate-fade-in rounded-xl border border-line-2 bg-bg-2 p-6 shadow-shadow-2"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="mb-3 font-serif text-2xl text-fg-0">{title}</h3>
        )}
        {children}
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
