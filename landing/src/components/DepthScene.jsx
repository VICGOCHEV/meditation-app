import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

const B = import.meta.env.BASE_URL

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform float uProgress;
  uniform vec2 uMouse;

  void main() {
    float screenA = uRes.x / uRes.y;
    float imgA = uImg.x / uImg.y;
    vec2 scale = screenA > imgA ? vec2(1.0, imgA/screenA) : vec2(screenA/imgA, 1.0);
    vec2 uv = (vUv - 0.5) * scale + 0.5;

    float d = texture2D(uDepth, uv).r;
    vec2 focus = vec2(0.5, 0.46);
    float push = uProgress;
    float zoom = 1.0 + push * (0.7 + 2.6 * d);
    vec2 uv2 = focus + (uv - focus) / zoom;
    // эффекты глубины НАРАСТАЮТ с прогрессом → при push=0 кадр 1:1 с последним
    // кадром скраба (нет прыжка на стыке). mouse-параллакс тоже от 0.
    float depthIn = smoothstep(0.0, 0.22, push);
    uv2 += uMouse * (0.012 + 0.03 * d) * depthIn;

    vec3 col = texture2D(uColor, clamp(uv2, 0.001, 0.999)).rgb;
    float vig = smoothstep(1.15, 0.35, length(vUv - 0.5));
    col *= mix(1.0, mix(0.72, 1.0, vig), depthIn);
    gl_FragColor = vec4(col, 1.0);
  }
`

function Plane({ progressMV, colorUrl, depthUrl }) {
  const matRef = useRef()
  const { size } = useThree()
  const [color, depth] = useLoader(THREE.TextureLoader, [`${B}${colorUrl}`, `${B}${depthUrl}`])
  const mouse = useRef([0, 0])

  const uniforms = useMemo(() => {
    color.minFilter = THREE.LinearFilter
    color.magFilter = THREE.LinearFilter
    color.wrapS = color.wrapT = THREE.ClampToEdgeWrapping
    depth.wrapS = depth.wrapT = THREE.ClampToEdgeWrapping
    return {
      uColor: { value: color },
      uDepth: { value: depth },
      uRes: { value: new THREE.Vector2(1, 1) },
      uImg: { value: new THREE.Vector2(color.image.width, color.image.height) },
      uProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }
  }, [color, depth])

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame(() => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    u.uProgress.value = progressMV?.get ? progressMV.get() : 0
    u.uRes.value.set(size.width, size.height)
    const m = u.uMouse.value
    m.x += (mouse.current[0] - m.x) * 0.06
    m.y += (mouse.current[1] - m.y) * 0.06
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={matRef} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

export default function DepthScene({ progress, color = 'hero/scene.webp', depth = 'hero/depth.webp', active = true }) {
  return (
    <div className="absolute inset-0">
      <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ width: '100%', height: '100%', display: 'block' }}>
        <Plane progressMV={progress} colorUrl={color} depthUrl={depth} />
      </Canvas>
    </div>
  )
}
