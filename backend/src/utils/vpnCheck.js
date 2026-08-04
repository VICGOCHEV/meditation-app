// Детекция VPN/прокси по IP запроса.
//
// Проверка СЕРВЕРНАЯ: клиентские способы (WebRTC-leak) обходятся, ломаются в
// Telegram WebView и требуют разрешений, которых в мини-аппе нет.
//
// Принцип — fail-open. Любая неопределённость (таймаут, 5xx провайдера, нет
// ключа, приватный IP) трактуется как «VPN не обнаружен»: ложное срабатывание
// на живом пользователе дороже пропущенного VPN.
//
// Env:
//   VPN_CHECK_PROVIDER — 'ipinfo' | 'ipapi' | пусто (детекция выключена)
//   VPN_CHECK_TOKEN    — ключ провайдера (ipinfo)
//   VPN_CHECK_FLAGS    — какие флаги считать срабатыванием,
//                        по умолчанию 'vpn,proxy,tor'
//   VPN_CHECK_TIMEOUT_MS — по умолчанию 3000

const TIMEOUT_MS = Number(process.env.VPN_CHECK_TIMEOUT_MS) || 3000
const CACHE_TTL_MS = 15 * 60 * 1000
const CACHE_MAX = 5000

const PROVIDER = (process.env.VPN_CHECK_PROVIDER || '').trim().toLowerCase()
const TOKEN = (process.env.VPN_CHECK_TOKEN || '').trim()

// hosting и relay в дефолт НЕ входят: под hosting попадают корпоративные сети
// и часть мобильных операторов, под relay — iCloud Private Relay, который
// включён у массы обычных пользователей iOS.
const TRIGGER_FLAGS = (process.env.VPN_CHECK_FLAGS || 'vpn,proxy,tor')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

const cache = new Map() // ip → { verdict, expires }

function cacheGet(ip) {
  const hit = cache.get(ip)
  if (!hit) return null
  if (hit.expires <= Date.now()) {
    cache.delete(ip)
    return null
  }
  return hit.verdict
}

function cacheSet(ip, verdict) {
  // Map сохраняет порядок вставки — вытесняем самый старый ключ.
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value)
  cache.set(ip, { verdict, expires: Date.now() + CACHE_TTL_MS })
}

// Локальные и приватные адреса проверять бессмысленно (и вредно: провайдер
// вернёт ошибку, а мы сожжём лимит).
export function isPrivateIp(ip) {
  if (!ip) return true
  const v = String(ip).replace(/^::ffff:/, '')
  if (v === '::1' || v.startsWith('fc') || v.startsWith('fd')) return true
  if (/^127\./.test(v) || /^10\./.test(v) || /^192\.168\./.test(v)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v)) return true
  if (/^169\.254\./.test(v)) return true
  return false
}

async function fetchJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`provider http ${res.status}`)
  return res.json()
}

// Нормализуем ответ провайдера в плоский набор булевых флагов.
async function queryProvider(ip) {
  if (PROVIDER === 'ipinfo') {
    if (!TOKEN) throw new Error('VPN_CHECK_TOKEN не задан')
    const d = await fetchJson(
      `https://ipinfo.io/${encodeURIComponent(ip)}/privacy?token=${encodeURIComponent(TOKEN)}`
    )
    return {
      vpn: !!d.vpn,
      proxy: !!d.proxy,
      tor: !!d.tor,
      relay: !!d.relay,
      hosting: !!d.hosting,
      country: null,
    }
  }

  if (PROVIDER === 'ipapi') {
    const d = await fetchJson(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,proxy,hosting,countryCode`
    )
    if (d.status !== 'success') throw new Error(d.message || 'provider error')
    return {
      vpn: false, // ip-api не различает vpn и proxy
      proxy: !!d.proxy,
      tor: false,
      relay: false,
      hosting: !!d.hosting,
      country: d.countryCode || null,
    }
  }

  throw new Error(`неизвестный VPN_CHECK_PROVIDER: ${PROVIDER}`)
}

/**
 * Вердикт по IP.
 * @returns {{blocked:boolean, source:string, flags:object|null, error?:string}}
 *   source: 'disabled' | 'private' | 'cache' | 'provider' | 'error'
 */
export async function checkIp(ip) {
  if (!PROVIDER) return { blocked: false, source: 'disabled', flags: null }
  if (isPrivateIp(ip)) return { blocked: false, source: 'private', flags: null }

  const cached = cacheGet(ip)
  if (cached) return { ...cached, source: 'cache' }

  try {
    const flags = await queryProvider(ip)
    const blocked = TRIGGER_FLAGS.some((f) => flags[f] === true)
    const verdict = { blocked, flags }
    cacheSet(ip, verdict)
    return { ...verdict, source: 'provider' }
  } catch (e) {
    // Сервис недоступен/таймаут — пропускаем пользователя. Отрицательный
    // вердикт кешируем ненадолго не будем: провайдер может ожить через минуту.
    return { blocked: false, source: 'error', flags: null, error: e.message }
  }
}

export const vpnCheckConfigured = () => !!PROVIDER
