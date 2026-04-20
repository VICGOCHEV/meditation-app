export default function ScreenShell({ children, withBottomNav = false, className = '' }) {
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
