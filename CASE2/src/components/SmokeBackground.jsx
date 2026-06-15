import { lazy, Suspense, useEffect, useState } from 'react'

// Живой дым на фоне — тот самый halo-шейдер из приложения, крутится на
// низком dpr (дёшево), под ним статичная фиолетовая глубина для мгновенного
// первого кадра. Тяжёлый WebGL грузится лениво, не блокируя рендер контента.
const ShaderCanvas = lazy(() => import('./ShaderCanvas'))

let haloPromise
function loadHalo() {
  if (!haloPromise) haloPromise = import('../shaders').then((m) => m.haloFragment)
  return haloPromise
}

function LiveSmoke() {
  const [frag, setFrag] = useState()
  useEffect(() => {
    let alive = true
    loadHalo().then((f) => alive && setFrag(f))
    return () => {
      alive = false
    }
  }, [])
  if (!frag) return null
  return (
    <ShaderCanvas
      fragmentShader={frag}
      dpr={[0.4, 0.6]}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}

export default function SmokeBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20">
      {/* статичная фиолетовая глубина — видна мгновенно */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 760px at 50% -8%, rgba(60,40,130,0.5), transparent 60%), radial-gradient(900px 700px at 82% 112%, rgba(97,69,194,0.22), transparent 55%), #0a0714',
        }}
      />
      {/* живой дым (halo-шейдер) поверх градиента */}
      <div className="absolute inset-0 opacity-70" style={{ mixBlendMode: 'screen' }}>
        <Suspense fallback={null}>
          <LiveSmoke />
        </Suspense>
      </div>
      {/* затемнение к низу — текст всегда читается */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 800px at 50% -10%, transparent, rgba(10,7,20,0.45) 72%), linear-gradient(180deg, rgba(10,7,20,0.15), rgba(10,7,20,0.55))',
        }}
      />
    </div>
  )
}
