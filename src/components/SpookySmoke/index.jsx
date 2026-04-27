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

// Spooky smoke — multiple drifting soft puffs with fbm-perturbed edges.
// Adapted to the violet/lilac palette of the app. Output is alpha-only,
// designed to mix-blend: screen over the global AppBackground.
const smokeFragment = /* glsl */ `
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
      p *= 2.05;
      amp *= 0.5;
    }
    return v;
  }

  // Theatrical drifting puff — bigger, softer, more cinematic.
  // Core stays semi-translucent (max ~0.85), edge fades over a wide range.
  float puff(vec2 p, vec2 center, float radius, float seed, float t) {
    vec2 q = p - center;
    float r = length(q);
    float n = fbm(q * 1.6 + vec2(t * 0.025, t * 0.03) + seed);
    float edge = radius * (0.78 + n * 0.55);
    float core = smoothstep(edge, edge * 0.15, r) * 0.85;
    float halo = smoothstep(edge * 2.2, edge * 0.5, r) * 0.30;
    return clamp(core + halo, 0.0, 1.0);
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime * 0.55; // slow everything down

    // 4 large drifting puffs — clearer cloud silhouettes
    vec2 c0 = vec2(-0.32 + sin(t * 0.10) * 0.12, -0.18 + cos(t * 0.08) * 0.10);
    vec2 c1 = vec2( 0.30 + cos(t * 0.07 + 1.7) * 0.14,  0.22 + sin(t * 0.09 + 0.6) * 0.10);
    vec2 c2 = vec2(-0.12 + sin(t * 0.06 + 3.1) * 0.18,  0.32 + cos(t * 0.05 + 2.0) * 0.08);
    vec2 c3 = vec2( 0.10 + cos(t * 0.09 + 4.2) * 0.16, -0.30 + sin(t * 0.06 + 5.1) * 0.12);

    float a = 0.0;
    a += puff(p, c0, 0.50,  0.0, t) * 0.95;
    a += puff(p, c1, 0.46,  1.7, t) * 0.90;
    a += puff(p, c2, 0.52,  3.4, t) * 0.95;
    a += puff(p, c3, 0.44,  5.1, t) * 0.85;

    // Slow domain-warped fbm modulates the puffs — wispy interior
    vec2 warp = vec2(
      fbm(p * 1.1 + vec2(0.0, t * 0.04)),
      fbm(p * 1.1 + vec2(5.2, -t * 0.035))
    );
    float texture = fbm(p * 1.6 + warp * 1.8 + vec2(t * 0.025, t * 0.02));
    a *= 0.45 + texture * 0.85;

    a = clamp(a, 0.0, 1.0);

    // Palette: deep violet core, lilac mid, soft pink-violet bloom highlights
    vec3 cDeep   = vec3(0.18, 0.08, 0.42);
    vec3 cMid    = vec3(0.50, 0.28, 0.92);
    vec3 cBright = vec3(0.85, 0.72, 1.00);

    vec3 col = mix(cDeep, cMid, smoothstep(0.0, 0.7, a));
    col = mix(col, cBright, smoothstep(0.55, 1.0, a) * 0.7);

    col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.010 * a;

    gl_FragColor = vec4(col, a);
  }
`

function SmokeMesh() {
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
        fragmentShader={smokeFragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        transparent
      />
    </mesh>
  )
}

export default function SpookySmoke({ className, blendMode = 'screen' }) {
  return (
    <div
      className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}
      style={{ mixBlendMode: blendMode }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'low-power',
        }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <SmokeMesh />
      </Canvas>
    </div>
  )
}
