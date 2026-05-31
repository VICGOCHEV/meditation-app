import { create } from 'zustand'

const VOICE_KEY = 'player_voice'
const MUSIC_KEY = 'player_music'
const MUSIC_BY_PRACTICE_KEY = 'player_music_by_practice'
const POS_KEY = (id) => `player_pos_${id}`

const savedVoice = localStorage.getItem(VOICE_KEY)
const savedMusic = localStorage.getItem(MUSIC_KEY)

function loadMusicByPractice() {
  try {
    return JSON.parse(localStorage.getItem(MUSIC_BY_PRACTICE_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export const usePlayerStore = create((set, get) => ({
  currentPractice: null,
  isPlaying: false,
  position: 0,
  volume: 1,
  selectedVoice: savedVoice || 'male',
  // Глобальный последний выбор музыки (используется как дефолт).
  selectedMusic: savedMusic ? Number(savedMusic) : 1,
  // Per-practice memory: { 'a1': 2, 'au3': 3, ... } — клиент 2026-05-27:
  // «приложение запоминает его последний выбор для этой конкретной практики».
  musicByPractice: loadMusicByPractice(),

  setCurrentPractice: (practice) => set({ currentPractice: practice }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPosition: (position) => set({ position }),
  setVolume: (volume) => set({ volume }),

  setVoice: (v) => {
    localStorage.setItem(VOICE_KEY, v)
    set({ selectedVoice: v })
  },

  setMusic: (m) => {
    localStorage.setItem(MUSIC_KEY, String(m))
    set({ selectedMusic: m })
  },

  // Запомнить выбор музыки для конкретной практики + обновить глобальный
  // selectedMusic (чтобы новая практика стартовала с последним выбором).
  setMusicForPractice: (practiceId, musicId) => {
    if (!practiceId) return
    const next = { ...get().musicByPractice, [practiceId]: musicId }
    localStorage.setItem(MUSIC_BY_PRACTICE_KEY, JSON.stringify(next))
    localStorage.setItem(MUSIC_KEY, String(musicId))
    set({ musicByPractice: next, selectedMusic: musicId })
  },

  // Что играть в этой практике: сохранённый выбор → глобальный.
  // Не подписывайся через селектор (zustand не отслеживает get()) —
  // подпишись на `musicByPractice`/`selectedMusic` и вычисляй в компоненте.
  getMusicForPractice: (practiceId) => {
    if (!practiceId) return get().selectedMusic
    return get().musicByPractice[practiceId] ?? get().selectedMusic
  },

  savePosition: (practiceId, seconds) => {
    if (!practiceId) return
    localStorage.setItem(POS_KEY(practiceId), String(seconds))
  },

  loadPosition: (practiceId) => {
    if (!practiceId) return 0
    const raw = localStorage.getItem(POS_KEY(practiceId))
    return raw ? Number(raw) : 0
  },

  clearPosition: (practiceId) => {
    if (!practiceId) return
    localStorage.removeItem(POS_KEY(practiceId))
  },

  // Wipe all saved practice positions. Called on logout so the next
  // user on this browser doesn't get "Continue?" prompts for the
  // previous user's sessions.
  clearAllPositions: () => {
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('player_pos_')) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  },
}))
