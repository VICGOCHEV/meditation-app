import { create } from 'zustand'
import { useProgressStore } from './useProgressStore'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

// Pull server-authoritative progress into the store right after the
// session is established (or restored). Done as a fire-and-forget;
// if the server is unreachable, the local LS snapshot stays.
async function hydrateProgress() {
  try {
    await useProgressStore.getState().loadFromServer?.()
  } catch {
    /* ignore */
  }
}

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
    hydrateProgress()
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, isAuthenticated: false })
    // Clear local progress mirror — next user shouldn't see prev user's data.
    useProgressStore.getState().reset?.()
  },

  restoreSession: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw)
        set({ token, user, isAuthenticated: true })
        hydrateProgress()
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
  },
}))
