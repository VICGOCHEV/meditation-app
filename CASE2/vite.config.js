import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Кейс RELAX ME (CASE2). Локально — порт 5210, отдельно от аппки (5173),
// лендинга (5190) и старого кейса (5200).
export default defineConfig({
  plugins: [react()],
  server: { port: 5210, open: true },
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
