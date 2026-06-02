// import ShaderCanvas from './ShaderCanvas'   // ← вернуть для «живого» дыма
// import { haloFragment } from '../shaders'

// Фон страницы. ДЫМ (halo-шейдер) ОТКЛЮЧЁН — статичный фиолетовый градиент
// вместо постоянного WebGL-контекста. Чтобы вернуть дым: раскомментить импорты
// и <ShaderCanvas .../> ниже.
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
      {/* <ShaderCanvas fragmentShader={haloFragment} dpr={[0.45, 0.6]} /> */}
      {/* мягкое статичное свечение вместо дыма — фиолетовая глубина, 0 нагрузки */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1100px 760px at 50% -8%, rgba(60,40,130,0.45), transparent 60%), radial-gradient(900px 700px at 80% 110%, rgba(97,69,194,0.22), transparent 55%)',
        }}
      />
      {/* затемняющий градиент к низу, чтобы текст всегда читался */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1200px 800px at 50% -10%, transparent, rgba(10,7,20,0.5) 70%), linear-gradient(180deg, rgba(10,7,20,0.2), rgba(10,7,20,0.6))',
        }}
      />
    </div>
  )
}
