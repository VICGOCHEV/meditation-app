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

const playFragment = /* glsl */ `
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

  float angularDistort(float theta, float t, float seed) {
    float th = theta + t * 0.08;
    float p1 = sin(t * 0.173 + seed)       * 0.60;
    float p2 = cos(t * 0.231 + seed * 1.7) * 0.40;
    float d = 0.0;
    d += sin(th * 2.0 + t * 0.293 + seed       + p1)        * 0.55;
    d += sin(th * 3.0 - t * 0.471 + seed * 2.1 + p2)        * 0.35;
    d += sin(th * 5.0 + t * 0.187 + seed * 1.7)             * 0.18;
    d += sin(th * 7.0 - t * 0.259 + seed * 3.3 + p1 * 0.5)  * 0.09;
    return d;
  }
  float angularDistortSharp(float theta, float t, float seed) {
    float th = theta + t * 0.07;
    float p1 = sin(t * 0.219 + seed)       * 0.55;
    float p2 = cos(t * 0.251 + seed * 1.7) * 0.35;
    float d = 0.0;
    d += sin(th * 2.0 + t * 0.311 + seed       + p1)       * 0.55;
    d += sin(th * 3.0 - t * 0.457 + seed * 2.1 + p2)       * 0.35;
    d += sin(th * 5.0 + t * 0.213 + seed * 1.7)            * 0.18;
    d += sin(th * 7.0 - t * 0.271 + seed * 3.3 + p1 * 0.5) * 0.09;
    return sign(d) * pow(abs(d), 1.15);
  }

  float sdPlayTri(vec2 p, float r) {
    p.x = -p.x;
    vec2 q = vec2(p.y, -p.x);
    const float k = 1.7320508;
    q.x = abs(q.x) - r;
    q.y = q.y + r / k;
    if (q.x + k * q.y > 0.0) q = vec2(q.x - k * q.y, -k * q.x - q.y) / 2.0;
    q.x -= clamp(q.x, -2.0 * r, 0.0);
    return -length(q) * sign(q.y);
  }

  float triFill(vec2 p, vec2 center, float baseR, float amp, float edge, float t, float seed) {
    vec2 pp = p - center;
    float r = length(pp);
    float theta = atan(pp.y, pp.x);
    float stab = smoothstep(0.0, 0.06, r);
    float distort = angularDistort(theta, t, seed) * amp * stab;
    const float round = 0.025;
    float d = sdPlayTri(pp, baseR - round) - distort - round;
    return smoothstep(edge, -edge, d);
  }
  float triFillSharp(vec2 p, vec2 center, float baseR, float amp, float edge, float t, float seed) {
    vec2 pp = p - center;
    float r = length(pp);
    float theta = atan(pp.y, pp.x);
    float stab = smoothstep(0.0, 0.06, r);
    float distort = angularDistortSharp(theta, t, seed) * amp * stab;
    const float round = 0.025;
    float d = sdPlayTri(pp, baseR - round) - distort - round;
    return smoothstep(edge, -edge, d);
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime;

    vec2 c0 = vec2(
      sin(t * 0.131 + sin(t * 0.071) * 0.6) * 0.015,
      cos(t * 0.173 + cos(t * 0.059) * 0.6) * 0.012
    );
    vec2 c1 = vec2(
      cos(t * 0.097 + 1.7 + sin(t * 0.053) * 0.5) * 0.025,
      sin(t * 0.149 + 0.3 + cos(t * 0.067) * 0.5) * 0.020
    );
    vec2 c2 = vec2(
      sin(t * 0.079 + 2.4 + sin(t * 0.041) * 0.7) * 0.030,
      cos(t * 0.113 + 1.1 + cos(t * 0.061) * 0.7) * 0.025
    );
    vec2 c3 = vec2(
      sin(t * 0.091 + 3.7 + cos(t * 0.043) * 0.6) * 0.028,
      cos(t * 0.127 + 2.2 + sin(t * 0.057) * 0.6) * 0.022
    );
    vec2 c4 = vec2(
      cos(t * 0.103 + 5.1 + sin(t * 0.049) * 0.6) * 0.032,
      sin(t * 0.119 + 4.3 + cos(t * 0.063) * 0.6) * 0.024
    );
    vec2 c5 = vec2(
      sin(t * 0.083 + 0.9 + cos(t * 0.037) * 0.7) * 0.026,
      cos(t * 0.137 + 6.1 + sin(t * 0.053) * 0.7) * 0.020
    );
    vec2 c6 = vec2(
      cos(t * 0.071 + 4.2 + sin(t * 0.039) * 0.8) * 0.020,
      sin(t * 0.101 + 0.6 + cos(t * 0.051) * 0.8) * 0.016
    );

    float pulseA = 1.0 + 0.55 * sin(t * 0.113) * cos(t * 0.079 + 0.9);
    float pulseB = 1.0 + 0.65 * sin(t * 0.091 + 1.7) * cos(t * 0.137);

    float s1 = triFill     (p, c0, 0.305, 0.020,           0.010, t, 0.0);
    float s2 = triFill     (p, c1, 0.295, 0.028 * pulseA,  0.013, t, 1.9);
    float s3 = triFill     (p, c2, 0.285, 0.034,           0.015, t, 3.7);
    float s4 = triFillSharp(p, c3, 0.300, 0.024,           0.010, t, 8.1);
    float s5 = triFillSharp(p, c4, 0.290, 0.030 * pulseB,  0.013, t, 11.7);
    float s6 = triFillSharp(p, c5, 0.297, 0.026,           0.011, t, 14.3);
    float s7 = triFill     (p, c6, 0.318, 0.026,           0.014, t, 17.9);

    float body = max(max(max(max(max(max(s1, s2), s3), s4), s5), s6), s7);
    float stack = s1 + s2 + s3 + s4 + s5 + s6 + s7;
    float cut = 1.0 - smoothstep(1.6, 4.6, stack) * 0.85;

    vec2 lightDir = normalize(vec2(0.6, 0.8));
    float lightStab = smoothstep(0.02, 0.18, length(p));
    float lighting = 0.5 + 0.5 * dot(normalize(p + vec2(0.0001)), lightDir) * lightStab;
    float rim = pow(smoothstep(0.35, 1.0, lighting), 3.0);

    vec3 cDeep   = vec3(0.120, 0.050, 0.320);
    vec3 cMid    = vec3(0.420, 0.220, 0.850);
    vec3 cViolet = vec3(0.46,  0.24,  0.92);
    vec3 cPink   = vec3(1.00,  0.78,  0.86);

    vec3 shell1Col = mix(cDeep,        cMid,         lighting);
    vec3 shell2Col = mix(cDeep * 1.15, cMid * 1.05,  lighting);
    vec3 shell3Col = mix(cDeep * 0.85, cViolet,      lighting);
    shell3Col = mix(shell3Col, cViolet * 1.25, rim * 0.45);

    vec3 col = vec3(0.0);
    col  = mix(col, shell1Col * 0.85, s7 * 0.08 * cut);
    col  = mix(col, shell1Col,        s1 * 0.36 * cut);
    col  = mix(col, shell2Col,        s2 * 0.44 * cut);
    col  = mix(col, shell2Col * 1.06, s4 * 0.10 * cut);
    col  = mix(col, shell3Col,        s3 * 0.38 * cut);
    col  = mix(col, shell3Col * 1.10, s5 * 0.09 * cut);
    col  = mix(col, shell1Col * 1.15, s6 * 0.07 * cut);
    col += cViolet * rim * body * 0.18;

    float pinkHit = pow(smoothstep(0.55, 1.00, lighting), 2.0);
    col += cPink * pinkHit * body * cut * 0.36;

    float alpha = 1.0 - (1.0 - s1 * 0.36 * cut)
                      * (1.0 - s2 * 0.44 * cut)
                      * (1.0 - s3 * 0.38 * cut)
                      * (1.0 - s4 * 0.10 * cut)
                      * (1.0 - s5 * 0.09 * cut)
                      * (1.0 - s6 * 0.07 * cut)
                      * (1.0 - s7 * 0.08 * cut);

    gl_FragColor = vec4(col, alpha);
  }
`

function PlayShaderMesh() {
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
        fragmentShader={playFragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function PlayShader({ className }) {
  return (
    <div className={className ?? 'absolute inset-0 h-full w-full'}>
      <Canvas
        gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }}
      >
        <PlayShaderMesh />
      </Canvas>
    </div>
  )
}
