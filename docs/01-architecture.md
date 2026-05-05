# 01 — Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 5 + React 18 | Per BRIEF; fast HMR. |
| Routing | react-router-dom v6 | Per BRIEF. |
| State | Zustand v4 | Per BRIEF. |
| Styling | Tailwind CSS 3 + custom CSS layers | Tokens from the design system mapped into `tailwind.config.js`. |
| Animations | framer-motion v12 | Per session decision. |
| Smooth scroll | lenis v1.3 | Pointer-fine devices only. |
| Audio | Howler.js | Per BRIEF. |
| HTTP | axios | Per BRIEF. |
| Telegram WebApp | @twa-dev/sdk | Per BRIEF; lazy-loaded. |
| 3D / Shaders | three v0.169 + @react-three/fiber v8 | v8 because v9 needs React 19. |
| Glass / variants | @radix-ui/react-slot, class-variance-authority | Used by `LiquidGlass`. |

`package.json` carries no `@types/*` runtime additions because the project is
JSX (no TypeScript). The two `@types/react*` entries are dev-only leftovers.

## Repo layout

```
APP/
├── public/
│   └── preloader.mp4                ← splash video, ≈3.5 MB
├── docs/                            ← this directory
├── index.html                       ← Vite entry, Google Fonts (Manrope+JBM)
├── package.json
├── postcss.config.js
├── tailwind.config.js               ← design tokens
├── vite.config.js
├── .env                             ← VITE_USE_MOCK=true and counter ranges
└── src/
    ├── main.jsx                     ← <BrowserRouter> + <App />
    ├── index.css                    ← Tailwind layers + Lenis CSS + .btn-* + .panel + liquidFloat / liquidCardAngle keyframes
    ├── lib/
    │   └── utils.js                 ← `cn()` clsx+tailwind-merge helper for LiquidGlass
    ├── app/
    │   ├── App.jsx                  ← AuthGate, AppBackground, Preloader gate, Lenis bootstrap, Telegram SDK
    │   └── routes.jsx               ← AnimatePresence + Routes; opacity-only transitions
    ├── pages/
    │   ├── Onboarding/index.jsx     ← 4 slides, OnboardingFog, asymmetric typography
    │   ├── Auth/                    ← Login, Register, ResetPassword, AuthShell, PasswordInput
    │   ├── Home/index.jsx           ← gear+profile header, 3 sections, BottomNav
    │   ├── Checkin/index.jsx        ← 4-question flow + animated ResultScreen
    │   ├── DeepAnalysis/index.jsx   ← 10-question flow with two blocks
    │   ├── Player/index.jsx         ← lazy-loaded; back, AudioPlayer, modals
    │   ├── Subscription/index.jsx   ← AnimatedSubscribeButton CTA
    │   └── Profile/index.jsx        ← TrackerCalendar, progress, settings, logout
    ├── components/
    │   ├── ui/
    │   │   ├── Button.jsx           ← routes primary→ShinyButton, others→<motion.button>
    │   │   ├── ShinyButton.jsx      ← 21st.dev shiny-cta; adds CSS via dangerouslySetInnerHTML once
    │   │   ├── AnimatedSubscribeButton.jsx  ← per-letter glow, idle↔active swap, BottomNav-pill palette
    │   │   ├── LiquidGlass.jsx      ← LiquidGlassFilter, GlassLayers, LiquidButton, LiquidGlass
    │   │   ├── Card.jsx             ← practice card; lock / completed / bonus / price
    │   │   ├── Slider.jsx           ← 0-10 with bubble value above thumb
    │   │   ├── Modal.jsx            ← createPortal(document.body)
    │   │   ├── BottomNav.jsx        ← layoutId-animated active pill + radial glow
    │   │   └── ScreenShell.jsx      ← max-w-md + horizontal padding wrapper
    │   ├── AppBackground/index.jsx           ← global fixed -z-10 fog shader
    │   ├── OnboardingFog/index.jsx           ← denser fog overlay for onboarding (z=-5)
    │   ├── AmorphSphere/index.jsx            ← player blob shader, mix-blend screen
    │   ├── SpookySmoke/index.jsx             ← unused; bigger drifting puffs
    │   ├── PlayShader/index.jsx              ← unused; amorphous play triangle
    │   ├── Preloader/index.jsx               ← session-once video splash
    │   ├── ProgressionGate/index.jsx         ← <ProtectedRoute>
    │   ├── TrackerCalendar/index.jsx         ← month grid, streak pill
    │   ├── VoiceMusicModal/index.jsx         ← gear-icon modal on Home
    │   └── AudioPlayer/index.jsx             ← deferred-mount AmorphSphere + controls
    ├── hooks/
    │   ├── useAudio.js              ← Howl wrapper, position interval, formatTime
    │   ├── useCheckin.js
    │   └── useProgression.js
    ├── store/
    │   ├── useAuthStore.js
    │   ├── useCheckinStore.js
    │   ├── usePlayerStore.js
    │   └── useProgressStore.js
    ├── api/
    │   ├── client.js                ← axios + USE_MOCK + delay()
    │   ├── auth.js
    │   ├── practices.js
    │   ├── checkin.js
    │   ├── subscription.js
    │   └── mock.js                  ← practice catalogue (3+6+2)
    └── utils/
        ├── scoreCalc.js             ← ИС, ИТ, ИО, КТ + interpretations
        └── dateHelpers.js           ← isToday, daysSince, monthGrid, consecutiveStreak
```

## Mounting order in `main.jsx`

```
<StrictMode>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</StrictMode>
```

`StrictMode` is on. It double-invokes mount in dev — that's why every framer
animation that wants to play on first mount is driven through
`variants` + `staggerChildren` rather than per-element `initial`/`animate`
(see `07-animations.md`).

## App.jsx top-level tree

```jsx
<>
  <AppBackground />            // fixed inset-0 -z-10, opaque clear color
  <LiquidGlassFilter />        // SVG <filter id="container-glass"> defs (used by liquid-glass cards / GlassLayers)
  <AuthGate />                 // <Navigate /> when path is protected & no token
  {preloaderDone && <AppRoutes />}
  {preloaderDone && <ShouldShowNav />}  // <BottomNav /> on /, /profile — persistent so layoutId pill animates between tabs
  <Preloader onDone={...} />   // overlays everything until done; raises preloaderDone
</>
```

`ShouldShowNav` is a tiny in-file component:

```jsx
const NAV_ROUTES = ['/', '/profile']
function ShouldShowNav() {
  const { pathname } = useLocation()
  return NAV_ROUTES.includes(pathname) ? <BottomNav /> : null
}
```

The bar lives outside `AppRoutes` so navigation between Home and Profile
does not unmount/remount it — that is what lets Framer Motion's
`layoutId` springs interpolate the active pill between tabs.

`preloaderDone` reads `sessionStorage.preloader_played === '1'` on first
render so a refresh inside the same session doesn't replay the splash.
Routes are gated behind it so onboarding entry animations don't tick
quietly behind the splash and finish before the user sees them.

Lenis is bootstrapped in `App.jsx`'s `useEffect` only when
`matchMedia('(pointer: coarse)')` reports `false` — touch-first phones
keep native momentum. Telegram WebApp SDK is dynamically imported and
calls `WebApp.ready() / .expand()` inside try/catch so non-Telegram
browsers stay quiet.
