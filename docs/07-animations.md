# 07 — Animations

## Tooling

- **framer-motion v12** — declarative React-side motion. Used for:
  page transitions, slide-step swaps, modal show/hide, button press,
  staggered card grids, BottomNav active-pill morph.
- **Lenis v1.3** — RAF-driven smooth scroll on pointer-fine devices.
- **CSS keyframes** — `liquidFloat`, `liquidCardAngle`, ShinyButton's
  `gradient-angle / shimmer / breathe`.
- **Three.js shader animations** — driven by `useFrame` per frame
  (`uTime` uniform). See `05-shaders.md`.

Common easing constant: `EASE = [0.22, 0.8, 0.36, 1]`.

## Route transitions

`src/app/routes.jsx` wraps a single keyed `motion.div` in
`AnimatePresence mode="wait" initial={false}`:

```js
const forward = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
const backward = forward
transition={{ duration: 0.95, ease: EASE }}
```

Opacity-only — no `x`, no `filter`. Both create CSS stacking contexts
that traps `mix-blend-mode: screen` inside the route wrapper, breaking
`AmorphSphere`'s ability to composite against `AppBackground`. See
`02-routes-and-flow.md` and `05-shaders.md`. Duration was bumped from
0.7 s to 0.95 s in commit `088a086` for a calmer cross-page feel; the
persistent `BottomNav` made the longer fade tolerable because the bar
no longer fades with the route.

The route key is the pathname; `useNavigationType()` was used in earlier
iterations to flip direction-aware variants when transitions had `x`,
but the current opacity-only setup makes direction irrelevant.

## Onboarding (variants + staggerChildren)

Slides 0..3 are children of an `AnimatePresence mode="wait"` with a
keyed `motion.div` per `step`. The wrapper uses **variants** so the
parent drives child entry through `staggerChildren` — robust to
StrictMode's dev-only double mount which otherwise eats the first
slide's animation.

```js
const slideVar = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.30, delayChildren: 0.20 } },
  exit: { opacity: 0, y: -24, filter: 'blur(8px)', transition: { duration: 0.6, ease: EASE } },
}
const eyebrowVar = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: EASE } } }
const lineLeft   = { hidden: { opacity: 0, x: -12, filter: 'blur(10px)' }, visible: { opacity: 1, x: 0, filter: 'blur(0)', transition: { duration: 1.4, ease: EASE } } }
const lineRight  = { ...similar with x: 12... }
const lineDown   = { ...similar with y: 18, blur 12... }
const paraVar    = { hidden: { opacity: 0, y: 14 }, visible: { ..., duration: 1.6 } }
const cardListVar = { hidden: {}, visible: { transition: { staggerChildren: 0.16 } } }
const cardItemVar = { hidden: { opacity: 0, y: 18, filter: 'blur(8px)' }, visible: { ..., duration: 0.9 } }
```

Each line of the asymmetric H1 (3 stacked spans) gets its own variant
(`lineLeft`, `lineRight`, `lineDown`) so the header builds itself line
by line. The eyebrow `Пролог · 01` precedes them. Below the title
either a paragraph (slides 0/1) or a stack of card buttons (2/3) is
animated in via the same variant chain.

The "Next" button below the slides is in its own `AnimatePresence`
keyed by `btn-${step}`, with `transition.delay = 2.4` on `animate` so it
shows up only after slide content has finished its cascade.

## Step swap in Checkin / DeepAnalysis

Each step is wrapped in:

```jsx
<AnimatePresence mode="wait" initial={false} custom={direction}>
  <motion.div key={step}
    initial={stepVariants[direction].initial}
    animate={stepVariants[direction].animate}
    exit={stepVariants[direction].exit}
    transition={{ duration: 0.65, ease: EASE }}
  > ... question + slider ... </motion.div>
</AnimatePresence>
```

`direction` derives from `useRef` of the previous step:
`step >= prev ? 'forward' : 'backward'`. Variants slide in from the
correct side (`±48px` x-offset).

## Checkin result screen

`ResultScreen` cycles through state names (`Шторм / Туман / Ясность /
Поток`) for ~2.4 s before settling on the actual `result.state`.

- `tickIdx` advances on a 460 ms `setInterval`, `phase` flips to
  `'settled'` after 2400 ms.
- The big `<motion.h1>` has key `displayed-tickIdx` (cycling) or
  `displayed-final` (settled), inside an `AnimatePresence` (default
  sync mode, **not** popLayout — sync's parallel exit/enter looks
  smoother for crossfade).
- The H1 is `absolute inset-0 flex items-center justify-center` inside a
  `relative h-[72px] w-full overflow-hidden` parent so cycling siblings
  overlap cleanly without layout shift.
- Eyebrow + paragraph + CTA each fade in with their own delays once
  `phase === 'settled'`.

## Modal

`Modal.jsx` with `createPortal(document.body)`. Backdrop and sheet
animate independently:

```js
backdrop: opacity 0 → 1 → 0 in 450ms
sheet:    { opacity, y, scale } 0,32,0.96 → 1,0,1 → 0,24,0.97 in 600ms
```

Mobile: sheet sits at bottom (`items-end + pb-6`). ≥sm: centred.

## Buttons

- `Button` non-shiny path: `whileTap={{ scale: 0.97 }}`,
  `whileHover={{ y: -1 }}`, spring transition (`stiffness 500, damping 30,
  mass 0.6`).
- `ShinyButton`: CSS-only animations (`gradient-angle`, `shimmer`,
  `breathe`) running constantly. Hover/focus upgrades — see
  `04-components-catalog.md`.

## BottomNav active pill

Two `motion.span` with `layoutId` shared across nav items
(`bottomnav-active-pill`, `bottomnav-active-glow`). When the route
changes and the active item flips, framer interpolates the pill's
position with a spring (`stiffness: 320, damping: 32, mass: 0.7`).

## Home cards stagger

```js
const gridContainer = { animate: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }
const cardItem = {
  initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0)', transition: { duration: 0.85, ease: EASE } },
}
```

## Lenis

In `App.jsx`:
```js
const isCoarse = matchMedia('(pointer: coarse)').matches
if (isCoarse) return            // skip on touch-only phones
const lenis = new Lenis({ lerp: 0.07, smoothWheel: true, ... })
documentElement.classList.add('lenis', 'lenis-smooth')
requestAnimationFrame(raf)
```

Class hooks in `index.css` (top of file) make Lenis play nice with
native scroll-behavior and stops accidental contention with sticky/iframe
content.
