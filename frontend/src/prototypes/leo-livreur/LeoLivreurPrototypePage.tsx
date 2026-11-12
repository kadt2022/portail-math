import { useEffect, useRef, useState, type PointerEvent } from "react";

import {
  mountLeoLivreurGame,
  type LeoLivreurControl,
  type LeoLivreurController,
  type LeoLivreurSnapshot,
} from "./LeoLivreurGame";
import { DESTINATIONS, ROUTE_LENGTH_METERS } from "./leoGeometry";
import styles from "./LeoLivreurPrototypePage.module.css";

const INITIAL_SNAPSHOT: LeoLivreurSnapshot = {
  phase: "INTRO",
  speed: 0,
  heading: 0,
  steering: 0,
  cargo: DESTINATIONS.length,
  targetCargo: DESTINATIONS.length,
  distanceToHouse: 740,
  targetLabel: "Maison 1",
  travelledMeters: 0,
  routeLengthMeters: ROUTE_LENGTH_METERS,
};

const PHASE_LABELS: Record<LeoLivreurSnapshot["phase"], string> = {
  INTRO: "Préparation de la mission",
  DRIVING: "Conduite en cours",
  ARRIVED: "Arrêt réussi devant la maison",
  DELIVERED: "Livraison réussie",
};

function HoldButton({
  control,
  label,
  icon,
  controller,
}: {
  control: LeoLivreurControl;
  label: string;
  icon: string;
  controller: LeoLivreurController | null;
}) {
  const press = () => controller?.setControl(control, true);
  const release = (event?: PointerEvent<HTMLButtonElement>) => {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    controller?.setControl(control, false);
  };
  const nudge = () => {
    if (control === "left" || control === "right") controller?.turn(control);
  };
  const handlePress = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    press();
    nudge();
  };
  return (
    <button
      type="button"
      className={`${styles.control} ${styles[control]}`}
      onPointerDown={handlePress}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      aria-label={`${label} (maintenir)`}
    >
      <span aria-hidden="true">{icon}</span>
      <strong>{label}</strong>
    </button>
  );
}

export function LeoLivreurPrototypePage() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<LeoLivreurController | null>(null);
  const [controller, setController] = useState<LeoLivreurController | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  useEffect(() => {
    if (!hostRef.current) return;
    const mountedController = mountLeoLivreurGame(hostRef.current, setSnapshot);
    controllerRef.current = mountedController;
    setController(mountedController);
    const observer = new ResizeObserver(() => controllerRef.current?.refreshLayout());
    observer.observe(hostRef.current);
    return () => {
      observer.disconnect();
      controllerRef.current?.destroy();
      controllerRef.current = null;
      setController(null);
    };
  }, []);

  const canStart = snapshot.phase === "INTRO";
  const canDeliver = snapshot.phase === "ARRIVED";

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Prototype LEO-DRIVE-01</p>
          <h1>Léo le livreur de pizzas</h1>
          <p className={styles.lead}>Conduis vraiment jusqu’aux maisons : avance, tourne à l’intersection, puis freine dans la zone jaune.</p>
        </div>
        <div className={styles.missionCard}>
          <span>Commande du jour</span>
          <strong>{snapshot.targetCargo} pizzas, une par maison</strong>
          <small>{PHASE_LABELS[snapshot.phase]}</small>
        </div>
      </header>

      <section className={styles.gameCard} aria-label="Prototype de conduite de Léo">
        <div ref={hostRef} className={styles.gameHost} />
        <div className={styles.hud}>
          <span>Dans la voiture : <strong>{snapshot.cargo} pizzas</strong></span>
          <span>Vitesse : <strong>{snapshot.speed}</strong></span>
          <span>Braquage : <strong>{snapshot.steering}°</strong></span>
          <span>{snapshot.targetLabel} : <strong>{snapshot.distanceToHouse} m</strong></span>
          <span>Parcours : <strong>{(snapshot.travelledMeters / 1000).toFixed(1)} / {(snapshot.routeLengthMeters / 1000).toFixed(1)} km</strong></span>
        </div>
      </section>

      <section className={styles.panel}>
        {canStart ? <p>Les pizzas sont chargées. Pars du restaurant et livre d’abord la Maison 1, au bout de la route du haut.</p> : null}
        {snapshot.phase === "DRIVING" ? <p>Prochaine livraison : {snapshot.targetLabel}. Tu choisis toi-même où tourner. Besoin de reculer ? Maintiens Freiner à l’arrêt.</p> : null}
        {canDeliver ? <p>Tu es arrêté au bon endroit. La conduite est bloquée pendant la livraison : {snapshot.targetLabel}.</p> : null}
        {snapshot.phase === "DELIVERED" ? <p className={styles.success}>Bravo ! Toutes les maisons du long parcours sont livrées. La prochaine étape ajoutera les questions mathématiques.</p> : null}
        <div className={styles.actions}>
          {canStart ? <button type="button" className={styles.primaryAction} onClick={() => controller?.startMission()}>Commencer la mission</button> : null}
          {canDeliver ? <button type="button" className={styles.primaryAction} onClick={() => controller?.deliver()}>Livrer la pizza</button> : null}
          {snapshot.phase === "DELIVERED" ? <button type="button" className={styles.secondaryAction} onClick={() => controller?.reset()}>Rejouer</button> : null}
        </div>
      </section>

      <section className={styles.controls} aria-label="Commandes de conduite">
        <HoldButton control="left" label="Gauche" icon="←" controller={controller} />
        <HoldButton control="forward" label="Avancer" icon="↑" controller={controller} />
        <HoldButton control="brake" label="Freiner" icon="■" controller={controller} />
        <HoldButton control="right" label="Droite" icon="→" controller={controller} />
      </section>
    </main>
  );
}
