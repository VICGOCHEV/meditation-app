// Шейдеры перенесены 1:1 из боевой аппки (src/components/AmorphSphere,
// AppBackground). Это не пересказ — это тот самый GLSL, что крутится у
// пользователя на экране плеера и в фоне приложения.

export const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Общий пролог: hash-value-noise (не Perlin) + 5-октавный fbm.
const noiseProlog = /* glsl */ `
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
`

// ── Аморфная сфера: 7 наложенных blob-слоёв с угловым искажением ──
export const sphereFragment = noiseProlog + /* glsl */ `
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
  float blobFillSharp(vec2 p, vec2 center, float baseR, float amp, float edge, float t, float seed) {
    vec2 pp = p - center;
    float r = length(pp);
    float theta = atan(pp.y, pp.x);
    float stab = smoothstep(0.0, 0.06, r);
    float distort = angularDistortSharp(theta, t, seed) * amp * stab;
    float R = baseR + distort;
    return smoothstep(R + edge, R - edge, r);
  }
  float blobFill(vec2 p, vec2 center, float baseR, float amp, float edge, float t, float seed) {
    vec2 pp = p - center;
    float r = length(pp);
    float theta = atan(pp.y, pp.x);
    float stab = smoothstep(0.0, 0.06, r);
    float distort = angularDistort(theta, t, seed) * amp * stab;
    float radialN = (fbm(pp * 3.0 + t * 0.12 + seed) - 0.5) * 0.05;
    float R = baseR + distort + radialN;
    return smoothstep(R + edge, R - edge, r);
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);
    float t = uTime;

    vec2 c0 = vec2(sin(t*0.131+sin(t*0.071)*0.6)*0.015, cos(t*0.173+cos(t*0.059)*0.6)*0.012);
    vec2 c1 = vec2(cos(t*0.097+1.7+sin(t*0.053)*0.5)*0.025, sin(t*0.149+0.3+cos(t*0.067)*0.5)*0.020);
    vec2 c2 = vec2(sin(t*0.079+2.4+sin(t*0.041)*0.7)*0.030, cos(t*0.113+1.1+cos(t*0.061)*0.7)*0.025);

    float pulseA = 1.0 + 0.55 * sin(t*0.113) * cos(t*0.079+0.9);
    float pulseB = 1.0 + 0.65 * sin(t*0.091+1.7) * cos(t*0.137);

    float s1 = blobFill(p, c0, 0.330, 0.064,          0.012, t, 0.0);
    float s2 = blobFill(p, c1, 0.320, 0.082*pulseA,   0.018, t, 1.9);
    float s3 = blobFill(p, c2, 0.310, 0.098,          0.022, t, 3.7);

    vec2 c3 = vec2(sin(t*0.091+3.7+cos(t*0.043)*0.6)*0.028, cos(t*0.127+2.2+sin(t*0.057)*0.6)*0.022);
    vec2 c4 = vec2(cos(t*0.103+5.1+sin(t*0.049)*0.6)*0.032, sin(t*0.119+4.3+cos(t*0.063)*0.6)*0.024);
    vec2 c5 = vec2(sin(t*0.083+0.9+cos(t*0.037)*0.7)*0.026, cos(t*0.137+6.1+sin(t*0.053)*0.7)*0.020);
    float s4 = blobFillSharp(p, c3, 0.327, 0.068,          0.012, t, 8.1);
    float s5 = blobFillSharp(p, c4, 0.317, 0.085*pulseB,   0.018, t, 11.7);
    float s6 = blobFillSharp(p, c5, 0.323, 0.075,          0.013, t, 14.3);

    vec2 c6 = vec2(cos(t*0.071+4.2+sin(t*0.039)*0.8)*0.020, sin(t*0.101+0.6+cos(t*0.051)*0.8)*0.016);
    float s7 = blobFill(p, c6, 0.343, 0.072, 0.020, t, 17.9);

    float body = max(max(max(max(max(max(s1, s2), s3), s4), s5), s6), s7);
    // пересечения НЕ понижаем по непрозрачности (параметр отключён) — сплошная сфера
    float cut = 1.0;

    vec2 lightDir = normalize(vec2(0.6, 0.8));
    float lightStab = smoothstep(0.02, 0.18, length(p));
    float lighting = 0.5 + 0.5 * dot(normalize(p + vec2(0.0001)), lightDir) * lightStab;
    float rim = pow(smoothstep(0.35, 1.0, lighting), 3.0);

    vec3 cDeep   = vec3(0.180, 0.080, 0.440);
    vec3 cMid    = vec3(0.560, 0.320, 1.000);
    vec3 cViolet = vec3(0.62, 0.36, 1.00);
    vec3 shell1Col = mix(cDeep,        cMid,        lighting);
    vec3 shell2Col = mix(cDeep * 1.15, cMid * 1.05, lighting);
    vec3 shell3Col = mix(cDeep * 0.85, cViolet,     lighting);
    shell3Col = mix(shell3Col, cViolet * 1.25, rim * 0.45);

    vec3 col = vec3(0.0);
    col = mix(col, shell1Col * 0.85, s7 * 0.08 * cut);
    col = mix(col, shell1Col, s1 * 0.36 * cut);
    col = mix(col, shell2Col, s2 * 0.44 * cut);
    col = mix(col, shell2Col * 1.06, s4 * 0.10 * cut);
    col = mix(col, shell3Col, s3 * 0.38 * cut);
    col = mix(col, shell3Col * 1.10, s5 * 0.09 * cut);
    col = mix(col, shell1Col * 1.15, s6 * 0.07 * cut);
    col += cViolet * rim * body * 0.18;

    // белые источники света убраны (pink-блик и белая подсветка изгибов) —
    // остаётся только фиолетово-сиреневая палитра
    col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.015 * body;

    float alphaMix = mix(0.55, 1.00, cut);
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    // без тёмной каёмки: альфа гаснет вместе с яркостью (мягче порог)
    float edgeFade = smoothstep(0.0, 0.10, lum);
    float alpha = body * alphaMix * edgeFade;

    gl_FragColor = vec4(col, alpha);
  }
`

