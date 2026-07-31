"use strict";

const assert = require("node:assert/strict");
const {
    createProgressStore,
    STORAGE_KEY,
    OLD_STORAGE_KEY
} = require("../../main/resources/static/js/progress-store.js");

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
        },
        has(key) {
            return data.has(key);
        }
    };
}

function result(overrides = {}) {
    return {
        quizId: "quiz-1",
        mode: "STANDARD",
        subjectId: "cercle",
        subjectName: "Le cercle",
        score: 4,
        correctAnswers: 4,
        incorrectAnswers: 1,
        failedQuestionIds: ["cercle-001"],
        correctedQuestionIds: [],
        completedAt: "2026-07-30T22:30:00Z",
        ...overrides
    };
}

{
    const store = createProgressStore(memoryStorage());
    assert.deepEqual(store.loadAll(), {version: 1, subjects: {}, recordedQuizIds: []});
    assert.equal(store.getGlobalSummary().startedSubjects, 0);
}

{
    const storage = memoryStorage();
    const store = createProgressStore(storage);
    store.recordQuizResult(result());
    store.recordQuizResult(result({
        quizId: "quiz-2",
        score: 2,
        correctAnswers: 2,
        incorrectAnswers: 3,
        failedQuestionIds: ["cercle-001", "cercle-004", "cercle-008"]
    }));

    const progress = store.findBySubject("cercle");
    assert.equal(progress.attemptCount, 2);
    assert.equal(progress.lastScore, 2);
    assert.equal(progress.bestScore, 4);
    assert.equal(progress.totalCorrectAnswers, 6);
    assert.equal(progress.totalIncorrectAnswers, 4);
    assert.deepEqual(progress.lastFailedQuestionIds, [
        "cercle-001", "cercle-004", "cercle-008"
    ]);
    assert.equal(progress.status, "IN_PROGRESS");

    store.recordQuizResult(result({
        quizId: "quiz-2",
        score: 2
    }));
    assert.equal(store.findBySubject("cercle").attemptCount, 2);
}

{
    const storage = memoryStorage();
    const firstStore = createProgressStore(storage);
    firstStore.recordQuizResult(result());
    const reloadedStore = createProgressStore(storage);
    assert.equal(reloadedStore.findBySubject("cercle").bestScore, 4);

    reloadedStore.recordQuizResult(result({
        quizId: "review-1",
        mode: "REVIEW",
        score: 1,
        correctAnswers: 1,
        incorrectAnswers: 0,
        failedQuestionIds: [],
        correctedQuestionIds: ["cercle-001"]
    }));
    const reviewed = reloadedStore.findBySubject("cercle");
    assert.equal(reviewed.attemptCount, 1);
    assert.equal(reviewed.lastScore, 4);
    assert.equal(reviewed.bestScore, 4);
    assert.equal(reviewed.totalCorrectedQuestions, 1);
    assert.deepEqual(reviewed.lastFailedQuestionIds, []);
    assert.equal(reviewed.status, "MASTERED");
}

{
    const legacy = JSON.stringify({
        version: 1,
        subjects: {},
        recordedQuizIds: []
    });
    const storage = memoryStorage({[OLD_STORAGE_KEY]: legacy});
    const store = createProgressStore(storage);
    assert.deepEqual(store.loadAll(), JSON.parse(legacy));
    assert.equal(storage.getItem(OLD_STORAGE_KEY), null);
    assert.equal(storage.getItem(STORAGE_KEY), legacy);
}

{
    const store = createProgressStore(memoryStorage());
    store.recordQuizResult(result({
        quizId: "perfect",
        score: 5,
        correctAnswers: 5,
        incorrectAnswers: 0,
        failedQuestionIds: []
    }));
    store.recordQuizResult(result({
        quizId: "later",
        score: 1,
        correctAnswers: 1,
        incorrectAnswers: 4,
        failedQuestionIds: [
            "cercle-001", "cercle-002", "cercle-004", "cercle-005"
        ]
    }));
    const progress = store.findBySubject("cercle");
    assert.equal(progress.lastScore, 1);
    assert.equal(progress.bestScore, 5);
    assert.equal(progress.status, "MASTERED");
}

{
    const storage = memoryStorage({[STORAGE_KEY]: "{invalid json"});
    const store = createProgressStore(storage);
    const originalWarn = console.warn;
    console.warn = () => {};
    assert.deepEqual(store.loadAll(), {version: 1, subjects: {}, recordedQuizIds: []});
    console.warn = originalWarn;
}

{
    const storage = memoryStorage({unrelated: "keep"});
    const store = createProgressStore(storage);
    store.recordQuizResult(result());
    store.clearAll();
    assert.equal(storage.getItem(STORAGE_KEY), null);
    assert.equal(storage.getItem("unrelated"), "keep");
}

console.log("progress-store: all tests passed");
