import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App.jsx'
import { vkInit } from './lib/vk'
import './index.css'

// Снимаем VK splash до рендера React — иначе иконка висит поверх всего.
vkInit()

// Sentry активируется только если в build-time задан VITE_SENTRY_DSN.
// Без DSN импорт SDK и init пропускается — bundle не растёт.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  // Динамический import чтобы Sentry попадал в свой chunk и грузился
  // только когда реально включен.
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
      // Не отправляем initData / JWT / passwords:
      sendDefaultPii: false,
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'fetch' && /\/auth\//.test(breadcrumb.data?.url || '')) {
          // Скрываем тело запросов к auth — там пароли и токены
          breadcrumb.data = { url: breadcrumb.data.url, status_code: breadcrumb.data.status_code }
        }
        return breadcrumb
      },
    })
  }).catch(() => {/* не падаем если Sentry не загрузился */})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
