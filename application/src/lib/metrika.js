// Тонкая обёртка над Яндекс.Метрикой. Счётчик подключается в index.html;
// здесь только отправка целей, чтобы страницы не знали про глобальный ym().
//
// Метрика может быть не загружена (блокировщик, офлайн, VK/TG WebView с
// урезанным сетевым доступом) — все вызовы молчано-оп, аналитика никогда не
// ломает пользовательский сценарий.

const COUNTER_ID = Number(import.meta.env.VITE_YM_ID) || 109442488

export function reachGoal(goal, params) {
  try {
    window.ym?.(COUNTER_ID, 'reachGoal', goal, params)
  } catch {
    /* аналитика не должна влиять на UI */
  }
}

// Цели донатной плашки в финале практики.
export const GOALS = {
  donateBannerShown: 'donate_banner_shown',
  donateBannerSupportClick: 'donate_banner_support_click',
  donateBannerContinueClick: 'donate_banner_continue_click',
}
