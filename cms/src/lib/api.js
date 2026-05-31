import axios from 'axios'
import { getToken, useAuth } from './store.js'

export const api = axios.create({ baseURL: '/api', timeout: 30000 })

api.interceptors.request.use((cfg) => {
  const t = getToken()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // протух токен — выкидываем на логин
    if (err.response?.status === 401 && getToken()) {
      useAuth.getState().logout()
    }
    return Promise.reject(err)
  },
)

// Достаёт человекочитаемую ошибку из ответа бэка.
export function errText(err) {
  return err?.response?.data?.error || err?.message || 'Ошибка запроса'
}

// Загрузка одного аудиофайла. Возвращает media { id, url, durationSec, ... }.
// ВАЖНО: Content-Type НЕ ставим вручную — браузер сам добавит
// `multipart/form-data; boundary=...`. Если задать заголовок руками, boundary
// потеряется и Fastify-multipart не распарсит тело.
export async function uploadAudio(file, onProgress) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post('/admin/media', fd, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data.media
}
