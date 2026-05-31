import { motion, motionValue, useSpring, useTransform } from 'framer-motion'

// Единый источник позиции мыши на всё приложение: ОДИН слушатель, значения
// обновляются вне React-рендера (дёшево). На тач-устройствах не активируется.
const rawX = motionValue(0)
const rawY = motionValue(0)
let started = false

export function startPointerTracking() {
  if (started || typeof window === 'undefined') return
  if (!window.matchMedia('(pointer: fine)').matches) return // только мышь
  started = true
  const onMove = (e) => {
    rawX.set((e.clientX / window.innerWidth) * 2 - 1) // −1..1
    rawY.set((e.clientY / window.innerHeight) * 2 - 1)
  }
  window.addEventListener('pointermove', onMove, { passive: true })
}

// Лёгкая привязка блока к движению мыши. strength — амплитуда в px.
export default function MouseFloat({ strength = 12, className = '', children, as = 'div', style }) {
  const sx = useSpring(rawX, { stiffness: 55, damping: 18, mass: 0.7 })
  const sy = useSpring(rawY, { stiffness: 55, damping: 18, mass: 0.7 })
  const x = useTransform(sx, (v) => v * strength)
  const y = useTransform(sy, (v) => v * strength)
  const M = motion[as] || motion.div
  return (
    <M className={className} style={{ x, y, ...style }}>
      {children}
    </M>
  )
}
