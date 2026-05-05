# 05 — Shaders

Five GLSL shader components. Three are mounted live, two remain in the
repo for future use.

| Component | Mounted | Purpose |
|---|---|---|
| `AppBackground` | yes — `App.jsx` (fixed `-z-10`) | Global atmosphere everywhere. |
| `OnboardingFog` | yes — `Onboarding.jsx` (fixed `z-[-5]`) | Denser fog on the four onboarding slides. |
| `AmorphSphere` | yes — `AudioPlayer.jsx`, deferred 750 ms | Animated violet blob behind player controls. |
| `SpookySmoke` | no | Bigger, fewer, slower drifting puffs (alternative atmosphere). |
| `PlayShader` | no | Amorphous Play-triangle on transparent background. |

All shaders share the same plumbing pattern:

```jsx
function FooMesh() {
  const matRef = useRef(null)
  const { size } = useThree()
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  }), [])
  useFrame((s) => {
    matRef.current.uniforms.uTime.value = s.clock.elapsedTime
    matRef.current.uniforms.uResolution.value.set(s.size.width, s.size.height)
  })
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={matRef}
        vertexShader={...} fragmentShader={...}
        uniforms={uniforms}
        depthTest={false} depthWrite={false}
        transparent />
    </mesh>
  )
}
```

The vertex shader is a constant fullscreen quad (no transforms, just
forwards `vUv`). All visual logic lives in the fragment.

## Shared GLSL helpers

Almost every fragment includes:

```glsl
float hash(vec2 p) { ... }
float noise(vec2 p) { ... }       // value noise via 4-corner hashes + smoothstep interp
float fbm(vec2 p) { 5 octaves, lacunarity 2.02, gain 0.5 }
```

Some also include:

```glsl
float angularDistort(theta, t, seed)        // sum-of-sines, integer multipliers (so seam at ±π is continuous)
float angularDistortSharp(theta, t, seed)   // same, plus sign(d)*pow(|d|,1.15) to sharpen peaks
```

## `AppBackground`

`Canvas` with `gl: { alpha: false, antialias: false, premultipliedAlpha: …,
powerPreference: 'low-power' }`, `dpr: [0.75, 1.5]` to keep mobile cheap.
Wrapper: `fixed inset-0 -z-10` with `style={{ background: '#11101a' }}`
as a fallback while the canvas warms up.

Fragment:
- Domain-warped fbm: `warp = (fbm(p*1.6+...), fbm(p*1.6+...))`
- `smoke = fbm(p*2.4 + warp*1.8 + ...)`, `wisps = fbm(p*0.9 + ...)`
- Center bias `vign = mix(0.75, 1.0, smoothstep(1.1, 0.1, length(p)))`
- Sparse halo: `smokeGate = smoothstep(0.40, 0.85, smoke)`
- `halo = vign * smokeGate * mix(0.55, 1.05, wisps) + vign*pow(smoke,6)*0.18`
- **60-s generation gating** — instead of softly modulating amplitude,
  the shader now emulates "stop generating new smoke" then "let it
  dissipate" then "resume":

  ```glsl
  float cycle = mod(uTime, 60.0);
  float gen = max(
    1.0 - smoothstep(30.0, 58.0, cycle),  // 30s plateau, then 28s decay
    smoothstep(58.0, 60.0, cycle)         // 2s ramp back to 1.0
  );
  halo *= gen;
  ```

  Visual cadence: 30 s ON → 28 s smooth dissipate to zero → 2 s ramp
  back. The fbm coordinates continue to advance in real time during
  the OFF half, so when generation resumes the field is on a new
  configuration — there's no awkward "rewind" feel.
- Color base `#11101a` (= app background).

## `OnboardingFog`

Same fbm-driven pattern as `AppBackground` but with **higher density**,
**transparent base**, `mix-blend-mode: screen`. Threshold lowered
(`smoothstep(0.18, 0.80, smoke)`), wisps scaled `mix(0.85, 1.45, wisps)`,
peaks `pow(smoke, 4)*0.55`, vignette flattened (`mix(0.85, 1.0, ...)`).

After the `halo` is composed it is multiplied by two scalars:

1. **`uDensity`** — uniform driven by a `density` prop (`<OnboardingFog
   density={1.2} />`). Default `1.0` for the onboarding slides; Home
   passes `1.2` for slightly denser cover.
