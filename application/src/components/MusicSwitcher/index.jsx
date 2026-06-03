import { usePlayerStore } from '../../store/usePlayerStore'

// 3 «энергии» / фоновые звуки. По бизнес-памяти клиента (2026-05-25):
//   1. Энергия созидания · почувствовать лёгкость
//   2. Энергия очищения · почувствовать покой
//   3. Энергия жизни · почувствовать заземление
// Имена-плашки для UI компактные; полные описания — в Profile/онбординге.
const MUSICS = [
  {
    id: 1,
    label: 'Созидание',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </svg>
    ),
  },
  {
    id: 2,
    label: 'Очищение',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c-3.5 4.5-6 8-6 11.5A6 6 0 0 0 12 21a6 6 0 0 0 6-6.5C18 11 15.5 7.5 12 3z" />
      </svg>
    ),
  },
  {
    id: 3,
    label: 'Жизнь',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h2.5M18.5 12H21M12 3v2.5M12 18.5V21" />
        <path d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5-5-2.2-5-5z" />
        <path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3" />
      </svg>
    ),
  },
]

/**
 * 3 иконки энергий: тап → меняет фон для текущей практики и запоминается.
 * Заблокированные (не входящие в `available`) показываются тусклыми и
 * не реагируют на тап. Если `available` не передан — все 3 доступны.
 *
 * @param {string} practiceId — id текущей практики
 * @param {number[]} [available] — список доступных music id (1..3)
 */
export default function MusicSwitcher({ practiceId, available }) {
  // Подписываемся на musicByPractice (zustand triggers re-render),
  // а вычисляем актуальный musicId в компоненте.
  const musicByPractice = usePlayerStore((s) => s.musicByPractice)
  const selectedMusic = usePlayerStore((s) => s.selectedMusic)
  const setMusicForPractice = usePlayerStore((s) => s.setMusicForPractice)

  const current = musicByPractice[practiceId] ?? selectedMusic
  const allowedSet = available && available.length ? new Set(available) : null
  const currentLabel = MUSICS.find((m) => m.id === current)?.label

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] text-fg-2">
        Выбери фон звучания
      </span>
      <div className="flex items-center justify-center gap-3">
        {MUSICS.map((m) => {
        const isAllowed = !allowedSet || allowedSet.has(m.id)
        const isActive = isAllowed && current === m.id
        return (
          <button
            key={m.id}
            type="button"
            disabled={!isAllowed}
            onClick={() => isAllowed && setMusicForPractice(practiceId, m.id)}
            aria-label={m.label}
            aria-pressed={isActive}
            title={m.label}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-full transition',
              isAllowed ? 'cursor-pointer' : 'cursor-not-allowed',
              isActive
                ? 'text-fg-0'
                : isAllowed
                ? 'text-fg-2 hover:text-fg-0'
                : 'text-fg-4 opacity-40',
            ].join(' ')}
            style={{
              border: isActive ? '1.5px solid #6145c2' : '1px solid rgba(180,160,255,0.16)',
              background: isActive
                ? 'rgba(97,69,194,.18)'
                : isAllowed
                ? 'rgba(255,255,255,.04)'
                : 'rgba(255,255,255,.02)',
              boxShadow: isActive
                ? '0 0 18px rgba(97,69,194,.7), inset 0 0 10px rgba(97,69,194,.25)'
                : undefined,
            }}
          >
            <span className="h-4 w-4">{m.icon}</span>
          </button>
        )
      })}
      </div>
      {currentLabel && (
        <span className="text-[11px] text-fg-2">{currentLabel}</span>
      )}
    </div>
  )
}
