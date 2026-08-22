import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";
import { formatNumber } from "../number-words";

interface PlaceValueRevealBoardProps {
  value: number;
}

const PLACES = [
  { key: "dm", divisor: 10000 },
  { key: "um", divisor: 1000 },
  { key: "c", divisor: 100 },
  { key: "d", divisor: 10 },
  { key: "u", divisor: 1 },
] as const;

// Figure tactile du « Je découvre » de la leçon Valeur de position (§11 du
// récit) : l'enfant touche un chiffre du nombre et voit apparaître sa valeur
// réelle (ex. dans 24 638, toucher le 2 affiche 2 = 20 000). Ce n'est pas un
// exercice noté : c'est une manipulation qui précède le texte de la règle.
export function PlaceValueRevealBoard({ value }: PlaceValueRevealBoardProps) {
  const { t, i18n } = useTranslation("primaryFour");
  const [revealedKey, setRevealedKey] = useState<(typeof PLACES)[number]["key"] | null>(null);

  // Chaque rang s'obtient indépendamment des autres (base 10) : pas besoin
  // d'accumulateur mutable pour dérouler les cinq chiffres.
  const digitsByPlace = PLACES.map((place) => ({
    ...place,
    digit: Math.floor(value / place.divisor) % 10,
  }));

  const revealed = digitsByPlace.find((entry) => entry.key === revealedKey);

  return (
    <div className={styles.revealBoard}>
      <p className={styles.revealHint}>{t("blocks.discover.figureHint")}</p>
      <div className={styles.revealRow}>
        {digitsByPlace.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={revealedKey === entry.key ? `${styles.revealDigit} ${styles.revealDigitActive}` : styles.revealDigit}
            aria-pressed={revealedKey === entry.key}
            onClick={() => setRevealedKey(entry.key)}
          >
            <span className={styles.revealPlaceLabel}>{t(`exercise.placeValue.${entry.key}`)}</span>
            <span className={styles.revealDigitValue}>{entry.digit}</span>
          </button>
        ))}
      </div>
      <p className={styles.revealOutput} aria-live="polite">
        {revealed
          ? t("blocks.discover.figureReveal", {
              digit: revealed.digit,
              value: formatNumber(revealed.digit * revealed.divisor, i18n.language),
            })
          : t("blocks.discover.figurePrompt")}
      </p>
    </div>
  );
}
