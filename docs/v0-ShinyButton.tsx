'use client'

/**
 * ShinyButton — фирменная CTA-кнопка бренда Meditation.
 * Drop-in компонент для V0.dev / Next.js 14.
 *
 * Pill-форма, фиолетовый conic-gradient бордер крутится по кругу,
 * shimmer-блик внутри, hover расширяет градиент. На клик — лёгкий
 * "вдавливание" по Y.
 *
 * Использование:
 *   <ShinyButton onClick={() => router.push('/register')}>
 *     Начать
 *   </ShinyButton>
 *
 *   <ShinyButton fullWidth disabled>
 *     Получить ключи к жизни
 *   </ShinyButton>
 */

import { ButtonHTMLAttributes, ReactNode } from 'react'

const SHINY_CSS = `
@property --gradient-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
@property --gradient-angle-offset {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
@property --gradient-percent {
  syntax: "<percentage>";
  initial-value: 5%;
  inherits: false;
}
@property --gradient-shine {
  syntax: "<color>";
  initial-value: white;
  inherits: false;
}

.shiny-cta {
  --shiny-cta-bg: #14102a;
  --shiny-cta-bg-subtle: #2a1f4d;
  --shiny-cta-fg: #f4f0ff;
  --shiny-cta-highlight: #6145c2;
  --shiny-cta-highlight-subtle: oklch(0.78 0.12 312);
  --animation: gradient-angle linear infinite;
  --duration: 3s;
  --shadow-size: 2px;
  --transition: 800ms cubic-bezier(0.25, 1, 0.5, 1);

  mix-blend-mode: screen;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  outline-offset: 4px;
  padding: 1.1rem 2.5rem;
  font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  border-radius: 360px;
  color: var(--shiny-cta-fg);
  background:
    linear-gradient(var(--shiny-cta-bg), var(--shiny-cta-bg)) padding-box,
    conic-gradient(
      from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
      transparent,
      var(--shiny-cta-highlight) var(--gradient-percent),
      var(--gradient-shine) calc(var(--gradient-percent) * 2),
      var(--shiny-cta-highlight) calc(var(--gradient-percent) * 3),
      transparent calc(var(--gradient-percent) * 4)
    ) border-box;
  box-shadow: inset 0 0 0 1px var(--shiny-cta-bg-subtle);
  transition: var(--transition);
  transition-property: --gradient-angle-offset, --gradient-percent, --gradient-shine;
}

.shiny-cta:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.shiny-cta::before,
.shiny-cta::after {
  content: "";
  pointer-events: none;
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  translate: -50% -50%;
  z-index: -1;
}

.shiny-cta:active:not(:disabled) {
  translate: 0 1px;
}

.shiny-cta::before {
  --size: calc(100% - var(--shadow-size) * 3);
  --position: 2px;
  --space: calc(var(--position) * 2);
  width: var(--size);
  height: var(--size);
  background: radial-gradient(
    circle at var(--position) var(--position),
    white calc(var(--position) / 4),
    transparent 0
  ) padding-box;
  background-size: var(--space) var(--space);
  background-repeat: space;
  mask-image: conic-gradient(
    from calc(var(--gradient-angle) + 45deg),
    black,
    transparent 10% 90%,
    black
  );
  border-radius: inherit;
  opacity: 0.4;
  z-index: -1;
}

.shiny-cta::after {
  --animation: shimmer linear infinite;
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(
    -50deg,
    transparent,
    var(--shiny-cta-highlight),
    transparent
  );
  mask-image: radial-gradient(circle at bottom, transparent 40%, black);
  opacity: 0.6;
}

.shiny-cta span {
  z-index: 1;
  position: relative;
}

.shiny-cta,
.shiny-cta::before,
.shiny-cta::after {
  animation:
    var(--animation) var(--duration),
    var(--animation) calc(var(--duration) / 0.4) reverse paused;
  animation-composition: add;
}

.shiny-cta:not(:disabled):is(:hover, :focus-visible) {
  --gradient-percent: 20%;
  --gradient-angle-offset: 95deg;
  --gradient-shine: var(--shiny-cta-highlight-subtle);
}

.shiny-cta:not(:disabled):is(:hover, :focus-visible),
.shiny-cta:not(:disabled):is(:hover, :focus-visible)::before,
.shiny-cta:not(:disabled):is(:hover, :focus-visible)::after {
  animation-play-state: running;
}

@keyframes gradient-angle {
  to {
    --gradient-angle: 360deg;
  }
}

@keyframes shimmer {
  to {
    rotate: 360deg;
  }
}
`

interface ShinyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  fullWidth?: boolean
}

export default function ShinyButton({
  children,
  className = '',
  fullWidth = false,
  ...rest
}: ShinyButtonProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHINY_CSS }} />
      <button
        type="button"
        className={`shiny-cta ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        <span>{children}</span>
      </button>
    </>
  )
}
