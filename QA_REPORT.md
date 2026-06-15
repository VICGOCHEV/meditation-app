# QA report: пользовательские сценарии и минимальные правки

Дата проверки: 2026-06-03

Проверка выполнена по коду проекта без исправления приложения. Ниже — что найдено, как воспроизвести и какой минимальный фикс нужен, чтобы сценарии были стабильнее в production.

## Критичные и важные баги

| Приоритет | Сценарий | Статус | Файл / роут | Что найдено | Как воспроизвести | Минимальный фикс |
|---|---|---|---|---|---|---|
| P1 | Пользовательский API-клиент | Bug | `application/src/api/client.js` | Если `VITE_API_URL` не задан, приложение автоматически включает `USE_MOCK`. В production без env можно получить mock-login, mock-payment и fake progress вместо реального backend. | Собрать приложение без `VITE_API_URL`, попробовать login/register/payment. | Включать mock только через `VITE_USE_MOCK=true`; `baseURL` оставить `/api` по умолчанию. |
| P1 | CMS feedback | Bug | `cms/src/pages/Feedback.jsx`, `cms/src/ui/Toast.jsx` | Страница вызывает `toast.error(...)`, но ToastProvider предоставляет только `toast.err(...)` и `toast.ok(...)`. При ошибке API обработчик сам падает. | Сломать `/admin/feedback` или PATCH статуса feedback. | Заменить `toast.error` на `toast.err`. |
| P1 | CMS push phrases | Bug | `cms/src/pages/PushPhrases.jsx`, `cms/src/ui/Toast.jsx` | Страница вызывает `toast.success(...)` / `toast.error(...)`, которых нет. CRUD фраз может падать после успешного API или при ошибке. | Создать, удалить, включить/выключить фразу или вызвать ошибку API. | Заменить `toast.success` на `toast.ok`, `toast.error` на `toast.err`. |
| P1 | Глубокий анализ | Bug | `application/src/pages/DeepAnalysis/index.jsx` | Финальный submit не имеет `loading`, `try/catch` и error state. При 401/500 пользователь остается на последнем вопросе без объяснения. | Сломать `/api/deep-analysis`, пройти 10 вопросов, нажать финальную кнопку. | Обернуть `recordAnalysis(...)` в `try/catch`, добавить `submitting` и inline error. |
| P1 | Check-in | Bug | `application/src/store/useCheckinStore.js` | При ошибке `/api/checkin` пользователь локально считается прошедшим check-in, но backend запись теряется. | Отключить сеть, завершить check-in, затем открыть профиль/админку. | Либо показывать ошибку и не завершать сценарий, либо сохранять pending sync и ретраить. |
| P1 | Завершение практики | Risk | `application/src/store/useProgressStore.js` | При ошибке `/api/practices/:id/complete` прогресс локально отмечается, API ошибка скрывается. В production прогресс может не сохраниться. | Отключить сеть, дослушать практику до конца. | Добавить сообщение “не удалось синхронизировать” и retry/pending sync. |
| P2 | Регистрация | Bug | `application/src/pages/Auth/Register.jsx`, `backend/src/routes/auth.js` | Regex пароля на фронте и backend не совпадают. UI требует цифру, backend допускает цифру или символ. | Ввести пароль `Password!`: backend принял бы, UI блокирует. | Синхронизировать правило и подсказки: “буква + цифра/символ” или ужесточить backend до цифры. |
| P2 | Подписка / YooKassa | Risk | `application/src/pages/Subscription/index.jsx` | После `widget.success` приложение показывает success даже если `loadFromServer()` упал. Если webhook задержался или не активировал подписку, пользователь увидит ложный успех. | Смоделировать success виджета при недоступном `/progress`. | После success показывать “проверяем оплату” и подтверждать активную подписку; при неопределенности дать retry. |
| P2 | Практики из CMS | Risk | `application/src/pages/Home/index.jsx` | Ошибка загрузки CMS тихо проглатывается, остаются mock-практики. Пользователь не видит, что реальные данные не загрузились. | Сломать `/api/content/practices`. | Добавить явный error/empty state или пометить fallback как dev-only. |
| P2 | CMS Practice Editor | Risk | `cms/src/pages/PracticeEditor.jsx`, `cms/src/ui/AudioCell.jsx` | UI помечает music1 как обязательную, но publish не блокирует практику без обязательных дорожек. | Создать практику без audio music1, нажать “Опубликовать”. | Перед publish валидировать required audio cells. |
| P2 | Пользовательский 401 | Risk | `application/src/api/client.js` | В пользовательском app нет response interceptor для 401. CMS токен чистит, app — нет. Часть 401 превращается в скрытый fallback. | Использовать протухший JWT и открыть protected API сценарии. | Добавить interceptor: при 401 чистить auth store и редиректить на login/onboarding. |
| P3 | Root lint | Bug | `package.json`, `application/package.json` | `npm run lint` в корне вызывает `cd application && npm run lint`, но в application нет `lint` script. | Запустить `npm run lint`. | Добавить lint script в `application` или поправить root script. |

