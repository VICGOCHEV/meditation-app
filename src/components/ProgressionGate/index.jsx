import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    // Unauth visitors always go through onboarding first.
    // Login is reached only at the end of the onboarding flow.
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  }
  return children
}