// ── Туман: плотнее halo, прозрачный, с управляемой плотностью ──
export const fogFragment =
  noiseProlog +
  /* glsl */ `
  uniform float uDensity;
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
    float smokeGate = smoothstep(0.18, 0.80, smoke);
    float halo = vign * smokeGate * mix(0.85, 1.45, wisps);
    halo += vign * pow(smoke, 4.0) * 0.55;
    halo *= uDensity;

    float cycle = mod(uTime, 60.0);
    float gen = max(1.0 - smoothstep(30.0, 58.0, cycle), smoothstep(58.0, 60.0, cycle));
    halo *= gen;
    halo = clamp(halo, 0.0, 1.0);

    vec3 cMid    = vec3(0.520, 0.300, 0.950);
    vec3 cGlow   = vec3(0.460, 0.260, 0.880);
    vec3 cBright = vec3(0.820, 0.640, 1.000);
    vec3 smokeCol = mix(cGlow * 0.75, cMid, smoke);
    smokeCol = mix(smokeCol, cBright, smoothstep(0.6, 1.0, smoke) * 0.5);

    gl_FragColor = vec4(smokeCol * 1.10, halo);
  }
`

// ── Фон-гало: domain-warped fbm + 60-сек цикл «дыхания» ──────
export const haloFragment = noiseProlog + /* glsl */ `
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

    float vign = mix(0.75, 1.0, smoothstep(1.1, 0.1, length(p)));
    float smokeGate = smoothstep(0.40, 0.85, smoke);
    float halo = vign * smokeGate * mix(0.55, 1.05, wisps);
    halo += vign * pow(smoke, 6.0) * 0.18;

    float cycle = mod(uTime, 60.0);
    float gen = max(1.0 - smoothstep(30.0, 58.0, cycle), smoothstep(58.0, 60.0, cycle));
    halo *= gen;

    vec3 cBg   = vec3(0.0667, 0.0627, 0.1020);
    vec3 cMid  = vec3(0.420, 0.220, 0.850);
    vec3 cGlow = vec3(0.380, 0.220, 0.780);
    vec3 smokeCol = mix(cGlow * 0.65, cMid * 0.9, smoke);
    vec3 col = cBg + smokeCol * halo * 0.45;
    col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`

