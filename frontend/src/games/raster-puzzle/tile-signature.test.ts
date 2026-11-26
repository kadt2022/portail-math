import { afterEach, describe, expect, it, vi } from "vitest";

import { equivalenceClasses, readTileClasses, sameTile, tileSignature } from "./tile-signature";

const SIZE = 48;

/** Pixels RGBA d'un morceau uniforme de la couleur donnée. */
function flat(value: number, width = SIZE, height = SIZE, rgb: [number, number, number] = [value, value, value]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let at = 0; at < data.length; at += 4) data.set([...rgb, 255], at);
  return data;
}

/** Même morceau avec un petit carré d'une autre couleur. */
function withSquare(base: Uint8ClampedArray, left: number, top: number, side: number, value: number) {
  const data = base.slice();
  for (let y = top; y < top + side; y += 1) for (let x = left; x < left + side; x += 1) data.set([value, value, value, 255], (y * SIZE + x) * 4);
  return data;
}

const signature = (pixels: Uint8ClampedArray) => tileSignature(pixels, SIZE, SIZE);

describe("empreinte et équivalence des morceaux", () => {
  it("deux morceaux de fond blanc sont équivalents, même avec le léger bruit de compression d'un WebP", () => {
    expect(sameTile(signature(flat(255)), signature(flat(255)))).toBe(true);
    expect(sameTile(signature(flat(255)), signature(flat(254)))).toBe(true);
    // Au-delà d’un niveau d’écart moyen, ce n’est plus du bruit : c’est un autre fond.
    expect(sameTile(signature(flat(255)), signature(flat(252)))).toBe(false);
  });

  it("deux morceaux seulement ressemblants ne sont pas équivalents : un dégradé de ciel, un autre fond, un point de couleur", () => {
    expect(sameTile(signature(flat(255)), signature(flat(240)))).toBe(false);
    expect(sameTile(signature(flat(200, SIZE, SIZE, [135, 206, 235])), signature(flat(200, SIZE, SIZE, [120, 200, 235])))).toBe(false);
    // Un minuscule détail (un carré de 3 pixels, comme un poil ou le coin d'un objet) suffit à les distinguer.
    expect(sameTile(signature(flat(255)), signature(withSquare(flat(255), 20, 20, 3, 0)))).toBe(false);
    expect(sameTile(signature(flat(255)), signature(withSquare(flat(255), 20, 20, 1, 0)))).toBe(false);
  });

  it("deux morceaux qui contiennent le même détail à des endroits différents ne sont pas équivalents", () => {
    const a = withSquare(flat(255), 4, 4, 6, 0);
    const b = withSquare(flat(255), 36, 36, 6, 0);
    expect(sameTile(signature(a), signature(b))).toBe(false);
    expect(sameTile(signature(a), signature(a))).toBe(true);
  });

  it("refuse de comparer des empreintes de tailles différentes", () => {
    expect(sameTile([1, 2, 3], [1, 2])).toBe(false);
  });

  it("numérote les classes : les morceaux identiques partagent un numéro, les autres en ont un à eux", () => {
    const white = signature(flat(255));
    const nearWhite = signature(flat(254));
    const grey = signature(flat(128));
    const dotted = signature(withSquare(flat(255), 10, 10, 4, 0));
    expect(equivalenceClasses([white, grey, nearWhite, dotted, grey])).toEqual([0, 1, 0, 2, 1]);
  });

  it("compare toujours au premier morceau de la classe : une dérive lente ne fusionne pas des morceaux différents", () => {
    // 255, 254, 253, 252 : chaque voisin est proche du suivant, mais 253 est loin de 255.
    expect(equivalenceClasses([255, 254, 253, 252].map((value) => signature(flat(value))))).toEqual([0, 0, 1, 1]);
  });

  it("calcule l'empreinte d'un morceau plus petit que la grille de mesure sans diviser par zéro", () => {
    const tiny = flat(200, 3, 3);
    expect(tileSignature(tiny, 3, 3)).toHaveLength(8 * 8 * 3);
    expect(tileSignature(tiny, 3, 3).every((value) => value === 200)).toBe(true);
  });
});

describe("lecture de l'image", () => {
  afterEach(() => vi.restoreAllMocks());

  const fakeImage = { naturalWidth: 96, naturalHeight: 96 } as unknown as HTMLImageElement;

  it("regroupe les morceaux blancs d'une image lue sur un canevas", () => {
    // Image 2×2 de 48 px : trois morceaux blancs et un morceau avec un détail.
    const tiles = [flat(255), flat(255), flat(255), withSquare(flat(255), 10, 10, 8, 0)];
    let read = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: () => undefined,
      getImageData: () => ({ data: tiles[read++] }),
    } as unknown as CanvasRenderingContext2D);
    expect(readTileClasses(fakeImage, 2)).toEqual([0, 0, 0, 1]);
  });

  it("renvoie null quand la lecture est impossible : le jeu traite alors chaque morceau comme unique", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(readTileClasses(fakeImage, 2)).toBeNull();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("canevas contaminé");
    });
    expect(readTileClasses(fakeImage, 2)).toBeNull();
    expect(readTileClasses({ naturalWidth: 0, naturalHeight: 0 } as unknown as HTMLImageElement, 2)).toBeNull();
  });
});
