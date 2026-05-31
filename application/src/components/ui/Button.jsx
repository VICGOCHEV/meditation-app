import { motion } from 'framer-motion'
import ShinyButton from './ShinyButton'

const sizeMap = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' }
const variantMap = {
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  destructive: 'btn-destructive',
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  )
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  const isDisabled = disabled || loading

  // Primary variant uses ShinyButton across the whole app — single source of
  // visual truth for our main CTA. Pass loading/disabled/onClick through.
  if (variant === 'primary') {
    return (
      <ShinyButton
        type={type}
        disabled={isDisabled}
        fullWidth={fullWidth}
        className={className}
        {...rest}
      >
        {loading ? <Spinner /> : null}
        {children}
      </ShinyButton>
    )
  }

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      whileHover={isDisabled ? undefined : { y: -1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.6 }}
      className={[
        'btn',
        sizeMap[size],
        variantMap[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </motion.button>
  )
}
