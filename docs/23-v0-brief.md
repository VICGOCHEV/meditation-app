# V0.dev Brief — Meditation Landing Page

> Прикладываемые файлы вместе с этим брифом:
> 1. `docs/22-landing-structure.md` — структура секций и тексты
> 2. `Design System.html` — токены, кнопки, карточки v0.2
> 3. `docs/v0-AmorphSphere.tsx` — фирменный шейдер-сфера (Hero, Final)
> 4. `docs/v0-AppBackground.tsx` — глобальный фон с фбм-дымом (база)
> 5. `docs/v0-OnboardingFog.tsx` — слой густого фиолетового тумана поверх
> 6. `docs/v0-ShinyButton.tsx` — фирменная CTA-кнопка
>
> Задача V0.dev — собрать одностраничный лендинг по структуре из (1),
> используя визуал из (2), с компонентами (3-6) — без подмены на
> "похожие" аналоги.

---

## 1. Стек

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS**
- `framer-motion` для появлений секций при скролле
- `@react-three/fiber` + `three` — уже нужны для AmorphSphere (компонент готов, см. приложенный файл)
- Без shadcn/ui для кнопок-CTA — берём фирменную `ShinyButton` (приложена)
- Шрифты через `next/font/google`: **Manrope** (200/300/400/500) и **JetBrains Mono** (400/500)

---

## 2. Бренд-токены (Tailwind)

Добавь в `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      bg: { 0: '#0a0714', 1: '#110c20', 2: '#1a1330', 3: '#231a42' },
      fg: { 0: '#f4f0ff', 1: '#d9d2f0', 2: '#a99ecb', 3: '#6e6290', 4: '#463e62' },
      line: 'rgba(180,160,255,0.09)',
      violet: { DEFAULT: '#6145c2' },
      lilac:  { DEFAULT: 'oklch(0.78 0.12 312)' },
    },
    fontFamily: {
      sans:    ['var(--font-manrope)',  'system-ui', 'sans-serif'],
      display: ['var(--font-manrope)',  'system-ui', 'sans-serif'],
      mono:    ['var(--font-jetbrains)', 'monospace'],
    },
    backgroundImage: {
      'night-sky':
        'radial-gradient(900px 600px at 85% -200px, oklch(0.35 0.18 290 / 0.45), transparent 60%),' +
        'radial-gradient(700px 500px at -200px 40%, oklch(0.30 0.16 270 / 0.35), transparent 60%),' +
        '#0a0714',
    },
    boxShadow: {
      glow: '0 0 60px -10px oklch(0.66 0.18 300 / 0.55)',
      'btn-primary':
        '0 10px 30px -10px oklch(0.55 0.22 295 / 0.6), inset 0 1px 0 rgba(255,255,255,.2)',
    },
  },
},
```

**Глобальный фон страницы (важно — это два слоя шейдера, не CSS):**

В `app/layout.tsx` смонтируй оба компонента ОДИН раз — они fixed inset-0 за всем контентом:

```tsx
import AppBackground from '@/components/AppBackground'
import OnboardingFog from '@/components/OnboardingFog'

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="text-fg-0 antialiased">
        <AppBackground />              {/* z=-10, opaque #11101a + halo */}
        <OnboardingFog density={1.0} /> {/* z=-5,  прозрачный фиолетовый дым */}
        <CursorTrail />                 {/* поверх всего */}
        <main className="relative">{children}</main>
      </body>
    </html>
  )
}
```

Без них лендинг будет «плоский» и потеряет атмосферу. CSS-градиент `bg-night-sky` из конфига выше — это только fallback на случай, если WebGL не поддерживается.

---

## 3. Шрифты (типографика)

| Применение | Шрифт / вес | Размер |
|---|---|---|
| Заголовки Hero / финальный CTA | Manrope 200 | 64-72px (mobile 48px) |
| Заголовки секций | Manrope 200 | 40-48px |
| Body / подзаголовки | Manrope 300 | 18-20px |
| UI / кнопки | Manrope 500 | 16px |
| Eyebrow-метки, мелкий мono | JetBrains Mono 400, **uppercase**, letter-spacing 0.18em | 12px |

