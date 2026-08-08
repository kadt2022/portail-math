import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  apiRequest,
  type AnswerResult,
  type CurrentQuestion,
  type QuizResult,
  type QuizStarted,
  type SubjectDetail,
  type SubjectSummary,
} from "./api";
import { recordQuizResult } from "./progress-storage";
import styles from "./ExetatPages.module.css";

interface RemoteState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

function useRemote<T>(path: string | null): RemoteState<T> {
  const [state, setState] = useState<RemoteState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    if (!path) {
      return;
    }
    let active = true;
    void apiRequest<T>(path)
      .then((data) => {
        if (active) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ data: null, error: toErrorMessage(error), loading: false });
        }
      });
    return () => {
      active = false;
    };
  }, [path]);

  return state;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
}

function LoadingOrError({ loading, error }: Pick<RemoteState<unknown>, "loading" | "error">) {
  const { t } = useTranslation("exetat");
  if (loading) {
    return <p className={styles.notice}>{t("common.loading")}</p>;
  }
  if (error) {
    return (
      <div className={styles.error} role="alert">
        <strong>{t("common.errorTitle")}</strong>
        <p>{error}</p>
      </div>
    );
  }
  return null;
}

export function ExetatCataloguePage() {
  const { t } = useTranslation("exetat");
  const { data: subjects, error, loading } = useRemote<SubjectSummary[]>(
    "/api/v1/exetat/matieres",
  );

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("catalogue.eyebrow")}</p>
      <h1 className={styles.title}>{t("catalogue.title")}</h1>
      <p className={styles.lead}>{t("catalogue.description")}</p>
      <LoadingOrError loading={loading} error={error} />
      {subjects ? (
        <div className={styles.grid}>
          {subjects.map((subject) => (
            <article className={styles.card} key={subject.id}>
              <span className={styles.icon} aria-hidden="true">
                {subject.icon === "integral" ? "∫" : subject.icon === "derivative" ? "f′" : "◆"}
              </span>
              <p className={styles.meta}>{subject.category}</p>
              <h2>{subject.name}</h2>
              <p>{subject.description}</p>
              <dl className={styles.metrics}>
                <div>
                  <dt>{t("catalogue.questions")}</dt>
                  <dd>{subject.questionCount}</dd>
                </div>
                <div>
                  <dt>{t("catalogue.minutes")}</dt>
                  <dd>{subject.estimatedMinutes}</dd>
                </div>
              </dl>
              <Link className={styles.primaryLink} to={`/exetat/matieres/${subject.id}`}>
                {t("catalogue.discover")}
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ExetatSubjectPage() {
  const { subjectId } = useParams();
  const { t } = useTranslation("exetat");
  const { data: subject, error, loading } = useRemote<SubjectDetail>(
    subjectId ? `/api/v1/exetat/matieres/${encodeURIComponent(subjectId)}` : null,
  );

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to="/exetat">
        ← {t("subject.back")}
      </Link>
      <LoadingOrError loading={loading} error={error} />
      {subject ? (
        <>
          <p className={styles.eyebrow}>{subject.category}</p>
          <h1 className={styles.title}>{subject.name}</h1>
          <p className={styles.lead}>{subject.description}</p>
          <section className={styles.panel} aria-labelledby="topics-title">
            <h2 id="topics-title">{t("subject.topics")}</h2>
            <ul className={styles.topicList}>
              {subject.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </section>
          <div className={styles.actions}>
            <Link
              className={styles.primaryLink}
              to={`/exetat/matieres/${subject.id}/entrainement`}
            >
              {t("subject.prepare")}
            </Link>
            <Link className={styles.secondaryLink} to={`/exetat/matieres/${subject.id}/quiz`}>
              {t("subject.start")}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ExetatTrainingPage() {
  const { subjectId } = useParams();
  const { t } = useTranslation("exetat");
  const { data: subject, error, loading } = useRemote<SubjectDetail>(
    subjectId ? `/api/v1/exetat/matieres/${encodeURIComponent(subjectId)}` : null,
  );

  return (
    <div className={styles.page}>
      <LoadingOrError loading={loading} error={error} />
      {subject ? (
        <>
          <p className={styles.eyebrow}>{t("training.eyebrow")}</p>
          <h1 className={styles.title}>{subject.name}</h1>
          <p className={styles.lead}>{t("training.description")}</p>
          <section className={styles.panel}>
            <h2>{t("training.rulesTitle")}</h2>
            <ul className={styles.rules}>
              <li>{t("training.ruleQuestions", { count: subject.questionCount })}</li>
              <li>{t("training.ruleTime", { count: subject.estimatedMinutes })}</li>
              <li>{t("training.ruleFeedback")}</li>
              <li>{t("training.ruleProgress")}</li>
            </ul>
          </section>
          <div className={styles.actions}>
            <Link className={styles.primaryLink} to={`/exetat/matieres/${subject.id}/quiz`}>
              {t("training.start", { count: subject.questionCount })}
            </Link>
            <Link className={styles.secondaryLink} to={`/exetat/matieres/${subject.id}`}>
              {t("training.back")}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ExetatQuizPage() {
  const { subjectId } = useParams();
  const { t } = useTranslation("exetat");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const quizId = searchParams.get("quizId");
  const startRef = useRef<{ subjectId: string; promise: Promise<string> } | null>(null);
  const [current, setCurrent] = useState<CurrentQuestion | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) {
      return;
    }
    const activeSubjectId = subjectId;
    let active = true;

    async function initialize() {
      try {
        let activeQuizId = quizId;
        if (!activeQuizId) {
          const start =
            startRef.current?.subjectId === activeSubjectId
              ? startRef.current
              : {
                  subjectId: activeSubjectId,
                  promise: apiRequest<QuizStarted>("/api/v1/exetat/quizzes", {
                    method: "POST",
                    body: JSON.stringify({ subjectId: activeSubjectId }),
                  }).then((started) => started.quizId),
                };
          startRef.current = start;
          activeQuizId = await start.promise;
          if (active) {
            setSearchParams({ quizId: activeQuizId }, { replace: true });
          }
          return;
        }
        const question = await apiRequest<CurrentQuestion>(
          `/api/v1/exetat/quizzes/${encodeURIComponent(activeQuizId)}/current-question`,
        );
        if (active) {
          setCurrent(question);
          setSelectedChoiceId(question.answerResult?.selectedChoiceId ?? null);
          setLoading(false);
        }
      } catch (caught) {
        if (active) {
          setError(toErrorMessage(caught));
          setLoading(false);
        }
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [quizId, setSearchParams, subjectId]);

  async function submitAnswer() {
    if (!current || !selectedChoiceId) {
      return;
    }
    setBusy(true);
    try {
      const answerResult = await apiRequest<AnswerResult>(
        `/api/v1/exetat/quizzes/${encodeURIComponent(current.quizId)}/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            questionId: current.question.id,
            selectedChoiceId,
          }),
        },
      );
      setCurrent({ ...current, answered: true, score: answerResult.score, answerResult });
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function goNext() {
    if (!current?.answerResult) {
      return;
    }
    if (!current.answerResult.hasNextQuestion) {
      navigate(`/exetat/quizzes/${current.quizId}/resultats`);
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/api/v1/exetat/quizzes/${encodeURIComponent(current.quizId)}/next`, {
        method: "POST",
      });
      const question = await apiRequest<CurrentQuestion>(
        `/api/v1/exetat/quizzes/${encodeURIComponent(current.quizId)}/current-question`,
      );
      setCurrent(question);
      setSelectedChoiceId(null);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const answer = current?.answerResult;

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("quiz.eyebrow")}</p>
      <h1 className={styles.title}>
        {current?.mode === "REVIEW" ? t("quiz.reviewTitle") : t("quiz.title")}
      </h1>
      <LoadingOrError loading={loading} error={error} />
      {current ? (
        <section className={styles.quizPanel} aria-labelledby="question-title">
          <div className={styles.quizStatus}>
            <span>
              {t("quiz.question", {
                current: current.questionNumber,
                total: current.totalQuestions,
              })}
            </span>
            <span>{t("quiz.score", { score: current.score, total: current.totalQuestions })}</span>
          </div>
          <progress value={current.questionNumber} max={current.totalQuestions} />
          <p className={styles.meta}>{current.question.topic}</p>
          <h2 id="question-title">{current.question.statement}</h2>
          <div className={styles.choices} role="radiogroup" aria-labelledby="question-title">
            {current.question.choices.map((choice) => {
              const selected = selectedChoiceId === choice.id;
              const correct = answer?.correctChoiceId === choice.id;
              const incorrect = Boolean(answer && selected && !answer.correct);
              const className = [
                styles.choice,
                selected ? styles.choiceSelected : "",
                correct ? styles.choiceCorrect : "",
                incorrect ? styles.choiceIncorrect : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  className={className}
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={current.answered}
                  onClick={() => setSelectedChoiceId(choice.id)}
                >
                  <strong>{choice.id}</strong>
                  <span>{choice.label}</span>
                </button>
              );
            })}
          </div>
          {answer ? (
            <div
              className={`${styles.feedback} ${answer.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}`}
              role="status"
            >
              <h3>{answer.correct ? t("quiz.correct") : t("quiz.incorrect")}</h3>
              <p>{answer.solution.summary}</p>
              {answer.solution.formula ? <code>{answer.solution.formula}</code> : null}
              <ol>
                {answer.solution.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>{answer.solution.advice}</p>
            </div>
          ) : null}
          <div className={styles.actions}>
            {answer ? (
              <button className={styles.primaryButton} type="button" disabled={busy} onClick={goNext}>
                {answer.hasNextQuestion ? t("quiz.next") : t("quiz.results")}
              </button>
            ) : (
              <button
                className={styles.primaryButton}
                type="button"
                disabled={!selectedChoiceId || busy}
                onClick={submitAnswer}
              >
                {t("quiz.validate")}
              </button>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ExetatResultsPage() {
  const { quizId } = useParams();
  const { t } = useTranslation("exetat");
  const navigate = useNavigate();
  const { data: result, error, loading } = useRemote<QuizResult>(
    quizId ? `/api/v1/exetat/quizzes/${encodeURIComponent(quizId)}/result` : null,
  );
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    if (result) {
      recordQuizResult(result);
    }
  }, [result]);

  async function startReview() {
    if (!result) {
      return;
    }
    setReviewBusy(true);
    try {
      const started = await apiRequest<QuizStarted>(
        `/api/v1/exetat/quizzes/${encodeURIComponent(result.quizId)}/reviews`,
        { method: "POST" },
      );
      navigate(`/exetat/matieres/${result.subjectId}/quiz?quizId=${started.quizId}`);
    } catch (caught) {
      setReviewError(toErrorMessage(caught));
      setReviewBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <LoadingOrError loading={loading} error={error} />
      {result ? (
        <>
          <p className={styles.eyebrow}>
            {result.mode === "REVIEW" ? t("results.reviewEyebrow") : t("results.eyebrow")}
          </p>
          <h1 className={styles.title}>
            {result.mode === "REVIEW" ? t("results.reviewTitle") : result.subjectName}
          </h1>
          <p className={styles.resultScore}>{result.percentage}%</p>
          <p className={styles.lead}>{result.appreciation}</p>
          <dl className={styles.resultGrid}>
            <div>
              <dt>{t("results.score")}</dt>
              <dd>
                {result.score}/{result.totalQuestions}
              </dd>
            </div>
            <div>
              <dt>
                {result.mode === "REVIEW" ? t("results.corrected") : t("results.correct")}
              </dt>
              <dd>
                {result.mode === "REVIEW"
                  ? result.correctedQuestionIds.length
                  : result.correctAnswers}
              </dd>
            </div>
            <div>
              <dt>{t("results.toReview")}</dt>
              <dd>{result.failedQuestionIds.length}</dd>
            </div>
          </dl>
          {reviewError ? <p className={styles.error}>{reviewError}</p> : null}
          <div className={styles.actions}>
            {result.failedQuestionIds.length ? (
              <button
                className={styles.primaryButton}
                type="button"
                disabled={reviewBusy}
                onClick={startReview}
              >
                {t("results.review")}
              </button>
            ) : null}
            <Link className={styles.secondaryLink} to={`/exetat/matieres/${result.subjectId}/quiz`}>
              {t("results.retry")}
            </Link>
            <Link className={styles.secondaryLink} to="/progression">
              {t("results.progress")}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
