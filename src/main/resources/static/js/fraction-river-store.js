(function initializeFractionRiverStore(root) {
    "use strict";

    const STORAGE_KEY = "portailMath.games.fractionRiver.v1";
    const STEP_COUNT = 5;
    const MAX_RECENT_QUESTIONS = 12;
    const FIRST_TRY_BADGE_THRESHOLD = 5;

    // Table unique code ↔ libellé : les récits suivants réutilisent ces codes.
    const BADGES = {
        EXPLORATEUR_DES_DEMIS: "Explorateur des demis",
        MAITRE_DES_QUARTS: "Maître des quarts"
    };

    function emptyLevelProgress() {
        return {
            completedSteps: 0,
            firstTryCorrect: 0,
            correctedErrors: 0,
            bridgeCompleted: false,
            completed: false
        };
    }

    // Les métriques sont conservées par niveau : « 5/5 étapes » doit rester vrai
    // quand les niveaux 2 et 3 arriveront.
    function emptyProgress() {
        return {
            currentLevel: 1,
            levels: {"1": emptyLevelProgress()},
            gamesPlayed: 0,
            badges: [],
            soundEnabled: true,
            recentQuestionIds: [],
            lastPlayedAt: null
        };
    }

    function normalizeCount(value, maximum) {
        const count = Number(value);
        if (!Number.isInteger(count) || count < 0) {
            return 0;
        }
        return typeof maximum === "number" ? Math.min(count, maximum) : count;
    }

    function normalizeLevelProgress(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return emptyLevelProgress();
        }
        return {
            completedSteps: normalizeCount(value.completedSteps, STEP_COUNT),
            firstTryCorrect: normalizeCount(value.firstTryCorrect, STEP_COUNT),
            correctedErrors: normalizeCount(value.correctedErrors, STEP_COUNT),
            bridgeCompleted: value.bridgeCompleted === true,
            completed: value.completed === true
        };
    }

    function normalizeProgress(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Progression de la Rivière des fractions invalide");
        }

        const levels = {};
        const rawLevels = value.levels && typeof value.levels === "object" && !Array.isArray(value.levels)
            ? value.levels
            : {};
        Object.keys(rawLevels).forEach((key) => {
            if (/^[1-9]\d*$/.test(key)) {
                levels[key] = normalizeLevelProgress(rawLevels[key]);
            }
        });
        if (!levels["1"]) {
            levels["1"] = emptyLevelProgress();
        }

        const currentLevel = Number(value.currentLevel);
        return {
            currentLevel: Number.isInteger(currentLevel) && currentLevel >= 1 ? currentLevel : 1,
            levels,
            gamesPlayed: normalizeCount(value.gamesPlayed),
            badges: Array.isArray(value.badges)
                ? [...new Set(value.badges.filter((badge) => typeof badge === "string" && BADGES[badge]))]
                : [],
            soundEnabled: value.soundEnabled !== false,
            recentQuestionIds: Array.isArray(value.recentQuestionIds)
                ? value.recentQuestionIds
                    .filter((id) => typeof id === "string")
                    .slice(-MAX_RECENT_QUESTIONS)
                : [],
            lastPlayedAt: typeof value.lastPlayedAt === "string" ? value.lastPlayedAt : null
        };
    }

    function earnedBadges(levelProgress) {
        const badges = [];
        if (levelProgress.completed) {
            badges.push("EXPLORATEUR_DES_DEMIS");
        }
        if (levelProgress.firstTryCorrect >= FIRST_TRY_BADGE_THRESHOLD) {
            badges.push("MAITRE_DES_QUARTS");
        }
        return badges;
    }

    function createStore(storage, now = () => new Date().toISOString()) {
        function load() {
            if (!storage) {
                return emptyProgress();
            }
            try {
                const raw = storage.getItem(STORAGE_KEY);
                return raw ? normalizeProgress(JSON.parse(raw)) : emptyProgress();
            } catch (error) {
                console.warn("Progression de la Rivière des fractions illisible :", error);
                return emptyProgress();
            }
        }

        function save(progress) {
            if (!storage) {
                return progress;
            }
            try {
                storage.setItem(STORAGE_KEY, JSON.stringify(progress));
            } catch (error) {
                console.warn("Progression de la Rivière des fractions non enregistrée :", error);
            }
            return progress;
        }

        function recordTraversal(result) {
            const level = String(result && result.level ? result.level : 1);
            const current = load();
            const previous = current.levels[level] || emptyLevelProgress();
            const completedSteps = normalizeCount(result.completedSteps, STEP_COUNT);
            const bridgeCompleted = result.bridgeCompleted === true;
            const levelProgress = {
                completedSteps: Math.max(previous.completedSteps, completedSteps),
                firstTryCorrect: Math.max(previous.firstTryCorrect, normalizeCount(result.firstTryCorrect, STEP_COUNT)),
                correctedErrors: Math.max(previous.correctedErrors, normalizeCount(result.correctedErrors, STEP_COUNT)),
                bridgeCompleted: previous.bridgeCompleted || bridgeCompleted,
                completed: previous.completed || (completedSteps >= STEP_COUNT && bridgeCompleted)
            };

            const questionIds = Array.isArray(result.questionIds)
                ? result.questionIds.filter((id) => typeof id === "string")
                : [];

            return save({
                ...current,
                currentLevel: Math.max(current.currentLevel, Number(level)),
                levels: {...current.levels, [level]: levelProgress},
                gamesPlayed: current.gamesPlayed + 1,
                badges: [...new Set([...current.badges, ...earnedBadges(levelProgress)])],
                recentQuestionIds: [...current.recentQuestionIds, ...questionIds].slice(-MAX_RECENT_QUESTIONS),
                lastPlayedAt: now()
            });
        }

        function levelProgress(level = 1) {
            return load().levels[String(level)] || emptyLevelProgress();
        }

        function setSoundEnabled(enabled) {
            return save({...load(), soundEnabled: Boolean(enabled)});
        }

        function reset() {
            if (!storage) {
                return;
            }
            try {
                storage.removeItem(STORAGE_KEY);
            } catch (error) {
                console.warn("Progression de la Rivière des fractions non supprimée :", error);
            }
        }

        return {
            load,
            save,
            recordTraversal,
            levelProgress,
            setSoundEnabled,
            reset
        };
    }

    const api = {
        createStore,
        emptyProgress,
        emptyLevelProgress,
        normalizeProgress,
        earnedBadges,
        BADGES,
        STORAGE_KEY,
        STEP_COUNT,
        MAX_RECENT_QUESTIONS
    };

    let browserStorage = null;
    try {
        browserStorage = root.localStorage;
    } catch (error) {
        console.warn("Stockage local indisponible :", error);
    }
    root.FractionRiverStore = createStore(browserStorage);
    root.FractionRiverStoreApi = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
