/** Wind puffs the shader keeps track of. Mist.tsx fills a ring buffer of this size. */
export const PUFFS = 32;
/** Seconds a puff takes to fill back in. */
export const PUFF_LIFE = 3.2;

export const vertex = /* glsl */ `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = /* glsl */ `#version 300 es
precision highp float;

#define PUFFS ${PUFFS}
const float LIFE = ${PUFF_LIFE.toFixed(2)};

uniform float uTime;
uniform vec2 uRes;
uniform float uScale;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
// Each puff: position in canvas pixels, then wind direction scaled by strength (0 to 1).
uniform vec4 uPuffs[PUFFS];
uniform float uBorn[PUFFS];
uniform float uRadius;
uniform vec4 uKeepA;
uniform vec4 uBottle;
uniform vec4 uText;

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}

// 1 inside the box, fading to 0 over "feather" pixels outside it.
float rectMask(vec2 p, vec4 r, float feather) {
  vec2 d = max(r.xy - p, p - r.zw);
  return 1.0 - smoothstep(0.0, feather, max(d.x, d.y));
}

void main() {
  vec2 px = gl_FragCoord.xy;
  float minDim = min(uRes.x, uRes.y);
  float k = 2.4 / minDim;

  // The pointer is a weak wind. Each puff opens a ragged hole, pushes the smoke outward and downwind,
  // then drifts on and shrinks as the smoke rolls back in.
  vec2 push = vec2(0.0);
  float clear = 0.0;
  for (int i = 0; i < PUFFS; i++) {
    float age = uTime - uBorn[i];
    if (age < 0.0 || age > LIFE) continue;
    vec4 puff = uPuffs[i];
    float life = age / LIFE;
    float strength = length(puff.zw);
    vec2 rel = px - puff.xy - puff.zw * uRadius * 0.8 * sqrt(life);
    float r = uRadius * (0.6 + 0.4 * strength) * (1.0 - 0.4 * life);
    float rag = 0.7 + 0.6 * noise(rel * k * 3.0 + uTime * 0.4);
    float hole = exp(-dot(rel, rel) * rag / (r * r)) * smoothstep(0.0, 0.15, age) * (1.0 - smoothstep(0.2, 1.0, life));
    clear = max(clear, hole * (0.55 + 0.45 * strength));
    push += (rel / (length(rel) + 1.0) * 0.3 + puff.zw * 0.2) * hole * r;
  }
  // Overlapping puffs along a sweep would add up into long streaks, so the total push stays under a third of a radius.
  float pushed = length(push);
  push *= min(1.0, uRadius * 0.33 / max(pushed, 1e-3));
  vec2 p = (px - push) * k;

  // Smoke: a doubly warped field that curls slowly on its own, drifting sideways.
  float t = uTime * 0.04;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.7, 0.0)));
  vec2 w = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.5), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(p + 2.0 * w + vec2(t, 0.0));

  float density = smoothstep(0.34, 0.8, f) * (1.0 - clear);
  vec3 col = mix(uColA, uColB, smoothstep(0.25, 0.6, f));
  col = mix(col, uColC, smoothstep(0.58, 0.9, f));

  // Alpha caps: 0.55 near the hero edges, 0.3 inside, 0.3 over the bottle, 0.15 behind the text.
  float edge = min(min(px.x, uRes.x - px.x), min(px.y, uRes.y - px.y)) / minDim;
  float cap = mix(0.3, 0.55, 1.0 - smoothstep(0.0, 0.22, edge));
  cap = min(cap, mix(1.0, 0.3, rectMask(px, uBottle, 40.0 * uScale)));
  cap = min(cap, mix(1.0, 0.15, rectMask(px, uText, 40.0 * uScale)));

  // The button is never covered. Its box already includes 16px padding.
  float keep = rectMask(px, uKeepA, 24.0 * uScale);

  float a = density * cap * (1.0 - keep);
  outColor = vec4(col * a, a);
}
`;
