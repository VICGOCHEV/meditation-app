import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Кейс RELAX ME (CASE3 = CASE2 + перенесённые секции из CASE). Локально —
// порт 5220, отдельно от аппки (5173), лендинга (5190), старого кейса (5200)
// и CASE2 (5210).
export default defineConfig({
  // Кейс встраивается в сайт VECTOR (gochev.pro) как iframe из /cases/relax-me/.
  // base должен совпадать с путём в public/ основного сайта.
  base: '/cases/relax-me/',
  plugins: [react()],
  server: { port: 5220, open: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
