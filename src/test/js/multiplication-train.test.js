"use strict";

const assert = require("node:assert/strict");
const {
    ALLOWED_TABLES,
    LEVELS,
    QUESTION_COUNT,
    GUIDED_INITIAL_SCENE_PAUSE_MS,
    GUIDED_CORRECTION_PAUSE_MS,
    TRAIN_TRAVEL_DURATION_MS,
    TRAIN_WHEEL_DIAMETER_PX,
    createAnswerOptions,
    createGameQuestions,
    createRoundState,
    nextAvailableLevelIndex,
    evaluateAnswer,
    scoreToLargeStars,
    calculateTrainOffset,
    calculateTrainTravelDistance,
    calculateWheelRotation
} = require("../../main/resources/static/js/multiplication-train.js");
const {
    createStore,
    STORAGE_KEY
} = require("../../main/resources/static/js/multiplication-train-store.js");

function sequenceRandom() {
    const values = [0.08, 0.72, 0.31, 0.94, 0.45, 0.16, 0.83, 0.57];
    let index = 0;
    return () => {
        const value = values[index % values.length];
        index += 1;
        return value;
    };
}

function memoryStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value) {
            data.set(key, String(value));
        },
        removeItem(key) {
            data.delete(key);
        }
    };
}

{
    assert.equal(LEVELS.length, 1);
    assert.equal(nextAvailableLevelIndex(0), null);
    assert.equal(nextAvailableLevelIndex(0, [{id: "LEVEL_1"}, {id: "LEVEL_2"}]), 1);
    assert.equal(nextAvailableLevelIndex(1, [{id: "LEVEL_1"}, {id: "LEVEL_2"}]), null);

    const questions = createGameQuestions(sequenceRandom());
    assert.equal(questions.length, QUESTION_COUNT);
    assert.equal(new Set(questions.map((question) => question.id)).size, QUESTION_COUNT);
    questions.forEach((question) => {
        assert.equal(ALLOWED_TABLES.includes(question.table), true);
        assert.equal(question.multiplier >= 1 && question.multiplier <= 10, true);
        assert.equal(question.answers.length, 3);
        assert.equal(new Set(question.answers).size, 3);
        assert.equal(
            question.answers.filter((answer) => answer === question.correctAnswer).length,
            1
        );
    });
}

{
    const answersWithLowRandom = createAnswerOptions(5, 4, () => 0);
    const answersWithHighRandom = createAnswerOptions(5, 4, () => 0.9999);
    assert.notDeepEqual(answersWithLowRandom, answersWithHighRandom);
    assert.equal(answersWithLowRandom.includes(20), true);
    assert.equal(answersWithHighRandom.includes(20), true);
}

{
    const question = {
        correctAnswer: 20
    };
    const initial = createRoundState();
    const incorrect = evaluateAnswer(initial, question, 15);
    assert.equal(incorrect.completedQuestions, 0);
    assert.equal(incorrect.score, 0);
    assert.equal(incorrect.hadMistake, true);

    const corrected = evaluateAnswer(incorrect, question, 20);
    assert.equal(corrected.completedQuestions, 1);
    assert.equal(corrected.score, 0);
    assert.equal(corrected.locked, true);

    const firstTry = evaluateAnswer(initial, question, 20);
    assert.equal(firstTry.completedQuestions, 1);
    assert.equal(firstTry.score, 1);
}

{
    assert.equal(GUIDED_INITIAL_SCENE_PAUSE_MS, 1500);
    assert.equal(GUIDED_CORRECTION_PAUSE_MS, 4500);
    assert.equal(TRAIN_TRAVEL_DURATION_MS, 3600);
    assert.equal(TRAIN_WHEEL_DIAMETER_PX, 40);
    assert.ok(GUIDED_CORRECTION_PAUSE_MS >= TRAIN_TRAVEL_DURATION_MS + 800);
    assert.equal(scoreToLargeStars(5), 3);
    assert.equal(scoreToLargeStars(4), 2);
    assert.equal(scoreToLargeStars(3), 1);
    assert.equal(scoreToLargeStars(2), 1);
    assert.equal(scoreToLargeStars(1), 0);
    assert.equal(calculateTrainOffset(0, 5, 500), 0);
    assert.equal(calculateTrainOffset(3, 5, 500), 300);
    assert.equal(calculateTrainOffset(5, 5, 500), 500);
    assert.equal(calculateTrainOffset(8, 5, 500), 500);
    assert.equal(calculateTrainTravelDistance(120, 280), 160);
    assert.equal(calculateTrainTravelDistance(280, 280, 160), 160);
    assert.equal(calculateTrainTravelDistance(320, 280), 0);
    assert.equal(calculateTrainTravelDistance(Number.NaN, 280), 0);
    assert.ok(Math.abs(calculateWheelRotation(Math.PI * 40) - 360) < 0.0001);
    assert.equal(calculateWheelRotation(20, 0), 0);
    assert.equal(calculateWheelRotation(Number.NaN, 40), 0);
}

{
    const storage = memoryStorage({unrelated: "à conserver"});
    const store = createStore(storage, () => "2026-08-02T01:10:00Z");
    store.recordGame(4);
    store.recordGame(2);
    const progress = store.load();
    assert.equal(progress.bestScore, 4);
    assert.equal(progress.gamesPlayed, 2);
    assert.equal(progress.totalCorrectAnswers, 6);
    assert.deepEqual(progress.unlockedLevels, ["LEVEL_1"]);
    assert.equal(progress.lastPlayedAt, "2026-08-02T01:10:00Z");

    store.setSoundEnabled(false);
    assert.equal(store.load().soundEnabled, false);
    store.reset();
    assert.equal(storage.getItem(STORAGE_KEY), null);
    assert.equal(storage.getItem("unrelated"), "à conserver");
}

{
    const originalWarn = console.warn;
    console.warn = () => {};
    const store = createStore(memoryStorage({[STORAGE_KEY]: "{json invalide"}));
    assert.deepEqual(store.load(), {
        bestScore: 0,
        gamesPlayed: 0,
        totalCorrectAnswers: 0,
        unlockedLevels: ["LEVEL_1"],
        lastPlayedAt: null,
        soundEnabled: true
    });
    console.warn = originalWarn;
}

console.log("multiplication-train: all tests passed");
