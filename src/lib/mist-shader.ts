export const vertex = /* glsl */ `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = /* glsl */ `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform float uScale;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec2 uPointer;
uniform vec2 uSwirl;
uniform float uForce;
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
  vec2 p = px * k;

  // Pointer: swirl the noise around the pointer and push it along the pointer velocity.
  vec2 d = px - uPointer;
  float w = exp(-dot(d, d) / (uRadius * uRadius)) * uForce;
  float angle = w * 1.6;
  vec2 pc = uPointer * k;
  vec2 rel = p - pc;
  p = pc + mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * rel;
  p -= uSwirl * k * w * 6.0;

  // Slow drift, about 0.02 noise units per second.
  float t = uTime * 0.02;
  vec2 q = vec2(fbm(p + vec2(t, 0.0)), fbm(p + vec2(5.2, 1.3) - vec2(0.0, t)));
  float f = fbm(p + 1.6 * q + vec2(t * 0.6, t * 0.4));

  float density = smoothstep(0.32, 0.82, f);
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
