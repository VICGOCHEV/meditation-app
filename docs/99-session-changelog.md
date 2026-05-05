# 99 — Session changelog

Chronological log of every iteration in the live session, from the
opening of the bundle to the moment these docs were created. Use this
when you want to know **why** a thing is the way it is.

---

## Phase 0 — Bundle inspection & initial scaffold

1. **Opened the Claude Design handoff bundle**
   `https://api.anthropic.com/v1/design/h/qy6muxqNlTWzun_o9XD-7w?open_file=Design+System.html`
   - Gzipped tarball in `/tmp/design-bundle/meditation-app/`.
   - Read `README.md`, `chats/chat1.md`, `BRIEF.md`, `Design System.html`.
   - Brief: contract VC-26-013, React 18 + Vite + Tailwind + Zustand +
     Howler + React Router. Mobile-first with web/Telegram/VK/MAX
     wrappers.

2. **Asked the user to confirm scope**: a) showcase only, b) component
   library + showcase, c) full meditation app scaffold. User chose **(c)
   full scaffold**, target path `/Users/eblan/Desktop/MED/APP`.

3. **Bootstrapped the project** (no `npx create-vite` — wrote files
   directly):
   - `package.json`, `vite.config.js`, `tailwind.config.js`,
     `postcss.config.js`, `index.html`, `src/main.jsx`, `src/index.css`.
   - `npm install` dependencies in background.
   - Tailwind theme tokens lifted from `Design System.html` (palette,
     fonts, radii, shadows, gradients, keyframes).

4. **Wrote utilities first**: `scoreCalc.js` (ИС/ИТ/ИО/КТ),
   `dateHelpers.js` (isToday, daysSince, monthGrid, consecutiveStreak).

5. **Zustand stores**: `useAuthStore`, `usePlayerStore`,
   `useCheckinStore`, `useProgressStore` — all LS-persisted.

6. **API mock layer**: `client.js`, `auth.js`, `practices.js`,
   `checkin.js`, `subscription.js`, `mock.js` (3 + 6 + 2 practices).
   Mock latency, one ~8 % failure path on `createSubscription` to make
   the error UI testable.

7. **Hooks**: `useAudio.js` (Howler wrapper, save-position interval),
   `useCheckin.js`, `useProgression.js`.

8. **UI primitives**: `Button`, `Card`, `Slider`, `Modal` (CSS-fade-in),
   `BottomNav`, `ScreenShell`, `AudioPlayer` (with orb), `TrackerCalendar`,
   `ProgressionGate`/`ProtectedRoute`.

9. **All ten screens** built: Onboarding, Auth (Login/Register/Reset),
   Home, Checkin, DeepAnalysis, Player, Subscription, Profile.

10. **Wired routes**: `routes.jsx`, `App.jsx` with `OnboardingGate`
    (legacy) reading `localStorage.onboarding_completed`.

11. **First production build green**. Bundle ≈ 300 KB JS (un-split).

12. **Initial git push**: commit `59c3305` to a fresh GitHub repo at
    `https://github.com/VICGOCHEV/meditation-app`. Author identity set
    inline via `-c user.name`/`-c user.email`.

---

## Phase 1 — Player redesign

User feedback (with screenshot): the player should match a reference
mock. Asked what the central object is.

13. **Identified the mock's central element**: a R3F shader. User uploaded
    `background-paper-shaders.tsx` containing a fully-functional
    `AmorphSphere` shader (multi-shell `blobFill`+`blobFillSharp`,
    angular-distort sum-of-sines, rim and pink lighting, deep-overlap
    `cut` damping, fbm-warped halo). Also defined an `AmorphSphereMesh`
    + `<Canvas>` wrapper.

14. **Confirmed plan in text** (no code yet): the user wanted (a) volume
    slider gone, (b) panel/orb backdrop gone, (c) layout to match the
    screenshot, (d) shader on top of the global background, (e) tap
    play/pause anywhere on the shader area.

15. **Installed three.js + R3F**. R3F v9 wanted React 19 — pinned to v8.

16. **Converted TSX → JSX** as `src/components/AmorphSphere/index.jsx`.
    Stripped types, dropped legacy/unused exports.

17. **Refactored `AudioPlayer`**: shader covers the player area, title
    above, big primary play button + `-15 / +15` skips, mono block
    label + duration line, thin progress bar, time codes. Volume slider
    and panel removed. Tap anywhere = play/pause.

18. **Header simplification**: gear icon moved from `Player` into the
    Home header (left). Profile icon stays right. The `VoiceMusicModal`
    gets the gear's tap. The "Meditation · Тишина" wordmark removed.

19. **Lazy-loaded `Player`** so the heavy three.js chunk is split out of
    the initial bundle.

---

## Phase 2 — Global background & atmosphere

