"use strict";

const assert = require("node:assert/strict");
const anchors = require("../../main/resources/static/js/games/fraction-river/v2/anchors.js");

const {
    WORLD,
    ANCHORS,
    PLAY_AREA_RIGHT,
    toWorld,
    toWorldRect,
    journey,
    heroSizeAt,
    heroScreenSize
} = anchors;

// Ce que ces tests peuvent, et ce qu'ils ne peuvent pas.
//
// Ils vérifient la COHÉRENCE de la grille : proportions, monotonie du trajet,
// respect du panneau, taille du héros à l'écran. Ils ne vérifient PAS que les
// ancrages tombent sur les pierres peintes — aucun test ne sait lire une
// image. Cette correspondance se contrôle à l'œil, avec ?debugAnchors=true, et
// c'est la leçon de la scène en primitives : un aperçu tiré des mêmes nombres
// que le code ne prouve rien.

// --- Le monde est en 16/9, comme l'illustration ---------------------------------
{
    const rapport = WORLD.width / WORLD.height;
    assert.equal(
        Math.abs(rapport - 16 / 9) < 0.001,
        true,
        `le monde n'est plus en 16/9 : ${rapport.toFixed(4)}`
    );
}

// --- Rien ne se place dans l'eau sans validation ---------------------------------
{
    // Ce contrôle a attrapé, à l'écriture, un poisson posé sur la pierre 1 et
    // trois autres qui sortaient de l'eau en fin de course. Il reste en place
    // pour que la prochaine position choisie à vue échoue tout de suite.
    assert.deepEqual(
        anchors.validateWaterSpots(),
        [],
        "une ondelette, un impact ou un poisson est hors de la rivière ou sur une pierre"
    );

    // Les six zones d'eau libre demandées sont couvertes, et aucune ondelette
    // n'est posée le long de la file des pierres.
    assert.equal(ANCHORS.waves.length >= 5, true, "trop peu d'ondelettes");
    ANCHORS.waves.forEach((onde, index) => {
        assert.equal(
            typeof onde.zone === "string" && onde.zone.length > 0,
            true,
            `ondelette ${index + 1} sans zone déclarée`
        );
        assert.equal(
            onde.length >= 60 && onde.length <= 180,
            true,
            `ondelette ${index + 1} hors de la fourchette 60-180 (${onde.length})`
        );
    });
    // Les zones sont distinctes : six ondelettes au même endroit ne couvriraient
    // pas la rivière.
    const zones = new Set(ANCHORS.waves.map((o) => o.zone));
    assert.equal(zones.size, ANCHORS.waves.length, "deux ondelettes partagent la même zone");

    assert.equal(ANCHORS.ripples.length >= 3, true, "trop peu d'impacts circulaires");
    ANCHORS.ripples.forEach((impact, index) => {
        assert.equal(anchors.isValidWaterSpot(impact.x, impact.y), true,
            `impact ${index + 1} hors de l'eau libre`);
        assert.equal(impact.radius >= 24 && impact.radius <= 60, true,
            `impact ${index + 1} trop petit ou trop grand`);
    });

    // Deux poissons lointains ont été ajoutés, sans retirer ceux du premier plan.
    assert.equal(
        ANCHORS.fish.length >= 5 && ANCHORS.fish.length <= 7,
        true,
        `nombre de poissons hors de 5-7 : ${ANCHORS.fish.length}`
    );
    assert.equal(
        ANCHORS.fish.filter((poisson) => poisson.y <= 140 && poisson.scale < 0.65).length >= 2,
        true,
        "les poissons lointains ne sont pas assez nombreux ou assez petits"
    );
}

