import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Папка проекта — cms/, но публичный путь раздачи на проде = /admin/.
// Почему не /cms/: пока идёт переход, по /cms/* живёт старый Strapi
// (его /cms/api ещё читает аппка до cutover) — заняли бы один путь дважды.
// После того как Strapi погасим, путь можно сменить на /cms/ (base +
// basename в src/main.jsx). В dev проксируем /api и /cms-media на
// локальный Fastify (порт 3001).
export default defineConfig({
  base: '/admin/',
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
