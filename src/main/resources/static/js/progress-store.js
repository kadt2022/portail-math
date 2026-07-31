(function initializeProgressStore(root) {
    "use strict";

    const STORAGE_KEY = "portailMath.exetat.progress.v1";
    const OLD_STORAGE_KEY = "timbiriMaths.exetat.progress.v1";
    const VERSION = 1;
    const MAX_RECORDED_QUIZZES = 100;

    function emptyProgress() {
        return {
            version: VERSION,
            subjects: {},
            recordedQuizIds: []
        };
    }

    function createProgressStore(storage) {
        function migrateOldKey() {
            if (!storage) {
                return;
            }
            try {
                const currentValue = storage.getItem(STORAGE_KEY);
                const oldValue = storage.getItem(OLD_STORAGE_KEY);
                if (!currentValue && oldValue) {
                    storage.setItem(STORAGE_KEY, oldValue);
                    storage.removeItem(OLD_STORAGE_KEY);
                }
            } catch (error) {
                console.warn("Migration de progression locale impossible :", error);
            }
        }

        function loadAll() {
            migrateOldKey();
            if (!storage) {
                return emptyProgress();
            }
            try {
                const raw = storage.getItem(STORAGE_KEY);
                if (!raw) {
                    return emptyProgress();
                }
                const parsed = JSON.parse(raw);
                if (!parsed || parsed.version !== VERSION
                        || !parsed.subjects || Array.isArray(parsed.subjects)) {
                    throw new Error("Format de progression invalide");
                }
                return {
                    version: VERSION,
                    subjects: parsed.subjects,
                    recordedQuizIds: Array.isArray(parsed.recordedQuizIds)
                        ? parsed.recordedQuizIds
                        : []
                };
            } catch (error) {
                console.warn("Progression locale illisible :", error);
                return emptyProgress();
            }
        }

        function save(progress) {
            if (!storage) {
                return;
            }
            try {
                storage.setItem(STORAGE_KEY, JSON.stringify(progress));
            } catch (error) {
                console.warn("Progression locale non enregistrée :", error);
            }
        }

        function findBySubject(subjectId) {
            return loadAll().subjects[subjectId] || null;
        }

        function calculateStatus(subject, failedQuestionIds) {
            if (!subject || subject.attemptCount === 0) {
                return "NOT_STARTED";
            }
            if (subject.status === "MASTERED" || subject.bestScore >= 5) {
                return "MASTERED";
            }
            if (subject.bestScore >= 4 && failedQuestionIds.length === 0) {
                return "MASTERED";
            }
            if (subject.bestScore >= 4) {
                return "IN_PROGRESS";
            }
            return "TO_REVIEW";
        }

        function newSubject(result) {
            return {
                subjectId: result.subjectId,
                subjectName: result.subjectName,
                attemptCount: 0,
                lastScore: 0,
                bestScore: 0,
                totalCorrectAnswers: 0,
                totalIncorrectAnswers: 0,
                totalCorrectedQuestions: 0,
                lastFailedQuestionIds: [],
                lastQuizId: null,
                reviewSourceQuizId: null,
                lastAttemptAt: null,
                lastActivityAt: null,
                status: "NOT_STARTED"
            };
        }

        function recordQuizResult(result) {
            if (!result || !result.subjectId || !result.subjectName) {
                throw new Error("Résultat de quiz incomplet");
            }

            const progress = loadAll();
            if (result.quizId && progress.recordedQuizIds.includes(result.quizId)) {
                return progress.subjects[result.subjectId] || null;
            }

            const current = {
                ...newSubject(result),
                ...(progress.subjects[result.subjectId] || {})
            };
            current.lastFailedQuestionIds = Array.isArray(current.lastFailedQuestionIds)
                ? current.lastFailedQuestionIds
                : [];
            current.totalCorrectedQuestions = Number(current.totalCorrectedQuestions) || 0;
            const failedQuestionIds = Array.isArray(result.failedQuestionIds)
                ? [...new Set(result.failedQuestionIds)]
                : [];
            const completedAt = result.completedAt || new Date().toISOString();
            let updated;

            if (result.mode === "REVIEW") {
                updated = {
                    ...current,
                    subjectName: result.subjectName,
                    totalCorrectedQuestions: current.totalCorrectedQuestions
                        + (Array.isArray(result.correctedQuestionIds)
                            ? result.correctedQuestionIds.length
                            : 0),
                    lastFailedQuestionIds: failedQuestionIds,
                    reviewSourceQuizId: failedQuestionIds.length
                        ? (result.quizId || current.reviewSourceQuizId)
                        : null,
                    lastActivityAt: completedAt
                };
            } else {
                updated = {
                    ...current,
                    subjectName: result.subjectName,
                    attemptCount: current.attemptCount + 1,
                    lastScore: result.score,
                    bestScore: Math.max(current.bestScore, result.score),
                    totalCorrectAnswers: current.totalCorrectAnswers + result.correctAnswers,
                    totalIncorrectAnswers: current.totalIncorrectAnswers + result.incorrectAnswers,
                    lastFailedQuestionIds: failedQuestionIds,
                    lastQuizId: result.quizId || null,
                    reviewSourceQuizId: failedQuestionIds.length ? (result.quizId || null) : null,
                    lastAttemptAt: completedAt,
                    lastActivityAt: completedAt
                };
            }

            updated.status = calculateStatus(updated, updated.lastFailedQuestionIds);
            progress.subjects[result.subjectId] = updated;
            if (result.quizId) {
                progress.recordedQuizIds = [
                    ...progress.recordedQuizIds.filter((quizId) => quizId !== result.quizId),
                    result.quizId
                ].slice(-MAX_RECORDED_QUIZZES);
            }
            save(progress);
            return updated;
        }

        function getGlobalSummary() {
            const entries = Object.values(loadAll().subjects)
                .filter((subject) => subject.attemptCount > 0);
            const totalBestPoints = entries.reduce(
                (total, subject) => total + subject.bestScore,
                0
            );
            return {
                startedSubjects: entries.length,
                bestAveragePercentage: entries.length
                    ? Math.round((totalBestPoints / (entries.length * 5)) * 100)
                    : 0,
                bestResult: entries.length
                    ? Math.max(...entries.map((subject) => subject.bestScore))
                    : 0,
                totalCorrectAnswers: entries.reduce(
                    (total, subject) => total + subject.totalCorrectAnswers,
                    0
                ),
                questionsToReview: entries.reduce(
                    (total, subject) => total + subject.lastFailedQuestionIds.length,
                    0
                )
            };
        }

        function clearAll() {
            if (!storage) {
                return;
            }
            try {
                storage.removeItem(STORAGE_KEY);
                storage.removeItem(OLD_STORAGE_KEY);
            } catch (error) {
                console.warn("Progression locale non supprimée :", error);
            }
        }

        return {
            loadAll,
            findBySubject,
            recordQuizResult,
            getGlobalSummary,
            clearAll
        };
    }

    let browserStorage = null;
    try {
        browserStorage = root.localStorage;
    } catch (error) {
        console.warn("Stockage local indisponible :", error);
    }
    root.ProgressStore = createProgressStore(browserStorage);

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            createProgressStore,
            STORAGE_KEY,
            OLD_STORAGE_KEY
        };
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
