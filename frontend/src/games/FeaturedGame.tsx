import { Fragment, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import countrysideUrl from "../prototypes/leo-livreur/assets/leo-countryside-v1.webp";

import skylineUrl from "./assets/leo-city-skyline-2k.webp";
import intercityBusUrl from "./assets/leo-bus-intercity.webp";
import carUrl from "./assets/leo-car-front-banner.webp";
import profileUrl from "./assets/leo-car-profile-banner.webp";
import type { GameCatalogueEntry } from "./game-catalogue";
import styles from "./FeaturedGame.module.css";

// Véhicules de la voie d'en face : ils roulent lentement de droite à gauche, une fois la voiture
// de Léo arrêtée. Géométrie des roues en pixels de l'image (cx, cy = centre ; r = rayon), mesurée sur chaque dessin.
interface Wheel {
  cx: number;
  cy: number;
  r: number;
}
interface TrafficBus {
  id: string;
  src: string;
  width: number;
  height: number;
  wheels: Wheel[];
  delay: number;
}
const TRAFFIC: TrafficBus[] = [
  {
    id: "intercity",
    src: intercityBusUrl,
    width: 1970,
    height: 660,
    wheels: [
      { cx: 514, cy: 555, r: 98 },
      { cx: 1472, cy: 555, r: 100 },
    ],
    delay: 9400,
  },
];

// Un disque de l'image posé sur chaque roue puis mis en rotation (même technique que pour la voiture de Léo).
function wheelStyle(bus: TrafficBus, wheel: Wheel, src: string) {
  const { width, height } = bus;
  const size = wheel.r * 2;
  return {
    left: `${((wheel.cx - wheel.r) / width) * 100}%`,
    top: `${((wheel.cy - wheel.r) / height) * 100}%`,
    width: `${(size / width) * 100}%`,
    backgroundImage: `url(${src})`,
    backgroundSize: `${(width / size) * 100}% auto`,
    backgroundPosition: `${((wheel.cx - wheel.r) / (width - size)) * 100}% ${((wheel.cy - wheel.r) / (height - size)) * 100}%`,
  };
}

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
      <img className={styles.sky} src={countrysideUrl} alt="" width={2172} height={724} fetchPriority="high" decoding="async" />
      <img className={styles.city} src={skylineUrl} alt="" width={2048} height={682} decoding="async" />
      <span className={styles.road} aria-hidden="true" />
      <Fragment key={play}>
        <span className={styles.carShadow} aria-hidden="true" />
        {TRAFFIC.map((bus) => (
          <span key={bus.id} className={styles.lane} style={{ animationDelay: `${bus.delay}ms` }} aria-hidden="true">
            <span className={styles.bus} style={{ aspectRatio: `${bus.width} / ${bus.height}` }}>
              <img src={bus.src} alt="" width={900} height={Math.round((bus.height * 900) / bus.width)} decoding="async" />
              {bus.wheels.map((wheel) => (
                <span
                  key={wheel.cx}
                  className={styles.busWheel}
                  style={{ ...wheelStyle(bus, wheel, bus.src), animationDelay: `${bus.delay}ms` }}
                />
              ))}
            </span>
          </span>
        ))}
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
      </span>
    </Link>
  );
}
