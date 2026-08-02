(function initializeMultiplicationTrainStore(root) {
    "use strict";

    const STORAGE_KEY = "portailMath.games.multiplicationTrain.v1";
    const MAX_SCORE = 5;

    function emptyProgress() {
        return {
            bestScore: 0,
            gamesPlayed: 0,
            totalCorrectAnswers: 0,
            unlockedLevels: ["LEVEL_1"],
            lastPlayedAt: null,
            soundEnabled: true
        };
    }

    function normalizeProgress(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Progression du jeu invalide");
        }

        const bestScore = Number(value.bestScore);
        const gamesPlayed = Number(value.gamesPlayed);
        const totalCorrectAnswers = Number(value.totalCorrectAnswers);
        if (!Number.isInteger(bestScore) || bestScore < 0 || bestScore > MAX_SCORE
                || !Number.isInteger(gamesPlayed) || gamesPlayed < 0
                || !Number.isInteger(totalCorrectAnswers) || totalCorrectAnswers < 0) {
            throw new Error("Valeurs de progression invalides");
        }

        return {
            bestScore,
            gamesPlayed,
            totalCorrectAnswers,
            unlockedLevels: Array.isArray(value.unlockedLevels)
                ? [...new Set(value.unlockedLevels.filter((level) => typeof level === "string"))]
                : ["LEVEL_1"],
            lastPlayedAt: typeof value.lastPlayedAt === "string" ? value.lastPlayedAt : null,
            soundEnabled: value.soundEnabled !== false
        };
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
                console.warn("Progression du Train des multiplications illisible :", error);
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
                console.warn("Progression du Train des multiplications non enregistrée :", error);
            }
            return progress;
        }

        function recordGame(score) {
            const safeScore = Math.max(0, Math.min(MAX_SCORE, Math.trunc(Number(score) || 0)));
            const current = load();
            return save({
                ...current,
                bestScore: Math.max(current.bestScore, safeScore),
                gamesPlayed: current.gamesPlayed + 1,
                totalCorrectAnswers: current.totalCorrectAnswers + safeScore,
                unlockedLevels: [...new Set([...current.unlockedLevels, "LEVEL_1"])],
                lastPlayedAt: now()
            });
        }

        function setSoundEnabled(enabled) {
            return save({
                ...load(),
                soundEnabled: Boolean(enabled)
            });
        }

        function reset() {
            if (!storage) {
                return;
            }
            try {
                storage.removeItem(STORAGE_KEY);
            } catch (error) {
                console.warn("Progression du Train des multiplications non supprimée :", error);
            }
        }

        return {
            load,
            recordGame,
            setSoundEnabled,
            reset
        };
    }

    const api = {
        createStore,
        emptyProgress,
        STORAGE_KEY
    };

    let browserStorage = null;
    try {
        browserStorage = root.localStorage;
    } catch (error) {
        console.warn("Stockage local indisponible :", error);
    }
    root.MultiplicationTrainStore = createStore(browserStorage);

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
