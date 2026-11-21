// Petites icônes SVG de la mission (aucune image à télécharger). Décoratives : masquées aux lecteurs d'écran.

export function PizzaIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M4 7c7-4 17-4 24 0L16 29Z" fill="#f2c14e" stroke="#9a5b1e" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 7c7-4 17-4 24 0" fill="none" stroke="#c98a3d" strokeWidth="4" strokeLinecap="round" />
      <circle cx="13" cy="13" r="2.4" fill="#d94b3a" />
      <circle cx="19" cy="14" r="2.4" fill="#d94b3a" />
      <circle cx="16" cy="20" r="2.2" fill="#d94b3a" />
    </svg>
  );
}

export function HouseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M3 11 12 4l9 7" fill="none" stroke="#c0392b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v10h13V10" fill="#fff4cf" stroke="#2d5270" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" fill="#3ec8c4" stroke="#2d5270" strokeWidth="1.6" />
    </svg>
  );
}

export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false" className={className} data-filled={filled}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" />
    </svg>
  );
}
