import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Halo-only: domain-warped fbm drifting across the whole viewport.
// No central blob — lives behind every screen.
const haloFragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uResolution;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime;

    vec2 warp = vec2(
      fbm(p * 1.6 + vec2(0.0, t * 0.06)),
      fbm(p * 1.6 + vec2(5.2, -t * 0.05))
    );
    float smoke = fbm(p * 2.4 + warp * 1.8 + vec2(t * 0.04, t * 0.03));
    float wisps = fbm(p * 0.9 + vec2(-t * 0.025, t * 0.035));

    // Very soft centre bias — edges ~75%, centre 100%.
    float vign = mix(0.75, 1.0, smoothstep(1.1, 0.1, length(p)));

    // Gate smoke — dim values stay invisible, only denser patches show.
    float smokeGate = smoothstep(0.40, 0.85, smoke);
    float halo = vign * smokeGate * mix(0.55, 1.05, wisps);
    halo += vign * pow(smoke, 6.0) * 0.18;
    // 60-s "generation gating" — same logic as OnboardingFog. 30 s ON,
    // 28 s smooth dissipate, 2 s ramp back to ON. Pattern continues to
    // drift through real-time uTime so each cycle starts on a new fbm
    // configuration.
    float cycle = mod(uTime, 60.0);
    float gen = max(
      1.0 - smoothstep(30.0, 58.0, cycle),
      smoothstep(58.0, 60.0, cycle)
    );
    halo *= gen;

    // Base #11101a
    vec3 cBg    = vec3(0.0667, 0.0627, 0.1020);
    vec3 cMid   = vec3(0.420, 0.220, 0.850);
    vec3 cGlow  = vec3(0.380, 0.220, 0.780);

    vec3 smokeCol = mix(cGlow * 0.65, cMid * 0.9, smoke);
    vec3 col = cBg + smokeCol * halo * 0.45;

    float grain = (hash(gl_FragCoord.xy + t) - 0.5) * 0.012;
    col += grain;

    gl_FragColor = vec4(col, 1.0);
  }
`

function HaloMesh() {
  const matRef = useRef(null)
  const { size } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uResolution.value.set(state.size.width, state.size.height)
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={fullscreenVertex}
        fragmentShader={haloFragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function AppBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ background: '#11101a' }}
    >
      <Canvas
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }}
        dpr={[0.75, 1.5]}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <HaloMesh />
      </Canvas>
    </div>
  )
}
