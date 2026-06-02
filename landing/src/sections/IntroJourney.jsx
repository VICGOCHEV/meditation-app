import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent, useSpring } from 'framer-motion'
import ScrollScrub from '../components/ScrollScrub'
import ShinyButton from '../components/ShinyButton'
import MouseFloat from '../components/MouseFloat'
import { SymBlob, SymRipple, SymWave, SymOrbit, SymConstellation } from '../components/OrbSymbols'

// глубинный шейдер — отдельным чанком, монтируется только в своей фазе
const DepthScene = lazy(() => import('../components/DepthScene'))

const EASE = [0.25, 1, 0.5, 1]

// Онбординг-типографика: строки разного веса, вход с блюром слева/справа/снизу
// со стаггером. Композиция горизонтальная — строки уходят «лесенкой» вправо.
// Без blur в входе (он давал дёрганье текста на первой загрузке) — только
// мягкий сдвиг + opacity.
const slideVar = { hidden: {}, visible: { transition: { staggerChildren: 0.18, delayChildren: 0.15 } } }
const lineLeft = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE } },
}
const lineRight = {
  hidden: { opacity: 0, x: 14 },
  visible: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE } },
}
const lineDown = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: EASE } },
}

// Раскладка по скроллу: [0..SCRUB] — покадровый видео-влёт (AVIF-скраб),
// [SCRUB..DEPTH] — финальный кадр оживает depth-параллаксом, [MANI..1] —
// фразы манифеста. Только после — pin отпускается → классика.
const SCRUB_END = 0.30
const DEPTH_END = 0.42
const MANI_START = 0.46

// a — тихий зачин (extralight), b — акцент (medium), смещён вправо
const PHRASES = [
  { Sym: SymBlob, n: '01', a: 'Ты не обязан быть продуктивным', b: 'каждую секунду.' },
  { Sym: SymRipple, n: '02', a: 'Тишина — это навык.', b: 'Ему можно научиться.' },
  { Sym: SymWave, n: '03', a: 'Дыхание возвращает тебя', b: 'в настоящий момент.' },
  { Sym: SymOrbit, n: '04', a: 'Несколько минут в день меняют', b: 'то, как ты слышишь себя.' },
  { Sym: SymConstellation, n: '05', a: 'Путь к себе начинается', b: 'с одной паузы.' },
]
const N = PHRASES.length

function LiveCounter() {
  const [n, setN] = useState(248)
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => Math.min(740, Math.max(47, v + Math.round(Math.sin(Date.now() / 5000) * 3 + (Math.random() * 4 - 1.5)))))
    }, 2600)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5" style={{ background: 'rgba(12,10,24,0.45)', backdropFilter: 'blur(4px)' }}>
      <span className="h-1.5 w-1.5 rounded-full bg-lilac" style={{ boxShadow: '0 0 8px #d6c8ff' }} />
      <span className="mono text-xs uppercase tracking-[0.18em] text-fg-1">
        В моменте <span className="text-fg-0">{n}</span>
      </span>
    </span>
  )
}

