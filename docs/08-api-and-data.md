# 08 — API & data

## Mock-mode switch

`src/api/client.js`:

```js
export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL
```

`.env` ships with `VITE_USE_MOCK=true`, so the entire app runs without a
backend. `VITE_API_URL` defaults to `http://localhost:3000/api`.

The axios instance:

```js
api = axios.create({ baseURL: VITE_API_URL ?? '/api', timeout: 10000 })
api.interceptors.request.use(c => {
  const token = localStorage.getItem('auth_token')
  if (token) c.headers.Authorization = `Bearer ${token}`
  return c
})
```

`delay(ms)` is a tiny `setTimeout` Promise wrapper, used to simulate
latency in mock paths.

## Modules

### `src/api/auth.js`

| Function | Mock behaviour | Real route |
|---|---|---|
| `login({ identifier, password })` | 400 ms delay; throws if either missing; returns `{ token: 'mock_token_<ts>', user }`. | `POST /auth/login` |
| `register({ identifier, password })` | 400 ms; returns `{ ok: true, challengeId }`. | `POST /auth/register` |
| `verifyCode({ code })` | 400 ms; throws if code length ≠ 6; returns `{ token, user }`. | `POST /auth/verify` |
| `resetPassword({ identifier })` | 400 ms; returns `{ ok: true }`. | `POST /auth/reset` |

### `src/api/practices.js`

| Function | Mock behaviour | Real route |
|---|---|---|
| `fetchPractices()` | 100 ms; returns `mockPractices`. | `GET /practices` |
| `fetchPractice(id)` | 100 ms; returns `findPractice(id)`. | `GET /practices/:id` |
| `completePractice(id)` | 120 ms; returns `{ ok: true, id }`. | `POST /practices/:id/complete` |

### `src/api/checkin.js`

| Function | Mock | Real |
|---|---|---|
| `postCheckin(payload)` | 120 ms; echoes payload. | `POST /checkin` |
| `postDeepAnalysis(payload)` | 150 ms; echoes payload. | `POST /deep-analysis` |

### `src/api/subscription.js`

| Function | Mock | Real |
|---|---|---|
| `createSubscription()` | 1.2 s delay; **8 % random failure** (`new Error('Оплата не прошла')`) so the error UI is testable; returns `{ ok: true, expiresAt: now+30d }`. | `POST /subscription` |
| `cancelSubscription()` | 200 ms. | `DELETE /subscription` |

## Mock catalogue — `src/api/mock.js`

```js
mockPractices = {
  relaxation: [
    { id:'r1', title:'Дыхание 4-7-8',          duration:'10 мин', block:'relaxation' },
    { id:'r2', title:'Сканирование тела',      duration:'15 мин', block:'relaxation' },
    { id:'r3', title:'Пауза посреди дня',      duration:'7 мин',  block:'relaxation' },
  ],
  awareness: [
    { id:'a1', title:'Осознанность: начало',   duration:'15 мин', block:'awareness' },
    { id:'a2', title:'Наблюдатель',            duration:'20 мин', block:'awareness' },
    { id:'a3', title:'Мысли как облака',       duration:'18 мин', block:'awareness' },
    { id:'a4', title:'Внутренняя тишина',      duration:'22 мин', block:'awareness' },
    { id:'a5', title:'Присутствие',            duration:'25 мин', block:'awareness' },
    { id:'a6', title:'Глубокое погружение',    duration:'30 мин', block:'awareness' },
  ],
  author: [
    { id:'au1', title:'Авторская: Поток',      duration:'20 мин', block:'author', price:'290 ₽' },
    { id:'au2', title:'Авторская: Источник',   duration:'25 мин', block:'author', price:'290 ₽' },
  ],
}
findPractice(id) → first match across all three arrays.
mockAudioUrl = 'https://cdn.jsdelivr.net/gh/anars/blank-audio@master/10-minutes-of-silence.mp3'
```

Howler points to `mockAudioUrl` for every practice — 10 minutes of
silence so playback flow is testable end to end.

## Switching to a real backend

1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=https://api.example.com` in
   the environment used at build time.
2. Implement the routes above with the same JSON shape.
3. The token returned by `login` / `verifyCode` is auto-attached to
   subsequent requests through the axios interceptor.

The frontend never branches on real/mock at the call-site — every API
function decides internally based on `USE_MOCK`. So no caller needs to
change.
