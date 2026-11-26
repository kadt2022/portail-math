// Équivalence visuelle des morceaux. Deux morceaux sont interchangeables seulement s'ils sont réellement identiques à l'image près
// (par exemple deux morceaux de fond blanc) : « ressemblants » ne suffit pas. L'empreinte d'un morceau est la couleur moyenne de
// chacune des cases d'une petite grille ; la comparaison est stricte, et se fait toujours avec le premier morceau de la classe.

const GRID = 8;
/** Écart maximal toléré sur une couleur d'une case (bruit de compression des WebP, de l'ordre de 1 niveau sur 255). */
const MAX_DIFF = 3;
/** Écart moyen toléré sur l'ensemble du morceau. */
const MEAN_DIFF = 1;

/** Empreinte d'un morceau : moyenne rouge, verte et bleue de chaque case d'une grille GRID × GRID, à partir de ses pixels RGBA. */
export function tileSignature(pixels: ArrayLike<number>, width: number, height: number, grid: number = GRID): number[] {
  const signature: number[] = [];
  for (let row = 0; row < grid; row += 1) {
    const top = Math.floor((row * height) / grid);
    const bottom = Math.max(top + 1, Math.floor(((row + 1) * height) / grid));
    for (let column = 0; column < grid; column += 1) {
      const left = Math.floor((column * width) / grid);
      const right = Math.max(left + 1, Math.floor(((column + 1) * width) / grid));
      const sums = [0, 0, 0];
      let count = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const at = (y * width + x) * 4;
          sums[0] += pixels[at];
          sums[1] += pixels[at + 1];
          sums[2] += pixels[at + 2];
          count += 1;
        }
      }
      signature.push(sums[0] / count, sums[1] / count, sums[2] / count);
    }
  }
  return signature;
}

/** Les deux empreintes décrivent le même morceau (à l'écart de compression près). */
export function sameTile(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  let total = 0;
  for (let index = 0; index < a.length; index += 1) {
    const diff = Math.abs(a[index] - b[index]);
    if (diff > MAX_DIFF) return false;
    total += diff;
  }
  return total / a.length <= MEAN_DIFF;
}

/** Numéro de classe de chaque morceau : les morceaux équivalents partagent le même numéro. */
export function equivalenceClasses(signatures: number[][]): number[] {
  const representatives: number[][] = [];
  return signatures.map((signature) => {
    const found = representatives.findIndex((representative) => sameTile(representative, signature));
    if (found >= 0) return found;
    representatives.push(signature);
    return representatives.length - 1;
  });
}

/**
 * Lit les pixels de l'image (déjà chargée) et en déduit la classe de chaque morceau. Renvoie null quand la lecture est impossible
 * (pas de canevas, image non lisible) : le jeu traite alors chaque morceau comme unique, ce qui reste juste, sans équivalence.
 */
export function readTileClasses(image: CanvasImageSource & { naturalWidth: number; naturalHeight: number }, size: number): number[] | null {
  try {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height || typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const tileWidth = Math.floor(width / size);
    const tileHeight = Math.floor(height / size);
    const signatures: number[][] = [];
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const data = context.getImageData(column * tileWidth, row * tileHeight, tileWidth, tileHeight);
        signatures.push(tileSignature(data.data, tileWidth, tileHeight));
      }
    }
    return equivalenceClasses(signatures);
  } catch {
    return null;
  }
}
