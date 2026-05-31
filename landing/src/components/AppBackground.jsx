import ShaderCanvas from './ShaderCanvas'
import { haloFragment } from '../shaders'

// Живой фон страницы — тот самый halo-шейдер из приложения.
// Фиксирован на весь вьюпорт, лежит под контентом.
export default function AppBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,
        pointerEvents: 'none',
      }}
    >
      {/* низкий dpr: фон размытый, в полном разрешении смысла нет — экономим GPU */}
      <ShaderCanvas fragmentShader={haloFragment} dpr={[0.5, 0.75]} />
      {/* затемняющий градиент к низу, чтобы текст всегда читался */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1200px 800px at 50% -10%, transparent, rgba(10,7,20,0.55) 70%), linear-gradient(180deg, rgba(10,7,20,0.2), rgba(10,7,20,0.6))',
        }}
      />
    </div>
  )
}
