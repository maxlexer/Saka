/**
 * The hero smoke is carried by a small fluid simulation: air is a velocity field kept incompressible by a pressure
 * solve, so air pushed aside is replaced by the air beside it, and it flows around the bottle. The smoke is only ever
 * moved by that air, never faded in or out in place.
 *
 * The air does not carry smoke values, which blur a little every time they are resampled. It carries a map of where
 * each bit of smoke came from, and the display paints the resting smoke through that map at full resolution, so
 * stirring stretches and folds the smoke itself and it never goes soft. Mist.tsx runs the passes in this order each
 * frame: advect, curl, force, divergence, pressure (repeated), gradient, carry, sharpen, then display.
 */

export const vertex = /* glsl */ `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Every simulation pass covers its whole target. uTexel is one over the target size.
const HEAD = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uTexel;
out vec4 outColor;
`;

const NOISE = /* glsl */ `
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
`;

const SMOKE = /* glsl */ `
// Each octave is turned, so the noise grid lines never stack into straight creases once the smoke is dense.
const mat2 TURN = mat2(0.8, 0.6, -0.6, 0.8);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = TURN * p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}

// The smoke at rest, a doubly warped field. x is its value, y how wispy it is there. uv runs 0 to 1 over the hero.
vec2 smoke(vec2 uv, vec2 aspect, float time) {
  vec2 p = uv * aspect * 2.4;
  float t = time * 0.05;
  p.y -= t * 1.2;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.7, 0.0)));
  vec2 w = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.5), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.4));
  return vec2(fbm(p + 2.0 * w + vec2(t, 0.0)), smoothstep(0.3, 0.7, length(w)));
}
`;

// The bottle is solid, shaped by its own picture's alpha, so any bottle photo works. uBottleBox is the picture's box in hero uv.
const SOLID = /* glsl */ `
uniform sampler2D uBottleTex;
uniform vec4 uBottleBox;

float solid(vec2 uv) {
  vec2 b = (uv - uBottleBox.xy) / max(uBottleBox.zw - uBottleBox.xy, 1e-6);
  return b == clamp(b, 0.0, 1.0) ? smoothstep(0.3, 0.7, texture(uBottleTex, b).a) : 0.0;
}
`;

// A solid neighbour pushes back with this cell's own pressure, so no air flows into the bottle.
const PRESSURE = /* glsl */ `
uniform sampler2D uP;

float pressure(vec2 uv, float own) {
  return mix(texture(uP, uv).x, own, solid(uv));
}
`;

/**
 * Air carries itself along, losing momentum like heavy, still air. uKeep is the share of speed kept this step.
 * Viscosity (uThick, the share blended towards the neighbours) damps the cell-sized ripples a plain grid solve leaves
 * behind, which would otherwise shear the smoke into blur, and leaves the large swirls alone.
 */
export const advect = HEAD + /* glsl */ `
uniform sampler2D uVel;
uniform float uDt;
uniform float uKeep;
uniform float uThick;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 from = uv - uDt * texture(uVel, uv).xy * uTexel;
  vec2 x = vec2(uTexel.x, 0.0);
  vec2 y = vec2(0.0, uTexel.y);
  vec2 around = 0.25 * (texture(uVel, from - x).xy + texture(uVel, from + x).xy + texture(uVel, from - y).xy + texture(uVel, from + y).xy);
  outColor = vec4(mix(texture(uVel, from).xy, around, uThick) * uKeep, 0.0, 1.0);
}
`;

/** How fast the air turns at each cell. */
export const curl = HEAD + /* glsl */ `
uniform sampler2D uVel;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 x = vec2(uTexel.x, 0.0);
  vec2 y = vec2(0.0, uTexel.y);
  float r = texture(uVel, uv + x).y - texture(uVel, uv - x).y;
  float t = texture(uVel, uv + y).x - texture(uVel, uv - y).x;
  outColor = vec4(0.5 * (r - t), 0.0, 0.0, 1.0);
}
`;

