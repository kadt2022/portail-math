import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";

import {
  enterNativeFullscreen,
  exitNativeFullscreen,
  fullscreenElement,
  lockOrientation,
} from "../fullscreen";
import { useDeviceOrientation } from "../useDeviceOrientation";
import { useImmersiveDevice } from "../useImmersiveDevice";
import { useInertOutside } from "../useInertOutside";
import { onPageSuspended } from "../viewport-events";
import styles from "./GamePlayer.module.css";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 8 4.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="4" width="5" height="16" rx="1.6" />
      <rect x="14" y="4" width="5" height="16" rx="1.6" />
    </svg>
  );
}

/** Classe des boutons de la barre du lecteur : les boutons propres à un jeu (ex. le son) l'utilisent pour faire partie du même panneau. */
export const playerControlClass = styles.ctl;

export interface PlayerStat {
  label: string;
  value: ReactNode;
  /** Lu par les lecteurs d'écran seulement. */
  srOnly?: boolean;
}

export interface PlayerHowToStep {
  title: string;
  text: string;
}

export interface GamePlayerProps {
  /** Élément racine du lecteur : le jeu le garde pour y placer ses propres calques (tutoriel, effets). */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Nom accessible de la région (ex. « Jeu Les Tuiles magiques »). */
  label: string;
  /** Titre visible dans l'en-tête ; absent : pas de titre (la page en a déjà un). */
  title?: string;
  /** Le titre est alors le titre de niveau 1 de la page (page de jeu autonome) ; sinon un simple paragraphe. */
  titleIsHeading?: boolean;
  /** Zone centrale de l'en-tête : propre au jeu (difficulté, mode, etc.). */
  headerCenter?: ReactNode;
  /** Compteurs de l'en-tête : temps, déplacements, score, niveau… */
  stats: PlayerStat[];
  /** État de lecture, tenu par le jeu : en pause, le plateau est bloqué et le chronomètre du jeu doit s'arrêter. */
  paused: boolean;
  onPlay: () => void;
  onPause: () => void;
  /** Partie terminée : Jouer et Pause ne servent plus. */
  ended?: boolean;
  onRestart: () => void;
  /** Nom accessible du bouton Recommencer, si le jeu veut préciser ce qui recommence (« avec une nouvelle grille »). */
  restartLabel?: string;
  /** Aide du jeu : absent, pas de bouton Indice. */
  onHint?: () => void;
  hintDisabled?: boolean;
  /** Boutons propres au jeu (son, etc.), placés dans le groupe d'outils à droite de la barre. */
  extraControls?: ReactNode;
  /** Instructions du jeu : absent, pas de bouton « ? ». */
  howTo?: PlayerHowToStep[];
  /** Présentation immersive : le lecteur occupe toute la fenêtre (plein écran natif quand il est possible, repli CSS sinon). */
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  onClose?: () => void;
  /**
   * Téléphone : le lecteur occupe tout l'écran dès l'ouverture, AVEC sa barre (affichage normal). La page qui l'ouvre a déjà
   * demandé le plein écran natif du document (seul moyen de tourner l'écran) ; le lecteur y verrouille l'orientation choisie.
   * Le bouton Plein écran ne fait alors que masquer la barre.
   */
  cover?: boolean;
  /**
   * Le jeu dessine sa scène sous les commandes (ex. un moteur Phaser qui remplit tout le cadre) : aucune place n'est réservée en bas.
   * Sinon (par défaut), la scène s'arrête au-dessus de la barre de commandes.
   */
  stageUnderControls?: boolean;
  /**
   * Orientation de la scène à l'ouverture sur téléphone : paysage (par défaut), ou « device » : celle dans laquelle l'appareil
   * est tenu, suivie ensuite à chaque rotation tant que le joueur n'a pas choisi lui-même (bouton Portrait / Paysage). Pour
   * les jeux dont la scène paysage, une fois réduite à la largeur d'un téléphone tenu droit, deviendrait trop basse.
   */
  initialOrientation?: PlayerOrientation | "device";
  /** Décor derrière tout le lecteur (ciel, dégradé…). */
  backdrop?: ReactNode;
  /** Calques posés par-dessus le lecteur (ex. main du tutoriel). */
  overlay?: ReactNode;
  /** Le plateau et ses commandes de jeu. */
  children: ReactNode;
}

export type PlayerOrientation = "landscape" | "portrait";

