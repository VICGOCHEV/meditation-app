// Мост курсора для случая, когда кейс встроен <iframe>-ом во внешний сайт.
//
// Проблема: пока указатель над iframe, события мыши получает документ ВНУТРИ
// iframe, а не родительская страница. Поэтому кастомный («кислотный») курсор
// родителя, который слушает mousemove на своей странице, над iframe замирает.
// Origin у кейса и сайта разные → напрямую читать события нельзя (same-origin
// policy). Единственный безопасный канал — window.postMessage.
//
// Здесь мы форвардим родителю координаты указателя (относительно вьюпорта
// iframe). Родитель прибавляет offset самого iframe и двигает свой курсор —
// см. сниппет parent-side в комментарии ниже / в ответе ассистента.

let started = false

export function startIframeCursorBridge() {
  if (started || typeof window === 'undefined') return
  if (window.self === window.top) return // не в iframe — форвардить некому
  if (!window.matchMedia('(pointer: fine)').matches) return // только мышь, не тач
  started = true

  // В embedded-режиме прячем нативный курсор, чтобы над кейсом был виден ТОЛЬКО
  // кислотный курсор родителя. Standalone-просмотр кейса это не затрагивает.
  // ВАЖНО: курсор-элемент родителя должен лежать ВЫШЕ iframe по z-index и иметь
  // pointer-events:none — иначе он отрисуется ПОД iframe и его не будет видно.
  document.documentElement.style.cursor = 'none'

  let raf = 0
  let last = null
  const flush = () => {
    raf = 0
    if (!last) return
    window.parent.postMessage(
      { source: 'relaxme-case', type: 'cursor', x: last.clientX, y: last.clientY },
      '*',
    )
  }
  const onMove = (e) => {
    last = e
    if (!raf) raf = requestAnimationFrame(flush)
  }
  const onLeave = () => {
    if (raf) cancelAnimationFrame(raf), (raf = 0)
    window.parent.postMessage({ source: 'relaxme-case', type: 'cursor-leave' }, '*')
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  // когда указатель уходит из iframe обратно на сайт — у родителя снова заработает
  // его собственный mousemove, но сообщим явно (на случай скрытия/«парковки» курсора)
  document.addEventListener('mouseleave', onLeave)
  window.addEventListener('blur', onLeave)
}
