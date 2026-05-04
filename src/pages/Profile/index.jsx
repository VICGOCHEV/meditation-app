import { useNavigate } from 'react-router-dom'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
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

  const { canDoDeepAnalysis, daysUntilAnalysis } = useProgression()

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
          {canDoDeepAnalysis ? (
            <>
              <p className="text-[14px] text-fg-1">
                Готов(а) зафиксировать прогресс за последние 3 дня?
              </p>
              <div className="mt-4">
                <Button fullWidth onClick={() => navigate('/deep-analysis')}>
                  Пройти анализ
                </Button>
              </div>
            </>
          ) : (
            <p className="text-[14px] text-fg-3">
              Следующий анализ через {daysUntilAnalysis} {daysUntilAnalysis === 1 ? 'день' : 'дней'}
            </p>
          )}
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