20. **Removed local halo from `AmorphSphere`** (left only the blob); added
    a separate `AppBackground` component that renders a halo-only fbm
    shader globally at `fixed inset-0 -z-10`.

21. **User feedback**: too much smoke, more of `#11101a` should show.
    Tuned `AppBackground` shader: `smokeGate = smoothstep(0.40, 0.85, smoke)`
    (was lower threshold), halo multiplier dropped from 0.75 → 0.45,
    `pow(smoke, 4) * 0.35` → `pow(smoke, 6) * 0.18`, vignette mellower.
    Base color updated `#0a0714 → #11101a`.

22. **Added `mix-blend-mode: screen`** on `AmorphSphere` wrapper so the
    blob composites against the global fog instead of painting opaquely.
    Made the `blendMode` prop configurable (default `'screen'`).

---

## Phase 3 — Onboarding overhaul (multiple iterations)

23. **First pass**: replaced the slide 0/1 illustration placeholder with
    `<AmorphSphere>` as a backdrop (re-used the same blob shader). User
    said this was wrong — the request was for a *different* "spooky
    smoke" shader, with the illustration block removed.

24. **Wrote `SpookySmoke`**: bigger, fewer drifting puffs, slower clock,
    theatrical palette. Mounted on slides 0/1.

25. User wanted denser version of the global app fog itself, not a new
    component. **Wrote `OnboardingFog`**: same fbm domain-warp pattern as
    `AppBackground` but with a transparent base, lower threshold (0.28),
    higher contribution. `mix-blend-mode: screen`. Mounted at `fixed inset-0
    z-[-5]` (above global fog, below interactive content).

26. **Asymmetric typography composition** for slides 0/1:
    - eyebrow `Пролог · 01` / `Система · 02` (mono)
    - 3-line H1 with stair indents (`pl-10 / pl-12`) and weight contrast
      (`font-extralight` ↔ `font-medium`)
    - paragraph max-width 28ch
    - Each line/paragraph animated in via per-element variants with
      explicit delays.

27. User reported slide 0 didn't animate on first mount but slide 1 did.
    Cause: React StrictMode dev double-mount + `AnimatePresence
    initial={false}`.
    **Fix**: hoisted slide entry into parent **variants** with
    `staggerChildren` orchestration — the parent state transition
    `hidden → visible` reliably triggers all children, regardless of
    StrictMode. Eyebrow / line-left / line-right / line-down /
    paragraph each get their own variant.

28. User flagged that the slide entry animations were running **behind
    the preloader video**, completing before the user saw them.
    **Fix**: `<AppRoutes />` is now gated on a `preloaderDone` state in
    `App.jsx`. Routes only mount after the splash hands off via
    `Preloader.onDone()`.

29. Redesigned slides 2/3 (voice/music) in the same style — eyebrow,
    asymmetric H1, `cardListVar` staggered grid/stack of cards.

30. Voice slide cards experimented: first as small grid cards with a
    PlayCircle inside, then with a giant `PlayShader` (an amorphous
    Play-triangle shader) and pill buttons below, then back to the
    plain horizontal cards (`PlayCircle 48 + Прослушать + label + ✓`)
    once the user said voice and music slides should look identical.

31. **"Next" button delay**: each slide's Continue button is in its own
    `AnimatePresence` keyed by `btn-${step}`, with `transition.delay = 2.4`
    on the `animate` variant — so the button shows up only after the
    text finishes its cascade. Fast exit (~0.35 s) on step change.

---

## Phase 4 — Auth flow tightening

32. User: "the login screen appears at the very start; only show it
    after Music slide".
    - Removed the `/auth` redirect Route entry.
    - Deleted `src/pages/Auth/index.jsx`.
    - Renamed `OnboardingGate` → `AuthGate`. Now: unauth visitors are
      always sent to `/onboarding`. Login is reachable only at the end
      of onboarding or by direct `/auth/login` URL.
    - `ProtectedRoute` redirects to `/onboarding` (not `/auth/login`),
      mirroring the gate's behaviour.

33. **Modal portal fix**: Modal moved to `createPortal(document.body)` so
    transformed route ancestors don't trap its `position: fixed`. Caused
    by framer-motion route animations leaving `transform: translate(0,0)`
    permanently inline.

---

## Phase 5 — Checkin polish

34. **State name flash on the Result screen**: cycles through
    `Шторм / Туман / Ясность / Поток` for ~2.4 s before settling on the
    real state. First implementation used `mode="popLayout"` with
    `key={tickIdx}`; user reported jitter.

35. **Smoothing**: switched to default sync `AnimatePresence` (parallel
    crossfade), interval 460 ms, transition 0.42 s cycling / 1.1 s
    settle. h1 made `absolute inset-0 flex items-center justify-center`
    inside a `relative h-[72px] overflow-hidden` parent so siblings
    overlap cleanly.

