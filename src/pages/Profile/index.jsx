import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Sparkline from '../../components/ui/Sparkline'
import TrackerCalendar from '../../components/TrackerCalendar'
import { useAuthStore } from '../../store/useAuthStore'
import { useProgressStore } from '../../store/useProgressStore'
import { usePlayerStore } from '../../store/usePlayerStore'
import { consecutiveStreak, formatRuDate } from '../../utils/dateHelpers'
import { useProgression } from '../../hooks/useProgression'

function Section({ title, children, trailing }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-serif text-[22px] text-fg-0">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const subscription = useProgressStore((s) => s.subscription)
  const trackerDays = useProgressStore((s) => s.trackerDays)
  const completedPractices = useProgressStore((s) => s.completedPractices)
  const lastKT = useProgressStore((s) => s.lastKT)

  const selectedVoice = usePlayerStore((s) => s.selectedVoice)
  const selectedMusic = usePlayerStore((s) => s.selectedMusic)
  const setVoice = usePlayerStore((s) => s.setVoice)
  const setMusic = usePlayerStore((s) => s.setMusic)

  const { canDoDeepAnalysis, daysUntilAnalysis, ktHistory, bonus } = useProgression()

  const awarenessDone = completedPractices.filter((id) => id.startsWith('a')).length
  const streak = consecutiveStreak(trackerDays)

  const initials = (user?.name || 'Я')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  const onLogout = () => {
    logout()
    navigate('/auth/login')
  }

  return (
    <ScreenShell withBottomNav>
      <header className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line-2 bg-white/5 font-serif text-2xl text-fg-0">
          {initials}
        </div>
        <div className="mt-4 text-[18px] text-fg-0">{user?.name || 'Практик'}</div>
        <div className="text-[13px] text-fg-3">{user?.email || '—'}</div>
      </header>

      <Section title="Подписка">
        <div className="panel flex items-center justify-between">
          <div>
            {subscription.active ? (
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px]" style={{ background: 'oklch(0.72 0.13 160 / 0.15)', color: 'oklch(0.82 0.13 160)', border: '1px solid oklch(0.72 0.13 160 / 0.3)' }}>
                Активна до {formatRuDate(subscription.expiresAt)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-white/5 px-3 py-1 text-[12px] text-fg-3">
                Не активна
              </span>
            )}
          </div>
          {subscription.active ? (
            <Button size="sm" variant="secondary">Управление</Button>
          ) : (
            <Button size="sm" onClick={() => navigate('/subscription')}>Оформить</Button>
          )}
        </div>
      </Section>

      <Section title="Мои практики">
        <TrackerCalendar trackerDays={trackerDays} streak={streak} />
      </Section>

      <Section title="Прогресс">
        <div className="panel">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] text-fg-1">Осознанность</span>
            <span className="font-mono text-[13px] text-fg-2">
              {awarenessDone} / 6 практик
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(awarenessDone / 6) * 100}%`,
                background: 'linear-gradient(90deg, oklch(0.55 0.18 270), oklch(0.68 0.18 310))',
              }}
            />
          </div>
          {lastKT !== null && (
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[13px]">
              <span className="text-fg-2">Последний КТ</span>
              <span className="font-serif text-xl text-fg-0">
                {lastKT > 0 ? '+' : ''}{lastKT.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Настройки">
        <div className="panel flex flex-col gap-5">
          <div>
            <div className="label-mono mb-2">Голос</div>
            <div className="flex rounded-full border border-line p-1">
              {[{ id: 'male', label: 'Мужской' }, { id: 'female', label: 'Женский' }].map((v) => {
                const on = selectedVoice === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={[
                      'flex-1 rounded-full py-2 text-[13px] transition',
                      on ? 'bg-white/10 text-fg-0' : 'text-fg-2 hover:text-fg-0',
                    ].join(' ')}
                  >
                    {v.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <div className="label-mono mb-2">Музыка</div>
            <div className="flex flex-col gap-2">
              {[{ id: 1, label: 'Спокойствие' }, { id: 2, label: 'Природа' }, { id: 3, label: 'Космос' }].map((m) => {
                const on = selectedMusic === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMusic(m.id)}
                    className={[
                      'flex items-center justify-between rounded-sm border px-4 py-3 text-left transition',
                      on ? 'border-lilac bg-white/10' : 'border-line-2 bg-white/5 hover:bg-white/10',
                    ].join(' ')}
                  >
                    <span className="text-fg-0">{m.label}</span>
                    <span className="text-[12px] text-fg-3">▶</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Глубокий анализ">
        <div className="panel">
          <div className="flex items-start gap-4">
            {/* Countdown ring on the left */}
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(180,160,255,.16)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="#6145c2" strokeWidth="6" strokeLinecap="round"
                  pathLength="1"
                  initial={{ pathLength: 0 }}
                  animate={{
                    pathLength: canDoDeepAnalysis
                      ? 1
                      : Math.max(0, Math.min(1, (3 - daysUntilAnalysis) / 3)),
                  }}
                  transition={{ duration: 0.9, ease: [0.22, 0.8, 0.36, 1] }}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(97,69,194,.55))' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {canDoDeepAnalysis ? (
                  <span className="text-lilac">✓</span>
                ) : (
                  <>
                    <div className="font-serif text-xl text-fg-0 leading-none">{daysUntilAnalysis}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[.16em] text-fg-3">
                      {daysUntilAnalysis === 1 ? 'день' : 'дн.'}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="label-mono">{canDoDeepAnalysis ? 'Доступен сейчас' : 'Следующий замер'}</div>
              <p className="mt-1 text-[14px] text-fg-1">
                {canDoDeepAnalysis
                  ? 'Готов(а) зафиксировать прогресс за последние 3 дня?'
                  : `До следующего анализа ${daysUntilAnalysis} ${daysUntilAnalysis === 1 ? 'день' : 'дн.'}`}
              </p>
              {(ktHistory?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <Sparkline data={ktHistory} height={48} />
                </div>
              )}
            </div>
          </div>

          {canDoDeepAnalysis && (
            <div className="mt-4">
              <Button fullWidth onClick={() => navigate('/deep-analysis')}>
                Пройти анализ
              </Button>
            </div>
          )}

          {/* Bonus progress */}
          <div className="mt-5 rounded-md p-3" style={{ background: 'rgba(180,160,255,.04)', border: '1px dashed rgba(180,160,255,.18)' }}>
            <div className="flex items-center justify-between">
              <div className="label-mono">{bonus.eligible ? '🎁 Бонус доступен' : 'Бонусы за месяц'}</div>
              <div className="font-mono text-[10px] uppercase tracking-[.16em] text-fg-3">
                окно {bonus.window} дн.
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.15em] text-fg-3">
                  Замеры с КТ ≥ 0
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-serif text-lg text-fg-0">{bonus.ktSamples}</span>
                  <span className="text-[12px] text-fg-3">/ {bonus.ktReq}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(1, bonus.ktSamples / bonus.ktReq) * 100}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 0.8, 0.36, 1] }}
                    className="h-full"
                    style={{ background: 'linear-gradient(90deg, #6145c2, #9eb5ff)' }}
                  />
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.15em] text-fg-3">
                  Дни в трекере
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-serif text-lg text-fg-0">{bonus.trackerCount}</span>
                  <span className="text-[12px] text-fg-3">/ {bonus.trackerReq}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(1, bonus.trackerCount / bonus.trackerReq) * 100}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 0.8, 0.36, 1], delay: 0.05 }}
                    className="h-full"
                    style={{ background: 'linear-gradient(90deg, #9eb5ff, #7be1a3)' }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-3 text-[12px] leading-snug text-fg-3">
              {bonus.eligible
                ? 'Условия выполнены — бонусные «авторские» практики открыты.'
                : 'Положительная динамика КТ + 6 дней в трекере за 30 дней — и откроются 1–2 «авторских» практики бесплатно.'}
            </p>
          </div>
        </div>
      </Section>

      <div className="mt-10">
        <Button variant="destructive" fullWidth onClick={onLogout}>
          Выйти из аккаунта
        </Button>
      </div>

    </ScreenShell>
  )
}
