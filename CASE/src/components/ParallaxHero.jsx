import { motion, useTransform } from 'framer-motion'

const B = import.meta.env.BASE_URL

// Слои по глубине (дальний → ближний). Ближние едут быстрее, сильнее
// масштабируются и раньше уходят/расфокусируются — эффект влёта внутрь.
// Зум ограничен (исходники 1448px — сильный апскейл мылит). Глубина — за счёт
// РАЗНИЦЫ скоростей слоёв, а не экстремального масштаба.
const LAYERS = [
  { src: 'layer-5.webp', z: 10, scale: [1, 1.18], y: [0, -20], fade: null, blur: 0 }, // небо + город
  { src: 'layer-4.webp', z: 20, scale: [1, 1.55], y: [0, 50], fade: [0.8, 1.0], blur: 0.5 }, // река + деревья
  { src: 'layer-3.webp', z: 30, scale: [1, 1.9], y: [0, 90], fade: [0.64, 0.94], blur: 1 }, // беседка
  { src: 'layer-2.webp', z: 40, scale: [1, 2.6], y: [0, 130], fade: [0.46, 0.74], blur: 2 }, // обрамляющие деревья
  { src: 'layer-1.webp', z: 50, scale: [1, 3.4], y: [0, 230], fade: [0.3, 0.52], blur: 3.5 }, // передние цветы
]

function Layer({ progress, cfg }) {
  const scale = useTransform(progress, [0, 1], cfg.scale)
  const y = useTransform(progress, [0, 1], cfg.y)
  // всегда вызываем хук; без fade — диапазон-«заглушка» (всегда 1)
  const opacity = useTransform(progress, cfg.fade || [0, 1], cfg.fade ? [1, 0] : [1, 1])
  const blurMv = useTransform(progress, [0, 1], [0, cfg.blur])
  const filter = useTransform(blurMv, (b) => (b ? `blur(${b}px)` : 'none'))
  return (
    <motion.img
      src={`${B}hero/${cfg.src}`}
      alt=""
      aria-hidden
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ zIndex: cfg.z, scale, y, opacity, filter }}
    />
  )
}

export default function ParallaxHero({ progress }) {
  // лёгкая дымка-виньетка поверх, усиливает глубину к краям
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1033]">
      {LAYERS.map((cfg) => (
        <Layer key={cfg.src} progress={progress} cfg={cfg} />
      ))}
      {/* атмосферная виньетка */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 60,
          background:
            'radial-gradient(120% 90% at 50% 35%, transparent 45%, rgba(10,7,20,0.55) 100%), linear-gradient(180deg, rgba(10,7,20,0.35), transparent 30%, transparent 70%, rgba(10,7,20,0.6))',
        }}
      />
    </div>
  )
}
