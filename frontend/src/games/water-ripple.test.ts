import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DRIP_INTERVAL, EMIT_DISTANCE, EMIT_INTERVAL, createWaterRipple, shouldEmit } from "./water-ripple";

describe("émission des ondes de la bannière de Léo", () => {
  it("émet toujours la première onde", () => {
    expect(shouldEmit(null, 10, 10, 0)).toBe(true);
  });

  it("n'émet pas tant que le pointeur n'a pas assez bougé", () => {
    const last = { x: 100, y: 100, time: 0 };
    expect(shouldEmit(last, 100 + EMIT_DISTANCE - 1, 100, EMIT_INTERVAL * 5)).toBe(false);
  });

  it("n'émet pas trop vite, même si le pointeur va loin", () => {
    const last = { x: 100, y: 100, time: 1000 };
    expect(shouldEmit(last, 400, 100, 1000 + EMIT_INTERVAL - 1)).toBe(false);
  });

  it("émet quand le pointeur a bougé assez et que le délai est écoulé", () => {
    const last = { x: 100, y: 100, time: 1000 };
    expect(shouldEmit(last, 100 + EMIT_DISTANCE, 100, 1000 + EMIT_INTERVAL)).toBe(true);
  });
});

// --- Le contrôleur WebGL, avec un faux contexte graphique (jsdom n'a pas de WebGL) ---

function fakeGl(options: { compile?: boolean; link?: boolean } = {}) {
  const gl: Record<string, unknown> = {};
  for (const name of [
    "shaderSource", "compileShader", "attachShader", "linkProgram", "useProgram", "bindBuffer", "bufferData",
    "enableVertexAttribArray", "vertexAttribPointer", "bindTexture", "texParameteri", "pixelStorei", "viewport",
    "texImage2D", "uniform2f", "uniform1f", "uniform4fv", "drawArrays",
  ]) gl[name] = vi.fn();
  Object.assign(gl, {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7,
    TEXTURE_2D: 8, TEXTURE_MIN_FILTER: 9, TEXTURE_MAG_FILTER: 10, TEXTURE_WRAP_S: 11, TEXTURE_WRAP_T: 12, LINEAR: 13,
    CLAMP_TO_EDGE: 14, UNPACK_FLIP_Y_WEBGL: 15, RGBA: 16, UNSIGNED_BYTE: 17, TRIANGLE_STRIP: 18,
    createShader: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    createTexture: vi.fn(() => ({})),
    getShaderParameter: vi.fn(() => options.compile !== false),
    getProgramParameter: vi.fn(() => options.link !== false),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    getExtension: vi.fn(() => ({ loseContext: vi.fn() })),
  });
  return gl;
}

const fake2d = () => ({
  fillStyle: "",
  globalAlpha: 1,
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});

function setup(gl: Record<string, unknown> | null = fakeGl()) {
  vi.stubGlobal("WebGLRenderingContext", class {});
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 400;
      naturalHeight = 100;
      decoding = "";
      src = "";
    },
  );
  const ctx2d = fake2d();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => (type === "webgl" ? gl : ctx2d)) as never);
  const hero = document.createElement("a");
  const canvas = document.createElement("canvas");
  const road = document.createElement("span");
  const sky = document.createElement("img");
  const city = document.createElement("img");
  for (const image of [sky, city]) {
    Object.defineProperty(image, "naturalWidth", { value: 200, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: 100, configurable: true });
  }
  hero.append(canvas, road, sky, city);
  document.body.append(hero);
  hero.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 300, right: 800, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
  return { hero, canvas, sky, city, road, roadSrc: "road.webp", gl: gl as Record<string, unknown>, ctx2d };
}

