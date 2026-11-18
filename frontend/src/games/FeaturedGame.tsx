import { Fragment, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import skylineUrl from "../prototypes/leo-livreur/assets/leo-world-city-skyline-v1.webp";

import carUrl from "./assets/leo-car-front-banner.webp";
import profileUrl from "./assets/leo-car-profile-banner.webp";
import countrysideUrl from "./assets/leo-countryside-1280.webp";
import type { GameCatalogueEntry } from "./game-catalogue";
import styles from "./FeaturedGame.module.css";

interface FeaturedGameProps {
  game: GameCatalogueEntry;
}

// Bannière cliquable en entier : décor, ville et deux vues de la voiture (profil puis face). À l'ouverture, Léo
// arrive de profil, s'arrête, puis sa voiture se tourne et roule vers nous (animation jouée une seule fois).
// Aucun module du moteur du jeu n'est importé ici : Phaser ne se charge qu'à l'ouverture du jeu.
// Durée totale du mouvement (roulage + demi-tour + approche), un peu arrondie à la hausse.
const INTRO_MS = 9200;

export function FeaturedGame({ game }: FeaturedGameProps) {
  const { t } = useTranslation("games");
  const name = t(game.nameKey);
  // Chaque passage de la souris (ou le focus clavier) rejoue le mouvement complet, une fois l'arrivée terminée.
  const [play, setPlay] = useState(0);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const replay = () => {
    if (Date.now() - startedAt.current < INTRO_MS) return;
    startedAt.current = Date.now();
    setPlay((value) => value + 1);
  };
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === "mouse") replay();
  };

  return (
    <Link
      className={styles.hero}
      to={game.href}
      aria-label={t("featured.aria", { name })}
      onPointerEnter={onPointerEnter}
      onFocus={(event) => event.currentTarget.matches(":focus-visible") && replay()}
    >
      <img className={styles.sky} src={countrysideUrl} alt="" width={1280} height={427} fetchPriority="high" decoding="async" />
      <img className={styles.city} src={skylineUrl} alt="" width={1024} height={341} decoding="async" />
      <span className={styles.road} aria-hidden="true" />
      <Fragment key={play}>
        <span className={styles.carShadow} aria-hidden="true" />
        <span className={styles.run} aria-hidden="true">
          <span className={styles.profile}>
            <img src={profileUrl} alt="" width={700} height={409} decoding="async" />
            <span className={`${styles.wheel} ${styles.wheelRear}`} style={{ backgroundImage: `url(${profileUrl})` }} />
            <span className={`${styles.wheel} ${styles.wheelFront}`} style={{ backgroundImage: `url(${profileUrl})` }} />
          </span>
        </span>
        <span className={styles.arrival} aria-hidden="true">
          <img className={styles.car} src={carUrl} alt="" width={400} height={428} decoding="async" />
        </span>
      </Fragment>
      <span className={styles.body}>
        <span className={styles.kicker}>{t("featured.label")}</span>
        <span className={styles.title}>{name}</span>
        <span className={styles.tagline}>{t(game.taglineKey)}</span>
        <span className={styles.tags}>
          <span>{t("featured.educational")}</span>
          <span>{t(`categories.${game.categoryId}`)}</span>
        </span>
      </span>
    </Link>
  );
}
