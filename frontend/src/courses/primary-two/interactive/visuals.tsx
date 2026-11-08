import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import bananaImage from "../../../assets/math-2p/banana-single.webp";
import type { ItemName, ProductName, ShapeName, SolidName, Visual } from "./types";
import styles from "./Interactive.module.css";

// Illustrations PROVISOIRES (SVG) des activités de 2e primaire.
//
// Ce fichier ne contient aucune règle mathématique : chaque visuel reçoit
// exactement les quantités décrites dans les données des leçons. Pour passer
// à des images réalistes, Crochet peut remplacer un glyphe (`ItemGlyph`,
// `ProductGlyph`, `SolidGlyph`…) par une <img> sans modifier les activités.
// Règle à conserver : un objet affiché = un objet comptable, jamais de nombre
// incrusté dans une collection à compter.

const NS = "primaryTwoLessons";

function Svg({ children, size = 34, viewBox = "0 0 40 40" }: { children: ReactNode; size?: number; viewBox?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function ItemGlyph({ item, size = 34 }: { item: ItemName; size?: number }) {
  switch (item) {
    case "banana":
      return <img src={bananaImage} alt="" width={size} height={size} className={styles.itemImage} />;
    case "seed":
      return <Svg size={size}><ellipse cx="20" cy="21" rx="9" ry="12" fill="#8a5a2b" /><ellipse cx="17" cy="16" rx="3" ry="5" fill="#b98352" /></Svg>;
    case "stick":
      return <Svg size={size} viewBox="0 0 12 40"><rect x="3" y="2" width="6" height="36" rx="3" fill="#c98b3d" stroke="#8a5a1f" strokeWidth="1" /></Svg>;
    case "orange":
      return <Svg size={size}><circle cx="20" cy="22" r="14" fill="#f08a1c" /><path d="M20 8c3-5 9-5 11-3-3 3-7 4-11 3z" fill="#3c8f3e" /><circle cx="15" cy="18" r="3" fill="#f7b267" /></Svg>;
    case "mango":
      return <Svg size={size}><ellipse cx="20" cy="22" rx="12" ry="15" transform="rotate(25 20 22)" fill="#f3b42c" /><path d="M24 7c4-3 9-2 10 0-3 2-7 2-10 0z" fill="#3c8f3e" /></Svg>;
    case "tomato":
      return <Svg size={size}><circle cx="20" cy="23" r="13" fill="#d63b2f" /><path d="M13 11l7 4 7-4-3 6h-8z" fill="#2f8a3a" /></Svg>;
    case "chalk":
      return <Svg size={size}><rect x="8" y="15" width="24" height="10" rx="3" fill="#fbfaf4" stroke="#9aa3a8" strokeWidth="2" /></Svg>;
    case "cap":
      return <Svg size={size}><circle cx="20" cy="20" r="13" fill="#2f6fb5" /><circle cx="20" cy="20" r="8" fill="none" stroke="#9cc3ee" strokeWidth="2" /></Svg>;
    case "token":
      return <Svg size={size}><circle cx="20" cy="20" r="13" fill="#f2c230" stroke="#b78a00" strokeWidth="2" /></Svg>;
    case "nut":
      return <Svg size={size}><circle cx="20" cy="23" r="12" fill="#a06a3a" /><path d="M9 18c4-9 18-9 22 0z" fill="#6b4220" /></Svg>;
    case "bottle":
      return <Svg size={size}><rect x="16" y="4" width="8" height="7" rx="2" fill="#2d6a8f" /><path d="M13 14c0-3 3-4 3-4h8s3 1 3 4v20a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill="#8fd0ee" stroke="#2d6a8f" strokeWidth="2" /></Svg>;
    case "beignet":
      return <Svg size={size}><circle cx="20" cy="21" r="13" fill="#d99a4e" /><circle cx="15" cy="17" r="2" fill="#f3d3a0" /><circle cx="24" cy="24" r="2" fill="#f3d3a0" /></Svg>;
    case "plant":
      return <Svg size={size}><path d="M20 36V18" stroke="#3d7a2a" strokeWidth="3" /><path d="M20 22c-9 0-12-8-12-8 8-1 12 3 12 8zM20 18c8 0 11-8 11-8-7-1-11 3-11 8z" fill="#5aa83b" /><rect x="12" y="33" width="16" height="4" rx="2" fill="#8a5a2b" /></Svg>;
    case "notebook":
      return <Svg size={size}><rect x="9" y="6" width="22" height="28" rx="2" fill="#3f78c4" /><path d="M14 13h13M14 18h13M14 23h13" stroke="#d7e6f8" strokeWidth="2" /></Svg>;
    case "bag":
      return <Svg size={size}><path d="M12 12h16l4 22H8z" fill="#d6b16b" stroke="#8a6a2b" strokeWidth="2" /><path d="M14 12c0-4 12-4 12 0" fill="none" stroke="#8a6a2b" strokeWidth="2" /></Svg>;
    case "bird":
      return <Svg size={size}><ellipse cx="19" cy="23" rx="12" ry="9" fill="#3a8fd1" /><circle cx="28" cy="16" r="6" fill="#3a8fd1" /><path d="M33 16l5 2-5 2z" fill="#f2a20c" /><circle cx="29" cy="15" r="1.5" fill="#1b2a36" /></Svg>;
    case "flower":
      return <Svg size={size}>{[0, 72, 144, 216, 288].map((angle) => <ellipse key={angle} cx="20" cy="11" rx="5" ry="8" fill="#e3609b" transform={`rotate(${angle} 20 20)`} />)}<circle cx="20" cy="20" r="5" fill="#f6c431" /></Svg>;
  }
}

function useItemName() {
  const { t } = useTranslation(NS);
  return (item: ItemName) => t(`common.items.${item}`);
}

function Collection({ item, count }: { item: ItemName; count: number }) {
  const name = useItemName();
  return (
    <ul className={styles.itemList} aria-label={name(item)}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={styles.itemCell} aria-label={name(item)}>
          <ItemGlyph item={item} />
        </li>
      ))}
    </ul>
  );
}

