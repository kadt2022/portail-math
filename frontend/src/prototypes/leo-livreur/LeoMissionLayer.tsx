import type { LeoLivreurSnapshot } from "./LeoLivreurGame";
import { LeoAnswerPad } from "./LeoAnswerPad";
import { LeoDeliveryNotice } from "./LeoDeliveryNotice";
import { PizzaIcon, StarIcon } from "./LeoMissionIcons";
import { LeoMissionWindow } from "./LeoMissionWindow";
import {
  addressById,
  currentAddress,
  currentQuestion,
  currentTour,
  formatKm,
  formatRemaining,
  helpLevel,
  MAX_STARS_PER_TOUR,
  tourSummary,
  type MissionState,
  type TourSummary,
} from "./leoMission";
import type { LeoQuestion } from "./leoQuestions";
import { LeoOrderList } from "./LeoOrderList";
import { LeoQuestionPanel } from "./LeoQuestionPanel";
import type { LeoMission } from "./useLeoMission";
import content from "./LeoMissionContent.module.css";
import styles from "./LeoMissionLayer.module.css";

const pizzas = (count: number) => `${count} pizza${count > 1 ? "s" : ""}`;

/** Valeurs du tableau de bord pendant la mission (destination, distances, pizzas). */
export function missionDashboard(state: MissionState, snapshot: LeoLivreurSnapshot) {
  return {
    destination: currentAddress(state).label,
    travelled: formatKm(snapshot.travelledMeters),
    // Une maison dépassée n'est jamais présentée comme encore devant Léo.
    remaining: state.missed.includes(currentAddress(state).id) || snapshot.destinationStatus === "passed" ? "Manquée" : formatRemaining(snapshot.remainingMeters),
    pizzas: state.stock,
  };
}

/** Consigne courte du panneau de conduite, selon l'étape de la mission. */
export function missionInstruction(state: MissionState, snapshot: LeoLivreurSnapshot) {
  if (state.stage === "welcome") return "Appuie sur Commencer pour ouvrir la pizzeria.";
  if (state.stage === "driving" && snapshot.phase === "ARRIVED") return "Tu es arrêté devant la bonne maison : appuie sur LIVRER.";
  if (state.stage === "driving") return `Conduis jusqu'au ${currentAddress(state).label}, puis arrête-toi dans la zone verte.`;
  if (state.stage === "handover") return "Léo remet les pizzas…";
  if (state.stage === "stock-question") return "Fin de la tournée : réponds à la question sur les pizzas restantes.";
  return "Réponds à la question pour continuer.";
}

function Stars({ count, max }: { count: number; max: number }) {
  return (
    <div className={content.stars} role="img" aria-label={`${count} étoile${count > 1 ? "s" : ""} sur ${max}`}>
      {Array.from({ length: max }, (_, index) => <StarIcon key={index} filled={index < count} />)}
    </div>
  );
}

/** Grand bouton LIVRER : seulement arrêté dans la zone de la bonne maison. Un seul clic compte (voir missionReducer). */
export function DeliverButton({ mission }: { mission: LeoMission }) {
  if (!mission.canDeliver) return null;
  return (
    <button type="button" className={styles.deliver} onClick={mission.deliver}>
      <PizzaIcon size={30} />
      <span>LIVRER</span>
    </button>
  );
}

/** Bilan d'une tournée ou de la partie : la conduite d'un côté, les mathématiques (et les étoiles) de l'autre. */
function SummaryBlocks({ summary, maxStars, meters }: { summary: Omit<TourSummary, "tour">; maxStars: number; meters: number }) {
  return (
    <>
      <h3 className={content.section}>Conduite</h3>
      <dl className={content.summary}>
        <div><dt>Livraisons prévues</dt><dd>{summary.planned}</dd></div>
        <div><dt>Livraisons réussies</dt><dd>{summary.houses}</dd></div>
        <div><dt>Livraisons manquées</dt><dd>{summary.missed}</dd></div>
        <div><dt>Pizzas livrées</dt><dd>{summary.pizzas}</dd></div>
        <div><dt>Pizzas restantes</dt><dd>{summary.remaining}</dd></div>
        <div><dt>Distance parcourue</dt><dd>{formatKm(meters)}</dd></div>
      </dl>
      <h3 className={content.section}>Mathématiques</h3>
      <Stars count={summary.stars} max={maxStars} />
      <dl className={content.summary}>
        <div><dt>Questions réussies</dt><dd>{summary.questions} sur {summary.questions}, dont {summary.firstTry} du premier coup</dd></div>
      </dl>
    </>
  );
}

/** Action d'une question : le pavé tant qu'elle n'est pas résolue, puis le message de réussite et le bouton suivant. */
function questionSide(
  mission: LeoMission,
  question: LeoQuestion,
  success: string | null,
  next: { label: string; onClick: () => void },
  keyboard: boolean,
) {
  if (!mission.state.solved) return <LeoAnswerPad key={question.id} unit={question.unit} onAnswer={mission.answer} keyboard={keyboard} />;
  return (
    <div className={content.actions}>
      {success ? <p className={content.success} role="status">{success}</p> : null}
      <button type="button" className={content.primary} onClick={next.onClick}>{next.label}</button>
    </div>
  );
}

/**
 * Écrans de la mission au-dessus de la scène (conduite neutralisée) : préparation au restaurant, départ, questions de
 * livraison, bilans. Rien pendant la conduite : la route reste entièrement visible. `className` : placement dans la
 * zone de la scène, fourni par l'écran hôte.
 */
