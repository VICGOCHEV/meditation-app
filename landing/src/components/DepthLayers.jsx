import { useEffect } from 'react'
import { motion, useTransform, useMotionValue, useSpring } from 'framer-motion'

const B = import.meta.env.BASE_URL

// Слои-спрайты: каждый объект — цельная картинка, двигается целиком
// (стволы НЕ рвутся, в отличие от попиксельного шейдера).
// plate = непрозрачная подложка (небо+город+река) → за уехавшими спрайтами
// всегда настоящий фон, не дыра/смаз. Без blur (перф).
const LAYERS = [
  { src: 'plate.webp', z: 10, scale: [1, 1.18], y: [0, -12], fade: null, mouse: 6 }, // фон-подложка
  { src: 'layer-3.webp', z: 20, scale: [1, 1.5], y: [0, 50], fade: null, mouse: 12 }, // беседка
  { src: 'layer-2.webp', z: 30, scale: [1, 2.05], y: [0, 105], fade: [0.8, 1.0], mouse: 22 }, // деревья-рамка
  { src: 'layer-1.webp', z: 40, scale: [1, 2.75], y: [0, 185], fade: [0.5, 0.74], mouse: 32 }, // передние цветы
]

function Layer({ progress, mx, my, cfg }) {
  const scale = useTransform(progress, [0, 1], cfg.scale)
  const sy = useTransform(progress, [0, 1], cfg.y)
  const x = useTransform(mx, (v) => v * cfg.mouse)
  const y = useTransform([sy, my], ([s, m]) => s + m * cfg.mouse)
  const opacity = useTransform(progress, cfg.fade || [0, 1], cfg.fade ? [1, 0] : [1, 1])
  return (
    <motion.img
      src={`${B}hero/${cfg.src}`}
      alt=""
      aria-hidden
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ zIndex: cfg.z, scale, x, y, opacity }}
    />
  )
}

export default function DepthLayers({ progress }) {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.4 })
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.4 })

  useEffect(() => {
    const onMove = (e) => {
      rawX.set((e.clientX / window.innerWidth) * 2 - 1)
      rawY.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [rawX, rawY])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1033]">
      {LAYERS.map((cfg) => (
        <Layer key={cfg.src} progress={progress} mx={mx} my={my} cfg={cfg} />
      ))}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 50, background: 'radial-gradient(120% 90% at 50% 38%, transparent 50%, rgba(10,7,20,0.5) 100%)' }}
      />
    </div>
  )
}
