import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/store.js'
import Login from './pages/Login.jsx'
import Shell from './components/Shell.jsx'
import Practices from './pages/Practices.jsx'
import PracticeEditor from './pages/PracticeEditor.jsx'
import Blocks from './pages/Blocks.jsx'
import Voices from './pages/Voices.jsx'
import Music from './pages/Music.jsx'
import Users from './pages/Users.jsx'
import Feedback from './pages/Feedback.jsx'
import PushPhrases from './pages/PushPhrases.jsx'
import PromoCodes from './pages/PromoCodes.jsx'
import Broadcasts from './pages/Broadcasts.jsx'

export default function App() {
  const token = useAuth((s) => s.token)

  if (!token) return <Login />

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/practices" replace />} />
        <Route path="/practices" element={<Practices />} />
        <Route path="/practices/new" element={<PracticeEditor mode="new" />} />
        <Route path="/practices/:id" element={<PracticeEditor mode="edit" />} />
        <Route path="/blocks" element={<Blocks />} />
        <Route path="/voices" element={<Voices />} />
        <Route path="/music" element={<Music />} />
        <Route path="/users" element={<Users />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/push-phrases" element={<PushPhrases />} />
        <Route path="/promocodes" element={<PromoCodes />} />
        <Route path="/broadcasts" element={<Broadcasts />} />
        <Route path="*" element={<Navigate to="/practices" replace />} />
      </Routes>
    </Shell>
  )
}
