// VK Mini App держит splash с иконкой приложения до тех пор, пока страница
// не пришлёт VKWebAppInit. Пока splash висит — юзер не видит вообще ничего,
// даже наш прелоадер.
//
// Init обязан уходить на КАЖДОМ запуске, независимо от роута и авторизации.
// Раньше он жил внутри VK auto-login в Login.jsx, и повторный запуск уже
// залогиненного юзера (VK-params есть, Login не монтируется) навсегда
// оставлял splash на экране.

/** Запуск из VK-контейнера: VK всегда добавляет vk_platform в launch-params. */
export function isVkLaunch() {
  if (typeof window === 'undefined') return false
  try {
    const sp = new URLSearchParams(window.location.search)
    if (sp.has('vk_platform') || sp.has('vk_user_id')) return true
    return /(^|\.)vk\.(com|ru)$/.test(new URL(document.referrer).hostname)
  } catch {
    return false
  }
}

/**
 * Снять VK splash. Fire-and-forget: ничего не ждём и не блокируем рендер.
 * Идемпотентно — повторный send безвреден.
 */
export function vkInit() {
  if (!isVkLaunch()) return
  import('@vkontakte/vk-bridge')
    .then((m) => { try { m.default.send('VKWebAppInit') } catch { /* noop */ } })
    .catch(() => { /* noop */ })
}
