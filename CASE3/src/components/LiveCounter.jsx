import { useEffect, useState } from 'react'

// «В моменте N» — мягко дрейфующий счётчик присутствия (как на лендинге).
export default function LiveCounter({ min = 47, max = 740, start = 248 }) {
  const [n, setN] = useState(start)
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => {
        const drift = Math.round(Math.sin(Date.now() / 5000) * 3 + (Math.random() * 4 - 1.5))
        return Math.min(max, Math.max(min, v + drift))
      })
    }, 2600)
    return () => clearInterval(id)
  }, [min, max])

  return (
    <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: 'rgba(12,10,24,0.5)', border: '1px solid rgba(180,160,255,0.16)', backdropFilter: 'blur(6px)' }}>
      <span className="h-1.5 w-1.5 rounded-full bg-lilac soft-pulse" style={{ boxShadow: '0 0 8px #d6c8ff' }} />
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-1">
        В моменте <span className="text-fg-0">{n}</span>
      </span>
    </span>
  )
}
