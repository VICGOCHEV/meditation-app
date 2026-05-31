// CTA-кнопка с переключением текста idle ↔ active (для loading-состояний
// типа «Получить ключи к жизни» → «Обрабатываем платёж»).
//
// Визуально использует ту же `.shiny-cta` из application/src/index.css,
// что и обычный ShinyButton — для единообразия со всем приложением и
// промо-лендингом. Раньше тут была кнопка-сама-в-себе с letter-stagger
// шиммером (`ui-anim-btn`); заменили на сдержанную landing-style обводку
// после фидбэка клиента 01.06.2026.
//
// API сохранён, чтобы Subscription/Home/Onboarding не пришлось править.

export default function AnimatedSubscribeButton({
  className = '',
  labelIdle = 'Получить ключи к жизни',
  labelActive = 'Обрабатываем…',
  generating = false,
  onClick,
  type = 'button',
  disabled = false,
  id,
  ariaLabel,
  fullWidth = false,
}) {
  const label = generating ? labelActive : labelIdle
  return (
    <button
      id={id}
      type={type}
      aria-label={ariaLabel || label}
      aria-pressed={generating}
      aria-busy={generating || undefined}
      disabled={disabled || generating}
      onClick={onClick}
      className={`shiny-cta ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <span>
        {generating && (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
          </svg>
        )}
        {label}
      </span>
    </button>
  )
}
