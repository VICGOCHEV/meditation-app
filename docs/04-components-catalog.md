# 04 — Components catalogue

## UI primitives — `src/components/ui/`

### `Button.jsx`

Single-source button. Props:

| Prop | Default | Notes |
|---|---|---|
| `variant` | `'primary'` | `primary \| secondary \| ghost \| destructive` |
| `size` | `'md'` | `sm \| md \| lg` (controls padding/font via `.btn-sm/md/lg` classes) |
| `loading` | `false` | Shows white spinner; disables. |
| `disabled` | `false` | Both `disabled` and `loading` set the disabled DOM attr. |
| `fullWidth` | `false` | adds `w-full`. |
| `className`, `type`, `...rest` | passthrough |

Render branches:
- `variant === 'primary'` → renders `<ShinyButton>` (the 21st.dev shiny CTA).
- All other variants → `<motion.button class="btn btn-{size} btn-{variant}">`
  with framer-motion `whileTap={{ scale: 0.97 }}` and `whileHover={{ y: -1 }}`.

### `ShinyButton.jsx`

JSX port of `21st.dev/r/designali-in/shiny-button`. Self-contained: emits
all of its `.shiny-cta` CSS via `dangerouslySetInnerHTML` once per mount
(the original used Next-only `<style jsx>`).

Key adaptations:
- Inter font swapped for Manrope (already loaded app-wide).
- Palette recoloured: `--shiny-cta-bg: #14102a`, `--shiny-cta-bg-subtle: #2a1f4d`,
  `--shiny-cta-highlight: #6145c2`, `--shiny-cta-highlight-subtle: oklch(0.78 0.12 312)`.
- `mix-blend-mode: screen` on the root button so the dark fill blends
  with the global `AppBackground` instead of reading as black on top of
  the violet fog. **No `isolation: isolate`** — that would re-trap the
  blend mode inside the button's own stacking context.

The original's `:hover/:focus-visible` upgrades (`--gradient-percent: 20%`,
`--gradient-angle-offset: 95deg`, `--gradient-shine` swap, `span::before`
opacity 1) are still gated on hover/focus in this version — the
"hover-as-default" iteration was scoped to the in-CSS `.btn` rule when
all variants were on shiny-cta; we reverted to a hierarchy where only
`primary` is shiny.

### `AnimatedSubscribeButton.jsx`

Compact pill CTA. Same fill/glow as the active BottomNav pill
(`#6145c2` linear-gradient → transparent + outer radial halo blur 10 px
+ inset glow `inset 0 0 14px rgba(97,69,194,.4)`). Renders two label
tracks (`labelIdle`, `labelActive`) inside a `position: relative`
wrapper sized by a hidden `.ui-anim-spacer`; each track is `position:
absolute inset: 0`, opacity-swapped by `is-idle`/`is-active` classes.

Each character is a `<span class="ui-anim-letter">` with a staggered
text-shadow flicker (`ui-letter-anim` keyframe; per-letter delays from
0 s to 1.84 s in 0.08 s steps, generated via the `STAGGER_LETTERS = 24`
loop at module load). Icon: 24 px sparkle SVG with `ui-flicker`
opacity-pulse 2 s.

Of the original 21st.dev snippet's chrome — the embossed shadow stack,
hover/focus brightness ramps, `::before` dark slab, `::after` highlight
gradient — only the text shimmer and icon flicker were kept; the rest
was stripped at user request because the embossing read as plastic
against the dark fog backdrop.

Inserts its CSS into `<head>` once via a side-effect at module load
(`injectStyle()`).

Props: `labelIdle` (default `'Оформить подписку'`), `labelActive`
(default `'Обрабатываем…'`), `generating`, `onClick`, `disabled`,
`fullWidth`, `highlightHueDeg` (default `263°` — matches `#6145c2`).

Used:
- `Home` — subscription nudge inside the «Осознанность» section (when
  `subscription.active === false`). Only `onClick` passed.