// Lecteur standard des jeux du portail : cadre, en-tête (titre + compteurs), barre de commandes, pause, instructions, orientation
// et plein écran. Chaque jeu garde son moteur et ses règles ; il ne fournit que son plateau, ses compteurs et ses boutons propres.
//
// Deux réglages indépendants donnent quatre présentations du même jeu (jamais recréé) :
// - l'orientation (paysage par défaut, ou portrait) : la forme de la scène, et le verrouillage de l'écran quand le navigateur
//   le permet (seulement en plein écran natif) ; sinon la scène prend simplement cette forme dans l'espace disponible ;
// - le plein écran : la taille. En plein écran, la barre de commandes disparaît et seul « ✕ Quitter » reste, en haut à droite ;
//   il ramène à l'affichage normal sans fermer le jeu ni toucher à la partie.
export function GamePlayer({
  rootRef,
  label,
  title,
  titleIsHeading = false,
  headerCenter,
  stats,
  paused,
  onPlay,
  onPause,
  ended = false,
  onRestart,
  restartLabel,
  onHint,
  hintDisabled = false,
  extraControls,
  howTo,
  fullscreen = false,
  onFullscreenChange,
  onClose,
  cover = false,
  stageUnderControls = false,
  initialOrientation = "landscape",
  backdrop,
  overlay,
  children,
}: GamePlayerProps) {
  const { t } = useTranslation("games");
  const [howToOpen, setHowToOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const nativeFullscreen = useRef(false);
  // Présentation voulue à l'instant (une demande de plein écran natif peut aboutir après un retour à l'affichage normal).
  const wantsFullscreen = useRef(fullscreen);
  // Orientation choisie par le joueur ; absente (« device »), c'est celle de l'appareil, en direct.
  const deviceOrientation = useDeviceOrientation();
  const [chosenOrientation, setOrientation] = useState<PlayerOrientation | null>(
    initialOrientation === "device" ? null : initialOrientation,
  );
  const orientation = chosenOrientation ?? deviceOrientation;
  const orientationRef = useRef(orientation);

  // Plein écran (natif ou repli CSS) : le reste de l'application est inerte, le focus reste dans le lecteur.
  useInertOutside(rootRef, fullscreen || cover);

  // Plein écran natif quand il est disponible ; sinon la présentation immersive CSS (classe « fullscreen ») suffit.
  // Le lecteur reste le même élément : la partie n'est jamais réinitialisée par ce passage.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    wantsFullscreen.current = fullscreen;
    if (cover) {
      return;
    }
    if (fullscreen) {
      void enterNativeFullscreen(root, false).then((entered) => {
        // Une seconde demande refusée (geste déjà consommé) ne doit pas faire oublier que le lecteur est déjà en plein écran.
        const inside = entered || fullscreenElement() === root;
        if (inside && !wantsFullscreen.current) {
          // L'affichage normal a été demandé pendant l'entrée : on ressort aussitôt.
          nativeFullscreen.current = false;
          void exitNativeFullscreen();
          return;
        }
        nativeFullscreen.current = inside;
        // L'orientation choisie est verrouillée quand le navigateur l'accepte (téléphone Android en plein écran natif) ; ailleurs
        // la demande est refusée sans bruit et la scène garde simplement la forme choisie.
        if (inside) {
          void lockOrientation(orientationRef.current);
        }
      });
      return;
    }
    if (nativeFullscreen.current || fullscreenElement() === root) {
      nativeFullscreen.current = false;
      void exitNativeFullscreen();
    }
  }, [rootRef, fullscreen, cover]);

  // Sortie par le système (geste retour, touche Échap) : le lecteur revient à l'affichage normal, au lieu de rester dans un état
  // incohérent. Sans bascule possible (pas d'affichage normal), il se ferme.
  useEffect(() => {
    function onChange() {
      if (cover) {
        if (fullscreenElement()) {
          // Le document vient d'entrer en plein écran natif : l'orientation choisie (paysage par défaut) est verrouillée.
          void lockOrientation(orientationRef.current);
        } else if (fullscreen) {
          onFullscreenChange?.(false);
        }
        return;
      }
      if (nativeFullscreen.current && !fullscreenElement()) {
        nativeFullscreen.current = false;
        if (onFullscreenChange) {
          onFullscreenChange(false);
        } else {
          onClose?.();
        }
      }
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [cover, fullscreen, onClose, onFullscreenChange]);

  // Mise en veille, onglet caché, application quittée : la partie affichée se met en pause (chronomètre, animations et musique
  // arrêtés), sans accélération au retour. Au réveil, rien ne repart tout seul : l'enfant reprend d'un toucher sur « Reprendre »,
  // une fois le lecteur remis en place. Une partie déjà en pause ou terminée n'est pas touchée.
  const suspendState = useRef({ paused, ended, onPause });
  useEffect(() => {
    suspendState.current = { paused, ended, onPause };
  });
  useEffect(
    () =>
      onPageSuspended(() => {
        const root = rootRef.current;
        const shown = !!root && root.getClientRects().length > 0;
        const { paused: alreadyPaused, ended: over, onPause: pause } = suspendState.current;
        if (shown && !alreadyPaused && !over) pause();
      }),
    [rootRef],
  );

  // Téléphone : la veille fait perdre le plein écran natif et le verrouillage de l'orientation. Le navigateur n'autorise à les
  // redemander que dans un geste : au premier toucher dans le lecteur après le réveil, ils sont rétablis (l'orientation choisie
  // est reverrouillée dès que le plein écran revient, voir plus haut).
  useEffect(() => {
    const root = rootRef.current;
    if (!cover || !root) {
      return;
    }
    const regain = () => {
      if (!fullscreenElement()) void enterNativeFullscreen(document.documentElement, false);
    };
    root.addEventListener("pointerdown", regain, true);
    return () => root.removeEventListener("pointerdown", regain, true);
  }, [rootRef, cover]);

  // Plein écran de remplacement (navigateur sans plein écran natif) : Échap en sort aussi.
  useEffect(() => {
    if (!fullscreen || !onFullscreenChange) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !nativeFullscreen.current) {
        onFullscreenChange?.(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, onFullscreenChange]);

  useEffect(
    () => () => {
      if (nativeFullscreen.current) {
        nativeFullscreen.current = false;
        void exitNativeFullscreen();
      }
    },
    [],
  );

  // Place réservée sous la scène : la hauteur réelle de la barre, mesurée, pour les jeux qui ne passent pas dessous.
  // En plein écran, la barre n'existe plus : rien n'est réservé.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const controls = controlsRef.current;
    if (!root) {
      return;
    }
    if (!controls) {
      root.style.setProperty("--controls-inset", "0px");
      root.style.setProperty("--controls-height", "0px");
      return;
    }
    // --controls-height : hauteur de la barre, toujours mesurée (la scène portrait s'arrête toujours au-dessus de la barre) ;
    // --controls-inset : place réservée en paysage, sauf pour les jeux qui passent sous la barre.
    const apply = () => {
      const height = `${Math.ceil(controls.getBoundingClientRect().height)}px`;
      root.style.setProperty("--controls-height", height);
      root.style.setProperty(
        "--controls-inset",
        stageUnderControls ? "0px" : height,
      );
    };
    apply();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(apply);
    observer.observe(controls);
    return () => observer.disconnect();
  }, [rootRef, stageUnderControls, fullscreen]);

  // Changement d'orientation : verrouillage de l'écran si le plein écran natif est actif (le bouton n'existe qu'en affichage
  // normal, mais l'orientation choisie est reprise à la prochaine entrée en plein écran).
  useEffect(() => {
    orientationRef.current = orientation;
    if (nativeFullscreen.current || (cover && fullscreenElement())) {
      void lockOrientation(orientation);
    }
  }, [orientation, cover]);

  // Un seul bouton de lecture : « Jouer » quand la partie est arrêtée (pause ou fin), « Pause » quand elle tourne.
  const showPlay = paused || ended;
  // Portrait / Paysage n’existe que sur téléphone et tablette tactile : sur ordinateur, le lecteur reste toujours en paysage.
  const phone = useImmersiveDevice();
  const portrait = phone && orientation === "portrait";

  // .screen : le lecteur occupe l'écran (plein écran, ou téléphone) ; .fullscreen : barre masquée, seul « Quitter » reste.
  const classes = [
    styles.root,
    fullscreen || cover ? styles.screen : "",
    fullscreen ? styles.fullscreen : "",
    cover ? styles.cover : "",
    portrait ? styles.portrait : styles.landscape,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={classes}
      role="region"
      aria-label={label}
      data-orientation={portrait ? "portrait" : "landscape"}
    >
      {backdrop}

      <header className={styles.bar}>
        {title ? (
          titleIsHeading ? (
            <h1 className={styles.title}>{title}</h1>
          ) : (
            <p className={styles.title}>{title}</p>
          )
        ) : null}
        {headerCenter}
        <dl className={styles.stats}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${styles.statItem}${stat.srOnly ? ` ${styles.srOnly}` : ""}`}
            >
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
        {howTo && howTo.length > 0 && !fullscreen ? (
          <button
            type="button"
            className={styles.howToButton}
            aria-expanded={howToOpen}
            aria-label={t("player.howTo.button")}
            onClick={() => setHowToOpen((open) => !open)}
          >
            ?
          </button>
        ) : null}
      </header>

      {cover && !portrait ? (
        <p className={styles.rotateNote}>
          {t("player.orientation.rotateNote")}
        </p>
      ) : null}

      <div className={styles.body}>
        <div className={styles.stage} inert={paused && !ended}>
          {children}
        </div>
        {paused && !ended ? (
          <div className={styles.pauseVeil} role="status">
            <p className={styles.pauseTitle}>{t("player.pausedTitle")}</p>
            <button
              type="button"
              className={styles.pauseResume}
              onClick={onPlay}
            >
              {t("player.resume")}
            </button>
          </div>
        ) : null}
      </div>

      {fullscreen ? (
        // Mode immersif : plus de barre ; une seule commande du lecteur, « ✕ Quitter », qui ramène à l'affichage normal.
        <button
          type="button"
          className={styles.fullscreenExit}
          aria-label={t("player.screen.exit")}
          onClick={() =>
            onFullscreenChange ? onFullscreenChange(false) : onClose?.()
          }
        >
          <Icon>
            <path d="M6 6l12 12M18 6 6 18" />
          </Icon>
          <span>{t("player.screen.leave")}</span>
        </button>
      ) : (
        <div
          ref={controlsRef}
          className={styles.controls}
          role="toolbar"
          aria-label={t("player.controls")}
        >
          <button
            type="button"
            className={`${styles.ctl} ${styles.ctlPrimary}`}
            aria-label={showPlay ? t("player.play") : t("player.pause")}
            disabled={ended}
            onClick={showPlay ? onPlay : onPause}
          >
            {showPlay ? <PlayIcon /> : <PauseIcon />}
            <span>{showPlay ? t("player.play") : t("player.pause")}</span>
          </button>
          <button
            type="button"
            className={styles.ctl}
            aria-label={restartLabel ?? t("player.restartAria")}
            onClick={onRestart}
          >
            <Icon>
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </Icon>
            <span>{t("player.restart")}</span>
          </button>
          <span className={styles.ctlSeparator} aria-hidden="true" />
          {onHint ? (
            <button
              type="button"
              className={styles.ctl}
              aria-label={t("player.hintAria")}
              disabled={hintDisabled || paused || ended}
              onClick={onHint}
            >
              <Icon>
                <path d="M9 18h6M10 21h4" />
                <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
              </Icon>
              <span>{t("player.hint")}</span>
            </button>
          ) : null}
          {extraControls}
          {/* Plein écran : change la taille, jamais l'orientation choisie. */}
          {onFullscreenChange ? (
            <button
              type="button"
              className={styles.ctl}
              aria-label={t("player.screen.enter")}
              onClick={() => onFullscreenChange(true)}
            >
              <Icon>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </Icon>
              <span>{t("player.screen.enterShort")}</span>
            </button>
          ) : null}
          {/* Portrait / Paysage (téléphone seulement) : change l'orientation, jamais le plein écran. */}
          {phone ? (
            <button
              type="button"
              className={styles.ctl}
              aria-label={
                portrait
                  ? t("player.orientation.playLandscape")
                  : t("player.orientation.playPortrait")
              }
              onClick={() =>
                setOrientation(portrait ? "landscape" : "portrait")
              }
            >
              <Icon>
                {portrait ? (
                  <rect x="3" y="7" width="18" height="10" rx="2" />
                ) : (
                  <rect x="7" y="3" width="10" height="18" rx="2" />
                )}
              </Icon>
              <span>
                {portrait
                  ? t("player.orientation.landscapeShort")
                  : t("player.orientation.portraitShort")}
              </span>
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              className={`${styles.ctl} ${styles.ctlExit}`}
              aria-label={t("player.screen.close")}
              onClick={onClose}
            >
              <Icon>
                <path d="M6 6l12 12M18 6 6 18" />
              </Icon>
              <span>{t("player.screen.closeShort")}</span>
            </button>
          ) : null}
        </div>
      )}

      {howToOpen && howTo && !fullscreen ? (
        <section className={styles.howTo} aria-label={t("player.howTo.title")}>
          <div className={styles.howToHeader}>
            <h3 className={styles.howToTitle}>{t("player.howTo.title")}</h3>
            <button
              type="button"
              className={styles.howToClose}
              aria-label={t("player.howTo.close")}
              onClick={() => setHowToOpen(false)}
            >
              ×
            </button>
          </div>
          <ol className={styles.howToList}>
            {howTo.map((step, index) => (
              <li key={step.title} className={styles.howToItem}>
                <span className={styles.howToNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  <strong>{step.title}</strong>
                  <span className={styles.howToText}>{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {overlay}
    </div>
  );
}
