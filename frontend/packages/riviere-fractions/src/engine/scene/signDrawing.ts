// Dessin d'un panneau de réponse sur un canevas : planche claire, cadre de bois, et le texte reçu (un nombre, ou une
// fraction en étages). La scène ne sait pas ce que le texte veut dire : elle le dessine tel qu'on le lui donne.

export type SignText = { kind: "stacked"; numerator: string; denominator: string } | { kind: "text"; text: string };

export type SignMark = "none" | "correct" | "wrong";

export const SIGN_CANVAS_WIDTH = 384;
export const SIGN_CANVAS_HEIGHT = 236;

const INK = "#3a2210";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawSign(ctx: CanvasRenderingContext2D, label: SignText | null, mark: SignMark): void {
  const w = SIGN_CANVAS_WIDTH;
  const h = SIGN_CANVAS_HEIGHT;
  ctx.clearRect(0, 0, w, h);
  // Cadre de bois.
  ctx.fillStyle = "#6b4226";
  roundedRect(ctx, 0, 0, w, h, 26);
  ctx.fill();
  // Planche claire, légèrement dégradée.
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#f6e8c8");
  gradient.addColorStop(1, "#e7d3a6");
  ctx.fillStyle = gradient;
  roundedRect(ctx, 16, 16, w - 32, h - 32, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(90, 58, 30, 0.35)";
  ctx.lineWidth = 3;
  roundedRect(ctx, 24, 24, w - 48, h - 48, 12);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = w / 2;
  if (label?.kind === "text") {
    ctx.font = `800 132px ${FONT}`;
    ctx.fillText(label.text, cx, h / 2 + 6);
  } else if (label?.kind === "stacked") {
    ctx.font = `800 84px ${FONT}`;
    ctx.fillText(label.numerator, cx, h / 2 - 48);
    ctx.fillText(label.denominator, cx, h / 2 + 58);
    ctx.fillRect(cx - 62, h / 2 + 2, 124, 9);
  }

  if (mark !== "none") {
    const mx = w - 58;
    const my = 58;
    ctx.fillStyle = mark === "correct" ? "#2f8f3a" : "#c62828";
    ctx.beginPath();
    ctx.arc(mx, my, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (mark === "correct") {
      ctx.moveTo(mx - 17, my + 1);
      ctx.lineTo(mx - 4, my + 15);
      ctx.lineTo(mx + 19, my - 13);
    } else {
      ctx.moveTo(mx - 15, my - 15);
      ctx.lineTo(mx + 15, my + 15);
      ctx.moveTo(mx + 15, my - 15);
      ctx.lineTo(mx - 15, my + 15);
    }
    ctx.stroke();
  }
}
