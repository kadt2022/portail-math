// Scènes illustrées en SVG pour les jeux qui n'ont pas encore de véritable
// artwork (contrairement à la Rivière, dont la photo existante est réutilisée
// directement). Dessinées à la main, dans le même esprit chaleureux que le
// reste de l'identité visuelle — pas des dégradés génériques.

export function TrainScene() {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="trainSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ecbe8" />
          <stop offset="100%" stopColor="#c9e9f6" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#trainSky)" />
      <circle cx="336" cy="46" r="30" fill="#ffd166" />
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="72" cy="52" rx="30" ry="14" />
        <ellipse cx="96" cy="44" rx="22" ry="12" />
        <ellipse cx="200" cy="34" rx="26" ry="12" />
      </g>
      <path d="M0 172 Q80 140 170 168 T400 160 V240 H0 Z" fill="#6fb567" />
      <path d="M0 196 Q100 176 220 196 T400 190 V240 H0 Z" fill="#4f9e56" />
      <rect x="0" y="214" width="400" height="8" fill="#caa06a" />
      <g stroke="#8a6a3c" strokeWidth="4">
        <line x1="16" y1="222" x2="16" y2="232" />
        <line x1="60" y1="222" x2="60" y2="232" />
        <line x1="104" y1="222" x2="104" y2="232" />
        <line x1="148" y1="222" x2="148" y2="232" />
        <line x1="192" y1="222" x2="192" y2="232" />
        <line x1="236" y1="222" x2="236" y2="232" />
        <line x1="280" y1="222" x2="280" y2="232" />
        <line x1="324" y1="222" x2="324" y2="232" />
        <line x1="368" y1="222" x2="368" y2="232" />
      </g>
      <g transform="translate(84 118)">
        <rect x="0" y="30" width="150" height="58" rx="14" fill="#e0523f" />
        <rect x="10" y="10" width="52" height="34" rx="8" fill="#f2705c" />
        <rect x="20" y="16" width="14" height="14" rx="2" fill="#eaf6ff" />
        <rect x="42" y="16" width="14" height="14" rx="2" fill="#eaf6ff" />
        <rect x="150" y="46" width="26" height="30" rx="6" fill="#f2705c" />
        <rect x="158" y="52" width="12" height="10" rx="2" fill="#eaf6ff" />
        <rect x="-2" y="0" width="16" height="30" rx="4" fill="#2c3e50" />
        <circle cx="6" cy="-4" r="7" fill="#2c3e50" />
        <circle cx="28" cy="88" r="16" fill="#2c3e50" />
        <circle cx="28" cy="88" r="6" fill="#8fa3ad" />
        <circle cx="92" cy="88" r="16" fill="#2c3e50" />
        <circle cx="92" cy="88" r="6" fill="#8fa3ad" />
        <circle cx="146" cy="88" r="13" fill="#2c3e50" />
      </g>
    </svg>
  );
}

export function NewGameScene() {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="newGameSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1f2f63" />
          <stop offset="100%" stopColor="#173a4a" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#newGameSky)" />
      <g fill="#ffffff" opacity="0.5">
        <circle cx="48" cy="40" r="2.4" />
        <circle cx="120" cy="24" r="1.8" />
        <circle cx="210" cy="56" r="2" />
        <circle cx="300" cy="30" r="2.6" />
        <circle cx="356" cy="72" r="1.8" />
        <circle cx="80" cy="96" r="1.6" />
      </g>
      <g opacity="0.5" stroke="#ffb45c" strokeWidth="3" fill="none" strokeLinecap="round">
        <rect x="300" y="150" width="26" height="26" rx="6" transform="rotate(18 313 163)" />
        <circle cx="70" cy="176" r="15" />
        <path d="M330 60 l10 10 l-10 10 l-10 -10 Z" />
      </g>
      <circle cx="200" cy="122" r="46" fill="#ffb84d" opacity="0.16" />
      <g transform="translate(200 122)">
        <circle r="30" fill="#ffb84d" />
        <path
          d="M0 -22 L6 -6 L22 0 L6 6 L0 22 L-6 6 L-22 0 L-6 -6 Z"
          fill="#fff4e2"
        />
      </g>
    </svg>
  );
}

export function GrilleMagiqueScene() {
  const tiles = [
    { x: 46, y: 48 },
    { x: 130, y: 48 },
    { x: 214, y: 48 },
    { x: 46, y: 132 },
    { x: 130, y: 132 },
    { x: 214, y: 132 },
    { x: 46, y: 216 },
    { x: 130, y: 216 },
    { x: 214, y: 216 },
  ];
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="grilleMagiqueSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a2a63" />
          <stop offset="100%" stopColor="#17493f" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#grilleMagiqueSky)" />
      <g fill="#ffffff" opacity="0.35">
        <circle cx="330" cy="36" r="2.2" />
        <circle cx="360" cy="70" r="1.6" />
        <circle cx="24" cy="60" r="1.8" />
      </g>
      {tiles.map(({ x, y }, index) =>
        index === 4 ? (
          <g key="magic-card" transform={`translate(${x} ${y})`}>
            <rect x="-30" y="-30" width="60" height="60" rx="14" fill="#e2762b" opacity="0.22" />
            <path
              d="M0 -22 L6 -6 L22 0 L6 6 L0 22 L-6 6 L-22 0 L-6 -6 Z"
              fill="#fce3cd"
              stroke="#e2762b"
              strokeWidth="2"
            />
          </g>
        ) : (
          <rect
            key={`tile-${x}-${y}`}
            x={x - 30}
            y={y - 30}
            width="60"
            height="60"
            rx="12"
            fill="#fef3e6"
            opacity="0.92"
          />
        ),
      )}
      <g stroke="#fce3cd" strokeWidth="2.5" strokeLinecap="round" opacity="0.6">
        <line x1="88" y1="48" x2="106" y2="48" />
        <line x1="172" y1="48" x2="190" y2="48" />
        <line x1="88" y1="216" x2="106" y2="216" />
        <line x1="172" y1="216" x2="190" y2="216" />
      </g>
    </svg>
  );
}

export function ExploreScene() {
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="exploreBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#17493f" />
          <stop offset="100%" stopColor="#0f332b" />
        </linearGradient>
      </defs>
      <rect width="400" height="160" fill="url(#exploreBg)" />
      <path
        d="M-10 130 C 60 100, 120 150, 200 110 S 340 90, 410 120"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="3"
        strokeDasharray="2 14"
        strokeLinecap="round"
      />
      <g transform="translate(70 70)">
        <circle r="34" fill="#e2762b" />
        <circle r="34" fill="none" stroke="#fce3cd" strokeOpacity="0.5" strokeWidth="2" />
        <path d="M0 -18 L7 5 L-7 5 Z" fill="#fff4e2" />
        <path d="M0 18 L7 -5 L-7 -5 Z" fill="#b85c1c" />
      </g>
      <g fill="#ffffff" opacity="0.7">
        <circle cx="180" cy="40" r="2.4" />
        <circle cx="230" cy="90" r="1.8" />
        <circle cx="290" cy="34" r="2.2" />
        <circle cx="330" cy="80" r="1.6" />
      </g>
    </svg>
  );
}
