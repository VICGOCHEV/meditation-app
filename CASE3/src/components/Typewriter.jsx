import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

// Эффект печатной машинки: текст «набирается» посимвольно, когда блок
// попадает во вьюпорт (один раз). Чтобы строки ниже не «прыгали» по мере
// набора, полный текст рендерится невидимым плейсхолдером и резервирует
// место, а печатаемый текст лежит абсолютом поверх него.
export default function Typewriter({ text, speed = 22, startDelay = 0, className = '', style }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  const [done, setDone] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let interval = 0
    let timeout = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return
        started.current = true
        timeout = setTimeout(() => {
          let i = 0
          interval = setInterval(() => {
            i += 1
            setN(i)
            if (i >= text.length) {
              clearInterval(interval)
              setDone(true)
            }
          }, speed)
        }, startDelay)
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [text, speed, startDelay])

  return (
    <span ref={ref} className={`relative inline-block ${className}`} style={style}>
      {/* плейсхолдер резервирует размер строки */}
      <span aria-hidden style={{ visibility: 'hidden' }}>{text}</span>
      <span className="absolute inset-0">
        {text.slice(0, n)}
        {!done && (
          <motion.span
            aria-hidden
            className="inline-block"
            style={{ marginLeft: 1, width: '0.06em', borderRight: '1.5px solid currentColor', opacity: 0.8 }}
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
          >
            &nbsp;
          </motion.span>
        )}
      </span>
    </span>
  )
}