// Фраза «пролетает» сквозь нас: выплывает из глубины (мелкая) → держится
// резко → проносится мимо и уходит. Символ за текстом — тоже из глубины.
function FlyScene({ progress, i, Sym, n, a, b }) {
  const w = 1 / N
  const s = i * w
  const e = (i + 1) * w
  // нахлёст ТОЛЬКО между фразами: первая не светится до манифеста, последняя — после
  const ov = 0.04
  const lo = i === 0 ? s : s - ov
  const hi = i === N - 1 ? e : e + ov
  const inB = s + 0.045
  const outA = e - 0.045

  const opacity = useTransform(progress, [lo, inB, outA, hi], [0, 1, 1, 0])

  const symScale = useTransform(progress, [lo, inB, outA, hi], [0.6, 1.1, 1.15, 1.7])
  const symOpacity = useTransform(progress, [lo, inB, outA, hi], [0, 0.5, 0.5, 0])
  const symRot = useTransform(progress, [s, e], [-22, 22])

  // Строки на разных слоях глубины. Во время держания выровнены (x/y=0),
  // на разблюре-вылете расходятся по разным траекториям «на зрителя».
  // A (тихий зачин) — ближе: крупнее, вверх-влево. B (акцент) — дальше: вниз-вправо.
  const aScale = useTransform(progress, [lo, inB, outA, hi], [0.74, 1, 1, 2.1])
  const aX = useTransform(progress, [outA, hi], [0, -66])
  const aY = useTransform(progress, [outA, hi], [0, -48])
  const aFilter = useTransform(useTransform(progress, [lo, inB, outA, hi], [8, 0, 0, 15]), (v) => `blur(${v}px)`)

  const bScale = useTransform(progress, [lo, inB, outA, hi], [0.74, 1, 1, 1.5])
  const bX = useTransform(progress, [outA, hi], [0, 74])
  const bY = useTransform(progress, [outA, hi], [0, 54])
  const bFilter = useTransform(useTransform(progress, [lo, inB, outA, hi], [8, 0, 0, 11]), (v) => `blur(${v}px)`)

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center px-6 text-center" style={{ opacity }}>
      {/* символ-подсветка строго по центру за текстом (grid, без translate-конфликта с framer) */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <motion.div style={{ scale: symScale, rotate: symRot, opacity: symOpacity }}>
          <div className="scale-[1.7] sm:scale-[2.4]">
            <Sym />
          </div>
        </motion.div>
      </div>
      {/* текст — две строки на отдельных z-слоях, расходятся на вылете */}
      <div className="relative max-w-4xl">
        {/* слой A: номер + тихий зачин — ближе к зрителю */}
        <motion.div className="relative z-20" style={{ scale: aScale, x: aX, y: aY, filter: aFilter }}>
          <span className="mono block text-sm text-violet">{n}</span>
          <p className="mt-4 font-display text-[1.9rem] font-extralight leading-[1.08] tracking-tight text-fg-1 sm:text-[3.4rem]" style={{ textShadow: '0 0 40px rgba(97,69,194,0.5)' }}>{a}</p>
        </motion.div>
        {/* слой B: акцент — дальше, своя траектория */}
        <motion.p
          className="relative z-10 font-display text-[1.9rem] font-medium leading-[1.08] tracking-tight text-fg-0 sm:text-[3.4rem]"
          style={{ scale: bScale, x: bX, y: bY, filter: bFilter, textShadow: '0 0 40px rgba(97,69,194,0.5)' }}
        >{b}</motion.p>
      </div>
    </motion.div>
  )
}