function Container({ kind, children }: { kind?: string; children: ReactNode }) {
  if (!kind || kind === "none") return <div className={styles.looseCollection}>{children}</div>;
  return <div className={`${styles.container} ${styles[`container_${kind}`] ?? ""}`}>{children}</div>;
}

export function Bundle({ size = 34 }: { size?: number }) {
  return (
    <span className={styles.bundle} aria-hidden="true" style={{ height: size + 6 }}>
      {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
    </span>
  );
}

export function TensView({ tens, units, item = "stick" }: { tens: number; units: number; item?: "stick" | "bag" }) {
  const { t } = useTranslation(NS);
  return (
    <div className={styles.tensView} role="img" aria-label={t("common.tensLabel", { tens, units })}>
      <div className={styles.tensGroup}>
        {Array.from({ length: tens }, (_, index) =>
          item === "bag" ? <span key={index} className={styles.bagTen}><ItemGlyph item="bag" size={42} /></span> : <Bundle key={index} />,
        )}
      </div>
      <div className={styles.unitsGroup}>
        {Array.from({ length: units }, (_, index) =>
          item === "bag" ? <ItemGlyph key={index} item="seed" size={22} /> : <span key={index} className={styles.singleStick} />,
        )}
      </div>
    </div>
  );
}

export function TenFrames({ filled, frames = 1 }: { filled: number; frames?: number }) {
  const { t } = useTranslation(NS);
  return (
    <div className={styles.tenFrames} role="img" aria-label={t("common.tenFrameLabel", { count: filled, frames })}>
      {Array.from({ length: frames }, (_, frame) => (
        <div className={styles.tenFrame} key={frame}>
          {Array.from({ length: 10 }, (_, cell) => (
            <span key={cell} className={frame * 10 + cell < filled ? styles.tenFrameFilled : undefined} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MoneyPiece({ value }: { value: number }) {
  const { t } = useTranslation(NS);
  const bill = value >= 500;
  return (
    <span className={bill ? styles.bill : styles.coin} role="img" aria-label={t("common.money", { value })}>
      <strong>{value}</strong>
      <small>FC</small>
    </span>
  );
}

export function ProductGlyph({ product }: { product: ProductName }) {
  switch (product) {
    case "pencil":
      return <Svg size={56} viewBox="0 0 60 60"><rect x="8" y="25" width="38" height="10" fill="#f2c230" /><path d="M46 25l10 5-10 5z" fill="#e8c9a0" /><rect x="4" y="25" width="5" height="10" fill="#e3609b" /></Svg>;
    case "eraser":
      return <Svg size={56} viewBox="0 0 60 60"><rect x="12" y="20" width="36" height="20" rx="4" fill="#f4a7b9" /><rect x="12" y="20" width="14" height="20" rx="4" fill="#5b8fd6" /></Svg>;
    case "notebook":
      return <Svg size={56} viewBox="0 0 60 60"><rect x="14" y="8" width="32" height="44" rx="3" fill="#3f78c4" /><path d="M20 18h20M20 25h20M20 32h20" stroke="#d7e6f8" strokeWidth="2" /></Svg>;
    case "ball":
      return <Svg size={56} viewBox="0 0 60 60"><circle cx="30" cy="30" r="20" fill="#f1f1f1" stroke="#333" strokeWidth="2" /><path d="M30 18l9 7-4 10h-10l-4-10z" fill="#333" /></Svg>;
    case "bread":
      return <Svg size={56} viewBox="0 0 60 60"><path d="M8 36c0-14 44-14 44 0v6H8z" fill="#d99a4e" /><path d="M20 28l4 6M30 26l3 7M40 28l2 6" stroke="#a5672a" strokeWidth="2" /></Svg>;
    case "soap":
      return <Svg size={56} viewBox="0 0 60 60"><rect x="12" y="22" width="36" height="20" rx="8" fill="#9ad7c9" /><circle cx="22" cy="18" r="4" fill="#d9f2ee" /><circle cx="32" cy="14" r="3" fill="#d9f2ee" /></Svg>;
    case "juice":
      return <Svg size={56} viewBox="0 0 60 60"><path d="M18 14h24l-3 38H21z" fill="#f08a1c" /><rect x="18" y="10" width="24" height="5" fill="#3c8f3e" /></Svg>;
    case "book":
      return <Svg size={56} viewBox="0 0 60 60"><rect x="12" y="10" width="36" height="40" rx="2" fill="#b83930" /><rect x="16" y="14" width="28" height="10" fill="#f7e2c0" /></Svg>;
  }
}

function Clock({ hour, minute, size = 150 }: { hour: number; minute: number; size?: number }) {
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={styles.clock}>
      <circle cx="60" cy="60" r="56" fill="#fff" stroke="#24433a" strokeWidth="4" />
      {Array.from({ length: 12 }, (_, index) => {
        const number = index + 1;
        const angle = (number * 30 * Math.PI) / 180;
        return (
          <text key={number} x={60 + Math.sin(angle) * 43} y={60 - Math.cos(angle) * 43 + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#24433a">
            {number}
          </text>
        );
      })}
      <line x1="60" y1="60" x2="60" y2="36" stroke="#b83930" strokeWidth="6" strokeLinecap="round" transform={`rotate(${hourAngle} 60 60)`} />
      <line x1="60" y1="60" x2="60" y2="24" stroke="#24433a" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${minuteAngle} 60 60)`} />
      <circle cx="60" cy="60" r="4" fill="#24433a" />
    </svg>
  );
}

export function ClockFace({ hour, minute }: { hour: number; minute: number }) {
  const { t } = useTranslation(NS);
  return (
    <figure className={styles.figure} role="img" aria-label={t("common.clockLabel", { hourHand: hour, minuteHand: minute === 0 ? 12 : 6 })}>
      <Clock hour={hour} minute={minute} />
    </figure>
  );
}

function Ruler({ start, end, max = 12, broken }: { start: number; end: number; max?: number; broken?: boolean }) {
  const { t } = useTranslation(NS);
  const unit = 26;
  const first = broken ? 2 : 0;
  const width = (max - first) * unit + 30;
  const x = (value: number) => 15 + (value - first) * unit;
  return (
    <figure className={styles.figure} role="img" aria-label={t("common.rulerLabel", { start, end })}>
      <svg viewBox={`0 0 ${width} 92`} className={styles.ruler} aria-hidden="true">
        <rect x={x(start)} y="8" width={(end - start) * unit} height="16" rx="8" fill="#f2c230" stroke="#8a6a00" strokeWidth="2" />
        <path d={`M${x(end)} 8l10 8-10 8z`} fill="#e8c9a0" />
        <rect x="4" y="34" width={width - 8} height="44" rx="4" fill="#fdf1c7" stroke="#b99a3a" strokeWidth="2" />
        {broken ? <path d={`M4 34l6 10-6 8 6 12-6 14`} fill="#fff" stroke="#b99a3a" strokeWidth="2" /> : null}
        {Array.from({ length: max - first + 1 }, (_, index) => {
          const value = first + index;
          return (
            <g key={value}>
              <line x1={x(value)} y1="34" x2={x(value)} y2="52" stroke="#5b4a12" strokeWidth="2" />
              <text x={x(value)} y="70" textAnchor="middle" fontSize="13" fill="#5b4a12">{value}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function NumberLine({ from, to, step = 1, marks = [], jumps = [] }: { from: number; to: number; step?: number; marks?: readonly number[]; jumps?: readonly (readonly [number, number])[] }) {
  const { t } = useTranslation(NS);
  const count = (to - from) / step;
  const unit = Math.max(22, Math.min(46, 560 / count));
  const width = count * unit + 40;
  const x = (value: number) => 20 + ((value - from) / step) * unit;
  return (
    <figure className={styles.figure} role="img" aria-label={t("common.numberLineLabel", { from, to })}>
      <svg viewBox={`0 0 ${width} 96`} className={styles.numberLineSvg} aria-hidden="true">
        {jumps.map(([a, b], index) => {
          const mid = (x(a) + x(b)) / 2;
          return (
            <g key={index}>
              <path d={`M${x(a)} 50 Q${mid} ${10} ${x(b)} 50`} fill="none" stroke="#b83930" strokeWidth="2.5" />
              <text x={mid} y="22" textAnchor="middle" fontSize="13" fontWeight="800" fill="#b83930">{b > a ? `+${b - a}` : `−${a - b}`}</text>
            </g>
          );
        })}
        <line x1="10" y1="56" x2={width - 10} y2="56" stroke="#24433a" strokeWidth="3" />
        {Array.from({ length: count + 1 }, (_, index) => {
          const value = from + index * step;
          const marked = marks.includes(value);
          return (
            <g key={value}>
              <line x1={x(value)} y1="48" x2={x(value)} y2="64" stroke="#24433a" strokeWidth={value % 10 === 0 ? 3 : 1.5} />
              {marked ? <circle cx={x(value)} cy="56" r="6" fill="#0f7a5c" /> : null}
              {(value % 10 === 0 || marked || count <= 12) ? (
                <text x={x(value)} y="84" textAnchor="middle" fontSize="13" fontWeight={marked ? 800 : 500} fill="#24433a">{value}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function ShapeGlyph({ shape, size = 72 }: { shape: ShapeName; size?: number }) {
  const common = { fill: "#9fd3c0", stroke: "#1f5d4c", strokeWidth: 3 };
  return (
    <Svg size={size} viewBox="0 0 80 80">
      {shape === "triangle" ? <polygon points="40,10 72,68 8,68" {...common} /> : null}
      {shape === "square" ? <rect x="14" y="14" width="52" height="52" {...common} /> : null}
      {shape === "rectangle" ? <rect x="6" y="24" width="68" height="34" {...common} /> : null}
      {shape === "circle" ? <circle cx="40" cy="40" r="30" {...common} /> : null}
      {shape === "oval" ? <ellipse cx="40" cy="40" rx="34" ry="22" {...common} /> : null}
      {shape === "pentagon" ? <polygon points="40,8 72,32 60,70 20,70 8,32" {...common} /> : null}
      {shape === "hexagon" ? <polygon points="22,10 58,10 76,40 58,70 22,70 4,40" {...common} /> : null}
    </Svg>
  );
}

export function SolidGlyph({ solid, size = 76 }: { solid: SolidName; size?: number }) {
  return (
    <Svg size={size} viewBox="0 0 80 80">
      {solid === "cube" ? (
        <g stroke="#1f3f66" strokeWidth="2.5">
          <polygon points="14,28 46,28 46,66 14,66" fill="#7fb2e5" />
          <polygon points="14,28 30,14 62,14 46,28" fill="#b5d3f2" />
          <polygon points="46,28 62,14 62,52 46,66" fill="#4f88c4" />
        </g>
      ) : null}
      {solid === "cuboid" ? (
        <g stroke="#6b3d14" strokeWidth="2.5">
          <polygon points="6,34 54,34 54,66 6,66" fill="#e3a868" />
          <polygon points="6,34 22,22 70,22 54,34" fill="#f2c897" />
          <polygon points="54,34 70,22 70,54 54,66" fill="#c27d3c" />
        </g>
      ) : null}
      {solid === "sphere" ? (
        <g>
          <circle cx="40" cy="40" r="28" fill="#e0574a" stroke="#8a2a20" strokeWidth="2.5" />
          <ellipse cx="31" cy="30" rx="8" ry="5" fill="#f4a49b" />
        </g>
      ) : null}
      {solid === "cylinder" ? (
        <g stroke="#2f5d2a" strokeWidth="2.5">
          <path d="M18 18v44a22 8 0 0 0 44 0V18" fill="#8dc96d" />
          <ellipse cx="40" cy="18" rx="22" ry="8" fill="#bfe3a8" />
        </g>
      ) : null}
    </Svg>
  );
}

function Balance({ heavier, leftKey, rightKey }: { heavier: "left" | "right" | "equal"; leftKey: string; rightKey: string }) {
  const { t } = useTranslation(NS);
  const tilt = heavier === "left" ? -10 : heavier === "right" ? 10 : 0;
  const left = t(leftKey);
  const right = t(rightKey);
  return (
    <figure className={styles.figure} role="img" aria-label={t(`common.balance.${heavier}`, { left, right })}>
      <svg viewBox="0 0 240 150" className={styles.balance} aria-hidden="true">
        <polygon points="120,60 104,140 136,140" fill="#8a6a2b" />
        <g transform={`rotate(${tilt} 120 60)`}>
          <line x1="30" y1="60" x2="210" y2="60" stroke="#5b4a12" strokeWidth="6" strokeLinecap="round" />
          <path d="M30 60l-20 34h40z" fill="none" stroke="#5b4a12" strokeWidth="2" />
          <path d="M210 60l-20 34h40z" fill="none" stroke="#5b4a12" strokeWidth="2" />
          <rect x="6" y="94" width="48" height="8" rx="3" fill="#b99a3a" />
          <rect x="186" y="94" width="48" height="8" rx="3" fill="#b99a3a" />
          <text x="30" y="88" textAnchor="middle" fontSize="15" fontWeight="800" fill="#24433a">{left}</text>
          <text x="210" y="88" textAnchor="middle" fontSize="15" fontWeight="800" fill="#24433a">{right}</text>
        </g>
      </svg>
    </figure>
  );
}

export function ContainerGlyph({ liters, filled = 0 }: { liters: number; filled?: number }) {
  const { t } = useTranslation(NS);
  const height = 40 + liters * 12;
  const level = liters === 0 ? 0 : (Math.min(filled, liters) / liters) * (height - 14);
  return (
    <span className={styles.containerGlyph} role="img" aria-label={t("common.containerLabel", { liters, filled })}>
      <svg width="70" height={height + 10} viewBox={`0 0 70 ${height + 10}`} aria-hidden="true">
        <rect x="8" y="12" width="54" height={height - 4} rx="8" fill="#eef7fb" stroke="#2d6a8f" strokeWidth="3" />
        <rect x="11" y={height + 5 - level} width="48" height={level} rx="5" fill="#59b7e3" />
        <rect x="24" y="2" width="22" height="10" rx="3" fill="#2d6a8f" />
      </svg>
      <strong>{t("common.liters", { count: liters })}</strong>
    </span>
  );
}

function Calendar({ firstWeekday, days, marks = [] }: { firstWeekday: number; days: number; marks?: readonly number[] }) {
  const { t } = useTranslation(NS);
  const weekdays = t("common.weekdaysShort", { returnObjects: true }) as string[];
  return (
    <figure className={styles.figure}>
      <table className={styles.calendar}>
        <caption className={styles.srOnly}>{t("common.calendarCaption")}</caption>
        <thead>
          <tr>{weekdays.map((day) => <th key={day} scope="col">{day}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil((firstWeekday + days) / 7) }, (_, week) => (
            <tr key={week}>
              {Array.from({ length: 7 }, (_, weekday) => {
                const day = week * 7 + weekday - firstWeekday + 1;
                const valid = day >= 1 && day <= days;
                return <td key={weekday} className={valid && marks.includes(day) ? styles.calendarMark : undefined}>{valid ? day : ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Fraction({ parts, shaded, equal }: { parts: number; shaded: number; equal: boolean }) {
  const { t } = useTranslation(NS);
  // Parts inégales : un découpage décalé pour montrer deux morceaux de tailles différentes.
  const angles = equal
    ? Array.from({ length: parts + 1 }, (_, index) => (index * 360) / parts)
    : parts === 2 ? [0, 120, 360] : Array.from({ length: parts + 1 }, (_, index) => [0, 60, 170, 250, 360][index] ?? 360);
  const point = (angle: number) => {
    const radian = ((angle - 90) * Math.PI) / 180;
    return `${60 + Math.cos(radian) * 50},${60 + Math.sin(radian) * 50}`;
  };
  return (
    <figure className={styles.figure} role="img" aria-label={t(equal ? "common.fractionEqual" : "common.fractionUnequal", { parts, shaded })}>
      <svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
        {angles.slice(0, -1).map((start, index) => {
          const end = angles[index + 1];
          const large = end - start > 180 ? 1 : 0;
          return (
            <path
              key={index}
              d={`M60,60 L${point(start)} A50,50 0 ${large} 1 ${point(end)} Z`}
              fill={index < shaded ? "#f08a1c" : "#f7d9a8"}
              stroke="#7a4a12"
              strokeWidth="2.5"
            />
          );
        })}
      </svg>
    </figure>
  );
}

export function GridFigure({ cols, rows, cells, axis }: { cols: number; rows: number; cells: readonly (readonly [number, number])[]; axis?: boolean }) {
  const set = new Set(cells.map(([c, r]) => `${c},${r}`));
  return (
    <div className={styles.staticGrid} style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }} aria-hidden="true">
      {Array.from({ length: rows * cols }, (_, index) => {
        const c = index % cols;
        const r = Math.floor(index / cols);
        return <span key={index} className={`${set.has(`${c},${r}`) ? styles.gridFilled : ""} ${axis && c === cols / 2 ? styles.gridAxisLeft : ""}`} />;
      })}
    </div>
  );
}

function House() {
  const { t } = useTranslation(NS);
  return (
    <figure className={styles.figure} role="img" aria-label={t("common.houseLabel")}>
      <svg viewBox="0 0 160 150" width="170" height="160" aria-hidden="true">
        <polygon points="80,10 150,70 10,70" fill="#e0574a" stroke="#7a2a20" strokeWidth="3" />
        <rect x="26" y="70" width="108" height="72" fill="#f2c897" stroke="#6b3d14" strokeWidth="3" />
        <rect x="66" y="98" width="28" height="44" fill="#7a4a12" />
      </svg>
    </figure>
  );
}

export function VisualView({ visual }: { visual: Visual }) {
  const { t } = useTranslation(NS);
  const name = useItemName();
  switch (visual.kind) {
    case "collection":
      return <Container kind={visual.container}><Collection item={visual.item} count={visual.count} /></Container>;
    case "groups":
      return (
        <div className={styles.groupRow} aria-label={t("common.groupsLabel", { count: visual.groups.length })} role="group">
          {visual.groups.map((count, index) => (
            <Container key={index} kind={visual.container ?? "plate"}><Collection item={visual.item} count={count} /></Container>
          ))}
        </div>
      );
    case "tens":
      return <TensView tens={visual.tens} units={visual.units} item={visual.item} />;
    case "array":
      return (
        <div className={styles.arrayView} role="img" aria-label={t("common.arrayLabel", { rows: visual.rows, cols: visual.cols, item: name(visual.item) })}>
          {Array.from({ length: visual.rows }, (_, row) => (
            <div key={row}>{Array.from({ length: visual.cols }, (_, col) => <ItemGlyph key={col} item={visual.item} size={30} />)}</div>
          ))}
        </div>
      );
    case "tenFrame":
      return <TenFrames filled={visual.filled} frames={visual.frames} />;
    case "money":
      return <div className={styles.moneyRow}>{visual.values.map((value, index) => <MoneyPiece key={index} value={value} />)}</div>;
    case "product":
      return (
        <span className={styles.product}>
          <ProductGlyph product={visual.product} />
          <span className={styles.priceTag}>{t(`common.products.${visual.product}`)} · {t("common.money", { value: visual.price })}</span>
        </span>
      );
    case "clock":
      return <ClockFace hour={visual.hour} minute={visual.minute} />;
    case "ruler":
      return <Ruler start={visual.start} end={visual.end} max={visual.max} broken={visual.broken} />;
    case "numberLine":
      return <NumberLine from={visual.from} to={visual.to} step={visual.step} marks={visual.marks} jumps={visual.jumps} />;
    case "shape":
      return <span role="img" aria-label={t(`common.shapeLooks.${visual.shape}`)}><ShapeGlyph shape={visual.shape} /></span>;
    case "solid":
      return <span role="img" aria-label={t(`common.solidLooks.${visual.solid}`)}><SolidGlyph solid={visual.solid} /></span>;
    case "balance":
      return <Balance heavier={visual.heavier} leftKey={visual.leftKey} rightKey={visual.rightKey} />;
    case "container":
      return <ContainerGlyph liters={visual.liters} filled={visual.filled} />;
    case "calendar":
      return <Calendar firstWeekday={visual.firstWeekday} days={visual.days} marks={visual.marks} />;
    case "expression":
      return <p className={styles.expression}>{visual.value}</p>;
    case "fraction":
      return <Fraction parts={visual.parts} shaded={visual.shaded} equal={visual.equal} />;
    case "grid":
      return <GridFigure cols={visual.cols} rows={visual.rows} cells={visual.cells} axis={visual.axis} />;
    case "house":
      return <House />;
    case "products":
      return (
        <div className={styles.moneyRow}>
          {visual.items.map((entry, index) => <VisualView key={index} visual={{ kind: "product", product: entry.product, price: entry.price }} />)}
        </div>
      );
    case "weight":
      return (
        <span className={styles.weight} role="img" aria-label={t("common.formats.kg", { value: visual.kg })}>
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <path d="M18 14a10 10 0 0 1 20 0" fill="none" stroke="#3f4a52" strokeWidth="4" />
            <path d="M10 20h36l6 30H4z" fill="#5f6b73" />
          </svg>
          <strong>{t("common.formats.kg", { value: visual.kg })}</strong>
        </span>
      );
    case "composite":
      return (
        <div className={styles.composite} role="img" aria-label={t("common.compositeLabel", { list: visual.shapes.map((shape) => t(`common.shapes.${shape}`)).join(", ") })}>
          {visual.shapes.map((shape, index) => <ShapeGlyph key={index} shape={shape} size={56} />)}
        </div>
      );
  }
}