// --- L'arrivée du chien est sur le bois, pas dans l'eau --------------------------
{
    // Le point vient d'une mesure de pixels : c'est celui dont le disque de bois
    // environnant est le plus large de toute la zone du pont, 9 px de rayon.
    // Aucun test ne sait lire une image — ce qui est vérifié ici, c'est que ce
    // point reste bien la dernière étape du trajet, au-dessus et à droite de la
    // cinquième pierre, et hors du panneau de question.
    const arrivee = ANCHORS.arrival;
    const cinquieme = ANCHORS.stones[4];

    assert.equal(Boolean(arrivee), true, "pas d'ancrage d'arrivée");
    assert.equal(
        arrivee.xRatio > cinquieme.xRatio,
        true,
        "l'arrivée n'est pas au-delà de la cinquième pierre"
    );
    assert.equal(
        arrivee.yRatio < cinquieme.yRatio,
        true,
        "l'arrivée n'est pas plus haute que la cinquième pierre"
    );

    // Un seul saut final : le trajet fait sept points, pas huit. Les deux points
    // de pont intermédiaires ont disparu — c'est le second qui tombait à côté du
    // tablier et noyait le chien.
    assert.equal(journey().length, 7, "le trajet ne fait plus un seul saut final");
    assert.equal(ANCHORS.bridgeEntry, undefined, "bridgeEntry devait disparaître");
    assert.equal(ANCHORS.bridgeExit, undefined, "bridgeExit devait disparaître");

    // Et le chien tient entièrement à gauche du panneau de question.
    const point = toWorld(arrivee);
    const taille = heroSizeAt(arrivee);
    assert.equal(
        point.x + taille.width / 2 < PLAY_AREA_RIGHT * WORLD.width,
        true,
        "le chien dépasse sous le panneau de question à l'arrivée"
    );
}

// --- Tous les ancrages sont des proportions valides ------------------------------
{
    const points = [ANCHORS.heroStart, ANCHORS.arrival].concat(ANCHORS.stones);

    points.forEach((point, index) => {
        assert.equal(
            point.xRatio > 0 && point.xRatio < 1,
            true,
            `ancrage ${index} : xRatio hors [0,1] (${point.xRatio})`
        );
        assert.equal(
            point.yRatio > 0 && point.yRatio < 1,
            true,
            `ancrage ${index} : yRatio hors [0,1] (${point.yRatio})`
        );
    });

    const panneau = ANCHORS.questionPanel;
    assert.equal(
        panneau.xRatio + panneau.widthRatio <= 1,
        true,
        "le panneau de question sort du cadre à droite"
    );
    assert.equal(
        panneau.yRatio + panneau.heightRatio <= 1,
        true,
        "le panneau de question sort du cadre en bas"
    );
    assert.equal(panneau.widthRatio >= 0.35, true, "le panneau de question est encore trop étroit");
}

// --- Cinq appuis, du plus proche au plus lointain --------------------------------
{
    assert.equal(ANCHORS.stones.length, 5, "cinq appuis attendus");

    for (let i = 1; i < ANCHORS.stones.length; i += 1) {
        assert.equal(
            ANCHORS.stones[i].xRatio > ANCHORS.stones[i - 1].xRatio,
            true,
            `l'appui ${i + 1} n'avance pas vers la droite`
        );
        assert.equal(
            ANCHORS.stones[i].yRatio < ANCHORS.stones[i - 1].yRatio,
            true,
            `l'appui ${i + 1} n'est pas plus loin que le précédent`
        );
        // La perspective : plus c'est loin, plus c'est petit. Sans ça, le héros
        // grandirait en s'éloignant et l'illusion de profondeur tomberait.
        assert.equal(
            ANCHORS.stones[i].scale <= ANCHORS.stones[i - 1].scale,
            true,
            `l'appui ${i + 1} ne rétrécit pas avec la distance`
        );
    }
}

// --- Le trajet va du bas-gauche vers le haut-droit, sans revenir -----------------
{
    const points = journey();
    assert.equal(points.length, 7, "départ + cinq appuis + le ponton d'arrivée");

    for (let i = 1; i < points.length; i += 1) {
        assert.equal(points[i].x > points[i - 1].x, true, `le trajet recule à l'étape ${i}`);
    }

    // Le premier pas descend : le garçon est sur la berge, la première pierre
    // est en contrebas, au premier plan. Tout le reste s'éloigne et monte.
    for (let i = 2; i < points.length; i += 1) {
        assert.equal(points[i].y < points[i - 1].y, true, `le trajet redescend à l'étape ${i}`);
    }
    assert.equal(
        points[points.length - 1].y < points[0].y - WORLD.height * 0.4,
        true,
        "le trajet ne s'éloigne pas franchement vers le village"
    );

    // Le départ en bas à gauche, l'arrivée en haut à droite de la zone jouable.
    assert.equal(ANCHORS.heroStart.xRatio < 0.2, true, "le départ n'est pas au bord gauche");
    assert.equal(ANCHORS.heroStart.yRatio > 0.6, true, "le départ n'est pas en bas");
    assert.equal(ANCHORS.arrival.yRatio < 0.35, true, "l'arrivée n'est pas en haut");
}