- `Subscription` — `labelActive="Обрабатываем платёж"`,
  `generating={stage === 'loading'}`, `disabled={stage === 'loading'}`.

### `LiquidGlass.jsx`

A frosted-glass look kit:

- `LiquidGlassFilter` — once-mounted SVG filter `<filter id="container-glass">`
  with `feTurbulence` + `feDisplacementMap` chain. Mount at App root.
- `GlassLayers` — a pair of absolute layers (light/dark drop+inset shadow,
  then a `backdrop-filter: url('#container-glass')` underlay).
- `LiquidButton` — variant-driven button using `class-variance-authority`,
  variants `default | ghost`, sizes `default | sm | lg | xl | xxl | icon`.
- `LiquidGlass` — generic wrapper for any "плашка" (`as` prop, defaults to `div`).

Not currently the default Button; available for opt-in when a screen
needs the glass look.

### `Card.jsx`

Practice card. Props: `title, duration, locked, badge, completed, price,
onPlay, onBuy, lockedLabel`.

- Locked: `opacity 60%`, blurred backdrop `inset-0 bg-black/40`, lock SVG
  centred.
- Completed: green `✓` badge top-right.
- Price: shows `<Button size="sm" variant="secondary">{price}</Button>` instead
  of play icon.
- Otherwise: round play button — transparent fill, `1.5 px` `#6145c2`
  border, triple violet glow (`0 0 18px / .95`, `0 0 36px / .55`,
  `inset 0 0 10px / .35`).

Sun icon next to the title is rendered bare (no circular wrapper) with
double `drop-shadow(#6145c2)` for a violet halo.

Layout: `relative isolate flex min-h-[200px] flex-col justify-between
overflow-hidden rounded-lg p-5`, no Tailwind background — the surface
is built from three stacked layers, in z-order:

1. `<span class="liquid-card-glow">` — radial-blur drift of `#6145c2`,
   `mix-blend-mode: screen`, `liquidFloat` keyframe with random
   per-card `animationDelay` (0..−14 s) and `animationDuration`
   (12–18 s) so neighbouring cards breathe out of phase.
2. `<span class="liquid-card-border">` — rotating 1 px conic-gradient
   border (`@property --card-angle` + `liquidCardAngle` 5 s linear,
   per-card random delay) cut to a ring via `mask-composite: exclude`.
3. Backdrop-filter underlay `style={{ backdropFilter: 'url(#container-glass)' }}`
   — uses the SVG turbulence/displacement filter mounted globally by
   `<LiquidGlassFilter />`.

The legacy `.card-practice` class still exists in `index.css` for
reference but no Card path applies it any more.

### `DialSlider.jsx`

Round-dial slider used by the Checkin and DeepAnalysis questionnaires.
SVG-based, fully self-contained. Layout (default `size = 300`):

- 330° arc; gap centred at the bottom-right between **value 0** (255°)
  and **value max** (-75° / 285°). Apex (`12 o'clock`) is the midpoint.
- 81 fine ticks across the arc (every ~4°), every 5th tick is thicker.
  Active range (covered by the value) tints the ticks lilac.
- Background full arc (`stroke: rgba(180,160,255,.16)`) plus a
  gradient fill arc (`#9b75ff → #6145c2`) with `feGaussianBlur` glow.
- Number labels (0..max) ring outside the track. The active number is
  `fontWeight: 500 #f4f0ff`, others `300 lilac/55%`. Tap-on-number
  jumps the dial directly.
- Knob: white inner dot (`r=12`) + glowing violet halo (`r=18`).
- Inner dark disk (`r ≈ size * 0.27`) with the big value number and a
  mono caption that auto-declines `балл / балла / баллов`.

Drag interaction: `pointerdown` anywhere on the SVG begins drag;
window-level `pointermove`/`pointerup` track the gesture. Pointer
angle from the centre is mapped to a value via
`valueRatioForAngle(ang)`; the 30° dead zone at the bottom snaps to
the nearest end. `touch-action: none` on the host prevents page
scroll while dragging. The drag handler accounts for a padded
viewBox (`-32 -32 size+64 size+64` with `overflow: visible`) so the
outer numbers are never clipped.

