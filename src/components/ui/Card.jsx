import Button from './Button'

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

// The same inner layout for both visual variants — keeps text/icons identical.
function CardContent({ title, duration, locked, badge, completed, price, onPlay, onBuy, lockedLabel }) {
  return (
    <>
      {badge && (
        <span className="absolute right-3 top-3 z-20 rounded-full border border-line-2 bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-1">
          {badge}
        </span>
      )}
      {completed && (
        <span
          className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white"
          style={{ background: 'oklch(0.55 0.2 160 / 0.35)', border: '1px solid oklch(0.72 0.13 160 / 0.3)' }}
        >
          ✓
        </span>
      )}

      <div className="text-lilac" style={{ filter: 'drop-shadow(0 0 6px #6145c2) drop-shadow(0 0 14px rgba(97,69,194,.6))' }}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M4.9 19.1l2-2M17.1 6.9l2-2" />
        </svg>
      </div>

      <h4 className="mt-4 font-sans text-[17px] font-medium leading-tight text-fg-0">{title}</h4>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] text-lilac">{duration}</span>
        {locked ? (
          <span className="text-[12px] text-lilac/70">{lockedLabel || 'Заблокировано'}</span>
        ) : price ? (
          <Button size="sm" variant="secondary" onClick={onBuy}>
            {price}
          </Button>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-lilac transition"
            style={{
              border: '1.5px solid #6145c2',
              boxShadow:
                '0 0 18px rgba(97,69,194,.95), 0 0 36px rgba(97,69,194,.55), inset 0 0 10px rgba(97,69,194,.35)',
            }}
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
    </>
  )
}

export default function Card(props) {
  const { locked = false } = props
  // Random animation phase + drift seed per card so neighbouring cards
  // glow out of sync — gives the wall a "breathing" quality.
  const delay = -(Math.random() * 14).toFixed(2) + 's'
  const duration = (12 + Math.random() * 6).toFixed(2) + 's'

  const borderDelay = -(Math.random() * 5).toFixed(2) + 's'

  return (
    <div
      className={`relative isolate flex min-h-[200px] flex-col justify-between overflow-hidden rounded-lg p-5 ${
        locked ? 'opacity-60' : ''
      }`}
      style={{
        boxShadow:
          '0 0 24px -8px rgba(97,69,194,.5), inset 0 0 0 1px rgba(180,160,255,.05)',
      }}
    >
      {/* Floating violet glow (mix-blend-mode: screen) */}
      <span
        className="liquid-card-glow"
        style={{ animationDelay: delay, animationDuration: duration }}
      />
      {/* Rotating conic-gradient border */}
      <span
        className="liquid-card-border"
        style={{ animationDelay: borderDelay }}
      />
      {/* Backdrop-filter glass distortion */}
      <div
        className="absolute top-0 left-0 -z-10 h-full w-full overflow-hidden rounded-lg"
        style={{ backdropFilter: 'url("#container-glass")' }}
      />
      <div className="relative z-10 flex h-full min-h-[160px] flex-col justify-between">
        <CardContent {...props} />
      </div>
    </div>
  )
}
