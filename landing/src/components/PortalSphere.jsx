import AmorphSphere from './AmorphSphere'

// Наша аморф-сфера (filled) как светящаяся аура + видео-ядро ВНУТРИ через
// круглую дымчатую маску. CSS-аура гарантирует, что сфера всегда читается.
export default function PortalSphere({ video = `${import.meta.env.BASE_URL}media/hero-loop.mp4` }) {
  return (
    <div className="relative h-full w-full">
      {/* мягкая фиолетовая аура */}
      <div
        className="absolute inset-[-8%]"
        style={{ background: 'radial-gradient(circle, rgba(110,80,210,0.55) 0%, rgba(97,69,194,0.22) 42%, transparent 64%)', filter: 'blur(18px)' }}
      />

      {/* живая аморф-сфера */}
      <div className="absolute inset-0">
        <AmorphSphere size={1200} blend="screen" />
      </div>

      {/* видео-ядро в центре, круглая маска с дымчатыми краями */}
      <div
        className="absolute inset-[18%] overflow-hidden rounded-full"
        style={{
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 40%, rgba(0,0,0,0.55) 60%, transparent 82%)',
          maskImage: 'radial-gradient(circle at 50% 50%, #000 40%, rgba(0,0,0,0.55) 60%, transparent 82%)',
        }}
      >
        <video
          src={video}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
          style={{ filter: 'saturate(1.5) brightness(1.0)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 55%, rgba(120,90,230,0.32), rgba(60,35,140,0.4) 78%)', mixBlendMode: 'color' }}
        />
      </div>
    </div>
  )
}
