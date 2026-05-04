// JSX port of the AnimatedGenerateButton (21st.dev style).
// styled-jsx → global <style> (Vite/React stack), TS types stripped.
// Highlight hue defaults to 263° to match our violet #6145c2.

const STAGGER_LETTERS = 24
const stagger = Array.from({ length: STAGGER_LETTERS }, (_, i) => {
  const n = i + 1
  const delay = (i * 0.08).toFixed(2)
  return `
    .ui-anim-txt-1 .ui-anim-letter:nth-child(${n}),
    .ui-anim-txt-2 .ui-anim-letter:nth-child(${n}) { animation-delay: ${delay}s; }
  `
}).join('')

const ANIM_CSS = `
.ui-anim-btn {
  --transition: 0.4s;
  --ui-anim-svg-fill: #d8c8ff;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  /* Same fill/glow as the active "Главная" pill in BottomNav. */
  background: linear-gradient(90deg, #6145c2 0%, rgba(97,69,194,.55) 60%, rgba(97,69,194,0) 100%);
  border: 0;
  border-radius: 9999px;
  padding: 0.625rem 1.25rem;
  color: #d8c8ff;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 500;
  outline: none;
  box-shadow:
    0 0 22px -2px rgba(97,69,194,.7),
    inset 0 0 14px rgba(97,69,194,.4);
}
/* Soft outer halo — mirrors the BottomNav active-glow layer. */
.ui-anim-btn::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(60% 80% at 30% 50%, rgba(97,69,194,.55), transparent 70%);
  filter: blur(10px);
}

.ui-anim-letter {
  color: #ffffff88;
  display: inline-block;
  animation: ui-letter-anim 2s ease-in-out infinite;
  transition: color var(--transition), text-shadow var(--transition), opacity var(--transition);
}

@keyframes ui-letter-anim {
  50% { text-shadow: 0 0 3px #fff8; color: #fff; }
}

.ui-anim-btn-svg {
  margin-right: 0.5rem;
  height: 1.5rem;
  width: 1.5rem;
  flex-grow: 0;
  fill: var(--ui-anim-svg-fill);
  animation: ui-flicker 2s linear infinite;
  animation-delay: 0.5s;
}

@keyframes ui-flicker {
  50% { opacity: 0.3; }
}

@keyframes ui-appear {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.ui-anim-txt-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.ui-anim-spacer { visibility: hidden; pointer-events: none; }
.ui-anim-txt-1, .ui-anim-txt-2 {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.ui-anim-txt-1.is-idle    { animation: ui-appear 1s ease-in-out forwards; }
.ui-anim-txt-1.is-active  { opacity: 0; }
.ui-anim-txt-2.is-active  { opacity: 1; }
.ui-anim-txt-2.is-idle    { opacity: 0; }

.ui-anim-btn:disabled { opacity: 0.6; cursor: not-allowed; }

${stagger}
`

let injected = false
function injectStyle() {
  if (injected || typeof document === 'undefined') return
  const tag = document.createElement('style')
  tag.setAttribute('data-anim-subscribe', '')
  tag.textContent = ANIM_CSS
  document.head.appendChild(tag)
  injected = true
}
injectStyle()

export default function AnimatedSubscribeButton({
  className = '',
  labelIdle = 'Оформить подписку',
  labelActive = 'Обрабатываем…',
  generating = false,
  highlightHueDeg = 263,
  onClick,
  type = 'button',
  disabled = false,
  id,
  ariaLabel,
  fullWidth = false,
}) {
  const idleLetters = Array.from(labelIdle)
  const activeLetters = Array.from(labelActive)

  return (
    <div
      className={`relative inline-block ${fullWidth ? 'w-full' : ''} ${className}`}
      id={id}
    >
      <button
        type={type}
        aria-label={ariaLabel || (generating ? labelActive : labelIdle)}
        aria-pressed={generating}
        disabled={disabled}
        onClick={onClick}
        className={`ui-anim-btn ${fullWidth ? 'w-full' : ''}`}
        style={{ ['--highlight-hue']: `${highlightHueDeg}deg` }}
      >
        <svg
          className="ui-anim-btn-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
          />
        </svg>
        <div className="ui-anim-txt-wrapper">
          <span className="ui-anim-spacer">
            {idleLetters.length >= activeLetters.length ? labelIdle : labelActive}
          </span>
          <div className={`ui-anim-txt-1 ${generating ? 'is-active' : 'is-idle'}`}>
            {idleLetters.map((ch, i) => (
              <span key={i} className="ui-anim-letter">
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </div>
          <div className={`ui-anim-txt-2 ${generating ? 'is-active' : 'is-idle'}`}>
            {activeLetters.map((ch, i) => (
              <span key={i} className="ui-anim-letter">
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </div>
        </div>
      </button>
    </div>
  )
}
