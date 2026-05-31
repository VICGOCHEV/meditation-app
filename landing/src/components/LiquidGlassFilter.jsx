// SVG-фильтр «жидкого стекла» — 1:1 из аппки (LiquidGlass.jsx).
// feTurbulence → blur → feDisplacementMap (scale 70) → blur.
// Именно scale=70 даёт сильное преломление — то самое ощущение
// «как в салоне мерседеса», которое просил заказчик.
export function LiquidGlassFilter() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden="true">
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}
