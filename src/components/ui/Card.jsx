import Button from './Button'
import { LiquidGlass } from './LiquidGlass'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

export default function Card({
  title,
  duration,
  locked = false,
  badge,
  completed = false,
  price,
  onPlay,
  onBuy,
  lockedLabel,
}) {
  return (
    <LiquidGlass radius="rounded-lg" className={`card-practice ${locked ? 'opacity-60' : ''}`}>
      {badge && (
        <span className="absolute right-3 top-3 z-10 rounded-full border border-line-2 bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-1">
          {badge}
        </span>
      )}
      {completed && (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white"
          style={{ background: 'oklch(0.55 0.2 160 / 0.35)', border: '1px solid oklch(0.72 0.13 160 / 0.3)' }}
        >
          ✓
        </span>
      )}

      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line-2 bg-white/5 text-fg-0">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M4.9 19.1l2-2M17.1 6.9l2-2" />
        </svg>
      </div>

      <h4 className="mt-4 font-sans text-[17px] font-medium leading-tight text-fg-0">
        {title}
      </h4>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] text-fg-2">{duration}</span>
        {locked ? (
          <span className="text-[12px] text-fg-3">{lockedLabel || 'Заблокировано'}</span>
        ) : price ? (
          <Button size="sm" variant="secondary" onClick={onBuy}>
            {price}
          </Button>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-2 bg-white/10 text-fg-0 transition hover:bg-white/20"
            aria-label="Слушать"
          >
            <PlayIcon />
          </button>
        )}
      </div>

      {locked && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="text-fg-1">
            <LockIcon />
          </div>
        </div>
      )}
    </LiquidGlass>
  )
}