36. **Result screen lifecycle bug**: `useEffect(() => { if (todayDone)
    navigate('/') })` was firing right after `completeCheckin()` flipped
    `todayDone`, so the result screen flashed and disappeared.
    **Fix**: read `useCheckinStore.getState().todayCheckinDone` once on
    mount only — don't re-trigger on store change.

---

## Phase 6 — Visual identity polish

37. **Fonts**: Fraunces removed everywhere. Manrope is the only display
    family. h1–h4 default `weight 300`, `letter-spacing -0.02em`.
    `tailwind.config.js` aliases `serif`/`display` to Manrope so old
    `font-serif` classes keep working.

38. **Wording sweep**:
    - "Медитации" → "Расслабление и осознанность" (Onboarding paragraph).
    - "Сейчас медитируют" → "Сейчас в практике" (Home counter).

39. **Preloader**: `/public/preloader.mp4` (3.5 MB) plays once per session
    (`sessionStorage.preloader_played`). Imperatively sets `videoRef.muted
    = true / defaultMuted = true` before `play()`. On `play().catch()` →
    immediately calls `finish()` (skips splash). Closes every iOS WebView
    quirk: `controls={false} disableRemotePlayback disablePictureInPicture
    playsInline webkit-playsinline x5-playsinline`. Final fade-out is a
    plain opacity 1 → 0 over 1.6 s (an earlier `clip-path` "vignette"
    iteration was reverted because the user wanted plain fade).

---

## Phase 7 — Stacking-context bug saga (`AmorphSphere` black artefacts)

This was the longest single thread. Symptoms: black squares visible on
the player. The visual budget said "screen blend should hide black",
but it wasn't doing so.

40. **First diagnosis**: route-level `motion.div` had `filter: blur(8px) →
    0px`. Even at 0px, `filter` other than `none` creates a CSS stacking
    context. `mix-blend-mode: screen` only blends inside its nearest
    stacking context — so `AmorphSphere` was blending inside a tiny
    transparent box, not against `AppBackground`.
    **Fix #1**: dropped `filter` from route variants.

41. **Second symptom**: still black on first ~700 ms after entering the
    player. Cause: `motion.div` has `x: 40 → 0` — `transform` also
    creates a stacking context.
    **Fix #2**: dropped `x`, route transitions are opacity-only.

42. **Third symptom**: still black during the opacity fade itself
    (opacity < 1 also creates a stacking context, transiently).
    **Fix #3**: in `AudioPlayer`, defer mounting `<AmorphSphere>` by
    `setTimeout(750)` — by then the route fade has settled to opacity 1
    and the wrapper is no longer a stacking context.

43. Several side fixes were tried inside the shader and reverted at
    the user's request:
    - `gl_FragColor = vec4(col, body * cut)` → see-through deep overlap.
      Reverted ("don't change the shader structure").
    - `col += mix(cDeep, cMid, lighting) * body * 0.65` base ramp.
      Reverted.
    - `vec4(col, body)` final form is what shipped.

---

## Phase 8 — Lenis smooth scroll

44. Installed `lenis@1.3`. Added required CSS to `index.css`. Bootstrap
    in `App.jsx`'s `useEffect`: skip when `matchMedia('(pointer: coarse)')`
    — touch-only phones keep native momentum because Lenis fights iOS's
    rubber-banding. Lerp `0.07`, `smoothWheel: true`,
    `wheelMultiplier: 1`.

---

## Phase 9 — Buttons (the long road)

45. **First pass**: a CSS shimmer sweep added on `.btn-primary` and
    `.btn-destructive` inside `index.css`. User wanted the shadcn shiny
    button, not a homemade shimmer.

46. **Tried `npx shadcn add https://21st.dev/r/designali-in/shiny-button`**
    — required `components.json` and was interactive; did not init
    shadcn. Instead fetched the registry JSON manually:
    `curl https://21st.dev/r/designali-in/shiny-button` returned the
    component source (Next.js, `<style jsx>`).

47. **Wrote `ShinyButton.jsx`** — JSX port: TS stripped; `<style jsx>` →
    one-shot `<style dangerouslySetInnerHTML>`; Inter swapped for Manrope;
    palette retuned to violet `#6145c2`; `mix-blend-mode: screen` so the
    dark fill blends with the global fog. `box-shadow inset` for the
    subtle border.

48. **Iterated which buttons get the shine**: from "primary only" → "all
    buttons" → "all buttons but variant tweaks" → finally `Button.jsx`
    branches: primary uses `<ShinyButton>`, secondary/ghost/destructive
    fall back to flat `.btn-*` via `<motion.button>`.

49. **`AnimatedSubscribeButton`** — separate animated CTA used on the
    Subscription screen. Idle/active label crossfade with per-letter
    text-shadow flicker (24-character stagger). Same `#6145c2` linear
    pill + radial halo as the BottomNav active pill.

