export default function Slider({
  min = 0,
  max = 10,
  step = 1,
  value,
  onChange,
  leftLabel,
  rightLabel,
}) {
  const range = max - min || 1
  const pct = ((value - min) / range) * 100

  return (
    <div className="w-full select-none">
      <div className="relative pt-14 pb-2">
        <div
          className="absolute -top-1 text-fg-0 font-serif text-4xl leading-none"
          style={{ left: `calc(${pct}% )`, transform: 'translateX(-50%)' }}
        >
          {value}
        </div>

        <div className="relative h-1.5 w-full rounded-full bg-white/10">
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, oklch(0.55 0.18 270), oklch(0.68 0.18 310))',
            }}
          />
          <div
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{
              left: `${pct}%`,
              boxShadow:
                '0 0 0 6px oklch(0.55 0.18 300 / 0.25), 0 4px 12px rgba(0,0,0,.4)',
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange?.(Number(e.target.value))}
            className="absolute inset-0 h-11 w-full cursor-pointer appearance-none bg-transparent opacity-0"
            style={{ top: '-20px' }}
            aria-label="Slider"
          />
        </div>
      </div>

      {(leftLabel || rightLabel) && (
        <div className="mt-3 flex justify-between text-xs text-fg-3">
          <span>{leftLabel}</span>
          <span className="text-right">{rightLabel}</span>
        </div>
      )}
    </div>
  )
}
