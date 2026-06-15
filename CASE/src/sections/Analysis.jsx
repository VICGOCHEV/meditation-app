import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Chapter, Up, Prose } from '../components/story'
import Icon from '../lib/icons'

const CARDS = [
  { tag: 'Design', icon: 'droplet', title: 'Дизайн-система: почему именно так.', text: 'Темная палитра «ночного неба» внедрена как жесткое функциональное требование: сессии медитации происходят вечером или перед сном, и агрессивный белый интерфейс разрушал бы выработку мелатонина. Единственный фиолетовый акцент фокусирует внимание и формирует узнаваемость. Два шрифта проецируют собранность и точность. Динамическая эволюция цвета в зависимости от времени суток превращает рутинное открытие приложения в сакральный цифровой ритуал.' },
  { tag: 'CMS', icon: 'database', title: 'Кастомная CMS: почему это выигрыш заказчика.', text: 'Отказ от абстрактной Strapi сэкономил оперативную память сервера и избавил заказчика от технической рутины. Матрица аудио 2x3 превратила сложную процедуру связывания файлов в интуитивный визуальный процесс, занимающий две минуты и исключающий путаницу в безымянных полях.' },
  { tag: 'Retention', icon: 'pulse', title: 'Модуль диагностики: почему это ядро, а не фича.', text: 'Пассивные плееры медитаций демонстрируют крайне низкий LTV. Интерактивное зеркало состояния в виде чек-инов формирует мощный внутренний триггер к возвращению. Любопытство к собственным метрикам и отслеживание снижения тревожности удерживают пользователя в приложении эффективнее навязчивых пушей.' },
  { tag: 'Backend', icon: 'server', title: 'Серверный прогресс: почему не в браузере.', text: 'Локальное хранение прогресса уязвимо перед очисткой кэша или сменой смартфона. Для платного премиального продукта это недопустимо. Вынос базы на Fastify + PostgreSQL обеспечил надежность: данные и оплаченный путь пользователя защищены и доступны с любого устройства.' },
  { tag: 'Payments', icon: 'card', title: 'Нативная оплата: почему встроенная.', text: 'Ликвидация редиректов на внешние эквайринг-страницы минимизирует трение на этапе конверсии в покупку и сохраняет целостность медитативной сессии, генерируя автоматизированный доход для бизнеса без ручной операционки.' },
  { tag: 'Notifications', icon: 'telegram', title: 'Telegram-нотификации: почему так, а не push.', text: 'Классический web-push демонстрирует техническую ненадежность в браузерных обертках. Перенос напоминаний в Telegram доставляет сообщения туда, где пользователь проводит максимум времени. Архитектурное решение с прокси-релеем через Cloudflare спасло этот критический бизнес-сценарий от сетевых блокировок.' },
  { tag: 'Distribution', icon: 'platforms', title: 'Мультиплатформенность: почему это важно.', text: 'Модель Web + TG Mini App + VK Mini App устраняет жесткий барьер в виде обязательной установки приложения из App Store / Google Play. Продукт доступен мгновенно в один тап, расширяя воронку первого касания на порядок без усложнения кодовой базы отдельной разработкой под каждую OS.' },
]

const EASE = [0.22, 0.9, 0.3, 1]

function Row({ card, open, onToggle, idx }) {
  return (
    <Up delay={(idx % 4) * 0.04}>
      <div className="overflow-hidden border-t" style={{ borderColor: 'rgba(180,160,255,0.12)' }}>
        <button onClick={onToggle} className="flex w-full items-center gap-5 py-7 text-left">
          <span className="ghost-num w-16 shrink-0 text-[34px]" style={{ WebkitTextStroke: open ? '1px rgba(180,160,255,0.5)' : '1px rgba(180,160,255,0.16)' }}>
            0{idx + 1}
          </span>
          <span className="flex-1">
            <span className="block text-[19px] font-light text-fg-0 sm:text-[23px]">{card.title}</span>
          </span>
          <span className="hidden rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lilac sm:inline" style={{ background: 'rgba(180,160,255,0.1)' }}>{card.tag}</span>
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.3 }} className="text-lilac">
            <Icon name="arrow" size={20} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
              <div className="max-w-3xl pb-9 pl-0 sm:pl-[84px]">
                <Prose text={card.text} stagger={false} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Up>
  )
}

export default function Analysis() {
  const [open, setOpen] = useState(-1)
  return (
    <Chapter
      id="analysis"
      index="03"
      kicker="Стратегический анализ"
      title="Продуктовый и стратегический анализ решений"
      intro="Показать мышление за решениями. Это блок не про «что сделали», а про «почему сделали именно так»."
    >
      <div>
        {CARDS.map((c, i) => (
          <Row key={c.tag} card={c} idx={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
        <div className="border-t" style={{ borderColor: 'rgba(180,160,255,0.12)' }} />
      </div>
    </Chapter>
  )
}