50. **`LiquidGlass.jsx`** — opt-in glass treatment: `LiquidGlassFilter`
    (SVG `feTurbulence`+`feDisplacementMap`) + `GlassLayers` + `LiquidButton`
    + generic `LiquidGlass` wrapper. CVA-driven variants. Not the default
    button; sits in the toolkit.

51. `Card.jsx` flat-glow style adopted (no border, double inset+outer
    violet shadow). Two CSS keyframe rigs (`liquidFloat`,
    `liquidCardAngle` + `@property --card-angle`) added to `index.css`
    for liquid-glass internal use.

52. **`BottomNav`** active pill animated with shared `layoutId`s for the
    pill (`bottomnav-active-pill`) and the radial glow
    (`bottomnav-active-glow`). Spring transition. Pill palette matches
    the AnimatedSubscribeButton.

---

## Phase 10 — Deploy & infra

53. **First deploy** to a Hetzner-class VPS with IPv6-only address —
    fine for HTTP, but most users couldn't reach it, and the SSH path
    needed IPv6 connectivity from the dev's Mac. User got a new IPv4
    box (`89.105.213.173`).

54. **Provisioning** the new server (Ubuntu 22.04):
    - `expect` script + `ssh-copy-id` to install the Mac's pubkey
      (interactive password supplied via env var).
    - `apt-get install nodejs caddy git` (NodeSource and cloudsmith repos).
    - `git clone` to `/opt/meditation-app`, `npm ci`, `npm run build`.
    - `Caddyfile` written, `systemctl reload caddy`.
    - `curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://89.105.213.173/` →
      200 internally and externally.

55. **TLS not enabled** (no domain). User briefly hit
    `ERR_CONNECTION_REFUSED` because the browser auto-tried HTTPS.
    Documented "type http://" workaround in the chat.

56. **Subsequent deploys** are all `git pull && npm run build &&
    systemctl reload caddy` over SSH. ~15 commits in `main` already.

---

## Phase 11 — Documentation (this directory)

57. User asked: (a) do you have project-wide MD docs and (b) can you
    update the original `Design System.html` with the new buttons.

58. Replied (a) no MD docs yet, only `BRIEF.md`/`PROMPT.md` in the parent
    folder. (b) yes, with caveats — three.js shaders don't drop into
    a static HTML demo cleanly, suggested either a fresh
    `Design System v2.html` or a textual `design-system.md`.

59. User asked for **MD docs covering the project from session start to
    current state**.

60. **Wrote this `docs/` directory** (`README` + 10 topic docs +
    this changelog). Snapshot is current as of:
    - Latest pushed commit `bb98a33` (voice slide cards parity).
    - Local uncommitted changes: `ShinyButton`, `AnimatedSubscribeButton`,
      `LiquidGlass`, `Card.jsx` flat-glow, `BottomNav` motion-pill
      `index.css` updates with `liquidFloat`/`liquidCardAngle` keyframes.

---

End of session log. Future iterations should append below this line.

---

## Phase 12 — Outside-session work (synced via git log)

Commits committed after the docs/ snapshot at `bb98a33`. Each entry
condenses the commit message + diff; "why" is only stated when the
commit message says it explicitly.

61. **`466fc9d` — "ShinyButton across primary CTAs + LiquidGlass on plashki"** (2026-05-04)
    - `Button.jsx`: `variant === 'primary'` now renders `<ShinyButton>`;
      `loading`, `disabled`, `fullWidth`, `onClick` pass through. Other
      variants keep the previous `<motion.button>` styling.
    - Home «Оформить подписку» switched to `variant=secondary` —
      excluded from the shiny treatment, kept as a compact inline pill.
    - Added deps: `@radix-ui/react-slot`, `class-variance-authority`,
      `clsx`, `tailwind-merge`. New `src/lib/utils.js` exports `cn()`
      (clsx + tailwind-merge).
    - New `src/components/ui/LiquidGlass.jsx` exports:
      - `LiquidGlassFilter` — SVG `<filter id="container-glass">`
        (feTurbulence + feDisplacementMap + feGaussianBlur), mounted
        once at App root so `filter: url('#container-glass')`
        references resolve.
      - `GlassLayers` — pointer-events-none shadow + backdrop-filter
        siblings, drop-in for any positioned host.
      - `LiquidGlass` — generic wrapper for non-button cards.
      - `LiquidButton` — interactive button using the same glass
        effect (variants `default | ghost`, sizes via `cva`).
    - Applied to:
      - `components/ui/Card.jsx` — Home practice cards adopt
        `LiquidGlass`.
      - Onboarding voice/music selection cards: `motion.div` + inner
        button + `GlassLayers` underlay (animations and selection
        state preserved).