// --- Rien d'interactif n'empiète sur le panneau de question ----------------------
{
    // Le HTML de la question passe devant le canvas. Un appui posé sous lui
    // serait invisible et injouable.
    const marge = 0.03;
    [ANCHORS.heroStart, ANCHORS.arrival]
        .concat(ANCHORS.stones)
        .forEach((point, index) => {
            assert.equal(
                point.xRatio < PLAY_AREA_RIGHT - marge,
                true,
                `ancrage ${index} trop près du panneau (${point.xRatio} contre ${PLAY_AREA_RIGHT})`
            );
        });

    // Et le héros lui-même, pas seulement son point d'ancrage.
    const dernier = ANCHORS.arrival;
    const taille = heroSizeAt(dernier);
    const bordDroit = toWorld(dernier).x + taille.width / 2;
    assert.equal(
        bordDroit < PLAY_AREA_RIGHT * WORLD.width,
        true,
        "le héros dépasse sous le panneau de question à l'arrivée"
    );
}

// --- Le héros reste au-dessus du cadre, jamais coupé en haut ---------------------
{
    [ANCHORS.heroStart].concat(ANCHORS.stones).forEach((anchor, index) => {
        const point = toWorld(anchor);
        const taille = heroSizeAt(anchor);
        assert.equal(
            point.y - taille.height > 0,
            true,
            `le héros dépasse en haut du cadre à l'ancrage ${index}`
        );
        assert.equal(
            point.y <= WORLD.height,
            true,
            `l'ancrage ${index} est sous le bas du cadre`
        );
    });
}

// --- La conversion en coordonnées du monde ---------------------------------------
{
    const premier = toWorld(ANCHORS.stones[0]);
    assert.equal(premier.x, ANCHORS.stones[0].xRatio * WORLD.width);
    assert.equal(premier.y, ANCHORS.stones[0].yRatio * WORLD.height);

    const zone = toWorldRect(ANCHORS.questionPanel);
    assert.equal(zone.width, ANCHORS.questionPanel.widthRatio * WORLD.width);
    assert.equal(zone.x + zone.width <= WORLD.width, true);
}

// --- Le critère qui décide de tout : le chien sur un téléphone -------------------
{
    // Téléphone tenu en paysage. L'illustration occupe l'écran entier — panneau
    // de question compris, puisqu'il est peint dedans.
    //
    // C'est la LARGEUR qui décide, pas la hauteur : un chien est bas et long.
    // Mesurer sa hauteur comme on mesurait celle d'un enfant debout donnerait
    // un faux échec, et pousserait à le grossir jusqu'à ce qu'il ne tienne plus
    // sur une pierre.
    const taille = heroScreenSize(740, 360);
    assert.equal(
        taille.width >= 50,
        true,
        `chien trop court sur téléphone paysage : ${taille.width} px`
    );
    assert.equal(
        taille.height >= 36,
        true,
        `chien trop plat sur téléphone paysage : ${taille.height} px`
    );

    // Il doit occuper au moins autant de pixels que l'enfant de la version en
    // primitives, qui faisait 39 x 60 dans le même panneau.
    assert.equal(
        taille.width * taille.height >= 39 * 60 * 0.9,
        true,
        `présence à l'écran insuffisante : ${taille.width} x ${taille.height}`
    );

    // Le chien rétrécit en s'éloignant, mais jamais au point de disparaître.
    const loin = heroScreenSize(740, 360, ANCHORS.stones[4]);
    assert.equal(loin.width >= 34, true, `chien illisible au cinquième appui : ${loin.width} px`);
}

