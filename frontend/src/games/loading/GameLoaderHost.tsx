import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { GameLoader } from "./GameLoader";
import { gameLoadingProfile } from "./gameLoadingProfiles";
import { createLoadingSession, type LoadingSession } from "./loadingSession";
import styles from "./GameLoaderHost.module.css";

const GameLoadingContext = createContext<LoadingSession | null>(null);

/**
 * Séance de chargement du jeu affiché. Hors d'un hôte (test d'un lecteur seul), une séance détachée, sans affichage :
 * le lecteur signale ses étapes sans avoir à savoir qui les montre.
 */
export function useGameLoading(): LoadingSession {
  const session = useContext(GameLoadingContext);
  const detached = useMemo(() => createLoadingSession({}), []);
  return session ?? detached;
}

/** Jalon d'initialisation atteint dès que ce composant est rendu (par exemple : le code du lecteur est arrivé). */
export function ReachMilestone({ id }: { id: string }) {
  const session = useGameLoading();
  useEffect(() => session.milestone(id), [session, id]);
  return null;
}

export interface GameLoaderHostProps {
  /** Identifiant du jeu (catalogue) : pondération de ses jalons et habillage du chargeur. */
  game: string;
  /** Séance créée au clic ; sans elle, une séance est ouverte au montage de l'hôte (page du jeu ouverte directement). */
  session?: LoadingSession;
  /** Faux quand le jeu est masqué (un autre jeu est affiché) : le chargeur et son chronomètre sont retirés. */
  visible?: boolean;
  /** Cadre plein écran (téléphone) : coins droits. */
  square?: boolean;
  /**
   * « cover » (catalogue) : le chargeur recouvre exactement le cadre du lecteur. « page » (page d'un jeu ouverte
   * directement) : le chargeur prend la place du lecteur en haut de la page, à la taille d'un lecteur, et la page reste
   * masquée dessous jusqu'au jeu prêt (rien ne bouge pendant le chargement).
   */
  layout?: "cover" | "page";
  onClose?: () => void;
  children: ReactNode;
}

// Hôte du chargeur commun : il entoure le lecteur (et son téléchargement) et pose le chargeur par-dessus, hors de toute
// attente React (Suspense). Le chargeur reste donc le même composant, sans démontage, du clic jusqu'au jeu prêt ; le
// lecteur, une fois arrivé, ne fait que lui signaler ses étapes par useGameLoading().
export function GameLoaderHost({ game, session: given, visible = true, square = false, layout = "cover", onClose, children }: GameLoaderHostProps) {
  const profile = gameLoadingProfile(game);
  const own = useMemo(() => given ?? createLoadingSession(profile.milestones), [given, profile]);
  const state = useSyncExternalStore(own.subscribe, own.getState);
  return (
    <GameLoadingContext.Provider value={own}>
      <div className={`${styles.host}${square ? ` ${styles.square}` : ""}${layout === "page" ? ` ${styles.page}` : ""}`} data-loading={state.ready ? undefined : ""}>
        {layout === "page" ? <div className={styles.pageContent}>{children}</div> : children}
        {state.ready || !visible ? null : (
          <div className={layout === "page" ? styles.pageFrame : styles.coverFrame} data-inert-exempt="">
            <GameLoader session={own} theme={profile.theme} onClose={onClose} />
          </div>
        )}
      </div>
    </GameLoadingContext.Provider>
  );
}