describe("ondulation WebGL (faux contexte graphique)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("ne démarre pas sans WebGL, avec les animations réduites ou si les programmes graphiques échouent", () => {
    const base = setup(null);
    expect(createWaterRipple(base)).toBeNull();

    const failing = setup(fakeGl({ compile: false }));
    expect(createWaterRipple(failing)).toBeNull();
    const failingLink = setup(fakeGl({ link: false }));
    expect(createWaterRipple(failingLink)).toBeNull();

    const reduced = setup();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(createWaterRipple(reduced)).toBeNull();
    vi.unstubAllGlobals();

    const noGl = setup();
    vi.stubGlobal("WebGLRenderingContext", undefined);
    expect(createWaterRipple(noGl)).toBeNull();
  });

  it("affiche le canvas à la première onde, le cache quand les ondes sont éteintes", () => {
    const options = setup();
    const ripple = createWaterRipple(options);
    expect(ripple).not.toBeNull();
    ripple!.move(100, 100);
    expect(options.canvas.style.visibility).toBe("visible");
    expect(options.gl.drawArrays).toHaveBeenCalled();
    ripple!.leave();
    // Les ondes vivent 2,6 s : après ce délai le canvas est de nouveau caché.
    for (let i = 0; i < 200; i++) vi.advanceTimersByTime(20);
    expect(options.canvas.style.visibility).toBe("hidden");
  });

  it("souris immobile : une nouvelle goutte tombe toutes les 2 s, et plus rien après la sortie", () => {
    const options = setup();
    const ripple = createWaterRipple(options)!;
    ripple.move(200, 120);
    const uniform = options.gl.uniform4fv as ReturnType<typeof vi.fn>;
    const readRipples = () => Array.from(uniform.mock.calls.at(-1)?.[1] as Float32Array);
    const activeDrops = () => readRipples().filter((_, i) => i % 4 === 3 && readRipples()[i] > 0).length;
    expect(activeDrops()).toBe(1);
    vi.advanceTimersByTime(DRIP_INTERVAL + 50);
    expect(activeDrops()).toBe(2);
    vi.advanceTimersByTime(DRIP_INTERVAL);
    expect(activeDrops()).toBeGreaterThanOrEqual(2);
    ripple.leave();
    for (let i = 0; i < 250; i++) vi.advanceTimersByTime(20);
    const calls = uniform.mock.calls.length;
    vi.advanceTimersByTime(DRIP_INTERVAL * 3);
    expect(uniform.mock.calls.length).toBe(calls);
    expect(options.canvas.style.visibility).toBe("hidden");
  });

  it("suit le pointeur : le déplacement émet de nouvelles ondes, pas la simple agitation", () => {
    const options = setup();
    const ripple = createWaterRipple(options)!;
    const draws = options.gl.drawArrays as ReturnType<typeof vi.fn>;
    ripple.move(100, 100);
    const initial = draws.mock.calls.length;
    ripple.move(102, 101);
    vi.advanceTimersByTime(EMIT_INTERVAL + 10);
    ripple.move(100 + EMIT_DISTANCE + 5, 100);
    vi.advanceTimersByTime(40);
    expect(draws.mock.calls.length).toBeGreaterThan(initial);
    ripple.dispose();
  });

  it("au toucher : une seule onde, sans gouttes répétées, et dispose libère tout", () => {
    const options = setup();
    const ripple = createWaterRipple(options)!;
    ripple.touch(50, 50);
    expect(options.canvas.style.visibility).toBe("visible");
    const uniform = options.gl.uniform4fv as ReturnType<typeof vi.fn>;
    const count = uniform.mock.calls.length;
    vi.advanceTimersByTime(DRIP_INTERVAL + 100);
    // Pas de goutte de plus : seules les images de l'onde en cours sont dessinées (au plus une toutes les ~16 ms).
    const drops = Array.from(uniform.mock.calls.at(-1)?.[1] as Float32Array).filter((_, i) => i % 4 === 3 && (uniform.mock.calls.at(-1)?.[1] as Float32Array)[i] > 0);
    expect(drops).toHaveLength(1);
    expect(uniform.mock.calls.length).toBeGreaterThan(count);
    ripple.dispose();
    expect(options.canvas.style.visibility).toBe("hidden");
  });

  it("n'affiche rien tant que le décor n'est pas chargé", () => {
    const options = setup();
    Object.defineProperty(options.sky, "naturalWidth", { value: 0 });
    const ripple = createWaterRipple(options)!;
    ripple.move(10, 10);
    expect(options.canvas.style.visibility).not.toBe("visible");
  });
});
