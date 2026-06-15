import AmorphSphere from './AmorphSphere'

// Рамка iPhone, в которую вставляются экраны-реплики приложения.
// За мокапом — мягкая аморфная сфера (тот же шейдер, что в плеере).
export default function PhoneMockup({ children, width = 300, withSphere = true, className = '', float = true }) {
  return (
    <div className={`relative ${className}`} style={{ width, maxWidth: '100%' }}>
      {withSphere && (
        <div className="pointer-events-none absolute -inset-16 -z-10 flex items-center justify-center opacity-70">
          <AmorphSphere size={width * 1.25} />
        </div>
      )}
      <div className={`phone-frame ${float ? 'float-soft' : ''}`} style={{ aspectRatio: '300 / 620' }}>
        <div className="phone-notch" />
        <div className="phone-screen">{children}</div>
      </div>
    </div>
  )
}
