"use strict";

const assert = require("node:assert/strict");
const questions = require("../../main/resources/static/js/fraction-river-questions.js");
const visuals = require("../../main/resources/static/js/fraction-river-visuals.js");
const game = require("../../main/resources/static/js/fraction-river.js");
const store = require("../../main/resources/static/js/fraction-river-store.js");

const {
    STEP_TYPES,
    STEP_COUNT,
    ALLOWED_FRACTIONS,
    HINTS,
    fractionKey,
    createSeededRandom,
    createLevel1Steps,
    createBridgePairs,
    hintFor,
    countLevel1Variants
} = questions;

const {
    createTraversalState,
    evaluateChoice,
    evaluateSelection,
    advanceStep,
    createBridgeState,
    evaluateBridgeAssociation,
    calculateExplorerOffset
} = game;

const {createStore, STORAGE_KEY, MAX_RECENT_QUESTIONS} = store;

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

const ALLOWED_KEYS = new Set(ALLOWED_FRACTIONS.map(fractionKey));

// --- Les cinq étapes, dans l'ordre, avec les fractions du niveau 1 ------------
{
    const steps = createLevel1Steps(createSeededRandom(7));
    assert.equal(steps.length, STEP_COUNT);
    assert.deepEqual(steps.map((step) => step.type), STEP_TYPES);
    steps.forEach((step) => {
        assert.equal(ALLOWED_KEYS.has(fractionKey(step.fraction)), true);
        assert.equal(step.fraction.denominator <= 4, true);
        assert.equal(typeof step.prompt, "string");
        assert.equal(step.prompt.length > 0, true);
        assert.equal(typeof step.explanation, "string");
    });
}

// --- Une seule bonne réponse, aucun doublon, distracteurs pédagogiques --------
{
    for (let seed = 1; seed <= 40; seed += 1) {
        const steps = createLevel1Steps(createSeededRandom(seed));
        steps.filter((step) => step.type !== "SELECT_PARTS").forEach((step) => {
            assert.equal(step.options.length, 3);
            assert.equal(step.options.filter((option) => option.correct).length, 1);
            assert.equal(new Set(step.options.map((option) => option.key)).size, 3);
            step.options.filter((option) => !option.correct).forEach((option) => {
                assert.equal(Object.keys(HINTS).includes(option.distractor), true);
            });
        });
    }
}

// --- Aucune fraction impossible par rapport au visuel -------------------------
{
    for (let seed = 1; seed <= 40; seed += 1) {
        createLevel1Steps(createSeededRandom(seed)).forEach((step) => {
            if (step.visual) {
                assert.equal(step.visual.total >= 2, true);
                assert.equal(step.visual.filled >= 0 && step.visual.filled <= step.visual.total, true);
            }
            step.options.filter((option) => option.visual).forEach((option) => {
                assert.equal(option.visual.total >= 2, true);
                assert.equal(option.visual.filled >= 1, true);
                assert.equal(option.visual.filled <= option.visual.total, true);
            });
        });
    }
}

// --- Générateur déterministe et catalogue de variantes ------------------------
{
    const first = createLevel1Steps(createSeededRandom(2026)).map((step) => step.id);
    const second = createLevel1Steps(createSeededRandom(2026)).map((step) => step.id);
    assert.deepEqual(first, second);

    const other = createLevel1Steps(createSeededRandom(11)).map((step) => step.id);
    assert.equal(first.join("|") !== other.join("|"), true);
    assert.equal(countLevel1Variants() >= 30, true);
}

// --- Anti-répétition : les questions déjà vues sont évitées -------------------
{
    const previous = createLevel1Steps(createSeededRandom(5));
    const previousIds = previous.map((step) => step.id);
    const next = createLevel1Steps(createSeededRandom(5), previousIds);
    next.forEach((step) => {
        assert.equal(previousIds.includes(step.id), false);
    });
}

