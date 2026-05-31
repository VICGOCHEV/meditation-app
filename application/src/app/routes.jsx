import { Suspense, lazy, useRef } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ProtectedRoute from '../components/ProgressionGate'

import Onboarding from '../pages/Onboarding'
import Login from '../pages/Auth/Login'
import Register from '../pages/Auth/Register'
import ResetPassword from '../pages/Auth/ResetPassword'
import Home from '../pages/Home'
import Checkin from '../pages/Checkin'
import DeepAnalysis from '../pages/DeepAnalysis'
import Subscription from '../pages/Subscription'
import Profile from '../pages/Profile'

const Player = lazy(() => import('../pages/Player'))

const EASE = [0.22, 0.8, 0.36, 1]

// NOTE: route transitions must be opacity-only (no x, no filter, no scale).
// Any non-none transform/filter creates a stacking context which traps
// AmorphSphere's mix-blend-mode: screen inside the route wrapper, so the
// blob can no longer composite against the global AppBackground — its
// darker interior pixels then read as black.
const forward = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}
const backward = forward

export default function AppRoutes() {
  const location = useLocation()
  const navType = useNavigationType()
  const direction = navType === 'POP' ? backward : forward
  const locationRef = useRef(location)
  locationRef.current = location

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={direction.initial}
        animate={direction.animate}
        exit={direction.exit}
        transition={{ duration: 0.95, ease: EASE }}
        className="min-h-dvh w-full"
      >
        <Routes location={location}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/reset" element={<ResetPassword />} />

          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/checkin" element={<ProtectedRoute><Checkin /></ProtectedRoute>} />
          <Route path="/deep-analysis" element={<ProtectedRoute><DeepAnalysis /></ProtectedRoute>} />
          <Route
            path="/player/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={<div className="min-h-dvh" />}>
                  <Player />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
