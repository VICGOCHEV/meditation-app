// Фирменная CTA-кнопка с вращающейся conic-обводкой.
export default function ShinyButton({ children, as = 'button', className = '', ...props }) {
  const Tag = as
  return (
    <Tag className={`shiny-cta ${className}`} {...props}>
      <span>{children}</span>
    </Tag>
  )
}
