import styles from "./RasterPuzzle.module.css";

interface PuzzleTileProps {
  /** Adresse de l'image entière (absente : un cadre neutre). */
  url: string | undefined;
  /** Côté de la grille. */
  size: number;
  /** Numéro du morceau : sa vraie case dans l'image. */
  piece: number;
  className?: string;
}

// Un morceau n'est pas un fichier : c'est la même image, agrandie size fois et décalée pour n'en montrer qu'une case. Aucune copie.
export function PuzzleTile({ url, size, piece, className }: PuzzleTileProps) {
  const column = piece % size;
  const row = Math.floor(piece / size);
  const position = size > 1 ? `${(column / (size - 1)) * 100}% ${(row / (size - 1)) * 100}%` : "0 0";
  return (
    <span
      className={`${styles.tileFace} ${className ?? ""}`}
      style={url ? { backgroundImage: `url(${url})`, backgroundSize: `${size * 100}% ${size * 100}%`, backgroundPosition: position } : undefined}
      aria-hidden="true"
    />
  );
}