Animation:
- **Smooth motion** — `useSmoothValue(target, 260ms)` ease-out
  cubic tweens the displayed value between integer steps; arc
  geometry, knob position, and tick highlight all read the smoothed
  value, so the dial slides rather than snaps.
- **Pulsing arc glow** — a wider `motion.path` underlay
  (`stdDeviation = 14` blur) tweens opacity `0.18 ↔ 0.42` over
  2.6 s on `easeInOut` infinite. Knob halo pulses opacity + scale
  on the same cadence.
- **Centre digit** — keyed `motion.text` inside `AnimatePresence
  mode="popLayout"`; each value change exits downward + blurred and
  the new digit enters from above + blurred (320 ms each).

Props: `value`, `onChange`, `min` (default 0), `max` (default 10),
`size` (default 300), `unitLabel` (function `(v) → string`, default
`declineBalov` returning «балл / балла / баллов»).

### `KTGauge.jsx`

Half-circle SVG gauge for the Coefficient of Transformation, used as
the hero on the DeepAnalysis result screen. Domain `−10..+10`, anchored
at the centre tick (KT = 0 sits at the dome's apex). Two layers:

1. faint background half-arc (`stroke: rgba(180,160,255,.16)`)
2. animated coloured arc — `framer-motion` tweens `pathLength` 0→1
   over 1.2 s; gradient flips between `kt-grad-pos` (blue → green) and
   `kt-grad-neg` (blue → orange) by sign of `value`.

Five tick marks (−10, −5, 0, +5, +10) with mono labels at the extremes
and the centre. A glowing needle dot lands at the value position with
a 1.1 s delay so the arc reaches it first.

Props: `value` (number).

### `Sparkline.jsx`

Tiny KT-history mini-chart (240 × 60 viewBox by default; height
overridable). Y is fixed to the same `−10..+10` domain so a flat
baseline at 0 reads as "neutral". Renders three SVG layers: a dashed
zero baseline, a violet-fading area fill below the line, and the line
itself with `pathLength` tweened 0→1 over 0.9 s. The last point gets
a glowing dot tinted by sign (`#7be1a3` / `#e6a878` / `#9eb5ff`).

Used: DeepAnalysis result screen (history including the just-recorded
entry) and Profile entry card (last 12 KT entries).

Props: `data` (array of numbers OR `{ kt }` objects), `height`
(default 60).

### `CountUp.jsx`

Tweens a number from `0 → value` over `duration` (ms, default 1100)
with an ease-out cubic curve. Returns a `<span>` showing the running
value formatted with `decimals` (default 1) and an optional `prefix`
(used for `+` on positive KT). Optional `delay` in ms before the tween
starts. Used three times on the result screen — for ИТ, ИО and КТ.

### `Slider.jsx`

`min, max, step, value, onChange, leftLabel, rightLabel`.

Visuals: 1.5 px track, violet→lilac gradient fill, 24 px white thumb with
violet halo (`box-shadow: 0 0 0 6px ..., 0 4px 12px ...`). Bubble value
in Manrope/serif `text-4xl` floats above the thumb at the same pct-x.
The native `<input type="range">` overlays at `opacity: 0` for touch.

### `Modal.jsx`

`createPortal(<>, document.body)` to escape any transformed ancestor that
would otherwise collapse `position: fixed` into its own coordinates.

Backdrop: `bg-black/60 backdrop-blur-sm`, animated opacity 0..1 (450 ms).
Sheet: rounded card `bg-bg-2 border border-line-2 shadow-shadow-2`,
animates `{ opacity, y, scale }` 0,32,0.96 → 1,0,1 → 0,24,0.97 (600 ms).
Mobile: `items-end` (sheet sits at bottom). ≥sm: `items-center`. Esc closes.

### `BottomNav.jsx`

Two NavLinks (`Главная`, `Профиль`). The "active pill" and "active glow"
are both `motion.span` with shared `layoutId`s (`bottomnav-active-pill`
and `bottomnav-active-glow`), so they slide between tabs on click.

Pill background: `linear-gradient(90deg, #6145c2 0%, rgba(97,69,194,.55) 60%,
rgba(97,69,194,0) 100%)`. Glow: radial gradient with `filter: blur(10px)`,
inset to `-inset-2`. Spring transition `stiffness: 320, damping: 32, mass: 0.7`.

Mounted **persistently** at App root via `ShouldShowNav` (allowed only
on `/` and `/profile`) — the bar therefore does not unmount when the
user navigates between Home and Profile, which is what allows the
`layoutId` springs to interpolate the pill across tabs instead of the
whole nav cross-fading with the route.

### `ScreenShell.jsx`

Layout wrapper: `min-h-dvh`, inner `mx-auto max-w-md px-5 pt-6`.
`withBottomNav` prop adds bottom padding so content clears the BottomNav.

## Domain components — `src/components/`

### `AppBackground/`

Globally mounted shader at `fixed inset-0 -z-10`. See `05-shaders.md`.

### `OnboardingFog/`

Dense fog overlay rendered only inside the Onboarding `<ScreenShell>`,
positioned `fixed inset-0 z-[-5]`. See `05-shaders.md`.

### `AmorphSphere/`

Animated violet blob inside `AudioPlayer`. Mounted with a 750 ms
`setTimeout` delay so the route opacity fade has settled by then.
`mix-blend-mode: screen` on the wrapper. See `05-shaders.md`.

### `SpookySmoke/` *(unused)*

Bigger, slower drifting puffs. Built during the smoke iterations but
not currently mounted anywhere.

### `PlayShader/` *(unused)*

Amorphous Play-triangle on transparent background. Built during the
voice slide experiment, replaced by horizontal cards.

### `Preloader/`

`<motion.div>` overlay at `z-[100]`. Plays `/preloader.mp4`. Imperatively
sets `videoRef.current.muted = true` + `defaultMuted = true` before
calling `play()`. On `play().catch()` immediately calls `finish()`. On
`ended` event fires `finish()`. 6.5 s fallback timer.
`<video controls={false} disableRemotePlayback disablePictureInPicture
playsInline webkit-playsinline x5-playsinline>` — closes every iOS
WebView quirk that would surface a tap-to-play overlay.

### `ProgressionGate/`

Single export: `<ProtectedRoute>{children}</ProtectedRoute>`.
Redirects unauthenticated visitors to `/onboarding` (not `/auth/login`),
so the funnel always passes through onboarding.

### `TrackerCalendar/`

Renders the current month as a 7×6 grid (Mon-first). Done day cells get
the violet→lilac gradient + `box-shadow: 0 4px 20px -4px ...`. Today
without a check gets a `border` in `border-lilac`. `streak` prop renders
the ember-tinted streak pill in the header (`🔥 N дн. подряд`).

### `VoiceMusicModal/`

Settings modal opened from the Home gear icon. Two segmented controls
inside a `<Modal>`:
- Голос: pill toggle `Мужской / Женский`.
- Музыка: stack of three full-width buttons with the play `▶` glyph.

Backed by `usePlayerStore.setVoice / setMusic`.

### `AudioPlayer/`

The big play surface. Layout:

```
[ shader background (deferred 750ms) ]
   <h1>title</h1>
   [ -15 ]   ( Big 88px play / pause )   [ +15 ]
   <mono>BLOCK</mono>
   <span>15 мин</span>
[ progress bar 2px ]
[ MM:SS                 MM:SS ]
```

Tap target: the whole shader container is `onClick={toggle}`. Skip
buttons `stopPropagation` so they don't double-fire. Howler progress
saves to `usePlayerStore.savePosition(id, sec)` every 5 s + on unmount.
On `onend`: `clearPosition`, `markPracticeComplete`, `addTrackerDay`,
`completePractice` (mock POST), then a "Практика завершена" Modal.