/**
 * Forces, in cells per second squared. Vorticity confinement keeps the curls that coarse cells would smear out.
 * A slow, wide sway keeps resting smoke breathing without going anywhere. The pointer drags the air near its path
 * towards its own velocity; uStroke is that path this frame, from xy to zw in cells, and a zero uRadius means it stood still.
 */
export const force = (swirl: number, sway: number, swaySize: number) =>
  HEAD + SOLID + /* glsl */ `
uniform sampler2D uVel;
uniform sampler2D uCurl;
uniform float uDt;
uniform float uTime;
uniform vec4 uStroke;
uniform vec2 uPush;
uniform float uRadius;

// A few slow, wide waves. Value noise would do, but its lattice lines leave thin jets in the air.
float potential(vec2 cell) {
  vec2 p = cell / ${swaySize.toFixed(1)};
  return (sin(p.x + uTime * 0.11) * sin(p.y * 0.8 - uTime * 0.07) + 0.6 * sin((p.x + p.y) * 0.6 + uTime * 0.05)) * ${(sway * swaySize).toFixed(2)};
}

void main() {
  vec2 cell = gl_FragCoord.xy;
  vec2 uv = cell * uTexel;
  vec2 x = vec2(uTexel.x, 0.0);
  vec2 y = vec2(0.0, uTexel.y);

  float c = texture(uCurl, uv).x;
  vec2 rise = 0.5 * vec2(abs(texture(uCurl, uv + y).x) - abs(texture(uCurl, uv - y).x), abs(texture(uCurl, uv - x).x) - abs(texture(uCurl, uv + x).x));
  vec2 f = rise / (length(rise) + 1e-4) * c * ${swirl.toFixed(2)};
  // The curl of a potential has no divergence, so the sway only ever stirs.
  f += 0.5 * vec2(potential(cell + vec2(0.0, 1.0)) - potential(cell - vec2(0.0, 1.0)), potential(cell - vec2(1.0, 0.0)) - potential(cell + vec2(1.0, 0.0)));

  vec2 v = texture(uVel, uv).xy + f * uDt;
  if (uRadius > 0.0) {
    vec2 a = uStroke.xy;
    vec2 ab = uStroke.zw - a;
    vec2 d = cell - a - ab * clamp(dot(cell - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    v = mix(v, uPush, 0.6 * exp(-dot(d, d) / (uRadius * uRadius)));
  }
  outColor = vec4(v * (1.0 - solid(uv)), 0.0, 1.0);
}
`;

/** How much air leaves each cell. The hero edges are walls, so the smoke stays in the room. */
export const divergence = HEAD + SOLID + /* glsl */ `
uniform sampler2D uVel;

vec2 vel(vec2 uv) {
  return texture(uVel, uv).xy * (1.0 - solid(uv));
}

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 x = vec2(uTexel.x, 0.0);
  vec2 y = vec2(0.0, uTexel.y);
  vec2 c = vel(uv);
  float l = uv.x < uTexel.x ? -c.x : vel(uv - x).x;
  float r = uv.x > 1.0 - uTexel.x ? -c.x : vel(uv + x).x;
  float b = uv.y < uTexel.y ? -c.y : vel(uv - y).y;
  float t = uv.y > 1.0 - uTexel.y ? -c.y : vel(uv + y).y;
  outColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}
`;

/** One Jacobi step of the pressure that cancels the divergence. */
export const jacobi = HEAD + SOLID + PRESSURE + /* glsl */ `
uniform sampler2D uDiv;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 x = vec2(uTexel.x, 0.0);
  vec2 y = vec2(0.0, uTexel.y);
  float own = texture(uP, uv).x;
  float sum = pressure(uv - x, own) + pressure(uv + x, own) + pressure(uv - y, own) + pressure(uv + y, own);
  outColor = vec4(0.25 * (sum - texture(uDiv, uv).x), 0.0, 0.0, 1.0);
}
`;

