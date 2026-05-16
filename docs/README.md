# Meditation App — Documentation

Snapshot of the project as of this Claude Code session
(Apr 27, 2026, commit `bb98a33` + uncommitted shiny-cta + LiquidGlass work).

## Reading order

Start at the top and stop when you have what you need.

| File | What's in it |
|---|---|
| [01-architecture.md](01-architecture.md) | Stack, repo layout, what each file is responsible for. |
| [02-routes-and-flow.md](02-routes-and-flow.md) | Routing, `AuthGate`, `Preloader` gate, route transitions. |
| [03-state-management.md](03-state-management.md) | All four Zustand stores with fields, actions, persistence. |
| [04-components-catalog.md](04-components-catalog.md) | UI + domain components with props and where they're used. |
| [05-shaders.md](05-shaders.md) | The five GLSL shader components and how they cooperate. |
| [06-design-tokens.md](06-design-tokens.md) | Palette, typography, spacing, radii, shadows, fonts. |
| [07-animations.md](07-animations.md) | framer-motion patterns, route + slide transitions, Lenis. |
| [08-api-and-data.md](08-api-and-data.md) | Mock API contracts, switching to real backend. |
| [09-formulas.md](09-formulas.md) | ИС / ИТ / ИО / КТ formulas and copy. |
| [10-deploy.md](10-deploy.md) | Production server, Caddy, GitHub Actions-less flow. |
| [11-spec-status.md](11-spec-status.md) | Spec compliance vs. contract VC-26-013 — what's done, partial, or still left. |
| [12-client-questions.md](12-client-questions.md) | Internal: questions and asset requests to send the client before starting the remaining work. |
| [13-client-brief.md](13-client-brief.md) | Clean Russian brief for the client — locked decisions + what to send back + step-by-step TG/VK/MAX setup. |
| [14-work-plan.md](14-work-plan.md) | Plan with green/yellow/red blockers per stream — what we can do without the client. |
| [15-strapi-implementation-log.md](15-strapi-implementation-log.md) | Live rollout log for the Strapi CMS deployment. |
| [16-cms-guide-for-client.md](16-cms-guide-for-client.md) | Russian how-to for the client on uploading practices / voice / music via the Strapi admin. |
| [99-session-changelog.md](99-session-changelog.md) | Chronological log of every iteration in this session. |

## Quick links

- **Live (production):** http://188.137.177.136/ — current dedicated box (older 212.43.148.208:8081 and 89.105.213.173 may still be up as archives)
- **CMS admin:** http://188.137.177.136/admin (Strapi default path; public API is at /cms/api/*)
- **Local dev:** http://localhost:5173/
- **Repo:** https://github.com/VICGOCHEV/meditation-app
- **Brief:** `/Users/eblan/Desktop/MED/BRIEF.md`
- **Original Claude Design output (HTML/CSS prototype):** `/tmp/design-bundle/meditation-app/project/Design System.html`

## TL;DR

Vite + React 18 SPA, Tailwind for the layout/utility layer, Zustand for state,
Framer Motion + Lenis for motion, Howler for audio, Three.js + R3F for the
five GLSL shaders that drive the visual identity. Mobile-first, 480 px
content column, BottomNav with safe-area padding. Mock-mode API
(`VITE_USE_MOCK=true`) so the app runs without a backend. Deployed on a
Hetzner-class VPS (Ubuntu 22.04) behind Caddy 2 on port 80; no domain yet.