Все заголовки — `text-fg-0`. Body — `text-fg-1`. Подписи под body — `text-fg-2` или `text-fg-3`. Акцент-цвет — `text-lilac` (для eyebrow в hover/active и для подсветки).

---

## 4. Структура — строго из 22-landing-structure.md

Не выдумывай порядок, не объединяй секции, не сокращай тексты. **9 секций по порядку**:

1. **Hero** — AmorphSphere слева/сверху, текст справа/снизу. На моб — sphere сверху.
2. **Манифест** — 3 фразы, появляются по очереди blur+y при скролле.
3. **Что внутри** — 3 карточки в столбик (стили см. ниже).
4. **Как это работает** — 4 шага вертикальной линией с пульсирующими точками.
5. **Голос и звук** — 2 колонки (моб — стек).
6. **Тариф** — одна карточка-минимализм.
7. **FAQ** — accordion, 4 вопроса.
8. **Финальный CTA** — снова AmorphSphere фоном, текст + ссылки TG/VK.
9. **Подвал** — мелкий mono.

Все тексты — копи-паст из `22-landing-structure.md`.

---

## 5. Hero и Финальный CTA — AmorphSphere

**Hero (desktop)**: AmorphSphere занимает левые 55% экрана, текст — правые 45%. На моб — sphere 65vh сверху, текст под ней. Sphere — `<AmorphSphere />` из `v0-AmorphSphere.tsx`, ставится в **абсолютный контейнер** с `inset-0`, **без обрезаний** (overflow visible).

**Финальный CTA**: AmorphSphere — полноэкранный фон с opacity 0.75, текст и кнопка по центру поверх через `relative z-10`.

Не подменяй AmorphSphere на градиент / Spline / CSS-blob — это **главный визуальный якорь бренда**, шейдер уже готов и работает.

### Локальное усиление тумана в Манифесте (секция 2)

В дополнение к глобальному `<OnboardingFog density={1.0} />` из layout, в секции «Манифест» нужно ощущение, что фразы плывут сквозь более густую дымку. Два варианта (выбирай первый):

1. **Просто увеличить density глобального fog** через React-стейт по `IntersectionObserver`: когда секция в viewport — `density=1.5`, иначе `1.0`. Плавный transition через requestAnimationFrame lerp.
2. **Локальный второй слой** — внутри секции `<OnboardingFog density={0.8} />` в `position:absolute inset-0` (но тогда 2 канваса одновременно — тяжелее на моб).

Тот же приём — для секции «Финальный CTA» (`density=1.2`), чтобы атмосфера была плотнее, чем в обычных секциях.

---

## 6. Карточки «Что внутри» (секция 3)

Используем стиль `card-practice` из Design System.html v0.2 — за-glow ореол + крутящийся conic-gradient бордер. Если в V0 это сложно — fallback такой:

```tsx
<div className="relative rounded-2xl border border-line bg-bg-1/60 backdrop-blur-md p-7
                shadow-glow transition-all hover:border-violet/40 hover:-translate-y-0.5">
  {/* halo behind card */}
  <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 blur-xl
                  bg-gradient-to-br from-violet/30 via-transparent to-lilac/20" />
  <div className="relative">
    <p className="font-mono text-xs uppercase tracking-[0.18em] text-fg-3">01 · СТАРТ</p>
    <h3 className="mt-2 text-2xl font-light text-fg-0">ВХОД В РАССЛАБЛЕНИЕ</h3>
    <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-lilac">Точка тишины</p>
    <div className="my-5 h-px w-12 bg-line" />
    <p className="text-fg-1 leading-relaxed">3 практики, доступные сразу…</p>
  </div>
</div>
```

Между карточками — 24px gap. На десктопе — 1 колонка max-width 720px по центру (не сетка 3 в ряд — это не landing-page для SaaS, а медитативное полотно, см. Calm/Headspace).

---

## 7. Кнопки

- **Главные CTA** (Hero «Начать», Тариф «Получить ключи к жизни», Финал «Присоединиться») — `<ShinyButton>` из приложенного файла. Внутри `<span>Текст</span>`.
- **Ссылки в подвале и FAQ** — простой `<a>` с `text-fg-2 hover:text-lilac transition-colors underline-offset-4 hover:underline`.