export default function IntroJourney() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // адаптив: моб — портретное видео day.mp4 (97 кадров), пк — наше (121)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const upd = () => setIsMobile(mq.matches)
    upd(); mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])
  const cfg = isMobile
    ? { dir: 'frames-m', count: 97, color: 'hero/scrub-m-last.webp', depth: 'hero/scrub-m-last-depth.webp' }
    : { dir: 'frames', count: 121, color: 'hero/scrub-last.webp', depth: 'hero/scrub-last-depth.webp' }

  // фаза 1 — покадровый скраб (видео-влёт)
  const scrub = useTransform(scrollYProgress, [0, SCRUB_END], [0, 1])
  const scrubOpacity = useTransform(scrollYProgress, [SCRUB_END - 0.03, SCRUB_END + 0.02], [1, 0])
  // фаза 2 — финальный кадр оживает глубиной, в конце РЕЗКИЙ наезд = «в трубу засосало»
  const depth = useTransform(scrollYProgress, [SCRUB_END, DEPTH_END - 0.05, DEPTH_END], [0, 0.32, 1.0])
  const depthWarp = useTransform(scrollYProgress, [DEPTH_END - 0.05, DEPTH_END], [1, 1.42])
  const depthOpacity = useTransform(scrollYProgress, [SCRUB_END - 0.05, SCRUB_END, DEPTH_END - 0.04, DEPTH_END], [0, 1, 1, 0])

  // рендерим WebGL глубины только в её фазе (иначе зря жрёт GPU = лаги)
  const [depthActive, setDepthActive] = useState(false)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const on = v > SCRUB_END - 0.08 && v < DEPTH_END + 0.03
    setDepthActive((prev) => (prev !== on ? on : prev))
  })

  // авто-скролл-гейт: на стыке скраб→глубина тебя автоматически протягивает
  // через «трубу» до первой фразы манифеста; вверх — обратно к концу скраба.
  const autoLock = useRef(false)
  const lastSp = useRef(0)
  const P_PHRASE1 = 0.50 // первая фраза манифеста видна
  const P_SCRUB = 0.27 // конец скраба (последний кадр)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const lenis = typeof window !== 'undefined' ? window.__lenis : null
    const sec = ref.current
    const prev = lastSp.current
    lastSp.current = v
    if (!lenis || !sec || autoLock.current) return
    // большие прыжки = переход по якорю/программный скролл → гейт не трогаем
    if (Math.abs(v - prev) > 0.05) return
    const range = sec.offsetHeight - window.innerHeight
    const top = sec.offsetTop
    // плавный разгон и торможение — без резкого старта/брейка («космос» убран)
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const fire = (p, duration, easing) => {
      autoLock.current = true
      lenis.scrollTo(top + p * range, { duration, easing, lock: true, onComplete: () => { autoLock.current = false } })
      setTimeout(() => { autoLock.current = false }, duration * 1000 + 700) // страховка
    }
    if (v > prev && prev < SCRUB_END && v >= SCRUB_END) fire(P_PHRASE1, 1.8, easeInOutCubic) // вниз → к фразе
    else if (v < prev && prev > MANI_START && v <= MANI_START) fire(P_SCRUB, 1.2, easeInOutCubic) // вверх → к скрабу
  })

  // текст hero — поверх начала скраба. БЕЗ blur по скроллу: анимация filter:blur()
  // на крупном заголовке форсит repaint каждый кадр = тормоз. Fade+scale (GPU) хватает.
  const textOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])
  const textScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.12])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0])

  // фаза 3 — манифест. Прогресс сглажен пружиной → фразы скользят плавно,
  // без микро-дёрганья от шага колеса/тачпада.
  const mani = useTransform(scrollYProgress, [MANI_START, 1], [0, 1])
  const maniSmooth = useSpring(mani, { stiffness: 110, damping: 28, mass: 0.3, restDelta: 0.0004 })

  // ждём готовности шрифтов → hero-вход стартует без FOUT-перекомпоновки (заголовок не дёргается)
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => setFontsReady(true))
    else setFontsReady(true)
  }, [])

  return (
    <section ref={ref} style={{ height: '880vh' }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* фаза 2 (за скрабом) — финальный кадр + карта глубины; в конце scale = «труба» */}
        <motion.div className="absolute inset-0" style={{ opacity: depthOpacity, scale: depthWarp, zIndex: 1 }}>
          <Suspense fallback={null}>
            <DepthScene key={cfg.color} progress={depth} color={cfg.color} depth={cfg.depth} active={depthActive} />
          </Suspense>
        </motion.div>

        {/* фаза 1 — покадровый AVIF-скраб поверх; на хэндофе гаснет, открывая тот же кадр в глубине */}
        <motion.div className="absolute inset-0" style={{ opacity: scrubOpacity, zIndex: 2 }}>
          <ScrollScrub key={cfg.dir} progress={scrub} dir={cfg.dir} count={cfg.count} />
        </motion.div>

        {/* фаза 2 — фразы пролетают сквозь нас */}
        <div className="absolute inset-0" style={{ zIndex: 5 }}>
          {PHRASES.map((p, i) => (
            <FlyScene key={p.n} progress={maniSmooth} i={i} {...p} />
          ))}
        </div>

        {/* текст hero — онбординг-типографика, горизонтальная лесенка, влево */}
        <motion.div
          className="relative z-[70] mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-between px-6 py-[13vh] sm:px-10"
          style={{ opacity: textOpacity, scale: textScale, willChange: 'transform, opacity' }}
        >
          <motion.h1
            variants={slideVar}
            initial="hidden"
            animate={fontsReady ? 'visible' : 'hidden'}
            className="mt-[6vh] w-fit text-left font-display leading-[0.92] tracking-tight text-[2.9rem] sm:text-[5.5rem]"
          >
            <motion.span variants={lineLeft} className="block font-extralight text-fg-1">Твой путь</motion.span>
            <motion.span variants={lineRight} className="block font-extralight text-fg-1 sm:pl-[1.6em]">к внутренней</motion.span>
            <motion.span variants={lineDown} className="block font-medium text-fg-0 sm:pl-[3.4em]">
              тишине<span className="text-violet">.</span>
            </motion.span>
          </motion.h1>

          {/* всё кроме заголовка — по центру, с лёгкой привязкой к мыши */}
          <MouseFloat strength={7} className="flex w-full justify-center">
            <motion.div className="flex w-full flex-col items-center gap-5 text-center" initial={{ opacity: 0 }} animate={{ opacity: fontsReady ? 1 : 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}>
              <p className="max-w-md text-base leading-relaxed text-fg-1" style={{ textShadow: '0 2px 20px rgba(10,7,20,0.8)' }}>
                Цифровое пространство замедления. Практики осознанности, дыхание, трекер состояния.
              </p>
              <ShinyButton as="a" href="#tariff">Начать</ShinyButton>
              <LiveCounter />
            </motion.div>
          </MouseFloat>
        </motion.div>

        {/* подсказка */}
        <motion.div className="absolute bottom-6 left-1/2 z-[70] -translate-x-1/2" style={{ opacity: hintOpacity }}>
          <p className="eyebrow mb-2 text-center">провались внутрь</p>
          <div className="mx-auto h-10 w-6 rounded-full border border-line p-1">
            <motion.div className="mx-auto h-2 w-1 rounded-full bg-lilac" animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
