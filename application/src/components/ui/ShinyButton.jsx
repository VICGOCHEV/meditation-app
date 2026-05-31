// Фирменная CTA-кнопка в стиле landing-сайта: тёмная заливка #14102a с
// бегущей по контуру conic-обводкой (фиолетовый → лилак → фиолетовый).
// Один период вращения 4 секунды. Без overlay-псевдоэлементов и
// mix-blend-mode — чистый одинокий блик по периметру, как на лендинге.
//
// CSS живёт глобально в application/src/index.css (.shiny-cta + @property
// --shine-angle + @keyframes shineSpin) — здесь только обёртка.
//
// API совместим со старым (children, onClick, disabled, fullWidth, type)
// чтобы Onboarding/Subscription не пришлось переписывать.

export function ShinyButton({
  children,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  fullWidth = false,
  as = 'button',
}) {
  const Tag = as
  return (
    <Tag
      type={Tag === 'button' ? type : undefined}
      onClick={onClick}
      disabled={Tag === 'button' ? disabled : undefined}
      className={`shiny-cta ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <span>{children}</span>
    </Tag>
  )
}

export default ShinyButton
