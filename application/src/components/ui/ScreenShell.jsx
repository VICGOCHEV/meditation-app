// `fixed` mode: the screen is locked to the viewport height with
// `overflow: hidden`, so dragging gestures (e.g. the DialSlider knob
// in Checkin / DeepAnalysis) cannot trigger page scroll or
// pull-to-refresh on touch devices. Used by questionnaire screens
// where the layout fits exactly one viewport.
export default function ScreenShell({
  children,
  withBottomNav = false,
  fixed = false,
  className = '',
}) {
  if (fixed) {
    return (
      <div
        className="h-dvh w-full overflow-hidden"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div
          className={[
            // pt учитывает env(safe-area-inset-top): в standalone-PWA на
            // iPhone статус-бар (black-translucent) лежит ПОВЕРХ контента,
            // и без этого верхний прогресс-бар уезжал под индикатор батареи
            // (жалоба со скриншотом). +1.5rem — прежний визуальный отступ.
            'mx-auto flex h-full w-full max-w-md flex-col px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]',
            withBottomNav ? 'pb-24' : '',
            className,
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden">
      <div
        className={[
          // pt с safe-area-inset-top — см. коммент в fixed-ветке выше.
          'mx-auto w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]',
          withBottomNav ? 'pb-28' : 'pb-10',
          className,
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