// ── HERO-сфера: многослойное «вихревое» кольцо из лент. ──────
// Большие всплески, белая подсветка изгибов, ОТКРЫТЫЙ центр
// (под видео). Рендерится со screen-блендом — тёмного нет совсем.
export const heroSphereFragment =
  noiseProlog +
  /* glsl */ `
  float angDist(float theta, float t, float seed, float freq) {
    float th = theta + t * 0.05;
    float d = 0.0;
    d += sin(th * 2.0 + t * 0.21 + seed)        * 0.55;
    d += sin(th * 3.0 - t * 0.33 + seed * 2.1)  * 0.35;
    d += sin(th * freq + t * 0.17 + seed * 1.7) * 0.22;
    d += sin(th * (freq + 4.0) - t * 0.27 + seed * 3.3) * 0.12;
    return d;
  }

  // тонкая лента-кольцо радиуса R с угловым искажением amp
  float ribbon(vec2 p, float R, float amp, float thick, float t, float seed, float freq) {
    float r = length(p);
    float theta = atan(p.y, p.x);
    float Rr = R + angDist(theta, t, seed, freq) * amp
                 + (fbm(p * 2.0 + seed + t * 0.05) - 0.5) * 0.04;
    return smoothstep(thick, 0.0, abs(r - Rr));
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);
    float t = uTime;

    // лёгкое глобальное вращение для «вихря»
    float ga = t * 0.04;
    p = mat2(cos(ga), -sin(ga), sin(ga), cos(ga)) * p;

    vec2 lightDir = normalize(vec2(-0.25, 0.95));
    float lighting = 0.5 + 0.5 * dot(normalize(p + vec2(0.0001)), lightDir);

    vec3 violet = vec3(0.42, 0.28, 0.95);
    vec3 lilac  = vec3(0.62, 0.45, 1.0);
    vec3 white  = vec3(0.97, 0.95, 1.0);

    float mask = 0.0;
    vec3 col = vec3(0.0);

    // точечный «горячий» источник света — едет по кругу, даёт ОДИН блик,
    // а не подсветку по всей поверхности
    float hotAng = t * 0.18;
    vec2 hot = vec2(cos(hotAng), sin(hotAng)) * 0.36;

    // 22 тонкие полупрозрачные ленты — воздушные слои, видно сквозь
    for (int i = 0; i < 22; i++) {
      float fi = float(i);
      float R     = 0.30 + fi * 0.0075;
      float amp   = 0.055 + mod(fi, 3.0) * 0.026;       // крупные всплески сохраняем
      float thick = 0.008 + mod(fi, 2.0) * 0.009;
      float freq  = 5.0 + mod(fi, 4.0) * 2.0;
      float seed  = fi * 2.37;
      float b = ribbon(p, R, amp, thick, t, seed, freq);

      vec3 base = mix(violet, lilac, fi / 22.0);
      col += base * b * 0.34;                            // тускло, воздушно
      mask += b * 0.62;                                  // полупрозрачно — слои просвечивают
    }

    float r = length(p);

    // ТОЧЕЧНЫЙ белый блик: только рядом с горячей точкой, узкое пятно
    float hotD = length(p - hot);
    float spot = exp(-hotD * hotD * 60.0);               // компактное пятно
    col += white * spot * smoothstep(0.0, 0.05, mask) * 0.9;
    mask += spot * smoothstep(0.0, 0.05, mask) * 0.5;

    // конверт: края НЕ режем жёстко — наружу ленты воздушно растворяются
    float envelope = smoothstep(0.16, 0.28, r) * (1.0 - smoothstep(0.50, 0.72, r));
    mask *= mix(0.6, 1.0, envelope);

    // лёгкое внутреннее свечение по краю «окна»
    float innerGlow = smoothstep(0.30, 0.24, r) * smoothstep(0.15, 0.24, r);
    col += violet * innerGlow * 0.35;
    mask += innerGlow * 0.3;

    col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.012 * mask;

    float alpha = clamp(mask, 0.0, 1.0) * 0.8;           // общая воздушность
    gl_FragColor = vec4(col, alpha);
  }
`
