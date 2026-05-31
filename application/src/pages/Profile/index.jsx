import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Sparkline from '../../components/ui/Sparkline'
import Modal from '../../components/ui/Modal'
import TrackerCalendar from '../../components/TrackerCalendar'
import { useAuthStore } from '../../store/useAuthStore'
import { useProgressStore } from '../../store/useProgressStore'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useThemeStore } from '../../store/useThemeStore'
import { consecutiveStreak, formatRuDate } from '../../utils/dateHelpers'

// Текст под заголовком блока, когда DA в данный момент недоступен —
// поясняет, что мешает (4-дневный кулдаун, не прослушана, нет
// тракер-марки, и т.д.). Зеркалит причины с бэка из nextAwarenessUnlock.
function daHelpText(next) {
  if (!next) return 'Замер откроется на ключевых точках курса.'
  switch (next.reason) {
    case 'sub-not-active':
      return 'Замер открывается после активации подписки.'
    case 'cycle-not-elapsed':
      return `Следующая практика откроется через ${next.daysLeft} ${plural(next.daysLeft)}.`
    case 'prev-not-completed':
      return 'Допроходи предыдущую практику до конца.'
    case 'no-tracker-mark':
      return 'Отметь день прослушивания в трекере.'
    case 'mid-da-required':
      return 'Промежуточный замер откроется после 3-й практики.'
    case 'all-unlocked':
      return 'Курс пройден. Финальный замер уже сделан.'
    default:
      return 'Замер откроется на ключевых точках курса.'
  }
}
function plural(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return 'дня'
  return 'дней'
}
import { useProgression } from '../../hooks/useProgression'
import { deleteAccount } from '../../api/auth'

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

  const themeMode = useThemeStore((s) => s.mode)
  const setThemeMode = useThemeStore((s) => s.setMode)

  const {
    canDoDeepAnalysis,
    daCheckpoint,
    nextAwarenessUnlock,
    ktHistory,
  } = useProgression()

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

  // Two-step delete: user has to type «УДАЛИТЬ» (mirrors GitHub /
  // Apple's irreversible-action UX). Sends DELETE /api/auth/me, then
  // logs out + redirects.
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const onDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      logout()
      navigate('/auth/login')
    } catch {
      setDeleting(false)
      // eslint-disable-next-line no-alert
      alert('Не удалось удалить аккаунт. Попробуй позже.')
    }
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
          <div>
            <div className="label-mono mb-2">Тема оформления</div>
            <div className="flex flex-col gap-2">
              {[
                { id: 'auto',    label: 'Авто',    sub: 'По времени суток' },
                { id: 'morning', label: 'Утро',    sub: '05:00 — 11:00 · коралл' },
                { id: 'day',     label: 'День',    sub: '11:00 — 17:00 · фиолетовый' },
                { id: 'evening', label: 'Вечер',   sub: '17:00 — 22:00 · изумрудный' },
                { id: 'night',   label: 'Ночь',    sub: '22:00 — 05:00 · индиго' },
              ].map((t) => {
                const on = themeMode === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setThemeMode(t.id)}
                    className={[
                      'flex items-center justify-between rounded-sm border px-4 py-3 text-left transition',
                      on ? 'border-lilac bg-white/10' : 'border-line-2 bg-white/5 hover:bg-white/10',
                    ].join(' ')}
                  >
                    <span className="flex flex-col">
                      <span className="text-fg-0">{t.label}</span>
                      <span className="text-[11px] text-fg-3">{t.sub}</span>
                    </span>
                    <span className={[
                      'h-2.5 w-2.5 rounded-full',
                      on ? 'bg-lilac' : 'bg-line-2',
                    ].join(' ')} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Глубокий анализ">
        <div className="panel">
          <div className="label-mono">
            {daCheckpoint === 'start' && '01 · Стартовый замер'}
            {daCheckpoint === 'mid'   && '02 · Промежуточный замер'}
            {daCheckpoint === 'final' && '03 · Финальный замер'}
            {!daCheckpoint            && 'Следующий замер'}
          </div>
          <p className="mt-1 text-[14px] text-fg-1">
            {daCheckpoint === 'start' &&
              'Зафиксируй точку входа в курс — нужно, чтобы потом увидеть динамику.'}
            {daCheckpoint === 'mid' &&
              'Половина курса позади. Замерь, что изменилось, чтобы открыть 4-ю практику.'}
            {daCheckpoint === 'final' &&
              'Курс пройден. Сравни себя в начале и сейчас.'}
            {!daCheckpoint &&
              daHelpText(nextAwarenessUnlock)}
          </p>

          {(ktHistory?.length ?? 0) > 0 && (
            <div className="mt-3">
              <Sparkline data={ktHistory} height={48} />
            </div>
          )}

          {canDoDeepAnalysis && (
            <div className="mt-4">
              <Button fullWidth onClick={() => navigate('/deep-analysis')}>
                Пройти анализ
              </Button>
            </div>
          )}
        </div>
      </Section>

      <div className="mt-10 flex flex-col gap-3">
        <Button variant="destructive" fullWidth onClick={onLogout}>
          Выйти из аккаунта
        </Button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="text-center text-[12px] text-fg-3 hover:text-fg-1"
        >
          Удалить аккаунт
        </button>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteConfirm('')
        }}
        title="Удалить аккаунт?"
      >
        <p className="text-[14px] text-fg-1">
          Это необратимо. Прогресс, история КТ, подписка и трекер
          удалятся. Восстановить нельзя.
        </p>
        <p className="mt-3 text-[13px] text-fg-2">
          Для подтверждения введи слово <strong className="text-fg-0">УДАЛИТЬ</strong>.
        </p>
        <input
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="УДАЛИТЬ"
          autoCorrect="off"
          autoCapitalize="characters"
          className="field-input mt-3"
        />
        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setDeleteOpen(false)
              setDeleteConfirm('')
            }}
            disabled={deleting}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            fullWidth
            disabled={deleteConfirm.trim().toUpperCase() !== 'УДАЛИТЬ' || deleting}
            loading={deleting}
            onClick={onDelete}
          >
            Удалить
          </Button>
        </div>
      </Modal>
    </ScreenShell>
  )
}
