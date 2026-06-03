import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
import { sendFeedback } from '../../api/feedback'
import { getNotifyPrefs, updateNotifyPrefs, sendTestPush } from '../../api/notify'

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

  // Logout — двухшаговый «прощальный» флоу:
  //   1. Юзер жмёт «Выйти» → стейт `logoutPending` поднимает оверлей,
  //      сцена за ним желейно тускнеет до серого, цвет уходит из меню.
  //   2. Сверху появляется единственная цветная фиолетовая кнопка
  //      «Вернуться в тишину» — это «отмена», возвращает обратно
  //      (анимация прощания, но без необратимости).
  //   3. Через ~3.2с (или по клику «Выйти всё равно») — реальный
  //      logout + navigate.
  const [logoutPending, setLogoutPending] = useState(false)
  const openLogoutFarewell = () => setLogoutPending(true)
  const cancelLogout = () => setLogoutPending(false)
  const confirmLogout = () => {
    // navigate СНАЧАЛА (replace, чтобы back-кнопка не вернула на пустой profile),
    // потом clear store — иначе ProtectedRoute может промежуточно отрендерить
    // нелогичное состояние пока store обновляется.
    navigate('/auth/login', { replace: true })
    setTimeout(() => logout(), 50)
    setLogoutPending(false)
  }

  // Two-step delete: user has to type «УДАЛИТЬ» (mirrors GitHub /
  // Apple's irreversible-action UX). Sends DELETE /api/auth/me, then
  // logs out + redirects.
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Уведомления: тумблер enabled + IANA-таймзона. Прогружаем с сервера
  // на mount и пишем PATCH'ем при изменении.
  const [notify, setNotify] = useState(null) // null = ещё грузим
  const [notifySaving, setNotifySaving] = useState(false)
  const [notifyTestSending, setNotifyTestSending] = useState(false)
  const [notifyTestStatus, setNotifyTestStatus] = useState(null) // 'ok'|'err'|null
  const [notifyTestMsg, setNotifyTestMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    getNotifyPrefs()
      .then((p) => { if (!cancelled) setNotify(p) })
      .catch(() => { if (!cancelled) setNotify({ enabled: true, timezone: 'Europe/Moscow', hasTg: false }) })
    return () => { cancelled = true }
  }, [])

  async function toggleNotify(nextEnabled) {
    if (notifySaving || !notify) return
    setNotifySaving(true)
    const prev = notify
    setNotify({ ...notify, enabled: nextEnabled }) // optimistic
    try {
      await updateNotifyPrefs({ enabled: nextEnabled })
    } catch {
      setNotify(prev)
    } finally {
      setNotifySaving(false)
    }
  }

  async function changeTimezone(tz) {
    if (notifySaving || !notify) return
    setNotifySaving(true)
    const prev = notify
    setNotify({ ...notify, timezone: tz })
    try {
      await updateNotifyPrefs({ timezone: tz })
    } catch {
      setNotify(prev)
    } finally {
      setNotifySaving(false)
    }
  }

  async function onTestPush() {
    if (notifyTestSending) return
    setNotifyTestSending(true)
    setNotifyTestStatus(null)
    setNotifyTestMsg('')
    try {
      await sendTestPush()
      setNotifyTestStatus('ok')
      setTimeout(() => setNotifyTestStatus(null), 4000)
    } catch (err) {
      setNotifyTestStatus('err')
      setNotifyTestMsg(err?.response?.data?.error || 'Не получилось отправить')
    } finally {
      setNotifyTestSending(false)
    }
  }

  // Форма обратной связи: благодарность / вопрос.
  const [fbType, setFbType] = useState('review')
  const [fbMessage, setFbMessage] = useState('')
  const [fbSending, setFbSending] = useState(false)
  const [fbStatus, setFbStatus] = useState(null) // 'ok' | 'err' | null
  const [fbError, setFbError] = useState('')

  async function onSubmitFeedback(e) {
    e.preventDefault()
    if (!fbMessage.trim() || fbSending) return
    setFbSending(true)
    setFbStatus(null)
    setFbError('')
    try {
      await sendFeedback({ type: fbType, message: fbMessage.trim() })
      setFbMessage('')
      setFbStatus('ok')
      setTimeout(() => setFbStatus(null), 4000)
    } catch (err) {
      setFbStatus('err')
      setFbError(err?.response?.data?.error || err?.message || 'Не получилось отправить')
    } finally {
      setFbSending(false)
    }
  }
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
    <>
    <motion.div
      animate={{
        // Когда юзер запустил logout-флоу — сцена тускнеет до серого
        // и приглушается. Bottom-nav уходит под фильтр (становится ч/б),
        // а прощальная плашка сверху живёт ВНЕ фильтра — остаётся цветной.
        filter: logoutPending
          ? 'grayscale(1) brightness(0.45) saturate(0.6)'
          : 'grayscale(0) brightness(1) saturate(1)',
      }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'filter' }}
    >
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

      <Section title="Напоминания">
        <div className="panel">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="label-mono">Пуши в Telegram</div>
              <p className="mt-1 text-[14px] text-fg-1">
                Мягкие напоминания вернуться к практике в 08:00, 12:00,
                16:00 и 20:00. Тексты подобраны под время дня.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={!!notify?.enabled}
              disabled={!notify || notifySaving}
              onClick={() => toggleNotify(!notify.enabled)}
              className={
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ' +
                (notify?.enabled
                  ? 'bg-accent-2'
                  : 'bg-bg-1 border border-fg-3/20')
              }
            >
              <span
                className={
                  'inline-block h-4 w-4 transform rounded-full bg-white transition ' +
                  (notify?.enabled ? 'translate-x-6' : 'translate-x-1')
                }
              />
            </button>
          </div>

          {notify && !notify.hasTg && (
            <div className="mt-3 rounded-md border border-fg-3/15 bg-bg-1 px-3 py-2 text-[12px] text-fg-2">
              Зайди в приложение через Telegram-бота, чтобы пуши доходили.
              Сейчас твой аккаунт не связан с Telegram.
            </div>
          )}

          {notify?.enabled && notify.hasTg && (
            <>
              <div className="mt-4">
                <div className="label-mono mb-1">Часовой пояс</div>
                <select
                  value={notify.timezone}
                  onChange={(e) => changeTimezone(e.target.value)}
                  disabled={notifySaving}
                  className="w-full rounded-xl border border-fg-3/15 bg-bg-1 px-3 py-2 text-[14px] text-fg-0 focus:border-accent-2 focus:outline-none"
                >
                  <option value="Europe/Kaliningrad">Калининград · UTC+2</option>
                  <option value="Europe/Moscow">Москва, Питер · UTC+3</option>
                  <option value="Europe/Samara">Самара · UTC+4</option>
                  <option value="Asia/Yekaterinburg">Екатеринбург · UTC+5</option>
                  <option value="Asia/Omsk">Омск · UTC+6</option>
                  <option value="Asia/Krasnoyarsk">Красноярск · UTC+7</option>
                  <option value="Asia/Irkutsk">Иркутск · UTC+8</option>
                  <option value="Asia/Yakutsk">Якутск · UTC+9</option>
                  <option value="Asia/Vladivostok">Владивосток · UTC+10</option>
                  <option value="Asia/Magadan">Магадан · UTC+11</option>
                  <option value="Asia/Kamchatka">Камчатка · UTC+12</option>
                  <option value="Asia/Almaty">Алматы · UTC+5</option>
                  <option value="Asia/Tbilisi">Тбилиси · UTC+4</option>
                </select>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={onTestPush}
                  disabled={notifyTestSending}
                  className="w-full rounded-xl border border-fg-3/20 bg-bg-1 px-4 py-2 text-[13px] text-fg-1 hover:text-fg-0 transition disabled:opacity-50"
                >
                  {notifyTestSending ? 'Отправляем…' : 'Прислать тестовый пуш'}
                </button>
                {notifyTestStatus === 'ok' && (
                  <div className="mt-2 text-[12px] text-emerald-400">
                    Отправлено — проверь Telegram.
                  </div>
                )}
                {notifyTestStatus === 'err' && (
                  <div className="mt-2 text-[12px] text-rose-400">{notifyTestMsg}</div>
                )}
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title="Связаться">
        <form onSubmit={onSubmitFeedback} className="panel">
          <div className="label-mono">Напиши автору</div>
          <p className="mt-1 text-[14px] text-fg-1">
            Поделиться инсайтом, задать вопрос или оставить благодарность —
            бережно прочтём всё.
          </p>

          <div className="mt-3 flex gap-2">
            {[
              { v: 'review',   l: 'Оставить благодарность' },
              { v: 'question', l: 'Задать вопрос' },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setFbType(opt.v)}
                className={
                  'rounded-full px-3 py-1 text-[13px] transition ' +
                  (fbType === opt.v
                    ? 'bg-accent-2 text-white'
                    : 'bg-bg-1 text-fg-2 hover:text-fg-0')
                }
              >
                {opt.l}
              </button>
            ))}
          </div>

          <textarea
            value={fbMessage}
            onChange={(e) => setFbMessage(e.target.value)}
            placeholder="Здесь твои мысли…"
            rows={5}
            maxLength={5000}
            className="mt-3 w-full rounded-xl border border-fg-3/15 bg-bg-1 px-3 py-2 text-[14px] text-fg-0 placeholder:text-fg-3 focus:border-accent-2 focus:outline-none"
          />

          {fbStatus === 'ok' && (
            <div className="mt-2 text-[13px] text-emerald-400">
              Отправлено. Спасибо!
            </div>
          )}
          {fbStatus === 'err' && (
            <div className="mt-2 text-[13px] text-rose-400">{fbError}</div>
          )}

          <div className="mt-4">
            <Button
              type="submit"
              fullWidth
              disabled={!fbMessage.trim() || fbSending}
            >
              {fbSending ? 'Отправляем…' : 'Отправить'}
            </Button>
          </div>
        </form>
      </Section>

      <div className="mt-10 flex flex-col gap-3">
        <Button variant="destructive" fullWidth onClick={openLogoutFarewell}>
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
    </motion.div>

    {/* Прощальный оверлей — два явных выбора. Лиловая CTA «Вернуться»
        как primary (визуально доминантная), под ней outlined «Выйти» —
        тоже хорошо видна, не мелкий текст. */}
    <AnimatePresence>
      {logoutPending && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 top-0 z-[60] px-5 pt-[max(env(safe-area-inset-top),24px)] pb-6 pointer-events-none"
        >
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="font-mono text-[10px] uppercase tracking-[0.32em] text-lilac/70"
            >
              мир потух
            </motion.div>
            <button
              type="button"
              onClick={cancelLogout}
              className="pointer-events-auto inline-flex items-center justify-center rounded-full bg-[#6145c2] px-7 py-3.5 text-[15px] font-medium text-white transition hover:bg-[#7155d6] active:scale-[0.98]"
              style={{ boxShadow: '0 0 48px rgba(180,160,255,0.55), 0 4px 18px rgba(0,0,0,0.4)' }}
            >
              ← Вернуться в тишину
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-fg-3/40 bg-bg-1/80 px-6 py-3 text-[14px] text-fg-1 backdrop-blur-sm transition hover:bg-bg-1 hover:text-fg-0 active:scale-[0.98]"
            >
              Выйти из аккаунта
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
