"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
const {
    EXPECTED_ANSWERS,
    isCorrectAnswer,
    clamp,
    computeGroupScale,
    computeRulerGeometry,
    computeRulerStart,
    computeKeypadScrollDelta,
    surfaceGuide,
    volumeGuide,
    waterGuide,
    missionGuide,
    mountGame
} = require("../../main/resources/static/js/flux-forge.js");

{
    assert.deepEqual(EXPECTED_ANSWERS, {surface: 8, volume: 16, liters: 4000, time: 200});
    assert.equal(isCorrectAnswer("surface", 8), true);
    assert.equal(isCorrectAnswer("surface", 7), false);
    assert.equal(isCorrectAnswer("volume", 16), true);
    assert.equal(isCorrectAnswer("liters", 4000), true);
    assert.equal(isCorrectAnswer("time", 200), true);
    assert.equal(isCorrectAnswer("time", 199), false);
}

{
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-5, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
    assert.equal(clamp(0, 0, 10), 0);
    assert.equal(clamp(10, 0, 10), 10);
}

{
    // Une scène étroite/basse doit produire une échelle réduite mais jamais
    // en dessous du plancher 0.3.
    assert.equal(computeGroupScale(0, 0), null);
    assert.equal(computeGroupScale(100, 0), null);
    const tiny = computeGroupScale(50, 50);
    assert.equal(tiny, 0.3);

    // Une scène large/haute doit être plafonnée à 1 (jamais de mise à
    // l'échelle supérieure à la taille de référence).
    const huge = computeGroupScale(4000, 4000);
    assert.equal(huge, 1);

    // Cas intermédiaire : la plus petite des deux contraintes (largeur vs
    // hauteur) l'emporte.
    const byWidth = computeGroupScale(500, 4000);
    assert.ok(byWidth > 0.3 && byWidth < 1);
    assert.ok(Math.abs(byWidth - (500 * 0.66) / 470) < 0.0001);
}

{
    const sceneRect = {left: 100, top: 50, right: 900, bottom: 650, width: 800, height: 600};
    const targetRect = {left: 200, top: 150, right: 400, bottom: 250, width: 200, height: 100};

    const bottom = computeRulerGeometry("bottom", targetRect, sceneRect, 10);
    assert.equal(bottom.isVertical, false);
    assert.equal(bottom.isLeft, false);
    assert.equal(bottom.left, 100);
    assert.equal(bottom.top, 210);
    assert.equal(bottom.width, 200);
    assert.equal(bottom.height, 6);

    const right = computeRulerGeometry("right", targetRect, sceneRect, 10);
    assert.equal(right.isVertical, true);
    assert.equal(right.isLeft, false);
    assert.equal(right.left, 310);
    assert.equal(right.top, 100);
    assert.equal(right.width, 6);
    assert.equal(right.height, 100);

    const left = computeRulerGeometry("left", targetRect, sceneRect, 10);
    assert.equal(left.isVertical, true);
    assert.equal(left.isLeft, true);
    assert.equal(left.left, 84);
    assert.equal(left.top, 100);
    assert.equal(left.width, 6);
    assert.equal(left.height, 100);
}

{
    const sceneRect = {left: 100, top: 50};
    // À l'intérieur des bornes : aucun ajustement.
    const inside = computeRulerStart({left: 300, top: 200}, sceneRect, 800, 600);
    assert.equal(inside.left, 200);
    assert.equal(inside.top, 150);

    // Hors bornes (dépasse la largeur/hauteur de la scène) : borné.
    const outside = computeRulerStart({left: 5000, top: 5000}, sceneRect, 800, 600);
    assert.equal(outside.left, 780);
    assert.equal(outside.top, 580);

    // Négatif (avant le coin de la scène) : borné à 0.
    const negative = computeRulerStart({left: 0, top: 0}, sceneRect, 800, 600);
    assert.equal(negative.left, 0);
    assert.equal(negative.top, 0);
}

{
    // Le pavé chevauche le bas du champ : il faut défiler vers le bas d'un
    // montant couvrant le chevauchement + la marge.
    const overlapping = computeKeypadScrollDelta(
        {bottom: 500, top: 460},
        {top: 480},
        16
    );
    assert.equal(overlapping, 500 - 480 + 16);

    // Le champ est remonté au-dessus du haut de l'écran (après un défilement
    // précédent) : il faut défiler vers le haut pour le ramener visible.
    const aboveViewport = computeKeypadScrollDelta(
        {bottom: -10, top: -40},
        {top: 480},
        16
    );
    assert.equal(aboveViewport, -40 - 16);

    // Aucun chevauchement, champ bien visible : pas de défilement nécessaire.
    const noOverlap = computeKeypadScrollDelta(
        {bottom: 300, top: 260},
        {top: 480},
        16
    );
    assert.equal(noOverlap, null);
}