/** Subtracting the pressure gradient leaves air that neither piles up nor thins out. */
export const gradient = HEAD + SOLID + PRESSURE + /* glsl */ `
uniform sampler2D uVel;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 x = vec2(uTexel.x, 0.0);
  vec2 y = vec2(0.0, uTexel.y);
  float own = texture(uP, uv).x;
  vec2 v = texture(uVel, uv).xy - 0.5 * vec2(pressure(uv + x, own) - pressure(uv - x, own), pressure(uv + y, own) - pressure(uv - y, own));
  outColor = vec4(v * (1.0 - solid(uv)), 0.0, 1.0);
}
`;

// How far the air carries the smoke this step, in uv. Velocity is in air cells per second. Plain linear filtering
// kinks at every air cell edge, which creases a tight swirl along the grid, so it is read as a smooth cubic B-spline
// (four linear taps).
const TRAVEL = /* glsl */ `
uniform sampler2D uVel;
uniform vec2 uSimTexel;
uniform float uDt;

vec2 travel(vec2 uv) {
  vec2 p = uv / uSimTexel - 0.5;
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = 1.0 - g0;
  vec2 a = (i - 0.5 + w1 / g0) * uSimTexel;
  vec2 b = (i + 1.5 + f3 / 6.0 / g1) * uSimTexel;
  vec2 v = g0.y * (g0.x * texture(uVel, a).xy + g1.x * texture(uVel, vec2(b.x, a.y)).xy)
         + g1.y * (g0.x * texture(uVel, vec2(a.x, b.y)).xy + g1.x * texture(uVel, b).xy);
  return uDt * v * uSimTexel;
}
`;

/**
 * The smoke map. Each texel holds how far its smoke has been carried from where it rests (xy, in hero uv) and how
 * much of it is missing (z, 1 inside the bottle). All zero is the smoke at rest, so fresh targets start there.
 * This pass carries the map one step, as absolute positions, which `sharpen` then corrects.
 */
export const carry = HEAD + TRAVEL + /* glsl */ `
uniform sampler2D uMap;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 from = uv - travel(uv);
  outColor = texture(uMap, from) + vec4(from, 0.0, 0.0);
}
`;

/**
 * MacCormack: carry the carried map (uMoved) back again and put back half of what the round trip lost, unless that
 * overshoots the four texels it came from, so it never rings. uSoft evens out sharp bends in the map, which would
 * otherwise show as stair steps; a smooth map is left as it is. Over uSettle (a tiny share per frame) the smoke drifts
 * home, so a long stir never leaves it tangled for good. Smoke never sits inside the bottle.
 */
export const sharpen = HEAD + SOLID + TRAVEL + /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uMoved;
uniform float uSoft;
uniform float uSettle;