Не делай вторичных «outline» кнопок. Если нужно второе действие — ссылка-текст.

---

## 8. Анимации

- **Появление секций** (framer-motion):
  ```tsx
  initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
  ```
- **Манифест** — 3 фразы со staggered delay 0.4с между ними.
- **Шаги "Как это работает"** — точки на линии слева пульсируют (`animate-pulse` или ручной keyframe), фразы появляются по очереди.

---

## 9. **КАСТОМНЫЙ КУРСОР С ШЛЕЙФОМ** ⭐

Это **обязательный визуальный wow-элемент**. Сделай:

- Обычный курсор скрыт на всём `<main>` (`cursor: none`).
- Поверх — кастомный курсор-точка: маленький лиловый круг **8-10px** с soft glow (`#6145c2` + box-shadow).
- За ним — **шлейф из 12-16 частиц**, каждая следующая лагает за предыдущей с easing (тип "smooth chase"), уменьшается в размере и затухает в прозрачность к хвосту.
- Цвет шлейфа — градиент от `#6145c2` (head) к `oklch(0.78 0.12 312)` (lilac) до transparent.
- При hover над интерактивным (`button`, `a`, `.shiny-cta`) — головная точка **раздувается до 28-32px** с blur, шлейф чуть замедляется.
- При движении быстрее N px/sec — шлейф растягивается сильнее (motion blur эффект).
- Курсор и шлейф используют `mix-blend-mode: screen` или `lighten` — чтобы красиво ложились на тёмный фон и поверх AmorphSphere.
- **На мобильных и тач-устройствах** — отключи через `@media (hover: hover) and (pointer: fine)`. Не ломай тач-скролл.

Реализуй через `requestAnimationFrame` + `transform: translate3d()` (никаких `top/left` — для GPU). Шлейф — массив точек в state, каждая лагает с коэффициентом 0.15-0.25 от предыдущей.

Если хочется референса — это похоже на курсор на сайтах **studio.bullion** / **wisr.studio** / типичный «liquid trail», но в нашей лиловой палитре.

---

## 10. Что НЕ делай

- Не подсовывай Hero-картинку / Spline-сцену / lottie вместо AmorphSphere.
- Не используй generic blue/teal градиенты — только лиловый/индиго (`#6145c2`, lilac).
- Не делай таблицы тарифов — у нас один тариф, одна карточка.
- Не добавляй "Trusted by" / "10,000+ users" / логотипы клиентов — это медитативный продукт, не SaaS.
- Не делай sticky-навбар с пунктами меню — только лёгкий floating-logo сверху-слева (mono, "MEDITATION · 2026") и опционально маленькая кнопка "Войти" сверху-справа.
- Не плодь иконки — за исключением галочек ✓ в списке тарифа и TG/VK иконок в финальном CTA.

---

## 11. SEO / meta

```tsx
export const metadata = {
  title: 'Meditation — твой путь к внутренней тишине',
  description: 'Цифровое пространство замедления. Практики осознанности, дыхание, трекер состояния. 7 дней бесплатно.',
  openGraph: {
    title: 'Meditation — твой путь к внутренней тишине',
    description: 'Цифровое пространство замедления.',
    images: ['/og.png'], // отрендерим отдельно
  },
}
```

---

## 12. Что прислать в результате

1. `app/page.tsx` — главная страница со всеми 9 секциями.
2. `app/layout.tsx` — шрифты, монтирование `AppBackground` + `OnboardingFog` + `CursorTrail` глобально.
3. `components/AmorphSphere.tsx` — оставь как есть (из приложенного файла).
4. `components/AppBackground.tsx` — оставь как есть (из приложенного файла).
5. `components/OnboardingFog.tsx` — оставь как есть (из приложенного файла).
6. `components/ShinyButton.tsx` — оставь как есть (из приложенного файла).
7. `components/CursorTrail.tsx` — твоя реализация курсора с шлейфом.
8. `tailwind.config.ts` — с расширенной палитрой.
9. `app/globals.css` — `html, body { background: #11101a; color: #f4f0ff; }` + `main { cursor: none; }` (только на десктопе).

Всё остальное — твоё творчество в рамках брифа. Главный критерий — **ощущение тишины и пространства**, не «продающего лендинга».
