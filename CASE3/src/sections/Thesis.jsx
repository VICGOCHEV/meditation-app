import { motion } from 'framer-motion'
import { Up } from '../components/story'

// Тезис кейса — второй абзац хиро вынесен в отдельный полноэкранный момент.
export default function Thesis() {
  return (
    <section className="relative mx-auto w-full max-w-[1000px] px-5 py-32 sm:py-44 text-center">
      <Up>
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-lilac">Тезис</span>
      </Up>
      <motion.blockquote
        className="statement mx-auto mt-8 max-w-[20ch] text-[26px] leading-[1.18] sm:text-[40px] sm:max-w-[24ch]"
        initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1.1, ease: [0.22, 0.9, 0.3, 1] }}
      >
        <span className="grad-text">Полный цикл производства</span> — от чистого листа дизайн-системы
        до боевого сервера с платежами, CMS и триггерными уведомлениями.
      </motion.blockquote>
    </section>
  )
}