// --- Le halo de la pierre active tient sur la pierre peinte ----------------------
{
    // Le halo est dimensionné sur la pierre DESSINÉE. S'il déborde franchement,
    // on voit une tache lumineuse dans l'eau au lieu d'une pierre qui s'allume.
    ANCHORS.stones.forEach((appui, index) => {
        const pierre = anchors.paintedStoneAt(index);
        assert.equal(Boolean(pierre), true, `pas de mesure peinte pour l'appui ${index + 1}`);

        // La pierre peinte rétrécit avec la distance, comme le chien.
        if (index > 0) {
            const precedente = anchors.paintedStoneAt(index - 1);
            assert.equal(
                pierre.width <= precedente.width + 2,
                true,
                `la pierre peinte ${index + 1} ne rétrécit pas avec la distance`
            );
        }

        // Le point d'appui est sur le dessus de la pierre, pas dans son ventre.
        const appuiY = appui.yRatio * WORLD.height;
        assert.equal(
            appuiY < pierre.y,
            true,
            `l'appui ${index + 1} est sous le centre de la pierre peinte`
        );
        assert.equal(
            pierre.y - appuiY < pierre.height,
            true,
            `l'appui ${index + 1} flotte trop haut au-dessus de sa pierre`
        );

        // Et le halo, agrandi de 15 %, reste dans le cadre.
        assert.equal(pierre.x - pierre.width * 0.575 > 0, true);
        assert.equal(pierre.y + pierre.height * 0.575 < WORLD.height, true);
    });
}

// --- La rivière, le ciel : les zones où la vie est semée -------------------------
{
    // Les reflets, les poissons et les oiseaux sont placés par ces deux zones.
    // Si elles sortent du cadre ou passent sous le panneau, on verra des
    // poissons dans l'herbe et des oiseaux derrière la question.
    const ciel = ANCHORS.sky;
    assert.equal(ciel.xRatio + ciel.widthRatio < PLAY_AREA_RIGHT, true,
        "la bande de ciel passe sous le panneau de question");
    assert.equal(ciel.yRatio + ciel.heightRatio < 0.3, true,
        "la bande de ciel descend trop bas");
    assert.equal(ANCHORS.birds.length >= 7, true, "pas assez d'oiseaux dans le ciel");
    assert.equal(Math.min(...ANCHORS.birds.map((oiseau) => oiseau.scale)) <= 0.5, true,
        "aucun petit oiseau lointain");
    assert.equal(Math.max(...ANCHORS.birds.map((oiseau) => oiseau.scale)) >= 1, true,
        "aucun grand oiseau au premier plan");

    const axe = ANCHORS.river;
    assert.equal(axe.length >= 4, true, "l'axe de la rivière est trop grossier");
    for (let i = 1; i < axe.length; i += 1) {
        // La rivière remonte : y décroît, x croît, et elle se resserre au loin.
        assert.equal(axe[i].yRatio < axe[i - 1].yRatio, true, `axe non monotone en y au point ${i}`);
        assert.equal(axe[i].xRatio >= axe[i - 1].xRatio, true, `axe non monotone en x au point ${i}`);
    }
    assert.equal(
        axe[axe.length - 1].halfWidth < axe[0].halfWidth,
        true,
        "la rivière ne se resserre pas en s'éloignant"
    );

    // Tout point de la rivière reste dans le cadre. Sa rive droite peut passer
    // sous le fond du panneau agrandi ; les poissons, les impacts et les objets
    // interactifs sont contrôlés séparément.
    for (let t = 0; t <= 1.0001; t += 0.05) {
        [-1, 0, 1].forEach((lateral) => {
            const point = anchors.riverPointAt(t, lateral);
            assert.equal(point.x > 0 && point.x < WORLD.width, true,
                `point de rivière hors cadre à t=${t.toFixed(2)}, lateral=${lateral}`);
            assert.equal(point.y > 0 && point.y <= WORLD.height, true,
                `point de rivière hors cadre à t=${t.toFixed(2)}`);
            assert.equal(point.scale > 0, true, "échelle de rivière nulle ou négative");
        });
    }
}

// --- Un écran absent ne fait pas exploser le calcul ------------------------------
{
    assert.deepEqual(heroScreenSize(0, 360), {width: 0, height: 0, factor: 0});
    assert.deepEqual(heroScreenSize(740, 0), {width: 0, height: 0, factor: 0});
}

console.log("fraction-river-anchors: all tests passed");