export function LeoMissionOverlay({
  mission,
  snapshot,
  className,
  keyboard = true,
}: {
  mission: LeoMission;
  snapshot: LeoLivreurSnapshot;
  className?: string;
  /** Clavier de l'ordinateur pour répondre : faux quand le jeu est masqué ou en pause. */
  keyboard?: boolean;
}) {
  const { state } = mission;
  const tour = currentTour(state);
  const tourNumber = state.tour + 1;
  const question = currentQuestion(state);
  const help = helpLevel(state);

  if (state.stage === "driving" && state.notice) {
    return <LeoDeliveryNotice notice={state.notice} onDismiss={mission.dismissNotice} className={className} />;
  }

  if (state.stage === "restaurant" && question) {
    const orders = tour.addresses.map((id, index) => ({ address: addressById(id).label, pizzas: tour.orders[index] }));
    return (
      <LeoMissionWindow
        className={className}
        title={`Tournée ${tourNumber} — Préparation`}
        side={questionSide(mission, question, null, { label: "Partir", onClick: mission.depart }, keyboard)}
      >
        {/* La méthode guidée reprend les commandes : la liste s'efface alors pour ne pas les répéter. */}
        {help < 3 ? <LeoOrderList orders={orders} /> : null}
        <LeoQuestionPanel question={question} short help={help} solved={state.solved} />
      </LeoMissionWindow>
    );
  }

  if (state.stage === "loaded") {
    return (
      <LeoMissionWindow
        className={className}
        title={`Tournée ${tourNumber} — C'est parti !`}
        side={(
          <div className={content.actions}>
            <button type="button" className={content.primary} onClick={mission.depart}>Partir</button>
          </div>
        )}
      >
        <p className={content.success}>Bravo ! {pizzas(state.stock)} dans la voiture.</p>
        <p className={content.text}>
          Première livraison : <strong>{currentAddress(state).label}</strong>, à {formatRemaining(snapshot.remainingMeters)} par la route.
        </p>
        <p className={content.note}>Arrête-toi dans la zone verte, devant le panneau « LIVRAISON ».</p>
      </LeoMissionWindow>
    );
  }

  if (state.stage === "question" && question) {
    const last = state.stop + 1 >= tour.addresses.length;
    return (
      <LeoMissionWindow
        className={className}
        title={`Livraison — ${currentAddress(state).label}`}
        side={questionSide(mission, question, `Bravo ! Livraison validée. Il reste ${pizzas(state.stock)} dans la voiture.`, {
          label: last ? "Terminer la tournée" : "Reprendre la route",
          onClick: mission.next,
        }, keyboard)}
      >
        <LeoQuestionPanel question={question} help={help} solved={state.solved} />
      </LeoMissionWindow>
    );
  }

  if (state.stage === "stock-question" && question) {
    return (
      <LeoMissionWindow
        className={className}
        title={`Tournée ${tourNumber} — Bilan des pizzas`}
        side={questionSide(mission, question, `Exact : il reste ${pizzas(state.stock)} dans la voiture.`, {
          label: "Voir le bilan de la tournée",
          onClick: mission.next,
        }, keyboard)}
      >
        <LeoQuestionPanel question={question} help={help} solved={state.solved} />
      </LeoMissionWindow>
    );
  }

  if (state.stage === "tour-summary") {
    const summary = tourSummary(state, state.tour);
    const more = state.tour + 1 < state.plan.tours.length;
    return (
      <LeoMissionWindow
        className={className}
        title={`Bilan de la tournée ${tourNumber}`}
        side={(
          <div className={content.actions}>
            {more ? <p className={content.note}>Léo rentre au restaurant pour charger la tournée suivante.</p> : null}
            <button type="button" className={content.primary} onClick={mission.nextTour}>{more ? "Retour au restaurant" : "Voir le bilan final"}</button>
          </div>
        )}
      >
        <SummaryBlocks summary={summary} maxStars={MAX_STARS_PER_TOUR} meters={summary.meters} />
      </LeoMissionWindow>
    );
  }

  if (state.stage === "final") {
    const summaries = state.plan.tours.map((_, index) => tourSummary(state, index));
    const total = (key: keyof Omit<TourSummary, "tour">) => summaries.reduce((sum, summary) => sum + summary[key], 0);
    const allDelivered = total("missed") === 0;
    return (
      <LeoMissionWindow
        className={className}
        title="Bilan final"
        side={(
          <div className={content.actions}>
            <button type="button" className={content.primary} onClick={mission.replay}>Rejouer avec de nouvelles commandes</button>
          </div>
        )}
      >
        <p className={content.success}>{allDelivered ? "Toutes les pizzas sont livrées !" : "Les deux tournées sont terminées."}</p>
        <SummaryBlocks
          summary={{
            planned: total("planned"),
            houses: total("houses"),
            missed: total("missed"),
            pizzas: total("pizzas"),
            remaining: total("remaining"),
            meters: total("meters"),
            questions: total("questions"),
            firstTry: total("firstTry"),
            stars: total("stars"),
          }}
          maxStars={MAX_STARS_PER_TOUR * state.plan.tours.length}
          meters={snapshot.travelledMeters}
        />
        <p className={content.note}>Le trajet de retour au restaurant entre les deux tournées n'est pas compté : Léo ne l'a pas conduit.</p>
      </LeoMissionWindow>
    );
  }

  return null;
}
