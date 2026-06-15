import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Кейс-страница. Локально — порт 5200, отдельно от аппки (5173) и лендинга (5190).
export default defineConfig({
  plugins: [react()],
  server: { port: 5200, open: true },
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
