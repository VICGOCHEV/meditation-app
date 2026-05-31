import { create } from 'zustand'

const TOKEN_KEY = 'cms_token'
const ADMIN_KEY = 'cms_admin'

function load(key) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export const useAuth = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  admin: load(ADMIN_KEY),
  setAuth: (token, admin) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
    set({ token, admin })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ADMIN_KEY)
    set({ token: null, admin: null })
  },
}))

export const getToken = () => localStorage.getItem(TOKEN_KEY)
