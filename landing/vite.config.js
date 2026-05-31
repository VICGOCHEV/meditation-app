import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// При сборке кладём лендинг под сабпуть /promo (корень = аппка, не трогаем).
// В dev — обычный корень.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/promo/' : '/',
  server: { port: 5190, open: true },
  build: {
    rollupOptions: {
      output: {
        // three/r3f и framer — отдельными чанками: грузятся параллельно,
        // кэшируются независимо, не раздувают стартовый бандл.
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          motion: ['framer-motion'],
        },
      },
    },
  },
}))
