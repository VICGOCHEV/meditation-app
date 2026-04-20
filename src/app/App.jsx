import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import AppRoutes from './routes'
import AppBackground from '../components/AppBackground'
import { useAuthStore } from '../store/useAuthStore'

function OnboardingGate() {
  const location = useLocation()
  const onboarded =
    typeof window !== 'undefined' &&
    localStorage.getItem('onboarding_completed') === 'true'

  if (!onboarded && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />
  }
  return null
}

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    restoreSession()
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk')
        .then(({ default: WebApp }) => {
          try {
            WebApp?.ready?.()
            WebApp?.expand?.()
          } catch {
            /* non-Telegram environment — ignore */
          }
        })
        .catch(() => {})
    }
    setReady(true)
  }, [restoreSession])

  if (!ready) return null

  return (
    <>
      <AppBackground />
      <OnboardingGate />
      <AppRoutes />
    </>
  )
}
