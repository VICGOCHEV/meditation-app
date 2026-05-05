# 09 — Score formulas & interpretations

All implemented in `src/utils/scoreCalc.js`.

## ИС (Индекс Состояния) — daily Checkin

```
ИС = q1 + q2 + q3 + q4         // 0..40
```

| Range | State | Copy |
|---|---|---|
| 0..10  | **Шторм**   | «Твой ментальный шум сейчас на пике. Это нормально. Давай просто подышим 5 минут, не ставя никаких целей» |
| 11..20 | **Туман**   | «Похоже, мысли о будущем или прошлом немного заслоняют настоящий момент. Практика поможет вернуть ясность» |
| 21..30 | **Ясность** | «Хороший контакт с телом и умеренный уровень мыслей. Отличная база, чтобы углубить состояние» |
| 31..40 | **Поток**   | «Ты в глубоком контакте с собой. Сегодняшняя практика станет для тебя не просто отдыхом, а настоящим исследованием» |

Implemented as `interpretIS(score)` returning `{ state, text }`.

## Deep analysis indices

```
ИТ = (q1 + q2 + q3 + q4 + q5) / 5     // 0..10  — Anxiety
ИО = (q6 + q7 + q8 + q9 + q10) / 5    // 0..10  — Awareness
КТ = ИО - ИТ                          // -10..+10
```

`interpretKT(kt)`:

| `kt` | Copy | Emoji | `tone` |
|---|---|---|---|
| `> 0`  | «Твоя осознанность растёт. Мысли о будущем стали тише» | 🌱 | `progress` |
| `<= 0` | «Сейчас время заземления. Практика поможет стабилизировать состояние» | 🌿 | `grounding` |

`interpretIT(it)` — narrative band for the standalone Anxiety index
(used under the IT count-up on the result screen):

| `it` | Copy |
|---|---|
| `>= 7.5` | Высокая тревожность — нужен расслабляющий контент |
| `>= 5`   | Заметный фон — практики дыхания дадут опору |
| `>= 2.5` | Низкий фон тревоги |
| else     | Тревога почти отсутствует |

`interpretIO(io)` — narrative band for Awareness:

| `io` | Copy |
|---|---|
| `>= 7.5` | Глубокая осознанность — практики работают |
| `>= 5`   | Уверенный контакт с настоящим |
| `>= 2.5` | Внимание ещё рассеяно — продолжай |
| else     | Осознанность только просыпается |

`ktDelta(currentKT, history)` — `currentKT − history.at(-1).kt`,
rounded to two decimals; returns `null` if the history is empty. Used
to render the "↑ +1.4 vs прошлый раз" pill on the result screen.

## Bonus eligibility (CMS-tracked transformation)

Implemented in `useProgressStore.bonusProgress()` (and the thin
`checkBonusEligibility()` wrapper that returns just the boolean).

```
window = 30 days
ktSamples       = recent KT entries within the window
ktAvg           = mean of those KT values
trackerCount    = countWithinLastDays(trackerDays, 30)

eligible := ktSamples ≥ 2 AND ktAvg ≥ 0.5 AND trackerCount ≥ 6
```

When `eligible`, calling `unlockBonus()` adds `['au1', 'au2']` to
`bonusUnlocked` (idempotent) and returns the **newly added** ids only.
Both DeepAnalysis (after recording the new entry) and Profile (visual
progress hint) read the full progress object via
`useProgression().bonus`.

## Date helpers — `src/utils/dateHelpers.js`

| Function | Notes |
|---|---|
| `todayISO()` | `new Date().toISOString().slice(0, 10)` |
| `isToday(d)` | compares ISO date prefix |
| `daysSince(d)` | `floor((now - d) / DAY)`; `Infinity` for null |
| `daysUntil(d)` | `ceil((d - now) / DAY)`, clamped at 0 |
| `canDoDeepAnalysis(lastDate)` | true if no last date or ≥ 3 days passed |
| `formatRuDate(d)` | Russian short month: «15 мая 2026» |
| `consecutiveStreak(dates)` | Walks today, today-1, … in `Set`-membership; returns count. |
| `monthGrid(year, month)` | 7×6 grid (42 days, Mon-first) `{ iso, day, inMonth }`. |

## Question text (canonical Russian)

### Daily checkin (`Checkin/index.jsx`)

| # | Title | Question | Left → Right |
|---|---|---|---|
| 1 | Прошлое | Насколько сильно мысли о прошлом отвлекают тебя сейчас? | 0 — совсем нет / 10 — постоянно там |
| 2 | Будущее | Как часто ты ловишь себя на тревожном планировании? | 0 — живу моментом / 10 — живу в «завтра» |
| 3 | Беспокойство | Оцени свой текущий уровень фонового беспокойства | 0 — абсолютное спокойствие / 10 — сильная тревога |
| 4 | Тело | Чувствуешь ли ты физическое напряжение в плечах, лице или животе? | 0 — тело расслаблено / 10 — всё сковано |

### Deep analysis (`DeepAnalysis/index.jsx`)

**Block A — Anxiety (ИТ)** — *«Высокий балл сигнализирует о
необходимости расслабляющего контента.»*

1. **Прошлое** — Насколько навязчивыми были мысли о прошлом в последние 3 дня? *(не отвлекали → постоянно)*
2. **Будущее** — Как часто фокус смещался на тревожное ожидание будущего? *(жил в моменте → жил в «завтра»)*
3. **Беспокойство** — Оцени средний уровень тревоги за этот период. *(спокойствие → сильная тревога)*
4. **Критик** — Насколько громко звучал твой «внутренний критик» в эти дни? *(тихо → оглушительно)*
5. **Напряжение** — Заметил(а) ли ты физическое напряжение в теле (челюсть, плечи) в течение этих дней? *(тело свободно → всё сковано)*

**Block Б — Awareness (ИО)** — *«Высокий балл подтверждает
эффективность практик и прогресс.»*

6.  **Момент** — Удавалось ли тебе возвращать внимание в «здесь и сейчас» во время рутинных дел? *(почти нет → постоянно)*
7.  **Тишина** — Насколько часто ты ощущал(а) состояние «внутренней тишины»? *(не было → часто)*
8.  **Телесность** — Насколько хорошо ты чувствуешь сигналы своего тела (зажимы, тепло, пульсацию)? *(тело молчит → ясные сигналы)*
9.  **Восстановление** — Оцени свою способность быстро возвращать спокойствие после стресса. *(долго → мгновенно)*
10. **Связь с «Я»** — Насколько ты чувствуешь связь со своими истинными потребностями сегодня? *(потерян(а) → ясно слышу)*

The italic anchor pairs are rendered under the slider (left → right) so
the scale is unambiguous per question.
