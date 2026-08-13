"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
    GUIDED_INITIAL_SCENE_PAUSE_MS,
    GUIDED_CORRECTION_SCENE_PAUSE_MS,
    GUIDED_FINALE_SCENE_PAUSE_MS,
    createTraversalState,
    evaluateChoice,
    evaluateSelection,
    advanceStep,
    createBridgeState,
    evaluateBridgeAssociation
} = game;

// --- Rythme guidé universel : scène, animation, puis question suivante -------
{
    assert.equal(GUIDED_INITIAL_SCENE_PAUSE_MS, 1500);
    assert.equal(GUIDED_CORRECTION_SCENE_PAUSE_MS, 3000);
    assert.equal(GUIDED_FINALE_SCENE_PAUSE_MS, 4200);
    assert.ok(GUIDED_CORRECTION_SCENE_PAUSE_MS >= 2000);
    assert.ok(GUIDED_FINALE_SCENE_PAUSE_MS >= 3600);
}

// --- Le héros illustré est livré avec le jeu ---------------------------------
{
    const explorerAsset = path.join(
        __dirname,
        "../../main/resources/static/images/games/fraction-river/explorer-boy.png"
    );
    const png = fs.readFileSync(explorerAsset);
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.ok(png.length > 100_000);
}

const {createEventBus, EVENTS} = require("../../main/resources/static/js/fraction-river-events.js");

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

// --- Le type « sélection de parts » a quitté le parcours -----------------------
{
    const questions = require("../../main/resources/static/js/fraction-river-questions.js");

    // Retiré du générateur, pas seulement masqué dans l'interface : sa grille de
    // parts cliquables et son bouton « Valider » ne tenaient pas sur le parchemin
    // peint, large de 18 % de la scène — 115 px sur un téléphone en paysage.
    assert.equal(
        questions.STEP_TYPES.includes("SELECT_PARTS"),
        false,
        "SELECT_PARTS est encore dans la liste des étapes"
    );
    assert.deepEqual(questions.RETIRED_STEP_TYPES, ["SELECT_PARTS"]);

    // Et il ne ressort par aucun tirage.
    for (let seed = 1; seed <= 120; seed += 1) {
        const steps = createLevel1Steps(createSeededRandom(seed));
        assert.equal(steps.length, 5, `tirage ${seed} : cinq étapes attendues`);
        steps.forEach((step) => {
            assert.equal(
                step.type,
                step.type === "SELECT_PARTS" ? null : step.type,
                `tirage ${seed} : une étape de sélection est sortie`
            );
            // Chaque étape se joue avec trois grandes réponses, sans exception.
            assert.equal(
                step.options.length,
                3,
                `tirage ${seed} : étape ${step.type} sans trois réponses`
            );
            assert.equal(
                step.requiredCount === undefined,
                true,
                `tirage ${seed} : étape ${step.type} attend encore une sélection`
            );
        });
        // Cinq fractions distinctes : la seconde reconnaissance ne rejoue pas la
        // première.
        assert.equal(
            new Set(steps.map((step) => step.id)).size,
            5,
            `tirage ${seed} : deux étapes identiques`
        );
    }
}

