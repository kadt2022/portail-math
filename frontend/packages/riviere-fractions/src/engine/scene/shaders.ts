import { WAVES } from "../geometry/water";

// Shaders du jeu, en GLSL ES 1.0 (WebGL 1 et 2) : lanternes qui brillent, panneaux, eau, ciel et ombres douces des
// bateaux. Le terrain et les décors utilisent le matériau standard de Babylon (voir lighting.ts). Le brouillard est le même partout : les lointains se fondent dans
// la brume du matin.

/**
 * Étalonnage des couleurs, le même que celui que Babylon applique au matériau du paysage (imageProcessingFunctions) :
 * exposition, contraste, saturation. `grading` = (facteur d'exposition en espace d'écran, part de contraste,
 * facteur de saturation) ; (1, 0, 1) le rend neutre.
 */
export const GRADE = /* glsl */ `
uniform vec3 grading;
vec3 grade(vec3 color) {
  vec3 c = clamp(color * grading.x, 0.0, 1.0);
  c = mix(c, c * c * (3.0 - 2.0 * c), grading.y);
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return max(mix(vec3(luma), c, grading.z), vec3(0.0));
}`;

export const FOG = /* glsl */ `${GRADE}
uniform vec3 fogColor;
uniform float fogDensity;
vec3 applyFog(vec3 color, float distance, float strength) {
  float fog = 1.0 - exp(-pow(distance * fogDensity, 2.0));
  return mix(color, fogColor, clamp(fog * strength, 0.0, 1.0));
}`;

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

export const LIT_VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
void main(void) {
  vec4 w = world * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(world) * normal;
  vColor = color.rgb;
  gl_Position = viewProjection * w;
}`;

export const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
uniform vec3 eyePosition;
uniform float glow;
${FOG}
void main(void) {
  vec3 n = normalize(vNormal);
  vec3 toEye = normalize(eyePosition - vWorld);
  float rim = 0.75 + 0.25 * abs(dot(n, toEye));
  vec3 color = vColor * glow * rim;
  gl_FragColor = vec4(grade(applyFog(color, length(eyePosition - vWorld), 0.75)), 1.0);
}`;

export const SIGN_VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vWorld;
varying vec2 vUV;
void main(void) {
  vec4 w = world * vec4(position, 1.0);
  vWorld = w.xyz;
  vUV = uv;
  gl_Position = viewProjection * w;
}`;

export const SIGN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vUV;
uniform sampler2D signTexture;
uniform vec3 eyePosition;
uniform float highlight;
${FOG}
void main(void) {
  vec3 color = texture2D(signTexture, vUV).rgb * (0.92 + 0.25 * highlight);
  gl_FragColor = vec4(grade(applyFog(color, length(eyePosition - vWorld), 0.6)), 1.0);
}`;

const waveTerms = WAVES.map(
  (wave) => `{
    float k = 6.2831853 * frequency / ${wave.length.toFixed(3)};
    vec2 dir = vec2(${wave.dirX.toFixed(3)}, ${wave.dirZ.toFixed(3)});
    float phase = k * dot(dir, w.xz) - time * ${wave.speed.toFixed(3)} * sqrt(9.8 * k) * 0.35;
    height += amplitude * ${wave.weight.toFixed(3)} * sin(phase);
    slope += amplitude * ${wave.weight.toFixed(3)} * k * cos(phase) * dir;
  }`,
).join("\n");