// --- Métriques : premier essai, correction, étapes ----------------------------
{
    const step = {
        type: "IDENTIFY",
        options: [
            {key: "2/4", correct: true, distractor: null},
            {key: "4/2", correct: false, distractor: "INVERTED"}
        ]
    };

    const firstTry = evaluateChoice(createTraversalState(), step, "2/4");
    assert.equal(firstTry.outcome, "CORRECT");
    assert.equal(firstTry.completedSteps, 1);
    assert.equal(firstTry.firstTryCorrect, 1);
    assert.equal(firstTry.correctedErrors, 0);

    const wrong = evaluateChoice(createTraversalState(), step, "4/2");
    assert.equal(wrong.outcome, "INCORRECT");
    assert.equal(wrong.hadMistake, true);
    assert.equal(wrong.completedSteps, 0);
    assert.equal(wrong.lastDistractor, "INVERTED");

    const wrongTwice = evaluateChoice(wrong, step, "4/2");
    const corrected = evaluateChoice(wrongTwice, step, "2/4");
    assert.equal(corrected.completedSteps, 1);
    assert.equal(corrected.firstTryCorrect, 0);
    // Une question ayant nécessité plusieurs tentatives ne compte qu'une fois.
    assert.equal(corrected.correctedErrors, 1);

    assert.equal(evaluateChoice(corrected, step, "4/2").outcome, "LOCKED");
    assert.equal(evaluateChoice(createTraversalState(), step, "9/9").outcome, "UNKNOWN");

    const advanced = advanceStep(corrected);
    assert.equal(advanced.stepIndex, 1);
    assert.equal(advanced.hadMistake, false);
    assert.equal(advanced.locked, false);
    assert.equal(advanced.correctedErrors, 1);
}

// --- Sélection de parts : un essai = une validation ---------------------------
{
    const step = {type: "SELECT_PARTS", requiredCount: 2, totalParts: 4};

    const tooFew = evaluateSelection(createTraversalState(), step, [0]);
    assert.equal(tooFew.outcome, "INCORRECT");
    assert.equal(tooFew.completedSteps, 0);

    const tooMany = evaluateSelection(createTraversalState(), step, [0, 1, 2]);
    assert.equal(tooMany.outcome, "INCORRECT");
    assert.equal(tooMany.lastDistractor, "OFF_BY_ONE");

    const exact = evaluateSelection(createTraversalState(), step, [3, 1]);
    assert.equal(exact.outcome, "CORRECT");
    assert.equal(exact.firstTryCorrect, 1);

    // Les doublons et les index hors limites ne gonflent pas la sélection.
    const noisy = evaluateSelection(createTraversalState(), step, [0, 0, 1, 9, -2]);
    assert.equal(noisy.outcome, "CORRECT");

    const afterMistake = evaluateSelection(tooFew, step, [0, 2]);
    assert.equal(afterMistake.correctedErrors, 1);
    assert.equal(afterMistake.firstTryCorrect, 0);
}

// --- Passerelle des représentations (climax) ----------------------------------
{
    const pairs = createBridgePairs(createSeededRandom(3));
    assert.deepEqual([...pairs.slabs.map((slab) => slab.key)].sort(), ["1/2", "1/4", "3/4"]);
    assert.equal(pairs.visualOrder.length, 3);

    let bridge = createBridgeState(pairs);
    assert.equal(bridge.completed, false);

    const wrongKey = ["1/2", "1/4", "3/4"].find((key) => key !== bridge.visualOrder[0]);
    const afterWrong = evaluateBridgeAssociation(bridge, wrongKey);
    assert.equal(afterWrong.outcome, "INCORRECT");
    assert.equal(afterWrong.associated.length, 0);

    bridge.visualOrder.forEach((key, index) => {
        bridge = evaluateBridgeAssociation(bridge, key);
        assert.equal(bridge.outcome, "CORRECT");
        assert.equal(bridge.associated.length, index + 1);
    });
    assert.equal(bridge.completed, true);
    assert.equal(evaluateBridgeAssociation(bridge, bridge.visualOrder[0]).outcome, "LOCKED");
}

// --- Progression de l'explorateur ---------------------------------------------
{
    assert.equal(calculateExplorerOffset(0, 5, 400), 0);
    assert.equal(calculateExplorerOffset(2, 5, 400), 160);
    assert.equal(calculateExplorerOffset(5, 5, 400), 400);
    assert.equal(calculateExplorerOffset(9, 5, 400), 400);
    assert.equal(calculateExplorerOffset(3, 5, 0), 0);
}

