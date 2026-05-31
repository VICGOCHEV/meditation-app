import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

const B = import.meta.env.BASE_URL
const N = 4

const vert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }
`
// Depth-шейдер на КАЖДЫЙ кадр: настоящий 3D-наезд по карте глубины внутри
// кадра. uOpacity — кросс-фейд между кадрами (на следующем передний план уже
// снят и дорисован → смаз уезжающего плана прячется переходом).
const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uColor, uDepth;
  uniform vec2 uRes, uImg, uMouse;
  uniform float uProgress, uOpacity;
  void main(){
    if(uOpacity <= 0.002) discard;
    float screenA = uRes.x/uRes.y, imgA = uImg.x/uImg.y;
    vec2 scl = screenA>imgA ? vec2(1.0, imgA/screenA) : vec2(screenA/imgA, 1.0);
    vec2 uv = (vUv-0.5)*scl + 0.5;
    float d = texture2D(uDepth, uv).r;
    vec2 focus = vec2(0.5, 0.46);
    float zoom = 1.0 + uProgress*(0.18 + 0.7*d);
    vec2 uv2 = focus + (uv-focus)/zoom + uMouse*(0.010 + 0.028*d);
    vec3 col = texture2D(uColor, clamp(uv2, 0.001, 0.999)).rgb;
    float vig = smoothstep(1.15, 0.35, length(vUv-0.5));
    col *= mix(0.74, 1.0, vig);
    gl_FragColor = vec4(col, uOpacity);
  }
`

// окна видимости кадров по глобальному прогрессу (сумма ~1)
function frameOpacity(i, p) {
  const sIn = [-1, 0.22, 0.48, 0.7][i]
  const eIn = [-1, 0.34, 0.6, 0.82][i]
  const sOut = [0.22, 0.48, 0.7, 2][i]
  const eOut = [0.34, 0.6, 0.82, 3][i]
  const ss = (x, a, b) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  const fin = i === 0 ? 1 : ss(p, sIn, eIn)
  const fout = 1 - ss(p, sOut, eOut)
  return fin * fout
}

function Planes({ progressMV }) {
  const { size } = useThree()
  const urls = []
  for (let i = 1; i <= N; i++) urls.push(`${B}hero/dive-${i}.webp`)
  for (let i = 1; i <= N; i++) urls.push(`${B}hero/dive-depth-${i}.webp`)
  const tex = useLoader(THREE.TextureLoader, urls)
  const mats = useRef([])
  const mouse = useRef([0, 0])

  const data = useMemo(() => {
    return Array.from({ length: N }, (_, i) => {
      const color = tex[i]
      const depth = tex[N + i]
      for (const t of [color, depth]) {
        t.minFilter = THREE.LinearFilter
        t.magFilter = THREE.LinearFilter
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      }
      return {
        uColor: { value: color },
        uDepth: { value: depth },
        uRes: { value: new THREE.Vector2(1, 1) },
        uImg: { value: new THREE.Vector2(color.image.width, color.image.height) },
        uProgress: { value: 0 },
        uOpacity: { value: i === 0 ? 1 : 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      }
    })
  }, [tex])

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // каждый кадр зумит ЛОКАЛЬНО в своё окно: пока главный — резкий (малый зум),
  // максимум зума приходится на момент ухода в прозрачность → смаз на
  // исчезающем кадре, видимый всегда чёткий.
  const winStart = [0.0, 0.22, 0.48, 0.7]
  const winEnd = [0.34, 0.6, 0.82, 1.0]
  useFrame(() => {
    const p = progressMV?.get ? progressMV.get() : 0
    for (let i = 0; i < N; i++) {
      const u = data[i]
      const localP = Math.min(1, Math.max(0, (p - winStart[i]) / (winEnd[i] - winStart[i])))
      u.uProgress.value = localP
      u.uOpacity.value = frameOpacity(i, p)
      u.uRes.value.set(size.width, size.height)
      const m = u.uMouse.value
      m.x += (mouse.current[0] - m.x) * 0.06
      m.y += (mouse.current[1] - m.y) * 0.06
    }
  })

  // дальний кадр (4) рисуем первым (сзади), полный (1) — последним (сверху)
  return (
    <>
      {data.map((u, i) => (
        <mesh key={i} frustumCulled={false} renderOrder={N - 1 - i}>
          <planeGeometry args={[2, 2]} />
          <shaderMaterial
            ref={(el) => (mats.current[i] = el)}
            vertexShader={vert}
            fragmentShader={frag}
            uniforms={u}
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}

export default function SceneDive({ progress }) {
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ width: '100%', height: '100%', display: 'block' }}>
        <Planes progressMV={progress} />
      </Canvas>
    </div>
  )
}
