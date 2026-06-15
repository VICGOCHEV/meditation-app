import { motion } from 'framer-motion'
import Icon from '../lib/icons'

/* ─────────────────────────────────────────────────────────────
   Общие строительные блоки кейса (поверх story.jsx / kit.jsx).
   Всё адаптивно: мобайл — стек, десктоп — раскладка из макета.
   ───────────────────────────────────────────────────────────── */

const EASE = [0.22, 0.9, 0.3, 1]

// Угловая mono-метка секции (как «01 / ОБЛОЖКА» в макете).
export function SecTag({ num, children, className = '' }) {
  return (
    <div className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] ${className}`}>
      <span className="text-lilac">{num}</span>
      <span className="h-px w-7 bg-lilac/40" />
      <span className="text-fg-3">{children}</span>
    </div>
  )
}

// Секция-обёртка с воздухом и угловой меткой. Призрачный номер справа.
export function Sec({ id, num, tag, ghost, children, className = '', wide = false }) {
  return (
    <section
      id={id}
      className={`relative mx-auto w-full px-5 py-24 sm:px-8 sm:py-32 ${wide ? 'max-w-[1280px]' : 'max-w-[1180px]'} ${className}`}
    >
      {ghost && (
        <span aria-hidden className="ghost-num pointer-events-none absolute -top-6 right-2 select-none text-[110px] leading-none sm:right-6 sm:text-[200px]">
          {ghost}
        </span>
      )}
      {tag && (
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <SecTag num={num} className="mb-9 sm:mb-12">{tag}</SecTag>
        </motion.div>
      )}
      {children}
    </section>
  )
}

// Крупный заголовок с акцентной точкой.
export function Title({ children, className = '', accent = true }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: EASE }}
      className={`text-balance font-extralight leading-[1.02] text-fg-0 ${className}`}
      style={{ textShadow: '0 0 48px rgba(97,69,194,0.30)' }}
    >
      {children}
      {accent && <span className="text-violet">.</span>}
    </motion.h2>
  )
}

// Лид-абзац под заголовком.
export function Lead({ children, className = '' }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
      className={`text-[16px] leading-relaxed text-fg-2 sm:text-[18px] ${className}`}
    >
      {children}
    </motion.p>
  )
}

// 3D-наклон телефона (CSS, без либ) — мягкий «портфолийный» ракурс.
export function Tilt3D({ children, rotY = -12, rotX = 5, className = '' }) {
  return (
    <div className={className} style={{ perspective: 1400 }}>
      <div
        className="transition-transform duration-500 will-change-transform"
        style={{ transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`, transformStyle: 'preserve-3d' }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`)}
      >
        {children}
      </div>
    </div>
  )
}

// Орбитальное кольцо со спутниками вокруг центра (Profile / Ecosystem).
// nodes: [{ icon?, label?, value? }] раскладываются по окружности.
export function OrbitRing({ size = 360, nodes = [], spin = 60, center, ringClass = '' }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '100%', aspectRatio: '1/1' }}>
      {/* кольца */}
      {[1, 0.74, 0.5].map((k, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${ringClass}`}
          style={{
            inset: `${(1 - k) * 50}%`,
            border: '1px solid rgba(180,160,255,0.14)',
            boxShadow: i === 0 ? 'inset 0 0 60px rgba(97,69,194,0.12)' : 'none',
          }}
        />
      ))}
      {/* медленное вращение спутников */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: spin, ease: 'linear', repeat: Infinity }}
      >
        {nodes.map((n, i) => {
          // позиционируем в процентах — кольцо корректно масштабируется на мобайле
          const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
          const x = 50 + Math.cos(ang) * 46
          const y = 50 + Math.sin(ang) * 46
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {/* контр-вращение, чтобы текст оставался ровным */}
              <motion.div animate={{ rotate: -360 }} transition={{ duration: spin, ease: 'linear', repeat: Infinity }}>
                <OrbNode {...n} />
              </motion.div>
            </div>
          )
        })}
      </motion.div>
      {/* центр */}
      <div className="absolute inset-0 grid place-items-center">{center}</div>
    </div>
  )
}

function OrbNode({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="grid h-14 w-14 place-items-center rounded-2xl text-lilac sm:h-[68px] sm:w-[68px]"
        style={{
          background: 'rgba(20,16,42,0.9)',
          border: '1px solid rgba(180,160,255,0.26)',
          boxShadow: '0 0 28px -6px rgba(97,69,194,0.8), inset 0 0 18px rgba(97,69,194,0.2)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {value != null ? <span className="font-mono text-[18px] text-fg-0">{value}</span> : <Icon name={icon} size={28} />}
      </span>
      {label && <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-fg-2">{label}</span>}
    </div>
  )
}

// Чип технологии стека.
export function Tech({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-lg px-3 py-1.5 font-mono text-[12px] text-fg-1"
      style={{ background: 'rgba(180,160,255,0.06)', border: '1px solid rgba(180,160,255,0.14)' }}
    >
      {children}
    </span>
  )
}
