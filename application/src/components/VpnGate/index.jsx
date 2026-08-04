import { useCallback, useEffect, useState } from 'react'
import Button from '../ui/Button'
import { checkVpn } from '../../api/vpn'
import {
  VPN_GATE_TITLE,
  VPN_GATE_TEXT,
  VPN_GATE_REFRESH_LABEL,
  VPN_GATE_CONTINUE_LABEL,
} from '../../constants/texts'

// Заглушка при включённом VPN. Показывается на входе, ДО онбординга и
// авторизации, один раз за сессию.
//
// Мягкая по трём осям:
//   • fail-open — недоступен сервис детекции, вышел таймаут → пускаем молча
//     (см. api/vpn.js), падение стороннего API не должно закрывать вход всем;
//   • не блокирует наглухо — есть «Продолжить без отключения», ложное
//     срабатывание (корпоративная сеть, CGNAT, iCloud Private Relay) не
//     превращается в тупик;
//   • один раз за сессию — отказавшегося отключать VPN не долбим на каждом
//     переходе.
const SESSION_KEY = 'vpn_gate_passed'

export default function VpnGate({ children }) {
  const [blocked, setBlocked] = useState(false)
  // Проверка идёт в фоне: интерфейс НЕ ждёт ответа, иначе таймаут в 3 секунды
  // превратился бы в 3 секунды белого экрана на каждом входе.
  const [checking, setChecking] = useState(false)

  const run = useCallback(async () => {
    setChecking(true)
    const { blocked: isBlocked } = await checkVpn()
    setChecking(false)
    setBlocked(isBlocked)
    if (!isBlocked) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* приватный режим — просто проверим ещё раз в следующую сессию */
      }
    }
  }, [])

  useEffect(() => {
    let passed = false
    try {
      passed = sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      /* нет доступа к sessionStorage — проверяем */
    }
    if (!passed) run()
  }, [run])

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    setBlocked(false)
  }

  return (
    <>
      {children}
      {blocked && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-0/95 px-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vpn-gate-title"
        >
          <div className="w-full max-w-sm text-center">
            <h2
              id="vpn-gate-title"
              className="font-serif text-[26px] leading-tight text-fg-0"
            >
              {VPN_GATE_TITLE}
            </h2>
            <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-fg-2">
              {VPN_GATE_TEXT}
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Button fullWidth onClick={run} disabled={checking}>
                {VPN_GATE_REFRESH_LABEL}
              </Button>
              <Button variant="secondary" fullWidth onClick={dismiss}>
                {VPN_GATE_CONTINUE_LABEL}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
