// Feu tricolore de la Zone 3 : logique pure (sans Phaser), à cycle configurable.
//
// Le feu ne commande rien à distance : il ne fait que changer d'état. Léo reste maître de ses
// commandes (le jeu l'informe), et chaque véhicule du trafic décide pour lui-même s'il s'arrête.

export type LightState = "GREEN" | "YELLOW" | "RED";

export interface LightCycle {
  /** Durées en secondes. */
  green: number;
  yellow: number;
  red: number;
  /** Décalage de départ dans le cycle (secondes). */
  offset?: number;
}

export const DEFAULT_LIGHT_CYCLE: LightCycle = { green: 9, yellow: 2.5, red: 7 };

export interface LightPhase {
  state: LightState;
  /** Temps restant dans l'état courant (secondes). */
  remaining: number;
  /** Temps écoulé dans l'état courant. */
  elapsed: number;
}

export function cycleLength(cycle: LightCycle) {
  return cycle.green + cycle.yellow + cycle.red;
}

/** État du feu à l'instant `time` (secondes) : vert, puis orange, puis rouge, en boucle. */
export function lightPhaseAt(time: number, cycle: LightCycle = DEFAULT_LIGHT_CYCLE): LightPhase {
  const length = cycleLength(cycle);
  let t = (((time + (cycle.offset ?? 0)) % length) + length) % length;
  if (t < cycle.green) return { state: "GREEN", remaining: cycle.green - t, elapsed: t };
  t -= cycle.green;
  if (t < cycle.yellow) return { state: "YELLOW", remaining: cycle.yellow - t, elapsed: t };
  t -= cycle.yellow;
  return { state: "RED", remaining: cycle.red - t, elapsed: t };
}

/**
 * Un véhicule situé à `distanceToLine` de la ligne d'arrêt, roulant à `speed`, doit-il s'arrêter ?
 * Au rouge : oui. À l'orange : seulement s'il peut encore s'arrêter confortablement (sinon il passe,
 * comme un conducteur prudent qui ne freine pas à fond).
 */
export function shouldStopForLight(
  state: LightState,
  distanceToLine: number,
  speed: number,
  comfortableBraking = 285,
  emergencyBraking = 630,
) {
  if (distanceToLine < 0 || state === "GREEN") return false;
  if (state === "RED") {
    // Au rouge on s'arrête, sauf si c'est physiquement impossible (déjà trop près de la ligne).
    return distanceToLine >= (speed * speed) / (2 * emergencyBraking);
  }
  const brakingDistance = (speed * speed) / (2 * comfortableBraking);
  return distanceToLine > brakingDistance + 10;
}

/** Messages pédagogiques (texte exact demandé). */
export const SIGNAL_MESSAGES = {
  respected: "Bravo Léo ! Tu as respecté le feu rouge !",
  violated: "Attention Léo ! Il faut s'arrêter au feu rouge.",
  yellow: "Le feu passe à l'orange : prépare-toi à freiner.",
} as const;

export type SignalEvent = "respected" | "violated" | "yellow" | null;

/** Distance avant la ligne à partir de laquelle un arrêt compte comme « devant le feu ». */
export const STOP_WINDOW = 220;

/**
 * Observe Léo face au feu et produit au plus un message par passage :
 *  - il s'arrête devant la ligne pendant le rouge : félicitations ;
 *  - il franchit la ligne au rouge : avertissement ;
 *  - le feu passe à l'orange alors qu'il approche : prévenance.
 * Aucune sanction mécanique : pas de téléportation, pas de blocage. Pour recommencer proprement, il
 * recule derrière la ligne (la marche arrière fait partie des commandes) ; sinon le feu repasse au vert.
 */
export class SignalJudge {
  private frontBefore: number | null = null;
  private praised = false;
  private warned = false;
  private yellowSeen = false;
  private lastState: LightState = "GREEN";
  private redPhaseId = 0;

  /**
   * `front` : abscisse du pare-chocs avant (vers l'est). `lineX` : ligne d'arrêt. Renvoie l'événement
   * de cette image, ou null.
   */
  update(state: LightState, front: number, speed: number, lineX: number): SignalEvent {
    const before = this.frontBefore;
    this.frontBefore = front;
    if (state === "RED" && this.lastState !== "RED") {
      this.redPhaseId += 1;
      this.praised = false;
      this.warned = false;
    }
    if (state === "YELLOW" && this.lastState !== "YELLOW") this.yellowSeen = false;
    this.lastState = state;

    // De retour derrière la ligne : on peut recommencer proprement.
    if (front < lineX - 40) this.warned = false;

    const approaching = front < lineX && front > lineX - STOP_WINDOW * 2;
    if (state === "YELLOW" && approaching && !this.yellowSeen) {
      this.yellowSeen = true;
      return "yellow";
    }
    const crossed = before !== null && before < lineX && front >= lineX;
    if (state === "RED" && crossed && !this.warned) {
      this.warned = true;
      return "violated";
    }
    const stoppedInFront = state === "RED" && speed === 0 && front < lineX && front > lineX - STOP_WINDOW;
    if (stoppedInFront && !this.praised && !this.warned) {
      this.praised = true;
      return "respected";
    }
    return null;
  }

  reset() {
    this.frontBefore = null;
    this.praised = false;
    this.warned = false;
    this.yellowSeen = false;
    this.lastState = "GREEN";
  }

  get redPhases() {
    return this.redPhaseId;
  }
}