vec4 placed(ivec2 texel) {
  ivec2 at = clamp(texel, ivec2(0), textureSize(uMap, 0) - 1);
  return texelFetch(uMap, at, 0) + vec4((vec2(at) + 0.5) * uTexel, 0.0, 0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec4 own = texture(uMap, uv) + vec4(uv, 0.0, 0.0);
  vec4 moved = texture(uMoved, uv);
  vec2 move = travel(uv);
  vec4 crisp = moved + 0.5 * (own - texture(uMoved, uv + move));

  ivec2 corner = ivec2(floor((uv - move) / uTexel - 0.5));
  vec4 a = placed(corner);
  vec4 b = placed(corner + ivec2(1, 0));
  vec4 c = placed(corner + ivec2(0, 1));
  vec4 d = placed(corner + ivec2(1, 1));
  vec4 low = min(min(a, b), min(c, d));
  vec4 high = max(max(a, b), max(c, d));
  // Clamping would flatten the map into plateaus that smear the smoke into streaks, so an overshoot falls back to the
  // plain carried value instead.
  crisp = mix(crisp, moved, vec4(lessThan(crisp, low)) + vec4(greaterThan(crisp, high)));
  vec2 x = vec2(uTexel.x, 0.0);
  vec2 y = vec2(0.0, uTexel.y);
  vec4 around = 0.25 * (texture(uMoved, uv - x) + texture(uMoved, uv + x) + texture(uMoved, uv - y) + texture(uMoved, uv + y));
  crisp = mix(crisp, around, uSoft);

  vec4 map = (crisp - vec4(uv, 0.0, 0.0)) * (1.0 - uSettle);
  map.z = max(map.z, solid(uv));
  outColor = map;
}
`;

/**
 * Paints the resting smoke at uTime through the smoke map, with the theme palette, alpha caps and the button keep-out.
 * The still (`still` true) paints it at rest, for the captured fallback image and the caps tests.
 */
export const display = (still: boolean) => /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uScale;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec4 uKeepA;
uniform vec4 uBottle;
uniform vec4 uText;
uniform float uTime;
${still ? "" : "uniform sampler2D uMap;"}

out vec4 outColor;
${NOISE}${SMOKE}

// 1 inside the box, fading to 0 over "feather" pixels outside it.
float rectMask(vec2 p, vec4 r, float feather) {
  vec2 d = max(max(r.xy - p, p - r.zw), 0.0);
  return 1.0 - smoothstep(0.0, feather, length(d));
}

// The same, but the fade follows the smoke's own shapes (wobble), so dense smoke curling past never shows a straight
// edge or a box. Inside the box it is always 1.
float zone(vec2 p, vec4 r, float feather, vec2 wobble) {
  return max(rectMask(p, r, 1.0), rectMask(p + wobble, r, feather));
}

void main() {
  vec2 px = gl_FragCoord.xy;
  float minDim = min(uRes.x, uRes.y);
  vec4 map = ${still ? "vec4(0.0)" : "texture(uMap, px / uRes)"};
  vec2 rest = px / uRes + map.xy;
  vec2 s = smoke(rest, uRes / minDim, uTime);
  // Where the air squeezes smoke together, real smoke loses its fine detail to an even haze; painted through the map
  // the squeezed detail would show as teeth. squeeze is the size of the map's stretch, about 1.4 at rest and under
  // plain rotation, and grows as the smoke is pressed thin.
  float squeeze = length(vec4(dFdx(rest) * uRes, dFdy(rest) * uRes));
  s = mix(s, vec2(0.45, 0.3), smoothstep(2.0, 4.5, squeeze));

  // A thick body with denser curling wisps on top, so it reads as smoke and not haze.
  float body = smoothstep(0.24, 0.58, s.x);
  float wisp = smoothstep(0.12, 0.0, abs(s.x - 0.55)) * s.y;
  float density = clamp(body * 0.85 + wisp * 0.3, 0.0, 1.0) * (1.0 - map.z);
  vec3 col = mix(uColA, uColB, smoothstep(0.3, 0.55, s.x));
  col = mix(col, uColC, max(smoothstep(0.55, 0.8, s.x), wisp * 0.6));

  // Alpha caps: 0.8 near the hero edges, 0.6 inside, 0.4 over the bottle, 0.15 behind the text.
  float edge = min(min(px.x, uRes.x - px.x), min(px.y, uRes.y - px.y)) / minDim;
  float cap = mix(0.6, 0.8, 1.0 - smoothstep(0.0, 0.22, edge));
  // The bottle box is mostly transparent margin, so the cap hugs its middle third with a wide soft edge, or its sides show as seams.
  vec4 glass = uBottle + vec4(1.0, 0.0, -1.0, 0.0) * (uBottle.z - uBottle.x) * 0.3;
  vec2 wobble = (s - 0.5) * 90.0 * uScale;
  cap = min(cap, mix(1.0, 0.4, zone(px, glass, 120.0 * uScale, wobble)));
  cap = min(cap, mix(1.0, 0.15, zone(px, uText, 80.0 * uScale, wobble)));

  // The button is never covered. Its box already includes 16px padding.
  float keep = zone(px, uKeepA, 64.0 * uScale, wobble);

  // Half a step of dither: the soft cap ramps change alpha by less than one 8-bit step per pixel, which shows as stripes.
  float a = max(density * cap + (hash(px) - 0.5) / 255.0, 0.0) * (1.0 - keep);
  outColor = vec4(col * a, a);
}
`;
