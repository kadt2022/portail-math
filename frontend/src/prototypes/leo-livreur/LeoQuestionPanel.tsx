import type { LeoQuestion } from "./leoQuestions";
import styles from "./LeoMissionContent.module.css";

export interface LeoQuestionPanelProps {
  question: LeoQuestion;
  /** Données déjà affichées à côté (liste des commandes) : on pose seulement la question courte. */
  short?: boolean;
  /** Niveau d'aide après les erreurs : 0 rien, 1 encouragement, 2 indice, 3 méthode guidée. */
  help: 0 | 1 | 2 | 3;
  solved: boolean;
}

/**
 * Question mise en évidence et retour après une réponse. La zone de retour est annoncée aux lecteurs d'écran à chaque
 * changement (erreur, indice, méthode, réussite) ; la réponse juste n'est jamais donnée sans la méthode.
 */
export function LeoQuestionPanel({ question, short = false, help, solved }: LeoQuestionPanelProps) {
  return (
    <div className={styles.question}>
      <p className={styles.prompt}>{short && question.prompt ? question.prompt : question.text}</p>
      <div className={styles.feedback} role="status" aria-live="polite">
        {solved || help === 0 ? null : help === 1 ? (
          <p className={styles.help}>Pas tout à fait. Relis bien l'énoncé et réessaie, tu vas y arriver !</p>
        ) : help === 2 ? (
          <p className={styles.help}><strong>Indice :</strong> {question.hint}</p>
        ) : (
          <div className={styles.help}>
            <strong>Regardons ensemble :</strong>
            <ol>{question.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <span>À toi d'écrire le résultat.</span>
          </div>
        )}
      </div>
    </div>
  );
}
