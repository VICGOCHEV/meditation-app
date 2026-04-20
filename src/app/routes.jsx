import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProgressionGate'

import Onboarding from '../pages/Onboarding'
import Auth from '../pages/Auth'
import Login from '../pages/Auth/Login'
import Register from '../pages/Auth/Register'
import ResetPassword from '../pages/Auth/ResetPassword'
import Home from '../pages/Home'
import Checkin from '../pages/Checkin'
import DeepAnalysis from '../pages/DeepAnalysis'
import Subscription from '../pages/Subscription'
import Profile from '../pages/Profile'

const Player = lazy(() => import('../pages/Player'))

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/auth" element={<Auth />} />
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
  )
}