2. **60-s generation gating** — same `gen = max(dissipate, ramp)`
   formula as `AppBackground` (30 s ON, 28 s decay, 2 s ramp). The
   cycle multiplies the `halo` AFTER `uDensity` is applied, so a
   higher density (Home's `1.2`) still gets fully dissipated during
   the OFF half.

Output: `vec4(smokeCol * 1.10, halo)`. Anything outside the cloud reads
through to the global `AppBackground` underneath.

`Canvas`: `alpha: true, premultipliedAlpha: false, antialias: true`,
`dpr: [0.75, 1.5]`. Container `fixed inset-0` with `zIndex: -5` so it
sits above the global fog (-10) but below all interactive content.

Mounted in `Onboarding/index.jsx` (default density) and `Home/index.jsx`
(`density={1.2}`).

## `AmorphSphere`

Inside `AudioPlayer`, mounted only after a 750 ms delay (see route
transitions and stacking-context note in `02-routes-and-flow.md`).

Wrapper: `<div style={{ mixBlendMode: blendMode }}>` where `blendMode`
defaults to `'screen'` and is set explicitly in `AudioPlayer`.

Fragment: seven shells of varying radius animate around 7 quasi-periodic
centers (`c0..c6`). Each is either:
- `blobFill` — soft fbm-perturbed circle, `smoothstep(R+edge, R-edge, r)`
- `blobFillSharp` — same but with `angularDistortSharp` for crisper peaks

`body = max(s1..s7)` is the shape mask. `cut = 1 - smoothstep(1.6, 4.6, stack)
* 0.85` damps colour contribution where many shells overlap, preventing the
core from melting into one solid colour.

Lighting:
- `lightDir = vec2(0.6, 0.8)` (upper-right)
- `lighting = 0.5 + 0.5 * dot(...) * lightStab` (stab kills the singularity at r=0)
- `rim = pow(smoothstep(0.35, 1.0, lighting), 3)`
- Pink rim highlight via `pinkHit = pow(smoothstep(0.55, 1.0, lighting), 2)`

Three shell colours mixed against `lighting` (`shell1Col`, `shell2Col`,
`shell3Col`), then overlaid with seven mix steps gated by `s_n * factor * cut`.
Final tweaks add violet rim and pink highlight.

Output: `vec4(col, body)` with `gl: { alpha: true, premultipliedAlpha: false }`.
Canvas DPR `[1, 2]` for crisp blob.

### Why the shader has had so many tweaks

There is a tension in the shader between two goals:

1. **`cut`** prevents over-saturation in the deep multi-shell core.
2. **Alpha = `body`** keeps the silhouette opaque enough to read.

When `cut` shrinks the colour but `body` stays ≈ 1, the deep core becomes
opaque near-black. Three iterations tried different fixes:
- Added a base violet ramp `col += mix(cDeep, cMid, lighting) * body * 0.65;`
  (visible as a constant fill — too "even").
- Multiplied alpha by `cut` (`vec4(col, body*cut)` — overlap got physically
  see-through, but the silhouette became patchy).
- **Final**: kept `vec4(col, body)` and removed everything that was creating
  stacking contexts above the shader (route-level transforms/filters were
  the real culprit; once those went away, `mix-blend-mode: screen` did its
  job and black artifacts disappeared).

## `SpookySmoke` *(unused)*

Four large drifting puffs (`puff(p, c, radius, seed, t)` SDF-ish sampler:
gaussian core + fbm-perturbed edge + outer wisp halo). Slower clock
(`uTime * 0.55`). Bigger radius range (0.44–0.52). Theatrical palette
`cDeep #2E156B → cMid #8047EB → cBright #D9B8FF`. Extra fbm layer
modulates puff alpha for wispy interior.

Wrapper renders with `mix-blend-mode: screen` so it composites against
the global fog. Kept around in case onboarding needs a moodier variant.

## `PlayShader` *(unused)*

A stylised animated Play-triangle. Same shell stacking + cut + rim/pink
machinery as `AmorphSphere`, but with `sdPlayTri(p, r)` replacing the
circular SDF — equilateral triangle with rounded corners, vertex pointing
right. Output is fully alpha-masked: `alpha = 1 - product(1 - s_n*factor*cut)`,
so the result is a transparent-canvas Play icon that only paints inside
the triangle silhouette. `gl: { alpha: true, premultipliedAlpha: true }`.