62. **`088a086` — "Home redesign: violet palette, liquid cards, persistent BottomNav"** (2026-05-04)
    - **Palette**: Home accents recoloured to lilac/violet `#6145c2` —
      labels (`Соратники`, `01`/`02`/`03`), durations, sun icons, play
      buttons, BottomNav active pill, `AnimatedSubscribeButton`,
      `.field-input:focus`, `ShinyButton` highlight. Tailwind token
      `violet` switched from `oklch(0.66 0.18 300)` → literal `#6145c2`.
    - **Cards** (`Card.jsx` + `index.css`): dropped the `.card-practice`
      flat fill; each card is now a `relative isolate overflow-hidden
      rounded-lg` host with three stacked layers:
      1. `<span class="liquid-card-glow">` — radial-blur drift of
         `#6145c2`, `mix-blend-mode: screen`, `liquidFloat` keyframe
         (12–18 s, random per-card phase).
      2. `<span class="liquid-card-border">` — rotating 1 px conic
         gradient border (`@property --card-angle` +
         `liquidCardAngle` 5 s linear) cut to a ring via
         `mask-composite: exclude`.
      3. backdrop-filter underlay using the global `#container-glass`
         SVG filter.
    - **Sun icon**: removed circle wrapper; rendered bare with a
      double `drop-shadow(#6145c2)` violet halo.
    - **BottomNav lifted out of pages and mounted at App root** via
      `ShouldShowNav` (`/` and `/profile` only). Active pill + glow
      are `motion.span`s with shared `layoutId`s so navigation between
      tabs interpolates the pill across the bar with a spring
      (`stiffness: 320, damping: 32, mass: 0.7`) instead of cross-
      fading the whole nav with the route. `BottomNav` removed from
      `Home/index.jsx` and `Profile/index.jsx`.
    - **Route transitions**: opacity fade duration `0.7 s` → `0.95 s`.
    - **`AnimatedSubscribeButton.jsx` created** — JSX port of the
      21st.dev animated CTA. Of the original chrome (embossed shadow
      stack, `::before` dark slab, `::after` highlight gradient,
      hover/focus brightness ramps) only the per-letter text shimmer
      and the icon flicker were kept; the rest stripped at user
      request. Wears the same violet pill as the active BottomNav tab.
      Used on Home (subscription nudge) and on Subscription
      (`generating={stage === 'loading'}`, `labelActive='Обрабатываем
      платёж'`).
    - **Fog** (`OnboardingFog` + `AppBackground`):
      - Added `uDensity` uniform + `density` prop on `OnboardingFog`.
        Home mounts `<OnboardingFog density={1.2} />`; Onboarding
        keeps default `1.0`.
      - Both shaders multiply the final `halo` by
        `0.6 + 0.4 * cos(uTime * 2π/60)` — a 60-s breathing cycle
        cancelling the natural fbm density bulge.
    - Misc: `Subscription` page replaced its primary `<Button>` with
      `<AnimatedSubscribeButton>`; `Profile` page no longer renders
      its own `<BottomNav>` (mounted globally now).

---

## Phase 13 — Pending local changes (uncommitted)

`git status --short` reports only `?? docs/` — the docs/ directory
itself is untracked (it was created during Phase 11 of the original
session and never staged). No source-code changes are pending.

---

## Phase 14 — Deep-analysis polish (this session, uncommitted)

Spec source: user-pasted requirements for «Глубокий анализ (раз в 3
дня)» — 10 questions across two blocks (ИТ, ИО), КТ math, progression
+ bonus gamification, CMS analytics hand-off.

63. **Question copy synced to spec, verbatim.** Titles renamed
    (`Тревога`→`Беспокойство`, `Тело`→`Напряжение`, `Здесь и сейчас`
    →`Момент`, `Сигналы тела`→`Телесность`, `Потребности`→`Связь
    с «Я»`). Bodies updated where the original wording differed
    (Q5 now reads «…в течение этих дней?»). Each question gets a
    `left`/`right` short anchor pair shown under the slider so 0 and
    10 mean something concrete per question.