{
    // surfaceGuide suit exactement la progression Mur -> Mesurer -> Calculer -> Toit.
    assert.deepEqual(
        surfaceGuide({wallPlaced: false, measured: false, surfaceDone: false, roofPlaced: false}),
        {key: "yambaStartWall", target: "slot"}
    );
    assert.deepEqual(
        surfaceGuide({wallPlaced: true, measured: false, surfaceDone: false, roofPlaced: false}),
        {key: "yambaMeasureWall", target: "rulerBtn"}
    );
    assert.deepEqual(
        surfaceGuide({wallPlaced: true, measured: true, surfaceDone: false, roofPlaced: false}),
        {key: "yambaCalcWallSurface", target: "answer"}
    );
    assert.deepEqual(
        surfaceGuide({wallPlaced: true, measured: true, surfaceDone: true, roofPlaced: false}),
        {key: "yambaAddRoof", target: "roofBtn"}
    );
    assert.deepEqual(
        surfaceGuide({wallPlaced: true, measured: true, surfaceDone: true, roofPlaced: true}),
        {key: "yambaSurfaceDone", target: null}
    );
}

{
    assert.deepEqual(
        volumeGuide({volumeMeasured: false, volumeDone: false}),
        {key: "yambaStartVolume", target: "rulerBtn"}
    );
    assert.deepEqual(
        volumeGuide({volumeMeasured: true, volumeDone: false}),
        {key: "yambaCalcVolume", target: "answer"}
    );
    assert.deepEqual(
        volumeGuide({volumeMeasured: true, volumeDone: true}),
        {key: "yambaVolumeDone", target: null}
    );
}

{
    assert.deepEqual(
        waterGuide({litersDone: false, timeDone: false, pumpDone: false}),
        {key: "yambaStartWater", target: "answer"}
    );
    assert.deepEqual(
        waterGuide({litersDone: true, timeDone: false, pumpDone: false}),
        {key: "yambaCalcTime", target: "answer"}
    );
    assert.deepEqual(
        waterGuide({litersDone: true, timeDone: true, pumpDone: false}),
        {key: "yambaPumpReady", target: "pumpStart"}
    );
    assert.deepEqual(
        waterGuide({litersDone: true, timeDone: true, pumpDone: true}),
        {key: "yambaWaterDone", target: null}
    );
}

{
    const state = {
        wallPlaced: false, measured: false, surfaceDone: false, roofPlaced: false,
        volumeMeasured: false, volumeDone: false,
        litersDone: false, timeDone: false, pumpDone: false
    };
    assert.deepEqual(missionGuide("surface", state), surfaceGuide(state));
    assert.deepEqual(missionGuide("volume", state), volumeGuide(state));
    assert.deepEqual(missionGuide("water", state), waterGuide(state));
}

// --- Intégration DOM (mountGame) ---------------------------------------
// Les blocs ci-dessus ne couvrent que la logique pure de flux-forge.js.
// mountGame() (câblage des boutons, missions, règle, pavé numérique, pompe)
// ne peut être exercé sans un vrai DOM : jsdom (déjà utilisé par
// frontend/ pour vitest) rejoue le fichier HTML réel du jeu. Les
// setTimeout/setInterval du fichier sont remplacés par des versions
// synchrones le temps du test pour ne pas attendre les délais d'animation
// réels (séquences de règle, remplissage de la pompe).

async function withFakeTimers(run) {
    const realSetTimeout = global.setTimeout;
    const realSetInterval = global.setInterval;
    const realClearInterval = global.clearInterval;
    const clearedIntervalIds = new Set();
    let nextIntervalId = 1;

    global.setTimeout = (callback) => {
        if (typeof callback === "function") callback();
        return 0;
    };
    global.setInterval = (callback) => {
        const id = nextIntervalId++;
        // Différé d'une micro-tâche (et non exécuté en synchrone comme
        // setTimeout ci-dessus) : le code testé fait `const timer =
        // setInterval(() => {... clearInterval(timer) ...})`, donc le
        // rappel ne doit s'exécuter qu'une fois `timer` réellement affecté.
        queueMicrotask(() => {
            let iterations = 0;
            // La boucle de remplissage de la pompe s'arrête d'elle-même via
            // clearInterval ; le plafond n'est qu'un filet de sécurité contre
            // une régression qui l'empêcherait de jamais s'arrêter.
            while (!clearedIntervalIds.has(id) && iterations < 5000) {
                callback();
                iterations += 1;
            }
        });
        return id;
    };
    global.clearInterval = (id) => { clearedIntervalIds.add(id); };

    try {
        return await run();
    } finally {
        global.setTimeout = realSetTimeout;
        global.setInterval = realSetInterval;
        global.clearInterval = realClearInterval;
    }
}