export const WATER_VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec2 river;
attribute vec2 shore;
uniform mat4 world;
uniform mat4 viewProjection;
uniform float time;
uniform float amplitude;
uniform float frequency;
varying vec3 vWorld;
varying vec2 vRiver;
varying vec2 vShore;
varying vec2 vSlope;
void main(void) {
  vec4 w = world * vec4(position, 1.0);
  float height = 0.0;
  vec2 slope = vec2(0.0);
  ${waveTerms}
  float calmNearShore = smoothstep(0.0, 2.5, shore.y);
  w.y += height * calmNearShore;
  vWorld = w.xyz;
  vRiver = river;
  vShore = shore;
  vSlope = slope * calmNearShore;
  gl_Position = viewProjection * w;
}`;

export const WATER_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vRiver;
varying vec2 vShore;
varying vec2 vSlope;
uniform vec3 eyePosition;
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform vec3 skyZenith;
uniform vec3 skyHorizon;
uniform float time;
uniform float current;
uniform float turbulence;
uniform float reflection;
uniform vec4 boat;
uniform float boatSpeed;
${FOG}
${NOISE}
float ripples(vec2 p) {
  return noise(p * 1.7) + 0.5 * noise(p * 3.9 + 7.0) + 0.25 * noise(p * 8.3 + 3.0) * (0.3 + turbulence);
}
void main(void) {
  // Les ondulations vivent en coordonnées de rivière : elles descendent le courant et suivent les virages.
  vec2 p = vec2(vRiver.y * 0.55 + vRiver.x * 0.08, vRiver.x * 0.42 - time * current * 0.4);
  float e = 0.12;
  float n0 = ripples(p);
  vec2 ripple = vec2(ripples(p + vec2(e, 0.0)) - n0, ripples(p + vec2(0.0, e)) - n0) / e * (0.028 + 0.3 * turbulence);
  vec3 n = normalize(vec3(-vSlope.x - ripple.x, 1.0, -vSlope.y - ripple.y));
  vec3 toEye = eyePosition - vWorld;
  vec3 v = normalize(toEye);
  float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  vec3 sky = mix(skyHorizon, skyZenith, clamp(r.y * 1.4, 0.0, 1.0));
  // Reflet des berges vertes près du bord.
  float bank = 1.0 - smoothstep(0.5, 8.0, vShore.y);
  sky = mix(sky, vec3(0.2, 0.36, 0.18), bank * 0.6);
  vec3 shallow = vec3(0.27, 0.62, 0.6);
  vec3 deep = vec3(0.05, 0.3, 0.42);
  vec3 body = mix(shallow, deep, smoothstep(0.1, 1.8, vShore.x));
  vec3 color = mix(body, sky, clamp(fresnel * reflection, 0.0, 0.85));
  float sparkle = pow(max(dot(r, sunDirection), 0.0), 160.0);
  color += sunColor * sparkle * 1.4 * reflection;

  // Écume au bord de l'eau.
  float edge = 1.0 - smoothstep(0.0, 1.2, vShore.y);
  float foam = edge * smoothstep(0.45, 0.85, noise(p * 5.0 + vec2(time * 0.25, 0.0)) + edge * 0.35);

  // Sillage en V derrière le bateau du joueur.
  vec2 rel = vWorld.xz - boat.xy;
  vec2 forward = boat.zw;
  float along = -dot(rel, forward);
  float across = abs(rel.x * forward.y - rel.y * forward.x);
  float strength = clamp(boatSpeed / 4.0, 0.0, 1.0) * step(0.0, along);
  float arms = (1.0 - smoothstep(0.0, 0.5, abs(across - (0.85 + along * 0.33)))) * (1.0 - smoothstep(2.0, 18.0, along));
  float trail = (1.0 - smoothstep(0.0, 0.8, across)) * (1.0 - smoothstep(0.0, 8.0, along)) * 0.7;
  float churn = smoothstep(0.25, 0.75, noise(vec2(along * 1.8 - time * 2.0, across * 2.5)));
  foam = max(foam, (arms + trail) * strength * churn);

  color = mix(color, vec3(0.94, 0.97, 0.98), clamp(foam, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(grade(applyFog(color, length(toEye), 1.0)), 1.0);
}`;

export const SKY_VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDirection;
void main(void) {
  vDirection = position;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

export const SKY_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vDirection;
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform vec3 skyZenith;
uniform vec3 skyHorizon;
uniform float time;
${NOISE}
${GRADE}
float clouds(vec2 p) {
  return 0.5 * noise(p) + 0.25 * noise(p * 2.1 + 3.0) + 0.125 * noise(p * 4.3 + 7.0) + 0.0625 * noise(p * 8.7 + 1.0);
}
void main(void) {
  vec3 d = normalize(vDirection);
  float up = clamp(d.y, -0.2, 1.0);
  vec3 color = mix(skyHorizon, skyZenith, pow(max(up, 0.0), 0.6));
  float sun = max(dot(d, sunDirection), 0.0);
  color += sunColor * (pow(sun, 700.0) * 1.6 + pow(sun, 10.0) * 0.16);
  if (d.y > 0.0) {
    vec2 p = d.xz / (d.y + 0.15) * 1.4 + vec2(time * 0.005, time * 0.002);
    float cover = smoothstep(0.52, 0.8, clouds(p));
    color = mix(color, vec3(1.0, 0.99, 0.97), cover * 0.8 * smoothstep(0.0, 0.2, d.y));
  }
  gl_FragColor = vec4(grade(color), 1.0);
}`;

export const SHADOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUV;
varying vec3 vWorld;
uniform float opacity;
${GRADE}
void main(void) {
  float r = length(vUV - 0.5) * 2.0;
  gl_FragColor = vec4(grade(vec3(0.02, 0.08, 0.1)), (1.0 - smoothstep(0.35, 1.0, r)) * opacity);
}`;