64. **Block intros.** The transitions Q0 (Block A) and Q5 (Block B)
    open with a violet-tinted callout panel containing the spec's
    block subtitle ("Высокий балл сигнализирует о необходимости
    расслабляющего контента." / "Высокий балл подтверждает
    эффективность практик и прогресс."). Block intros animate in with
    a 150 ms delay after the slide enters.

65. **Two-track progress bar.** Replaced the single 10-segment bar
    with two 5-segment tracks (А ‖ Б) so the user always sees how
    deep into each block they are. Mono captions on either side flip
    between `А · 1/5..5/5`, `Б · 1/5..5/5`.

66. **Result screen rewritten.** New components:
    - `src/components/ui/KTGauge.jsx` — animated half-circle gauge
      (−10..+10, gradient arc + needle, 1.2 s `pathLength` reveal).
    - `src/components/ui/Sparkline.jsx` — KT-history mini-chart
      (fixed `−10..+10` domain, animated line, glowing last point).
    - `src/components/ui/CountUp.jsx` — RAF-driven number tween for
      ИТ / ИО / КТ count-ups.

    Layout: KT gauge + delta pill ("↑ +1.4 vs прошлый раз") on top;
    two side-by-side ИТ/ИО panels with progress bars and narrative
    bands (`interpretIT` / `interpretIO`); KT history sparkline; then
    unlock callouts (next awareness practice + any newly unlocked
    bonus practices). All sections animate in with framer-motion `y`
    + `opacity` cascades, easing `EASE = [0.22, 0.8, 0.36, 1]`.

67. **Locked state ("ещё рано") got a countdown ring.** Animated
    SVG circle (`pathLength` 0 → `(3 − daysUntil)/3`) with the day
    count rendered inside.

68. **Bonus eligibility reworked** to match the spec ("Положительная
    динамика КТ в течение месяца + отметки в трекере"). New
    `useProgressStore.bonusProgress()` returns
    `{ eligible, window, ktSamples, ktReq, ktAvg, trackerCount,
    trackerReq }` so the UI can render progress, not just a boolean.
    Condition: `ktSamples ≥ 2` AND `ktAvg ≥ 0.5` AND `trackerCount ≥
    6`, all measured in a 30-day window. `checkBonusEligibility()`
    becomes a thin wrapper. `unlockBonus()` now returns **only newly
    added ids** so the result screen can render one callout per new
    bonus practice (idempotent on repeat runs).

69. **Profile entry card upgraded.** Replaced the plain "Следующий
    анализ через N дней" panel with a card that has:
    - countdown ring on the left (filled when available, partial
      otherwise — same SVG approach as on the locked DA screen),
    - last-N KT sparkline,
    - bonus-progress sub-panel with two progress bars (ktSamples / 2
      and trackerCount / 6) and a one-liner explaining the rule.

70. **Auto-unlock after recording.** DeepAnalysis flow now calls
    `unlockNextPractice()` AND `unlockBonus()` immediately after
    `recordDeepAnalysis(KT)`; the returned ids are surfaced in the
    callouts. CTA copy on the final button switches to "Перейти к
    практике" when an awareness practice was just unlocked.

71. **`scoreCalc` extras**: `interpretIT`, `interpretIO` (4 narrative
    bands each); `ktDelta(currentKT, history)` for the result-screen
    delta pill. `interpretKT` now also returns a `tone`
    (`'progress' | 'grounding'`) for any future tone-driven styling.

72. **`dateHelpers.countWithinLastDays(items, n, getter)`** — generic
    "how many entries fall within the last N days" used by
    `bonusProgress()` against `trackerDays` and `ktHistory`.

73. **Docs synced**: `03-state-management.md` (new bonus condition +
    `bonusProgress()` shape), `04-components-catalog.md` (new
    KTGauge / Sparkline / CountUp entries), `09-formulas.md`
    (verbatim spec wording, anchor pairs, narrative bands,
    `ktDelta`, the bonus formula).

Build is green (`npm run build` — 1.29 MB main chunk, 374 KB gzip).
Nothing is committed yet — all changes are pending in the working
tree.

---

## Phase 15 — Dial slider, redesigned results, fog gating, live counter (this session, uncommitted)

74. **`DialSlider.jsx` (new)** — round circular slider, replaces the
    old linear `Slider` in both Checkin and DeepAnalysis flows. 330°
    arc with the gap at the bottom; 81 fine ticks; gradient violet
    fill arc + glowing knob + centre disk with big value number and
    auto-declined «балл / балла / баллов» mono caption. Drag-anywhere
    on the SVG, tap-on-number to jump. `touch-action: none` to
    prevent page scroll while dragging.

75. **Checkin questionnaire** restyled around the dial — eyebrow
    (mono uppercase block name), big serif question, "Займёт меньше
    минуты" sub, dial centred. Removed left/right textual anchors
    (the dial is unambiguous on its own).

76. **Checkin result screen** redesigned to match the user-pasted
    "Туман" reference: glowing pill chip
    («ИНДЕКС СОСТОЯНИЯ · 20/40»), state-name H1 cycling 4× then
    settling, then a state pictogram (inline SVG with violet
    `drop-shadow` halo) — one of «Шторм» / «Туман» / «Ясность» /
    «Поток» — and the interpretation copy under it. Final CTA
    (`Button` → `ShinyButton`).

77. **DeepAnalysis questionnaire** also switched to `DialSlider`.
    Per-question `left`/`right` anchor pair stayed below the dial
    (kept under "лево/право" labels because the question wording
    still benefits from a textual reminder of what 0 vs 10 means).

78. **DeepAnalysis result rewritten as a staged choreography.**
    - Stage 1 (numbers, 0–1.4 s): KT gauge animates in (1.2 s arc
      pathLength tween) and the centre count-up reaches the final
      value at ~1.35 s. ИТ / ИО panels mount at 0.05 s offset and
      their bars fill in 1.0 s. A **`PulseOnSettle` wrapper** (scale
      1 → 1.04 → 1, 540 ms) fires at the 1.3 s / 1.55 s marks for
      KT and IT/IO respectively.
    - Stage 2 (narrative, ≥ 1.5 s): interpretation panel, ИТ/ИО
      narrative bands, KT history sparkline, unlock callouts,
      `ShinyButton` CTA — each fades in via `y + opacity`, with
      delays 0.05 / 0.15 / 0.25 / 0.35 / 0.5 s after the stage flip.
    - The staging avoids the previous "everything appears at once"
      feel and lets the user track each number individually.

79. **Onboarding voice/music tiles** rebuilt as a new local
    component `<ChoiceCard>`, visually identical to the Home
    practice cards: liquid-glass surface (`liquid-card-glow` +
    `liquid-card-border` + backdrop-filter `#container-glass`) and
    the same violet-glowing play button. Removed the old
    `hover:bg-white/[0.08]` background that produced the "лиловый
    прямоугольник" hover artefact reported by the user. The unused
    `<PlayCircle>` and the `GlassLayers` import were dropped.

80. **CompanionsCounter live drift** on Home. Initial random count
    in `[COMP_MIN, COMP_MAX]` is now seeded into state; a recursive
    `setTimeout` (4–7 s wait) shifts the count by a small delta —
    `−2..−3` 45 % of the time, `+1..+4` otherwise — biasing the
    average upward. On any *increase*, a keyed `motion.div` runs a
    one-shot `scale: [1, 1.18, 1]` pulse (550 ms) for emphasis.
    Decreases update silently.

81. **Fog generation gating.** Replaced the cosine `modCycle =
    0.6 + 0.4·cos(2π t / 60)` in both `AppBackground` and
    `OnboardingFog` with a square-window `gen` factor:

    ```glsl
    float cycle = mod(uTime, 60.0);
    float gen = max(
      1.0 - smoothstep(30.0, 58.0, cycle),
      smoothstep(58.0, 60.0, cycle)
    );
    halo *= gen;
    ```

    Cadence: **30 s full ON → 28 s smooth dissipate to zero → 2 s
    ramp back**. Pattern continues to advance through `uTime`
    during the OFF half so each cycle resumes on a new fbm
    configuration (no perceived "rewind"). Spec language was
    "30 секунд on, потом рассеивается, потом снова 30 секунд on".

82. **Docs synced**:
    - `04-components-catalog.md` — new `DialSlider` paragraph with
      drag/tap mechanics, inputs, geometry.
    - `05-shaders.md` — replaced the cosine modCycle paragraph in
      both `AppBackground` and `OnboardingFog` sections with the
      new gating-window description (formula included).

Build green (`npm run build` — 1.29 MB main, 367 KB gzip after the
swap; ~7 KB net delta from new SVG components and dial logic).

---

## Phase 16 — Polish round (this session, uncommitted)

83. **ShinyButton: removed the "lilac rectangle" hover artefact.**
    The `.shiny-cta span::before` rule (`box-shadow: inset 0 -1ex
    2rem 4px var(--shiny-cta-highlight)` running the `breathe`
    keyframe, lifted to `opacity: 1` on `:hover/:focus-visible`) was
    surrounding the label with a violet rounded rectangle on
    pointer-fine devices. Dropped the entire `span::before` block
    (and its `:hover/:focus-visible … span::before { opacity: 1 }`
    rule). Conic-gradient border + diagonal shimmer are kept.

84. **Onboarding ChoiceCard: removed `backdrop-filter: url(#container-glass)`.**
    The SVG turbulence/displacement filter was visibly painting white
    "wave" ghosts on the empty surface around the voice/music tiles
    (no dense fog behind them like there is on Home). Voice tiles
    now have `liquid-card-glow` + `liquid-card-border` + dark fill
    only — same play button, same selected check.

85. **DialSlider: orientation fix + viewBox padding.** Original
    `START_DEG = 255` produced a dial where 5 landed at the bottom
    (clipped) and the 0/10 gap was at the top. Re-derived the
    geometry with `pointAt(cx, cy, r, deg) = (cx + r·cos, cy +
    r·sin)` interpreted in SVG y-down coordinates (sin>0 ⇒ below
    centre):
    - `START_DEG = 105` (lower-left), `SPAN_DEG = 330` (unchanged)
    - increasing angle ⇒ visual CW ⇒ SVG arc `sweep=1`
    - v=0 → 105°, v=5 → 270° (top apex), v=10 → 75° (lower-right)
    - viewBox padded by 32 on every side and SVG `overflow: visible`
      so the outer number labels don't clip the «5» at the bottom

    Rewrote `valueRatioForAngle()` for the new convention. Drag
    handler now also accounts for the padded viewBox when mapping
    pointer coords.

86. **DialSlider: smooth motion + pulse glow + animated centre digit.**
    - **Smooth arc/knob motion**: new `useSmoothValue` hook tweens
      the displayed value from prev → current over 260 ms with an
      ease-out cubic curve. Geometry (knob + fill arc + tick highlights)
      uses the smoothed value, so the dial slides instead of snapping
      between integer steps.
    - **Pulsing glow on the active arc**: an extra wider `motion.path`
      sits underneath the gradient arc with a stronger blur filter
      (`stdDeviation = 14`) and tweens opacity `0.18 ↔ 0.42` on a
      2.6 s ease-in-out infinite loop. Also a knob halo
      (`motion.circle r = knobR + 6`) pulses opacity and scale.
    - **Centre number animation**: keyed `motion.text` inside an
      `AnimatePresence mode="popLayout"` — each digit change exits
      downward+blurred and the new one enters from above+blurred
      (320 ms each). The integer caption auto-declines via the
      existing `declineBalov` helper.
    - Suppress the degenerate dot at value=0 by gating the fill arc
      on `traversed > 0.4` degrees.

87. **Checkin result icons: highlight pulse → steady breathing glow.**
    Added two CSS keyframes in `index.css`:
    - `stateIconHighlight` (1.4 s ease-out forwards): brightens the
      `drop-shadow` filter and scales 0.92 → 1.08 → 1 in a single
      reveal pulse.
    - `stateIconBreathe` (4 s ease-in-out infinite, delayed 1.4 s):
      slow opacity-driven `drop-shadow` swell that loops forever.

    `.state-icon-reveal` chains both with the comma syntax. Applied
    to the «Шторм / Туман / Ясность / Поток» pictograms on the
    Checkin result screen, gated on `phase === 'settled'` so the
    pulse fires precisely when the icon mounts.

Build green after the polish round (`npm run build` — 367.6 KB gzip
main, +0.3 KB delta; mostly the new icon keyframes).

---

## Phase 17 — Centring + result enter animation (this session, uncommitted)

88. **Dial locked to the centre of the question step.** In Checkin
    and DeepAnalysis the slide's `motion.div` got
    `absolute inset-0 flex flex-col`, and the dial's wrapper turned
    into `flex flex-1 items-center justify-center`. Result: the
    eyebrow + question + sub stay at the top of the available space,
    the dial fills the rest and is always vertically + horizontally
    centred — independent of question wrapping or whether a Block A/B
    intro callout is present (DeepAnalysis Q1, Q5).

89. **DeepAnalysis result: enter animation rewritten.** Replaced the
    parent `variants={resultParent} initial="hidden" animate="visible"`
    cascade with explicit per-section `initial` + `animate` reveals
    via a small `reveal(delay)` helper:

    ```js
    const reveal = (delay) => ({
      initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
      transition: { duration: 0.85, ease: EASE, delay },
    })
    ```

    Sections come in at `delay = 0 / 0.18 / 0.32 s`; the IT/IO bar
    fills got bumped to delays `0.7 / 0.8 s` so they kick in only
    after the panels themselves finish blurring in. Stage 2
    (narrative + sparkline + callouts + CTA) still gates on the
    1.5 s `setTimeout` `stage` flip, fading in via its existing
    explicit `motion.div initial/animate` chain.

    The variants approach was rendering the content already at the
    final state on first mount in some cases (no perceptible enter),
    which matched the user report «не имеет сейчас анимации
    появления». Explicit per-element `initial` always plays.

---

## Phase 18 — New shared deploy target (this session)

90. **Bootstrapped a new VPS** at `212.43.148.208` (Ubuntu 22.04,
    Node 22 preinstalled). The box is **shared** with another
    agent's project — its Next.js process already occupies port 80
    (`next-server (v1...)` per `ss -tlnp`).

91. **Modular Caddy layout.** Installed Caddy 2.11.2; main
    `/etc/caddy/Caddyfile` is just `import /etc/caddy/sites/*.caddy`,
    and our site lives in `/etc/caddy/sites/meditation.caddy`
    listening on `:8081`. Each project owns one fragment, no one
    overwrites the other's config, both can `systemctl reload caddy`
    independently.

92. **Cloned + built + served.** `git clone --depth 1` of `main`
    @ `d631649` to `/opt/meditation-app`, `npm ci` + `npm run build`
    (1.27 MB main, 369 KB gzip). Caddy validate passed, `systemctl
    enable && restart caddy` brought it up. External `curl -I` from
    the dev mac returned `HTTP/1.1 200 OK Server: Caddy` for
    `http://212.43.148.208:8081/`.

93. **Docs updated**: `docs/10-deploy.md` rewritten around the new
    box (modular Caddy, port 8081, shared-host story, updated deploy
    procedure). `docs/README.md` quick-link points to the new URL.