class FakeAudioContext {
    constructor() {
        this.state = "running";
        this.currentTime = 0;
        this.destination = {};
    }
    resume() { return Promise.resolve(); }
    createOscillator() {
        return { type: "", frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }
    createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
}

async function runDomIntegrationTest() {
    const htmlPath = path.join(__dirname, "../../main/resources/static/games/flux-forge.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    const virtualConsole = new VirtualConsole();
    // window.location.assign(...) (bouton Quitter) n'est pas une vraie
    // navigation sous jsdom : il journalise une erreur "not implemented"
    // qu'on avale volontairement, le test ne vérifiant que le déclenchement.
    virtualConsole.on("jsdomError", () => {});

    const dom = new JSDOM(html, { url: "https://example.test/games/flux-forge.html", virtualConsole });
    const { window } = dom;
    const doc = window.document;
    window.AudioContext = FakeAudioContext;

    const previousWindow = global.window;
    global.window = window;

    try {
        await withFakeTimers(async () => {
            const $ = (id) => doc.getElementById(id);

            mountGame(doc);

            // Mission Surface : poser le mur, mesurer, se tromper puis
            // trouver la bonne surface, poser le toit.
            $("slot").onclick();
            assert.equal($("slot").style.display, "none");
            assert.equal($("wall").style.display, "block");

            await $("rulerBtn").onclick();
            assert.equal(doc.querySelectorAll(".ruler").length, 2);

            $("answer").value = "7";
            $("validate").onclick();
            assert.equal($("status").className.includes("bad"), true);

            $("answer").value = "8";
            $("validate").onclick();
            assert.equal($("status").className.includes("ok"), true);

            $("hint").onclick();
            $("roofBtn").onclick();
            assert.equal($("roof").style.display, "block");

            // Mission Volume.
            $("tabVolume").onclick();
            await $("rulerBtn").onclick();
            assert.equal(doc.querySelectorAll(".ruler").length, 3);

            $("answer").value = "15";
            $("validate").onclick();
            assert.equal($("status").className.includes("bad"), true);

            $("answer").value = "16";
            $("validate").onclick();
            assert.equal($("status").className.includes("ok"), true);

            // Mission Eau : la pompe reste verrouillée tant que le temps
            // n'est pas calculé.
            $("tabWater").onclick();
            await $("rulerBtn").onclick();
            $("pumpBtn").onclick();
            assert.equal($("pumpStart").classList.contains("locked"), true);

            $("answer").value = "3000";
            $("validate").onclick();
            assert.equal($("status").className.includes("bad"), true);

            $("answer").value = "4000";
            $("validate").onclick();
            $("hint").onclick();

            $("answer").value = "100";
            $("validate").onclick();
            assert.equal($("status").className.includes("bad"), true);

            $("answer").value = "200";
            $("validate").onclick();
            assert.equal($("pumpStart").classList.contains("locked"), false);

            $("pumpBtn").onclick();
            await Promise.resolve();
            assert.equal($("levelText").textContent, "4000 L");

            // Une deuxième pression une fois plein ne relance pas le
            // remplissage.
            $("pumpStart").onclick(new window.Event("click"));
            await Promise.resolve();
            assert.equal($("levelText").textContent, "4000 L");

            // Pavé numérique embarqué : ouverture au focus, saisie des
            // chiffres, effacement, correction, validation.
            $("answer").value = "";
            $("answer").dispatchEvent(new window.Event("focus"));
            assert.equal($("keypad").hidden, false);
            doc.querySelector('[data-digit="5"]').dispatchEvent(new window.Event("click", { bubbles: true }));
            assert.equal($("answer").value, "5");
            $("keypadBackspace").dispatchEvent(new window.Event("click", { bubbles: true }));
            assert.equal($("answer").value, "");
            $("keypadClear").dispatchEvent(new window.Event("click", { bubbles: true }));

            // Bascule du son.
            $("soundToggle").onclick();
            assert.equal($("soundToggle").getAttribute("aria-pressed"), "false");
            $("soundToggle").onclick();
            assert.equal($("soundToggle").getAttribute("aria-pressed"), "true");

            // Quitter : ouverture, annulation, puis confirmation.
            $("quitBtn").onclick();
            assert.equal($("quitModal").hidden, false);
            $("quitCancel").onclick();
            assert.equal($("quitModal").hidden, true);
            $("quitBtn").onclick();
            $("quitConfirm").onclick();
        });
    } finally {
        global.window = previousWindow;
    }
}

runDomIntegrationTest()
    .then(() => {
        console.log("flux-forge: all tests passed");
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