// --- Une seule bonne réponse, aucun doublon, distracteurs pédagogiques --------
{
    for (let seed = 1; seed <= 40; seed += 1) {
        const steps = createLevel1Steps(createSeededRandom(seed));
        steps.forEach((step) => {
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

// --- Bus d'événements entre la pédagogie et la scène Phaser -------------------
{
    const bus = createEventBus();
    const recus = [];

    const off = bus.on("step:completed", (payload) => recus.push(payload.completedSteps));
    bus.on("step:completed", () => recus.push("second"));

    assert.equal(bus.emit("step:completed", {completedSteps: 1}), 2);
    assert.deepEqual(recus, [1, "second"]);

    off();
    recus.length = 0;
    assert.equal(bus.emit("step:completed", {completedSteps: 2}), 1);
    assert.deepEqual(recus, ["second"]);

    // Émettre vers un événement sans écouteur ne coûte rien et ne casse rien.
    assert.equal(bus.emit("journey:completed", {}), 0);

    // Un écouteur en échec ne doit pas empêcher les suivants de recevoir.
    const originalWarn = console.warn;
    console.warn = () => {};
    const survivants = [];
    const busRobuste = createEventBus();
    busRobuste.on("answer:incorrect", () => {
        throw new Error("scène cassée");
    });
    busRobuste.on("answer:incorrect", (payload) => survivants.push(payload.hint));
    assert.equal(busRobuste.emit("answer:incorrect", {hint: "Recompte les parts."}), 1);
    assert.deepEqual(survivants, ["Recompte les parts."]);
    console.warn = originalWarn;

    // Un handler invalide est ignoré sans lever.
    assert.equal(typeof createEventBus().on("step:rendered", null), "function");

    bus.clear();
    assert.equal(bus.emit("step:completed", {completedSteps: 3}), 0);

    // Les événements émis par le jeu sont bien ceux annoncés par le module.
    ["journey:started", "answer:correct", "answer:incorrect", "step:completed",
        "bridge:started", "bridge:slab", "journey:finale-started",
        "journey:completed", "step:rendered"]
        .forEach((name) => assert.equal(EVENTS.includes(name), true));
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
    // Le motif doit être en style en ligne : en attribut, la feuille de style
    // reprend la main et les parts coloriées redeviennent invisibles.
    assert.equal(bar.includes('style="fill:url(#t1-hatch)"'), true);
    assert.equal(bar.includes('fill="url(#t1-hatch)"'), false);

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

// --- Localisation anglaise --------------------------------------------------
// Le français reste le comportement par défaut (voir les blocs ci-dessus, qui
// n'appellent jamais createLevel1Steps/hintFor avec un argument de langue) :
// ces tests couvrent uniquement le nouveau chemin explicite lang="en".
{
    for (let seed = 1; seed <= 15; seed += 1) {
        const stepsEn = createLevel1Steps(createSeededRandom(seed), [], "en");
        assert.equal(stepsEn.length, STEP_COUNT);
        stepsEn.forEach((step) => {
            assert.equal(typeof step.prompt, "string");
            assert.ok(step.prompt.length > 0);
            assert.equal(typeof step.explanation, "string");
            assert.ok(step.explanation.length > 0);
            // Aucune trace de gabarit non résolu (clé i18n oubliée).
            assert.equal(/\{\{/.test(step.prompt), false);
            assert.equal(/\{\{/.test(step.explanation), false);
        });
    }
}

// --- Vocabulaire numérateur / dénominateur (FR et EN) -----------------------
// CA : les questions doivent employer les vrais termes mathématiques, pas
// seulement « nombre du haut »/« nombre du bas ».
{
    const stepsFr = createLevel1Steps(createSeededRandom(3));
    const stepsEn = createLevel1Steps(createSeededRandom(3), [], "en");

    const numeratorFr = stepsFr.find((step) => step.type === "NUMERATOR");
    const denominatorFr = stepsFr.find((step) => step.type === "DENOMINATOR");
    const numeratorEn = stepsEn.find((step) => step.type === "NUMERATOR");
    const denominatorEn = stepsEn.find((step) => step.type === "DENOMINATOR");

    assert.ok(numeratorFr && /numérateur/i.test(numeratorFr.prompt));
    assert.ok(numeratorFr && /numérateur/i.test(numeratorFr.explanation));
    assert.ok(denominatorFr && /dénominateur/i.test(denominatorFr.prompt));
    assert.ok(denominatorFr && /dénominateur/i.test(denominatorFr.explanation));

    assert.ok(numeratorEn && /numerator/i.test(numeratorEn.prompt));
    assert.ok(numeratorEn && /numerator/i.test(numeratorEn.explanation));
    assert.ok(denominatorEn && /denominator/i.test(denominatorEn.prompt));
    assert.ok(denominatorEn && /denominator/i.test(denominatorEn.explanation));

    // Le pont pédagogique garde la formulation déjà connue de l'enfant.
    assert.ok(/nombre du haut/i.test(numeratorFr.prompt));
    assert.ok(/nombre du bas/i.test(denominatorFr.prompt));
    assert.ok(/top number/i.test(numeratorEn.prompt));
    assert.ok(/bottom number/i.test(denominatorEn.prompt));

    // Les indices ciblés emploient aussi les vrais termes, dans les deux langues.
    assert.ok(/numérateur/i.test(hintFor("INVERTED")));
    assert.ok(/numerator/i.test(hintFor("INVERTED", "en")));
}

// --- Interface téléphone : fractions, états et action principale ------------
// Un DOM minimal suffit ici : le test exécute le vrai mountGame et ses handlers
// sans ajouter jsdom aux dépendances du portail ni à l'image CI des jeux.
{
    class FakeClassList {
        constructor(owner) {
            this.owner = owner;
        }

        values() {
            return new Set(this.owner.className.split(/\s+/).filter(Boolean));
        }

        write(values) {
            this.owner.className = [...values].join(" ");
        }

        add(...names) {
            const values = this.values();
            names.forEach((name) => values.add(name));
            this.write(values);
        }

        remove(...names) {
            const values = this.values();
            names.forEach((name) => values.delete(name));
            this.write(values);
        }

        contains(name) {
            return this.values().has(name);
        }

        toggle(name, force) {
            const values = this.values();
            const active = force === undefined ? !values.has(name) : Boolean(force);
            if (active) {
                values.add(name);
            } else {
                values.delete(name);
            }
            this.write(values);
            return active;
        }
    }

    class FakeNode {
        constructor(tagName = "div") {
            this.tagName = tagName.toUpperCase();
            this.children = [];
            this.parentNode = null;
            this.attributes = new Map();
            this.dataset = {};
            this.listeners = new Map();
            this.className = "";
            this.classList = new FakeClassList(this);
            this.hidden = false;
            this.disabled = false;
            this.focused = false;
            this.scrolled = false;
            this._textContent = "";
            this._innerHTML = "";
        }

        set textContent(value) {
            this._textContent = String(value ?? "");
            this._innerHTML = "";
            this.children = [];
        }

        get textContent() {
            return this._textContent + this.children.map((child) => child.textContent).join("");
        }

        set innerHTML(value) {
            this._innerHTML = String(value ?? "");
            this._textContent = "";
            this.children = [];
            const imageLabel = this._innerHTML.match(/role="img"[^>]*aria-label="([^"]+)"/);
            if (imageLabel) {
                const image = new FakeNode("svg");
                image.setAttribute("role", "img");
                image.setAttribute("aria-label", imageLabel[1]);
                this.appendChild(image);
            }
        }

        get innerHTML() {
            return this._innerHTML;
        }

        append(...nodes) {
            nodes.forEach((node) => this.appendChild(node));
        }

        appendChild(node) {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
            this.children.push(node);
            node.parentNode = this;
            return node;
        }

        insertBefore(node, reference) {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
            const index = this.children.indexOf(reference);
            this.children.splice(index < 0 ? this.children.length : index, 0, node);
            node.parentNode = this;
            return node;
        }

        removeChild(node) {
            const index = this.children.indexOf(node);
            if (index >= 0) {
                this.children.splice(index, 1);
                node.parentNode = null;
            }
            return node;
        }

        descendants() {
            return this.children.flatMap((child) => [child, ...child.descendants()]);
        }

        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        }

        querySelectorAll(selector) {
            const nodes = this.descendants();
            if (selector === "button") {
                return nodes.filter((node) => node.tagName === "BUTTON");
            }
            if (selector === "[role='img']" || selector === "[role=\"img\"]") {
                return nodes.filter((node) => node.getAttribute("role") === "img");
            }
            const dataMatch = selector.match(/^\[([a-z0-9-]+)\]$/i);
            return dataMatch
                ? nodes.filter((node) => node.attributes.has(dataMatch[1]))
                : [];
        }

        setAttribute(name, value) {
            this.attributes.set(name, String(value));
            if (name.startsWith("data-")) {
                const key = name.slice(5).replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
                this.dataset[key] = String(value);
            }
        }

        getAttribute(name) {
            return this.attributes.has(name) ? this.attributes.get(name) : null;
        }

        addEventListener(type, handler) {
            this.listeners.set(type, handler);
        }

        click() {
            const handler = this.listeners.get("click");
            if (handler && !this.disabled) {
                handler({type: "click", currentTarget: this});
            }
        }

        focus() {
            this.focused = true;
        }

        scrollIntoView() {
            this.scrolled = true;
        }

        getBoundingClientRect() {
            return {top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100};
        }
    }

    class FakeRoot extends FakeNode {
        constructor(elements) {
            super("main");
            this.elements = elements;
        }

        querySelector(selector) {
            return this.elements.get(selector) || super.querySelector(selector);
        }
    }

    const selectors = [
        "[data-game-setup]", "[data-game-panel]", "[data-learning-area]", "[data-step-panel]",
        "[data-game-result]", "[data-step-title]", "[data-result-title]", "[data-step-options]",
        "[data-step-feedback]", "[data-next-step]", "[data-river-stage]", "[data-console-panel]",
        "[data-game-console]", "[data-console-stage]", "[data-console-launch]", "[data-console-quit]",
        "[data-step-progress]", "[data-stone-count]", "[data-console-step]", "[data-best-first-try]",
        "[data-games-played]", "[data-sound-toggle]", "[data-encouragement]", "[data-step-kicker]",
        "[data-step-visual]", "[data-fraction-legend]", "[data-final-steps]",
        "[data-final-first-try]", "[data-final-corrected]", "[data-result-message]",
        "[data-final-badges]", "[data-replay]", "[data-result-quit]"
    ];
    const elements = new Map(selectors.map((selector) => [selector, new FakeNode(
        selector.includes("button") || selector.includes("next") || selector.includes("replay")
            || selector.includes("quit") || selector.includes("sound") ? "button" : "div"
    )]));
    const rootElement = new FakeRoot(elements);
    const soundButton = elements.get("[data-sound-toggle]");
    const soundIcon = new FakeNode("span");
    const soundLabel = new FakeNode("span");
    soundIcon.setAttribute("data-sound-icon", "");
    soundLabel.setAttribute("data-sound-label", "");
    soundButton.append(soundIcon, soundLabel);

    const documentElement = new FakeNode("html");
    documentElement.clientHeight = 640;
    const body = new FakeNode("body");
    const fakeDocument = {
        documentElement,
        body,
        querySelector: (selector) => selector === "[data-fraction-river]" ? rootElement : null,
        querySelectorAll: () => [],
        createElement: (tagName) => new FakeNode(tagName),
        createTextNode: (text) => {
            const node = new FakeNode("#text");
            node.textContent = text;
            return node;
        },
        createComment: (text) => {
            const node = new FakeNode("#comment");
            node.textContent = text;
            return node;
        }
    };

    const emitted = [];
    const savedGlobals = new Map([
        ["FractionRiverStore", globalThis.FractionRiverStore],
        ["FractionRiverEvents", globalThis.FractionRiverEvents],
        ["GameConsole", globalThis.GameConsole],
        ["fractionRiverGameController", globalThis.fractionRiverGameController],
        ["startFractionRiverGame", globalThis.startFractionRiverGame],
        ["matchMedia", globalThis.matchMedia],
        ["requestAnimationFrame", globalThis.requestAnimationFrame],
        ["setTimeout", globalThis.setTimeout],
        ["clearTimeout", globalThis.clearTimeout],
        ["localStorage", globalThis.localStorage]
    ]);
    let consoleOptions;
    let storedSound = false;

    try {
        globalThis.FractionRiverStore = {
            load: () => ({soundEnabled: storedSound, recentQuestionIds: [], gamesPlayed: 0}),
            levelProgress: () => ({firstTryCorrect: 0}),
            setSoundEnabled: (enabled) => {
                storedSound = enabled;
            }
        };
        globalThis.FractionRiverEvents = {
            emit: (name, payload) => {
                emitted.push({name, payload});
                return 0;
            }
        };
        globalThis.GameConsole = {
            createGameConsole: (options) => {
                consoleOptions = options;
                return {
                    isActive: true,
                    enter() {
                        this.isActive = true;
                        options.onEnter();
                    },
                    exit() {
                        this.isActive = false;
                        options.onExit();
                    }
                };
            }
        };
        globalThis.fractionRiverGameController = {setLayoutMode() {}};
        globalThis.startFractionRiverGame = () => {};
        globalThis.matchMedia = () => ({matches: true});
        globalThis.requestAnimationFrame = (callback) => {
            callback();
            return 1;
        };
        globalThis.setTimeout = (callback) => {
            callback();
            return 1;
        };
        globalThis.clearTimeout = () => {};
        globalThis.localStorage = {
            getItem: (key) => key === "portailMath.preferences.language" ? "fr" : null
        };

        game.mountGame(fakeDocument);

        assert.equal(consoleOptions.panelSlot, elements.get("[data-console-panel]"));
        assert.equal(soundButton.getAttribute("aria-pressed"), "false");
        const mutedIcon = soundIcon.textContent;
        assert.ok(mutedIcon.length > 0);
        assert.equal(elements.get("[data-step-options]").querySelectorAll("button").length, 3);

        const firstVisualLabel = elements.get("[data-step-visual]")
            .querySelector("[role='img']").getAttribute("aria-label");
        const firstFraction = firstVisualLabel.match(/(\d+) part(?:s)? sur (\d+)/);
        const firstCorrectLabel = `${firstFraction[1]}/${firstFraction[2]}`;
        const firstOptions = elements.get("[data-step-options]").querySelectorAll("button");
        const firstWrong = firstOptions.find((button) => button.getAttribute("aria-label") !== firstCorrectLabel);
        const firstCorrect = firstOptions.find((button) => button.getAttribute("aria-label") === firstCorrectLabel);

        firstWrong.click();
        assert.equal(firstWrong.classList.contains("is-wrong"), true);
        assert.match(firstWrong.getAttribute("aria-label"), /incorrecte/);
        assert.equal(elements.get("[data-step-feedback]").scrolled, true);

        firstCorrect.click();
        assert.equal(firstCorrect.classList.contains("is-correct"), true);
        assert.match(firstCorrect.getAttribute("aria-label"), /correcte/);
        assert.equal(elements.get("[data-next-step]").hidden, false);
        assert.equal(elements.get("[data-next-step]").focused, true);
        assert.equal(elements.get("[data-next-step]").scrolled, true);
        assert.ok(elements.get("[data-step-feedback]").querySelector("[role='img']"));

        soundButton.click();
        assert.equal(storedSound, true);
        assert.equal(soundButton.getAttribute("aria-pressed"), "true");
        assert.notEqual(soundIcon.textContent, mutedIcon);

        elements.get("[data-next-step]").click();
        const titleFraction = elements.get("[data-step-title]").querySelector("[role='img']");
        assert.ok(titleFraction, "la question visuelle doit afficher une fraction empilÃ©e");
        const visualFraction = titleFraction.getAttribute("aria-label").match(/(\d+) sur (\d+)/);
        const visualOptions = elements.get("[data-step-options]").querySelectorAll("button");
        const correctVisual = visualOptions.find((button) => {
            const optionFraction = button.getAttribute("aria-label").match(/(\d+) part(?:s)? sur (\d+)/);
            return optionFraction
                && optionFraction[1] === visualFraction[1]
                && optionFraction[2] === visualFraction[2];
        });
        assert.ok(correctVisual, JSON.stringify({
            fraction: visualFraction.slice(1),
            options: visualOptions.map((button) => button.getAttribute("aria-label"))
        }));
        const wrongVisual = visualOptions.find((button) => button !== correctVisual);

        wrongVisual.click();
        assert.doesNotMatch(wrongVisual.getAttribute("aria-label"), /undefined/);
        assert.match(wrongVisual.getAttribute("aria-label"), /incorrecte/);
        correctVisual.click();
        assert.doesNotMatch(correctVisual.getAttribute("aria-label"), /undefined/);
        assert.match(correctVisual.getAttribute("aria-label"), /correcte/);
        assert.ok(emitted.some((event) => event.name === "answer:incorrect"));
        assert.ok(emitted.some((event) => event.name === "answer:correct"));
        assert.ok(emitted.some((event) => event.name === "step:completed"));
    } finally {
        savedGlobals.forEach((value, name) => {
            if (value === undefined) {
                delete globalThis[name];
            } else {
                globalThis[name] = value;
            }
        });
    }
}

console.log("fraction-river: all tests passed");
