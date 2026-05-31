import ShaderCanvas from './ShaderCanvas'
import { heroSphereFragment } from '../shaders'

// Большая hero-сфера: внутри круглой дымчатой маски — фиолетовое видео
// из прелоадера (затонированное в цвет сферы), сверху — вихревое кольцо
// из лент (WebGL, screen-бленд). Открытый центр показывает видео.
export default function HeroSphere({ size = 640, video = `${import.meta.env.BASE_URL}media/hero-loop.mp4` }) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size, maxWidth: '100%', aspectRatio: '1 / 1' }}
    >
      {/* видео внутри круглой дымчатой маски */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          // дымчатая маска: мягко растворяется к краю, без жёсткого обреза
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 36%, rgba(0,0,0,0.6) 54%, transparent 74%)',
          maskImage: 'radial-gradient(circle at 50% 50%, #000 36%, rgba(0,0,0,0.6) 54%, transparent 74%)',
        }}
      >
        <video
          src={video}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
          style={{ filter: 'saturate(1.5) brightness(1.0) contrast(1.05)' }}
        />
        {/* тонировка в цвет сферы (только подкрашивает, не затемняет) */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 55%, rgba(120,90,230,0.35), rgba(60,35,140,0.4) 75%)', mixBlendMode: 'color' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 45%, transparent 48%, rgba(10,7,20,0.5) 80%)' }}
        />
      </div>

      {/* вихревое кольцо из лент поверх — воздушное */}
      <div className="absolute inset-0" style={{ filter: 'drop-shadow(0 0 50px rgba(97,69,194,0.35))' }}>
        <ShaderCanvas fragmentShader={heroSphereFragment} dpr={[1, 1.6]} autoPause blend="screen" />
      </div>
    </div>
  )
}
