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
            'mx-auto flex h-full w-full max-w-md flex-col px-5 py-6',
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
    <div className="min-h-dvh w-full">
      <div
        className={[
          'mx-auto w-full max-w-md px-5 pt-6',
          withBottomNav ? 'pb-28' : 'pb-10',
          className,
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