// --- Durée de traversée lue depuis la variable CSS ----------------------------
{
    const {parseDuration, DEFAULT_BOAT_TRAVEL_MS} = game;
    assert.equal(parseDuration("4500ms", 1), 4500);
    assert.equal(parseDuration(" 4500ms ", 1), 4500);
    assert.equal(parseDuration("4.5s", 1), 4500);
    assert.equal(parseDuration("2s", 1), 2000);
    // Une variable absente ou aberrante ne doit jamais figer la barque.
    assert.equal(parseDuration("", DEFAULT_BOAT_TRAVEL_MS), DEFAULT_BOAT_TRAVEL_MS);
    assert.equal(parseDuration(undefined, DEFAULT_BOAT_TRAVEL_MS), DEFAULT_BOAT_TRAVEL_MS);
    assert.equal(parseDuration("0ms", DEFAULT_BOAT_TRAVEL_MS), DEFAULT_BOAT_TRAVEL_MS);
    assert.equal(parseDuration("-3s", DEFAULT_BOAT_TRAVEL_MS), DEFAULT_BOAT_TRAVEL_MS);
    assert.equal(parseDuration("beaucoup", DEFAULT_BOAT_TRAVEL_MS), DEFAULT_BOAT_TRAVEL_MS);
}

// --- Indices ciblés ------------------------------------------------------------
{
    Object.keys(HINTS).forEach((type) => {
        assert.equal(hintFor(type), HINTS[type]);
    });
    assert.equal(typeof hintFor("INCONNU"), "string");
    assert.equal(hintFor("INCONNU").length > 0, true);
}

// --- Visuels -------------------------------------------------------------------
{
    const bar = visuals.renderStaticVisual({kind: "BAR", total: 4, filled: 3, id: "t1"});
    assert.equal((bar.match(/<rect/g) || []).length >= 4, true);
    assert.equal((bar.match(/fr-part fr-part--filled/g) || []).length, 3);
    assert.equal(bar.includes('role="img"'), true);
    assert.equal(bar.includes("3 parts sur 4"), true);
    assert.equal(bar.includes("url(#t1-hatch)"), true);

    const disc = visuals.renderStaticVisual({kind: "DISC", total: 3, filled: 1, id: "t2"});
    assert.equal((disc.match(/<path/g) || []).length, 3);
    assert.equal((disc.match(/fr-part--filled/g) || []).length, 1);
    assert.equal(disc.includes("1 part sur 3"), true);

    const basket = visuals.renderStaticVisual({kind: "BASKET", total: 2, filled: 2, id: "t3"});
    assert.equal((basket.match(/<circle/g) || []).length, 2);

    assert.throws(() => visuals.renderStaticVisual({kind: "INCONNU", total: 2, filled: 1}));
    assert.throws(() => visuals.renderStaticVisual({kind: "BAR", total: 1, filled: 1}));
    assert.throws(() => visuals.renderStaticVisual({kind: "BAR", total: 3, filled: 5}));
}

// --- Parts interactives : de vrais boutons ------------------------------------
{
    const markup = visuals.renderInteractiveParts({kind: "BAR", total: 4, selected: [1]});
    assert.equal((markup.match(/<button/g) || []).length, 4);
    assert.equal((markup.match(/aria-pressed="true"/g) || []).length, 1);
    assert.equal(markup.includes('data-part="0"'), true);
    assert.equal(markup.includes('aria-label="Part 1 sur 4"'), true);
    assert.throws(() => visuals.renderInteractiveParts({kind: "DISC", total: 4}));
}

