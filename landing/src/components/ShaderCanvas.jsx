import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fullscreenVertex } from '../shaders'

// Fullscreen-плейн с шейдером. uTime, uResolution + опциональный uDensity.
function ShaderPlane({ fragmentShader, densityRef }) {
  const matRef = useRef()
  const { size, viewport } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uDensity: { value: densityRef ? densityRef.current : 1 },
    }),
    [densityRef],
  )

  useFrame((state) => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr)
    if (densityRef) u.uDensity.value += (densityRef.current - u.uDensity.value) * 0.05
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={fullscreenVertex}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

// autoPause: ставит рендер на «never», когда холст вне вьюпорта — это
// главная оптимизация: тяжёлый шейдер сферы не жрёт GPU за экраном.
export default function ShaderCanvas({
  fragmentShader,
  dpr = [1, 1.5],
  className,
  style,
  densityRef,
  autoPause = false,
  blend,
}) {
  const wrapRef = useRef(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!autoPause || !wrapRef.current) return
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { rootMargin: '120px' },
    )
    io.observe(wrapRef.current)
    return () => io.disconnect()
  }, [autoPause])

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ width: '100%', height: '100%', mixBlendMode: blend, ...style }}
    >
      <Canvas
        frameloop={autoPause && !visible ? 'never' : 'always'}
        dpr={dpr}
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <ShaderPlane fragmentShader={fragmentShader} densityRef={densityRef} />
      </Canvas>
    </div>
  )
}
