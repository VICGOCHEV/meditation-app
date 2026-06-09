import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Same shader family as AppBackground (domain-warped fbm halo) but:
//   - Lower smoke threshold (0.28 vs 0.40) — clouds appear in more places
//   - Higher contribution multiplier (0.65–1.15 vs 0.55–1.05)
//   - Output uses alpha = halo strength so the global fog stays visible
//     between clusters (no opaque rectangle).

const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uResolution;
  uniform float uDensity;

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

    float vign = mix(0.85, 1.0, smoothstep(1.1, 0.1, length(p)));

    // Клиент 09.06: «пиковые значения дыма надо дать меньше».
    // Подняли нижний порог smokeGate (0.18 → 0.32) — меньше базы дыма,
    // и снизили wisps-множитель (mix 0.85→1.45 → 0.70→1.00) — нет
    // ярких всплесков. Убрали добавочный «pow(smoke, 4.0)» — это
    // именно он давал резкие пики «вдруг много», которые потом
    // быстро исчезали.
    float smokeGate = smoothstep(0.32, 0.78, smoke);
    float halo = vign * smokeGate * mix(0.70, 1.00, wisps);
    halo *= uDensity;
    // 60-s gating window — emulates "stop generating new smoke" instead
    // of just dimming it. First 30 s of every cycle: full strength.
    // 30→58 s: smooth dissipate from 1 → 0. 58→60 s: short ramp back
    // up to 1 to avoid a visible snap on loop. The fbm coordinates
    // continue to advance in real time, so when generation resumes the
    // pattern is already different — no awkward repeat.
    float cycle = mod(uTime, 60.0);
    float gen = max(
      1.0 - smoothstep(30.0, 58.0, cycle),
      smoothstep(58.0, 60.0, cycle)
    );
    halo *= gen;
    // Жёсткий потолок alpha (≤0.42) — чтобы пиковая густота никогда
    // не перекрывала текст. Раньше доходило до 0.9, перекрывая всё.
    halo = clamp(halo, 0.0, 0.42);

    vec3 cMid    = vec3(0.520, 0.300, 0.950);
    vec3 cGlow   = vec3(0.460, 0.260, 0.880);
    vec3 cBright = vec3(0.820, 0.640, 1.000);

    vec3 smokeCol = mix(cGlow * 0.75, cMid, smoke);
    smokeCol = mix(smokeCol, cBright, smoothstep(0.6, 1.0, smoke) * 0.5);

    // Transparent base — only the smoke contributes; global AppBackground shows between clouds.
    gl_FragColor = vec4(smokeCol * 1.10, halo);
  }
`

function FogMesh({ density }) {
  const matRef = useRef(null)
  const { size } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uDensity: { value: density },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uResolution.value.set(state.size.width, state.size.height)
    matRef.current.uniforms.uDensity.value = density
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={fullscreenVertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        transparent
      />
    </mesh>
  )
}

export default function OnboardingFog({ density = 1 }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -5 }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'low-power',
        }}
        dpr={[0.75, 1.5]}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <FogMesh density={density} />
      </Canvas>
    </div>
  )
}