## Карта пользовательских сценариев

| Область | Роуты / компоненты | Сценарии | Статус |
|---|---|---|---|
| App auth | `/onboarding`, `/auth/login`, `/auth/register`, `/auth/reset` | onboarding, login, register, SMS/email verify placeholder, reset password | Bug: password rule mismatch; Risk: app 401 handling |
| App home | `/` | check-in redirect, список практик, locked/unlocked cards, profile/settings modal | Risk: silent CMS fallback |
| Check-in | `/checkin` | 4 вопроса, slider, result screen, переход на home | Bug: API failure скрыт |
| Player | `/player/:id` | загрузка практики, audio play, resume modal, music switcher, completion modal | Risk: completion API failure скрыт |
| Deep analysis | `/deep-analysis` | gate screen, 10 вопросов, result, KT history | Bug: нет error/loading на submit |
| Subscription | `/subscription` | выбор тарифа, YooKassa widget, cancel, success/fail | Risk: success без подтверждения backend |
| Profile | `/profile` | подписка, прогресс, тема/голос/музыка, уведомления, feedback, logout, delete account | Risk: silent rollback настроек уведомлений |
| Landing | promo app | CTA, login overlay, TG/VK/MAX links, FAQ, audio preview | Not enough info: нужны runtime/link checks |
| CMS auth | CMS root | admin login, 401 logout | OK |
| CMS practices | `/practices`, `/practices/new`, `/practices/:id` | список, empty blocks, create/edit/delete, reorder, publish, audio upload | Risk: publish без required audio; mobile DnD |
| CMS voices/music | `/voices`, `/music` | add/edit/delete active voice/music, full/preview mp3 upload | OK/Risk: grip icon без reorder |
| CMS users | `/users` | stats, search, active filter, user drawer, grant/revoke subscription | OK/Risk: mobile table |
| CMS feedback | `/feedback` | list/filter, mark read/replied, empty state | Bug: wrong toast API |
| CMS push phrases | `/push-phrases` | audience tabs, slot groups, create/edit/toggle/delete phrases | Bug: wrong toast API |

## Что проверить в браузере после фиксов

1. `application`: login/register/reset, check-in, home, player completion, deep-analysis submit, subscription fail/success.
2. `cms`: feedback load/error, push phrases CRUD, practice publish without audio, mp3 upload too large / wrong format.
3. `landing`: login overlay close/Esc, TG/VK links, mobile layout.
4. Mobile widths: 360px, 390px, 768px for app and CMS.
5. API states: 401, 403, 500, network offline, slow response.

## Минимальный порядок работ

1. Починить `USE_MOCK` включение.
2. Починить `toast.success/error` в CMS.
3. Добавить error/loading в deep-analysis submit.
4. Добавить честную обработку failed sync для check-in и practice completion.
5. Синхронизировать password validation.
6. Добавить проверку активной подписки после YooKassa success.
7. Починить `npm run lint`.

