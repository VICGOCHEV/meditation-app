# 02 — Routes & user flow

## Route table (final state)

`src/app/routes.jsx`

| Path | Element | Access |
|---|---|---|
| `/onboarding` | `<Onboarding />` | public |
| `/auth/login` | `<Login />` | public |
| `/auth/register` | `<Register />` | public |
| `/auth/reset` | `<ResetPassword />` | public |
| `/` | `<Home />` | protected |
| `/checkin` | `<Checkin />` | protected |
| `/deep-analysis` | `<DeepAnalysis />` | protected |
| `/player/:id` | `<Player />` | protected, `React.lazy` + `<Suspense>` |
| `/subscription` | `<Subscription />` | protected |
| `/profile` | `<Profile />` | protected |
| `*` | `<Navigate to="/" replace />` | catch-all |

Two earlier dup routes are gone:
- `/auth` redirected to `/auth/login` (removed — `/auth/login` is the only entry).
- `pages/Auth/index.jsx` (`<Auth />` wrapper that did `<Navigate />`) deleted.

## Gates

### `AuthGate` — `src/app/App.jsx`

```js
const isPublic = path.startsWith('/onboarding') || path.startsWith('/auth')
if (!isAuthenticated && !isPublic) {
  return <Navigate to="/onboarding" replace />
}
```

Replaces the original "if onboarding flag missing" check — the flag is no
longer used. Unauth users always go through onboarding before hitting login.

### `ProtectedRoute` — `src/components/ProgressionGate/index.jsx`

```js
if (!isAuthenticated) return <Navigate to="/onboarding" replace ... />
```

Belt-and-braces with `AuthGate`. Both redirect to `/onboarding` (not
`/auth/login`) so users always pass through the splash → slides → music
selection → login funnel.

### Preloader gate — `src/app/App.jsx`

```js
const [preloaderDone, setPreloaderDone] = useState(
  () => sessionStorage.getItem('preloader_played') === '1'
)
// ...
{preloaderDone && <AppRoutes />}
<Preloader onDone={() => setPreloaderDone(true)} />
```

Routes only mount after the preloader hands off. This was added because
onboarding's variant-driven entry animations would otherwise tick to
completion behind the opaque splash and the user would see the final
state when the splash faded.

`Preloader` calls `onDone` when:
- the video fires `ended`, OR
- a 6.5 s fallback timer fires (autoplay denied / video missing), OR
- `play().catch()` fires synchronously (typical on iOS WebView without prior
  user gesture; we skip the splash instead of leaving the tap-to-play
  overlay onscreen).

## Route transitions

`src/app/routes.jsx` renders an `AnimatePresence mode="wait" initial={false}`
around a single keyed `motion.div`:

```js
const forward = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
const backward = forward
```

Only opacity. Earlier iterations used `x: 40` and `filter: blur(8px)` —
both **create CSS stacking contexts** that trap `mix-blend-mode: screen`
inside the route wrapper, blocking `AmorphSphere` from compositing
against the global `AppBackground`. Result: visible black squares on
the player. Fixed by moving to opacity-only.

Even opacity creates a stacking context while < 1, so `AudioPlayer`
defers mounting `AmorphSphere` by `setTimeout(750)` — the route fade
has already settled to `opacity: 1` by then and the stacking context
dissolves.

## End-to-end happy path

1. **First visit** → AuthGate sees no token → redirect `/onboarding`.
2. Preloader plays `preloader.mp4` (or skips). `preloaderDone = true`.
3. Routes mount; `Onboarding` first slide animates in via parent variants.
4. Slides 1–4: Пролог → Система → Голос → Музыка. Voice and music are
   stored in `usePlayerStore` (LS-persisted).
5. Slide 4 "Начать" → navigate `/auth/login`.
6. Login (any non-empty email + password works in mock) → `useAuthStore.login()`
   → navigate `/`.
7. Home → AuthGate passes, `useCheckinStore.todayCheckinDone` is false → effect
   redirects to `/checkin`.
8. Four sliders → `ResultScreen` cycles state names then settles.
9. Result CTA → `/`.
10. Tapping a Relaxation card → `/player/r1` (lazy chunk).
11. Player saves position every 5 s. On `onend`, `markPracticeComplete`,
    `addTrackerDay`, modal "Практика завершена ✓" → home.
12. After 3 days, `canDoDeepAnalysis(lastDate)` returns true; user goes through
    `/deep-analysis`, gets a КТ score, taps "Открыть следующую практику" which
    runs `unlockNextPractice()`.

## URL guards summary

| Guard | Where | What it prevents |
|---|---|---|
| `AuthGate` | `App.jsx`, top-level | Reaching `/`, `/checkin`, `/player/*`, etc. without auth. |
| `ProtectedRoute` | each protected `<Route element>` | Same, second layer. |
| Preloader gate | `App.jsx` | Routes mounting (and animating) under the splash. |
| Onboarding redirect | inside `Checkin` & `Player` `useEffect` | Re-running checkin / re-resuming after completion. |
