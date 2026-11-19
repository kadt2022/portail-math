// Ondulation de l'eau sur le décor de la bannière de Léo (ciel, ville, route).
//
// Le décor est recomposé dans un canvas WebGL puis déformé par un petit programme graphique : des ondes circulaires
// partent du pointeur, s'éloignent en s'atténuant et plient réellement les pixels de l'image. Le canvas n'est visible
// que pendant que des ondes existent ; au repos, la bannière reste le décor HTML normal (aucun calcul, aucune différence).
// Sans WebGL (ou si l'utilisateur réduit les animations), rien ne se produit.

/** Durée de vie d'une onde, en secondes. */
export const RIPPLE_LIFETIME = 2.6;
const MAX_RIPPLES = 6;
/** Une nouvelle onde part après ce déplacement (px) et ce délai (ms) : l'ondulation suit la souris sans la saturer. */
export const EMIT_DISTANCE = 36;
export const EMIT_INTERVAL = 120;
/** Pointeur immobile sur la bannière : une goutte tombe de nouveau à sa position après ce délai (ms), tant qu’il reste là. */
export const DRIP_INTERVAL = 2000;

export interface EmitState {
  x: number;
  y: number;
  time: number;
}

/** Décide si le déplacement du pointeur doit émettre une nouvelle onde (fonction pure, testée). */
export function shouldEmit(last: EmitState | null, x: number, y: number, now: number): boolean {
  if (!last) return true;
  return now - last.time >= EMIT_INTERVAL && Math.hypot(x - last.x, y - last.y) >= EMIT_DISTANCE;
}

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Chaque onde (x, y en px depuis le bas-gauche, âge en s, force) est un paquet d'ondes circulaire dont le front avance.
// Le décalage radial est modéré (quelques pixels) ; un léger éclairage des crêtes rend l'onde lisible sous le dégradé.
const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uAmp;
uniform vec4 uRipple[${MAX_RIPPLES}];
void main() {
  vec2 p = vUv * uRes;
  vec2 offset = vec2(0.0);
  float light = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipple[i];
    if (r.w <= 0.0) continue;
    vec2 d = p - r.xy;
    float dist = length(d) + 0.001;
    float x = dist - 240.0 * r.z;
    float env = exp(-x * x / (2.0 * 58.0 * 58.0));
    float fade = r.w * exp(-r.z * 1.5) * exp(-dist / 700.0);
    // Adoucit le centre de l’onde : pas de déformation brusque juste sous le pointeur.
    float near = smoothstep(0.0, 60.0, dist);
    offset += d / dist * sin(x * 0.14) * env * fade * near * uAmp;
    light += cos(x * 0.14) * env * fade;
  }
  // Plusieurs ondes qui se croisent s’additionnent, mais le décalage total reste modéré (jamais d’image brouillée).
  float len = length(offset);
  offset *= min(1.0, uAmp * 1.4 / max(len, 0.001));
  vec3 color = texture2D(uTex, (p - offset) / uRes).rgb;
  color *= 1.0 + light * 0.09;
  color += max(light, 0.0) * 0.04;
  gl_FragColor = vec4(color, 1.0);
}`;

function coverRect(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number, posX: number, posY: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(image, x + (w - dw) * posX, y + (h - dh) * posY, dw, dh);
  ctx.restore();
}

export interface WaterRippleOptions {
  hero: HTMLElement;
  canvas: HTMLCanvasElement;
  sky: HTMLImageElement;
  city: HTMLImageElement;
  road: HTMLElement;
  roadSrc: string;
}

export interface WaterRipple {
  /** Le pointeur se déplace dans la bannière (coordonnées client). */
  move(clientX: number, clientY: number): void;
  /** Un toucher : une onde unique, un peu plus forte. */
  touch(clientX: number, clientY: number): void;
  /** Le pointeur quitte la bannière : plus d'onde nouvelle, celles en cours s'éteignent. */
  leave(): void;
  dispose(): void;
}

export function createWaterRipple(options: WaterRippleOptions): WaterRipple | null {
  if (typeof WebGLRenderingContext === "undefined") return null;
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const { hero, canvas, sky, city, road, roadSrc } = options;
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uAmp = gl.getUniformLocation(program, "uAmp");
  const uRipple = gl.getUniformLocation(program, "uRipple");
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const roadImage = new Image();
  roadImage.decoding = "async";
  roadImage.src = roadSrc;

  // Ondes : x, y (px CSS, origine en bas à gauche), âge (s), force ; force 0 = libre.
  const ripples = new Float32Array(MAX_RIPPLES * 4);
  let next = 0;
  let last: EmitState | null = null;
  let inside = false;
  let pointer = { x: 0, y: 0 };
  let dripTimer = 0;
  let raf = 0;
  let lastFrame = 0;
  let visible = false;
  let width = 0;
  let height = 0;
  let disposed = false;

  // Recompose ciel, ville et route à la taille réelle de la bannière (mêmes rectangles que le décor HTML) puis l'envoie à la carte graphique.
  const buildTexture = () => {
    const heroRect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, 1600 / Math.max(heroRect.width, 1));
    width = heroRect.width;
    height = heroRect.height;
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const surface = document.createElement("canvas");
    surface.width = w;
    surface.height = h;
    const ctx = surface.getContext("2d");
    if (!ctx || !sky.naturalWidth || !city.naturalWidth || !roadImage.naturalWidth) return false;
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - heroRect.left) * scale, y: (r.top - heroRect.top) * scale, w: r.width * scale, h: r.height * scale };
    };
    ctx.fillStyle = "#0b0c14";
    ctx.fillRect(0, 0, w, h);
    const s = rect(sky);
    coverRect(ctx, sky, s.x, s.y, s.w, s.h, 0.5, 0.4);
    const c = rect(city);
    ctx.globalAlpha = Number.parseFloat(getComputedStyle(city).opacity) || 1;
    coverRect(ctx, city, c.x, c.y, c.w, c.h, 0.5, 1);
    ctx.globalAlpha = 1;
    const r = rect(road);
    const tile = r.h * (roadImage.naturalWidth / roadImage.naturalHeight);
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    for (let x = r.x; x < r.x + r.w; x += tile) ctx.drawImage(roadImage, x, r.y, tile + 0.5, r.h);
    ctx.restore();

    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, surface);
    return true;
  };

  const show = (on: boolean) => {
    if (visible === on) return;
    visible = on;
    canvas.style.visibility = on ? "visible" : "hidden";
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    let alive = false;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (ripples[i * 4 + 3] <= 0) continue;
      ripples[i * 4 + 2] += dt;
      if (ripples[i * 4 + 2] > RIPPLE_LIFETIME) ripples[i * 4 + 3] = 0;
      else alive = true;
    }
    if (!alive) {
      show(false);
      return;
    }
    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uAmp, Math.min(5.5, Math.max(3, height * 0.014)));
    gl.uniform4fv(uRipple, ripples);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };

  // Souris immobile : la prochaine goutte tombe à la dernière position du pointeur. Chaque onde (ou déplacement) relance le délai.
  const scheduleDrip = () => {
    window.clearTimeout(dripTimer);
    if (!inside || disposed) return;
    dripTimer = window.setTimeout(() => {
      if (inside) emit(pointer.x, pointer.y, 0.8);
    }, DRIP_INTERVAL);
  };

  const emit = (clientX: number, clientY: number, strength: number) => {
    if (disposed) return;
    if (!visible) {
      // Première onde après un repos : le décor est recomposé (la bannière a pu être redimensionnée).
      if (!buildTexture()) return;
    }
    const rect = hero.getBoundingClientRect();
    const i = next;
    next = (next + 1) % MAX_RIPPLES;
    ripples[i * 4] = clientX - rect.left;
    ripples[i * 4 + 1] = rect.height - (clientY - rect.top);
    ripples[i * 4 + 2] = 0;
    ripples[i * 4 + 3] = strength;
    if (!visible) {
      lastFrame = performance.now();
      // Première image dessinée avant d'afficher le canvas : pas de saut visible.
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uAmp, Math.min(5.5, Math.max(3, height * 0.014)));
      gl.uniform4fv(uRipple, ripples);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      show(true);
    }
    if (!raf) raf = requestAnimationFrame(frame);
    scheduleDrip();
  };

  return {
    move(clientX, clientY) {
      const now = performance.now();
      pointer = { x: clientX, y: clientY };
      if (!inside) {
        inside = true;
        last = { x: clientX, y: clientY, time: now };
        emit(clientX, clientY, 1);
        return;
      }
      if (shouldEmit(last, clientX, clientY, now)) {
        last = { x: clientX, y: clientY, time: now };
        emit(clientX, clientY, 0.6);
      }
    },
    touch(clientX, clientY) {
      last = { x: clientX, y: clientY, time: performance.now() };
      emit(clientX, clientY, 1.1);
    },
    leave() {
      inside = false;
      last = null;
      window.clearTimeout(dripTimer);
    },
    dispose() {
      disposed = true;
      window.clearTimeout(dripTimer);
      if (raf) cancelAnimationFrame(raf);
      show(false);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