// --- Stockage local : métriques par niveau ------------------------------------
{
    const storage = memoryStorage({"portailMath.exetat.progress.v1": "à conserver"});
    const fractionStore = createStore(storage, () => "2026-08-02T20:00:00Z");

    fractionStore.recordTraversal({
        level: 1,
        completedSteps: 5,
        firstTryCorrect: 3,
        correctedErrors: 2,
        bridgeCompleted: true,
        questionIds: ["S01-1-2", "S03-1-4"]
    });

    const progress = fractionStore.load();
    assert.equal(progress.gamesPlayed, 1);
    assert.equal(progress.currentLevel, 1);
    assert.deepEqual(progress.levels["1"], {
        completedSteps: 5,
        firstTryCorrect: 3,
        correctedErrors: 2,
        bridgeCompleted: true,
        completed: true
    });
    assert.deepEqual(progress.badges, ["EXPLORATEUR_DES_DEMIS"]);
    assert.deepEqual(progress.recentQuestionIds, ["S01-1-2", "S03-1-4"]);
    assert.equal(progress.lastPlayedAt, "2026-08-02T20:00:00Z");

    // Le meilleur résultat est conservé, une traversée moins bonne ne l'écrase pas.
    fractionStore.recordTraversal({
        level: 1,
        completedSteps: 5,
        firstTryCorrect: 1,
        correctedErrors: 4,
        bridgeCompleted: true,
        questionIds: []
    });
    assert.equal(fractionStore.levelProgress(1).firstTryCorrect, 3);
    assert.equal(fractionStore.load().gamesPlayed, 2);

    fractionStore.recordTraversal({
        level: 1,
        completedSteps: 5,
        firstTryCorrect: 5,
        correctedErrors: 0,
        bridgeCompleted: true,
        questionIds: []
    });
    assert.deepEqual(
        fractionStore.load().badges.sort(),
        ["EXPLORATEUR_DES_DEMIS", "MAITRE_DES_QUARTS"]
    );

    // Un niveau non joué reste vierge.
    assert.deepEqual(fractionStore.levelProgress(2), {
        completedSteps: 0,
        firstTryCorrect: 0,
        correctedErrors: 0,
        bridgeCompleted: false,
        completed: false
    });

    fractionStore.setSoundEnabled(false);
    assert.equal(fractionStore.load().soundEnabled, false);

    // Seule la clé du jeu est supprimée.
    fractionStore.reset();
    assert.equal(storage.getItem(STORAGE_KEY), null);
    assert.equal(storage.getItem("portailMath.exetat.progress.v1"), "à conserver");
}

// --- Une traversée incomplète ne marque pas le niveau comme terminé -----------
{
    const fractionStore = createStore(memoryStorage());
    fractionStore.recordTraversal({
        level: 1,
        completedSteps: 4,
        firstTryCorrect: 4,
        correctedErrors: 0,
        bridgeCompleted: false,
        questionIds: []
    });
    assert.equal(fractionStore.levelProgress(1).completed, false);
    assert.deepEqual(fractionStore.load().badges, []);
}

// --- La liste anti-répétition reste bornée ------------------------------------
{
    const fractionStore = createStore(memoryStorage());
    for (let round = 0; round < 6; round += 1) {
        fractionStore.recordTraversal({
            level: 1,
            completedSteps: 5,
            firstTryCorrect: 0,
            correctedErrors: 5,
            bridgeCompleted: true,
            questionIds: [`q${round}a`, `q${round}b`, `q${round}c`]
        });
    }
    const recent = fractionStore.load().recentQuestionIds;
    assert.equal(recent.length, MAX_RECENT_QUESTIONS);
    assert.equal(recent[recent.length - 1], "q5c");
}

// --- Récupération après un JSON absent ou corrompu ----------------------------
{
    const originalWarn = console.warn;
    console.warn = () => {};

    const corrupted = createStore(memoryStorage({[STORAGE_KEY]: "{json invalide"}));
    assert.deepEqual(corrupted.load(), store.emptyProgress());

    const wrongShape = createStore(memoryStorage({[STORAGE_KEY]: '"une chaîne"'}));
    assert.deepEqual(wrongShape.load(), store.emptyProgress());

    // Des valeurs aberrantes sont ramenées à un état valide, sans exception.
    const absurd = createStore(memoryStorage({
        [STORAGE_KEY]: JSON.stringify({
            currentLevel: -3,
            levels: {"1": {completedSteps: 99, firstTryCorrect: -1, correctedErrors: "x"}, zzz: {}},
            gamesPlayed: -5,
            badges: ["INCONNU", "EXPLORATEUR_DES_DEMIS"],
            recentQuestionIds: "pas un tableau"
        })
    }));
    const repaired = absurd.load();
    assert.equal(repaired.currentLevel, 1);
    assert.equal(repaired.levels["1"].completedSteps, 5);
    assert.equal(repaired.levels["1"].firstTryCorrect, 0);
    assert.equal(repaired.levels["1"].correctedErrors, 0);
    assert.equal(repaired.levels.zzz, undefined);
    assert.equal(repaired.gamesPlayed, 0);
    assert.deepEqual(repaired.badges, ["EXPLORATEUR_DES_DEMIS"]);
    assert.deepEqual(repaired.recentQuestionIds, []);

    const missing = createStore(memoryStorage());
    assert.deepEqual(missing.load(), store.emptyProgress());

    console.warn = originalWarn;
}

console.log("fraction-river: all tests passed");
