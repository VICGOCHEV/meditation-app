import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Папка проекта — cms/, публичный путь раздачи на проде = /manage/.
// Почему не /admin/ и не /cms/:
//   - /cms/* занят живым Strapi (его /cms/api ещё читает аппка до cutover)
//   - /admin/* тоже занят Strapi (Strapi 5 хардкодит свой admin UI на /admin)
// Берём /manage/ — нейтральный путь, не конфликтует ни со Strapi ни с
// нашими /api/* роутами. После погашения Strapi можно переименовать на
// /admin/ или /cms/ (одна правка base + basename + редиректы).
// В dev проксируем /api и /cms-media на локальный Fastify (порт 3001).
export default defineConfig({
  base: '/manage/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/cms-media': 'http://127.0.0.1:3001',
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
