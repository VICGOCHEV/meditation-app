# 06 — Design tokens

All tokens live in two places:
- `tailwind.config.js` — colour, font-family, radius, shadow, animation
- `src/index.css` — base body bg, h1–h4 styles, `.btn-*`, `.panel`,
  `.field-input`, `.label-mono`, `.card-practice`, Lenis CSS, the two
  liquid-glass keyframes (`liquidFloat`, `liquidCardAngle`).

## Colours

### Background ("Night sky")

| Token | Hex |
|---|---|
| `bg-0` | `#0a0714` |
| `bg-1` | `#110c20` |
| `bg-2` | `#1a1330` |
| `bg-3` | `#231a42` |

App body is `#11101a` (`bg-1`-ish). The original Claude Design palette had
`#0a0714` as the canvas; we lifted it to `#11101a` per the user request
("чтобы фоновый цвет за дымкой был виден чаще"). Tailwind tokens above
are kept for component-level surfaces (`bg-bg-1`, `bg-bg-2` etc.).

### Foreground (off-white)

| Token | Hex |
|---|---|
| `fg-0` | `#f4f0ff` (Moonlight) |
| `fg-1` | `#d9d2f0` (Body) |
| `fg-2` | `#a99ecb` (Muted) |
| `fg-3` | `#6e6290` (Subtle) |
| `fg-4` | `#463e62` |

### Lines

| Token | Value |
|---|---|
| `line` | `rgba(180,160,255,0.09)` |
| `line-2` | `rgba(180,160,255,0.16)` |

### Accents (single-hue family)

| Token | Value |
|---|---|
| `violet` (primary) | `#6145c2` (literal hex; was `oklch(0.66 0.18 300)` until commit `088a086`) |
| `indigo` | `oklch(0.60 0.17 278)` |
| `lilac` (soft) | `oklch(0.78 0.12 312)` |
| `ember` (warm — for streak only) | `oklch(0.78 0.14 60)` |

Plus semantic: `ok oklch(0.72 0.13 160)`, `warn oklch(0.78 0.14 60)`,
`err oklch(0.66 0.18 20)`.

### Brand HEX `#6145c2`

The single source-of-truth for the violet accent. Referenced literally
(no `var()` indirection) by:

- `BottomNav` active pill (linear-gradient + glow shadows)
- `AnimatedSubscribeButton` (pill background + halo)
- `Card` play button border + glow + sun-icon `drop-shadow`
- `.liquid-card-glow` / `.liquid-card-border` (cards' floating glow + rotating border)
- `.field-input:focus` border-color and focus ring
- `ShinyButton` `--shiny-cta-highlight`
- `OnboardingFog` / `AppBackground` shaders use the same hue inside fbm
  colour mixing, just expressed in vec3 form.

## Typography

| Family | Used for | Note |
|---|---|---|
| Manrope | everything: body, headings, UI, display | Fraunces removed mid-session. |
| JetBrains Mono | `font-mono` — labels, eyebrows, time codes | |

`tailwind.config.js`:
```js
fontFamily: {
  sans: ["'Manrope'", 'system-ui', 'sans-serif'],
  serif: ["'Manrope'", ...],   // intentionally aliased to Manrope so existing `font-serif` classes keep working
  display: ["'Manrope'", ...],
  mono: ["'JetBrains Mono'", 'monospace'],
}
```

`index.html` Google Fonts URL loads:
`Manrope:wght@200;300;400;500;600;700;800` + `JetBrains Mono:wght@400;500`.

`h1, h2, h3, h4` defaults (in `index.css`):
```css
font-family: 'Manrope';
font-weight: 300;
color: #f4f0ff;
letter-spacing: -0.02em;
```

## Spacing & radii

4-pt scale (Tailwind defaults work). Rounded corners:

| Token | px |
|---|---|
| `xs` | 6 |
| `sm` | 10 |
| `md` | 16 |
| `lg` | 22 |
| `xl` | 32 |
| `full` | 9999 |

## Shadows

```js
'shadow-1':  '0 1px 2px rgba(0,0,0,.5)',
'shadow-2':  '0 10px 40px -12px rgba(70,40,150,.55)',
'glow':      '0 0 60px -10px oklch(0.66 0.18 300 / 0.55)',
'btn-primary': '0 10px 30px -10px oklch(0.55 0.22 295 / 0.6), inset 0 1px 0 rgba(255,255,255,.2)',
```

## Tailwind `backgroundImage`

```js
'primary-btn': 'linear-gradient(180deg, oklch(0.62 0.19 300), oklch(0.52 0.20 288))',
'night-sky':   'radial-gradient(900px 600px at 85% -200px, oklch(0.35 0.18 290 / 0.45), transparent 60%), ...',
```

## Tailwind keyframes

```js
fadeIn: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }
```

(`animate-fade-in` is used as a low-cost fallback in a few places.)

## CSS-only keyframes (`index.css`)

| Keyframe | Used by |
|---|---|
| `liquidFloat` | `.liquid-card-glow` — drifting violet halo inside liquid-glass cards. |
| `liquidCardAngle` (`@property --card-angle`) | `.liquid-card-border` — conic-gradient border that rotates. |
| `stateIconHighlight` | `.state-icon-reveal` — one-shot brighter pulse (1.4 s ease-out forwards) on the Checkin result icon. |
| `stateIconBreathe` | `.state-icon-reveal` — chained 4 s ease-in-out infinite swell (delayed 1.4 s) for the steady glow. |

Plus the shiny-cta keyframes (`gradient-angle`, `shimmer`, `breathe`) live
inside `ShinyButton.jsx`'s embedded stylesheet.

## Component classes

`index.css` defines under `@layer components`:

- `.btn`, `.btn-md`, `.btn-sm`, `.btn-lg`
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-destructive`
  (the latter four are for the non-shiny code path; shiny uses `.shiny-cta`).
- `.panel` — `bg-bg-1 border border-line rounded-md p-6`
- `.field-input` — text input default; `:focus` border-color `#6145c2`
  with `box-shadow: 0 0 0 4px rgba(97,69,194,.25)` ring.
- `.label-mono` — Mono 11 px, uppercase, tracking `.18em`, colour
  `text-lilac`.
- `.card-practice` — flat practice-card wrapper. Defined here for
  reference only; no current code path applies it. `Card.jsx` now uses
  the liquid-glass treatment described in `04-components-catalog.md`
  (a `relative isolate overflow-hidden rounded-lg` host with three
  stacked layers).

## Iconography

Lucide-like inline SVGs throughout (`stroke="currentColor" strokeWidth="1.5/1.6"`).
No external icon library installed.
