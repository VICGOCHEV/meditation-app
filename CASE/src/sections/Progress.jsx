import { motion } from 'framer-motion'
import { Chapter, Split, StoryItem, Cap } from '../components/story'
import Icon from '../lib/icons'

const NODES = [
  { state: 'done', label: 'День 01' },
  { state: 'done', label: 'День 02' },
  { state: 'done', label: 'День 03' },
  { state: 'gate', label: 'Тест-ворота' },
  { state: 'open', label: 'День 04' },
  { state: 'lock', label: 'День 05' },
  { state: 'lock', label: 'День 06' },
]

function Roadmap() {
  const fill = { done: '#6145c2', open: '#b9a7f0', gate: '#e08a6b', lock: 'rgba(180,160,255,0.12)' }
  const icon = { done: 'check', open: 'play', gate: 'formula', lock: 'lock' }
  return (
    <div className="case-card relative overflow-hidden p-7 sm:p-9">
      <div className="liquid-card-glow" style={{ opacity: 0.16 }} />
      <p className="label-mono relative mb-8">Курс осознанности · прогрессия</p>
      <ol className="relative space-y-1">
        <span className="absolute left-[23px] top-4 bottom-4 w-px" style={{ background: 'linear-gradient(180deg,#6145c2,rgba(180,160,255,0.1))' }} />
        {NODES.map((n, i) => (
          <motion.li key={n.label} className="relative flex items-center gap-5 py-2.5"
            initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
            <span className="z-10 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: n.state === 'lock' ? 'rgba(24,19,48,0.95)' : `${fill[n.state]}22`, border: `1px solid ${n.state === 'lock' ? 'rgba(180,160,255,0.18)' : fill[n.state]}`, color: n.state === 'lock' ? '#6e6290' : fill[n.state] }}>
              <Icon name={icon[n.state]} size={18} />
            </span>
            <span className={`text-[15px] ${n.state === 'lock' ? 'text-fg-3' : 'text-fg-1'}`}>{n.label}</span>
            {n.state === 'gate' && <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: '#e08a6b' }}>раз в 4 дня</span>}
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

const BLOCKS = [
  { n: '01', icon: 'lock', title: 'Контролируемый темп', text: 'Новая практика — раз в 4 дня, после прохождения «теста-ворот».' },
  { n: '02', icon: 'calendar', title: 'Ежемесячная ротация', text: 'Каждый месяц — 6 новых медитаций в сетке курса.' },
  { n: '03', icon: 'gift', title: 'Бесплатный вход', text: 'Три практики «Расслабления» — бесплатно и бессрочно.' },
]

export default function Progress() {
  return (
    <Chapter id="progress" kicker="Логика прогресса" title="Логика прогресса и курс осознанности">
      <Split visual={<Roadmap />}>
        <div className="space-y-12">
          {BLOCKS.map((b, i) => (
            <StoryItem key={b.n} index={b.n} icon={b.icon} title={b.title} delay={i * 0.06}>
              <Cap size="sm">{b.text}</Cap>
            </StoryItem>
          ))}
        </div>
      </Split>
    </Chapter>
  )
}
