import styles from "./RasterPuzzle.module.css";

// Décor de la savane, dessiné en SVG : aucun fichier à télécharger. Ciel dégradé, soleil, nuages qui dérivent doucement, collines,
// acacias de chaque côté, plans d'herbe et fleurs. Il remplit tout le cadre et reste derrière le jeu.
const FLOWERS: Array<[number, number, string]> = [
  [8, 92, "#ff7ab6"],
  [20, 96, "#ffd54d"],
  [34, 91, "#ff9a3d"],
  [118, 94, "#ff7ab6"],
  [134, 90, "#ffd54d"],
  [150, 95, "#b58cff"],
];

function Acacia({ x, scale }: { x: number; scale: number }) {
  return (
    <g transform={`translate(${x} 70) scale(${scale})`}>
      <path d="M-1.4 30 C-1 18 -2 10 -5 2 L-2.6 1 C-0.6 7 0.2 12 0.6 18 C1 12 2 6 6 1 L8 3 C3 9 2 18 1.6 30Z" fill="#6b4a2b" />
      <ellipse cx="0" cy="0" rx="22" ry="6.5" fill="#2f8f3d" />
      <ellipse cx="-10" cy="-3" rx="13" ry="5" fill="#3aa84a" />
      <ellipse cx="11" cy="-2" rx="12" ry="4.6" fill="#35a045" />
    </g>
  );
}

export function Savanna() {
  return (
    <svg className={styles.scenery} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#37b6ee" />
          <stop offset="0.65" stopColor="#8fdcff" />
          <stop offset="1" stopColor="#d8f5ff" />
        </linearGradient>
        <radialGradient id="rp-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff9c4" />
          <stop offset="0.45" stopColor="#ffe066" />
          <stop offset="1" stopColor="#ffe066" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rp-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cd24a" />
          <stop offset="1" stopColor="#3f9d33" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#rp-sky)" />
      <circle cx="132" cy="20" r="22" fill="url(#rp-sun)" />
      <circle cx="132" cy="20" r="8" fill="#fff3a6" />
      <g className={styles.cloudA} fill="#fff" opacity="0.92">
        <ellipse cx="30" cy="22" rx="14" ry="5" />
        <ellipse cx="40" cy="18" rx="9" ry="5.5" />
        <ellipse cx="22" cy="19" rx="8" ry="4.5" />
      </g>
      <g className={styles.cloudB} fill="#fff" opacity="0.85">
        <ellipse cx="92" cy="12" rx="11" ry="4" />
        <ellipse cx="100" cy="9" rx="7" ry="4.2" />
      </g>
      <path d="M0 62 C20 50 38 56 56 60 C78 64 96 48 120 54 C138 58 150 56 160 52 L160 100 L0 100Z" fill="#9fdc7a" />
      <path d="M0 70 C24 62 46 70 70 68 C96 66 120 62 160 70 L160 100 L0 100Z" fill="#82cf5c" />
      <Acacia x={14} scale={1.35} />
      <Acacia x={148} scale={1.2} />
      <path d="M0 80 C30 74 60 82 90 79 C120 76 140 80 160 76 L160 100 L0 100Z" fill="url(#rp-grass)" />
      <path d="M0 90 C40 86 80 92 120 88 C140 86 150 88 160 87 L160 100 L0 100Z" fill="#c9a266" opacity="0.55" />
      <g fill="#2f8a2a">
        {Array.from({ length: 34 }, (_, index) => {
          const x = index * 4.8 + (index % 3) * 0.8;
          const h = 3 + (index % 4) * 1.4;
          return <path key={index} d={`M${x} 100 L${x + 1} ${100 - h} L${x + 2.2} 100Z`} />;
        })}
      </g>
      {FLOWERS.map(([x, y, color]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="1.6" fill={color} />
          <circle cx={x} cy={y} r="0.6" fill="#fff6c4" />
        </g>
      ))}
    </svg>
  );
}
