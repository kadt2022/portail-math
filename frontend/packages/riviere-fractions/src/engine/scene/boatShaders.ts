import { FOG } from "./shaders";

// Matériau du bateau du joueur, en GLSL ES 1.0. Un seul matériau pour toute la coque, le moteur et l'hélice : la
// finition de chaque sommet (dans l'alpha de sa couleur) choisit entre peinture brillante, tissu mat, chrome ou
// lumière ; la décoration de la coque (bandeau orange, vagues turquoise, filets rouge et blanc, médaillon à l'étoile
// jaune) est dessinée ici, sans texture, nette à toutes les distances.

export const BOAT_VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;
attribute vec2 uv2;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vColor;
varying vec4 vPaint;
void main(void) {
  vec4 w = world * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(world) * normal;
  vColor = color;
  vPaint = vec4(uv, uv2);
  gl_Position = viewProjection * w;
}`;

export const BOAT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vColor;
varying vec4 vPaint;
uniform vec3 eyePosition;
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform vec3 skyLight;
uniform vec3 groundLight;
uniform vec3 skyZenith;
uniform vec3 skyHorizon;
uniform vec3 fillDirection;
uniform float pulse;
${FOG}

const float SOFT = 0.007;

float band(float x, float center, float halfWidth) {
  return 1.0 - smoothstep(halfWidth - SOFT, halfWidth + SOFT, abs(x - center));
}

// Étoile à cinq branches (distance signée, négative à l'intérieur), pointe vers le haut. Écrite pour Yamba : on replie
// l'angle sur une demi-branche, puis on mesure la distance au segment qui va de la pointe au creux entre deux branches.
float star5(vec2 p, float outer, float inner) {
  float sector = 1.2566371;
  float a = atan(p.x, p.y);
  a = abs(mod(a + sector * 0.5, sector) - sector * 0.5);
  vec2 q = length(p) * vec2(sin(a), cos(a));
  vec2 tip = vec2(0.0, outer);
  vec2 edge = inner * vec2(sin(sector * 0.5), cos(sector * 0.5)) - tip;
  vec2 w = q - tip;
  float t = clamp(dot(w, edge) / dot(edge, edge), 0.0, 1.0);
  float side = edge.x * w.y - edge.y * w.x;
  return length(w - edge * t) * (side > 0.0 ? 1.0 : -1.0);
}

// Décoration du flanc. along : m depuis le tableau arrière ; drop : m sous le plat-bord ; rise : m au-dessus du
// bouchain.
vec3 livery(float along, float drop, float rise) {
  vec3 navy = vec3(0.05, 0.11, 0.38);
  vec3 orange = vec3(0.98, 0.4, 0.07);
  vec3 cream = vec3(0.99, 0.93, 0.8);
  vec3 turquoise = vec3(0.1, 0.7, 0.94);
  vec3 foam = vec3(0.62, 0.94, 1.0);
  vec3 azure = vec3(0.24, 0.47, 1.0);
  vec3 red = vec3(0.88, 0.13, 0.1);
  vec3 white = vec3(0.97, 0.97, 0.95);
  vec3 gold = vec3(1.0, 0.84, 0.14);

  vec3 c = navy * (0.72 + 0.28 * smoothstep(0.0, 0.45, rise));

  // Deux vagues qui montent de la poupe vers le médaillon : crête claire, creux plus sombre.
  if (along < 3.4) {
    float fade = 1.0 - smoothstep(2.8, 3.4, along);
    float w1 = 0.44 - 0.13 * smoothstep(0.3, 3.2, along) + 0.05 * sin(along * 2.1 + 0.4);
    float t1 = (0.082 + 0.024 * sin(along * 1.3 + 1.0)) * fade;
    float m1 = 1.0 - smoothstep(t1 - SOFT, t1 + SOFT, abs(drop - w1));
    float inWave = clamp((drop - (w1 - t1)) / max(2.0 * t1, 1e-3), 0.0, 1.0);
    vec3 wave = mix(foam, turquoise, smoothstep(0.18, 0.34, inWave));
    wave = mix(wave, vec3(0.04, 0.48, 0.78), smoothstep(0.72, 0.86, inWave));
    c = mix(c, wave, m1 * smoothstep(0.004, 0.012, t1));
    float w2 = w1 + 0.165 + 0.035 * sin(along * 2.9 + 1.1);
    float t2 = 0.04 * (1.0 - smoothstep(2.1, 3.0, along));
    c = mix(c, azure, (1.0 - smoothstep(t2 - SOFT, t2 + SOFT, abs(drop - w2))) * smoothstep(0.003, 0.01, t2));
  }

  // Filet rouge et ligne blanche juste au-dessus du bouchain.
  c = mix(c, red, band(rise, 0.145, 0.03));
  c = mix(c, white, band(rise, 0.082, 0.011));

  // Bandeau orange sous le plat-bord, large à la poupe, affiné vers la proue, souligné d'un filet crème.
  float top = mix(0.19, 0.095, smoothstep(0.3, 3.9, along));
  c = mix(c, cream, 1.0 - smoothstep(top + 0.017 - SOFT, top + 0.017 + SOFT, drop));
  c = mix(c, orange, 1.0 - smoothstep(top - SOFT, top + SOFT, drop));

  // Médaillon rouge-orangé et son étoile jaune, vers l'avant (calculés seulement autour du médaillon).
  vec2 q = vec2(along - 3.86, 0.31 - drop);
  if (abs(q.x) < 0.3 && abs(q.y) < 0.2) {
    float r = length(q / vec2(0.28, 0.18));
    vec3 medal = mix(vec3(1.0, 0.45, 0.1), red, smoothstep(0.15, 1.0, r));
    c = mix(c, medal, 1.0 - smoothstep(1.0 - 0.02, 1.0 + 0.02, r));
    float s = star5(q, 0.135, 0.057);
    c = mix(c, vec3(0.75, 0.42, 0.05), 1.0 - smoothstep(0.0, SOFT * 1.5, s - 0.011));
    c = mix(c, gold, 1.0 - smoothstep(-SOFT, SOFT, s));
  }
  return c;
}

vec3 environment(vec3 r) {
  vec3 c = mix(vec3(0.1, 0.24, 0.26), skyHorizon, smoothstep(-0.22, 0.03, r.y));
  return mix(c, skyZenith, smoothstep(0.06, 0.75, r.y));
}

void main(void) {
  vec3 base = vColor.rgb;
  float finish = vColor.a;
  if (vPaint.x >= 0.0) base = livery(vPaint.x, vPaint.y, vPaint.z);
  vec3 toEye = eyePosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;

  if (finish >= 2.0) {
    float strength = finish >= 4.0 ? (finish - 3.0) * (0.45 + 0.55 * pulse) : finish - 1.0;
    gl_FragColor = vec4(grade(applyFog(base * strength, dist, 0.7)), 1.0);
    return;
  }

  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  float metal = step(1.25, finish);
  float gloss = metal > 0.5 ? 1.0 : clamp(finish, 0.0, 1.0);
  float light = dot(n, sunDirection);
  float diffuse = mix(max(light, 0.0), max((light + 0.4) / 1.4, 0.0), 0.45);
  vec3 ambient = mix(groundLight, skyLight, n.y * 0.5 + 0.5);
  // Lumière d'appoint, opposée au soleil : les flancs à l'ombre restent lisibles, comme dans un rendu de studio.
  float fill = max(dot(n, fillDirection), 0.0);
  ambient += skyLight * fill * 0.32;
  float facing = max(dot(n, v), 0.0);
  // Reflets et éclat du soleil : seulement pour les surfaces brillantes (tissus, bois et peau restent mats).
  vec3 env = vec3(0.0);
  float fresnel = 0.0;
  float spec = 0.0;
  if (gloss > 0.1) {
    env = environment(reflect(-v, n));
    fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
    vec3 h = normalize(sunDirection + v);
    spec = pow(max(dot(n, h), 0.0), mix(10.0, 160.0, gloss * gloss)) * gloss;
  }

  vec3 color;
  if (metal > 0.5) {
    color = env * base * 1.05 + base * (ambient + sunColor * diffuse) * 0.18 + sunColor * spec * 2.2;
  } else {
    color = base * (ambient + sunColor * diffuse) + env * fresnel * gloss * 0.45 + sunColor * spec * (0.12 + 0.9 * gloss);
    color += skyLight * pow(1.0 - facing, 3.0) * 0.1;
  }
  gl_FragColor = vec4(grade(applyFog(color, dist, 1.0)), 1.0);
}`;
