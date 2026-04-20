import { create } from 'zustand'

const VOICE_KEY = 'player_voice'
const MUSIC_KEY = 'player_music'
const POS_KEY = (id) => `player_pos_${id}`

const savedVoice = localStorage.getItem(VOICE_KEY)
const savedMusic = localStorage.getItem(MUSIC_KEY)

export const usePlayerStore = create((set) => ({
  currentPractice: null,
  isPlaying: false,
  position: 0,
  volume: 1,
  selectedVoice: savedVoice || 'male',
  selectedMusic: savedMusic ? Number(savedMusic) : 1,

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
}))
