"use strict";

const assert = require("node:assert/strict");
const layouts = require("../../main/resources/static/js/games/fraction-river/layouts.js");

const {STEP_COUNT, createLayout, heroScreenSize, heightUsage, fitFactor} = layouts;

// Panneau de jeu sur un téléphone tenu en paysage, mode immersif :
// 740 x 360 au total, dont 62 % pour la scène.
const TELEPHONE_PAYSAGE = {largeur: Math.round(740 * 0.62), hauteur: 360};
// Ce que l'enfant voit aujourd'hui, téléphone tenu debout.
const TELEPHONE_PORTRAIT = {largeur: 332, hauteur: 180};

// --- Les deux profils décrivent la même traversée ------------------------------
{
    ["panoramic", "immersive"].forEach((nom) => {
        const layout = createLayout(nom);
        assert.equal(layout.name, nom);
        assert.equal(layout.stones.length, STEP_COUNT, `${nom} : cinq appuis attendus`);

        layout.stones.forEach((pierre, index) => {
            assert.equal(
                pierre.x > 0 && pierre.x < layout.width,
                true,
                `${nom} : pierre ${index + 1} hors du cadre en largeur`
            );
            assert.equal(
                pierre.y > 0 && pierre.y < layout.height,
                true,
                `${nom} : pierre ${index + 1} hors du cadre en hauteur`
            );
            // Le héros se tient au-dessus de la pierre, jamais dedans.
            assert.equal(pierre.standY < pierre.y, true);
        });

        // Les appuis se suivent d'un bord à l'autre, sans retour en arrière.
        for (let i = 1; i < layout.stones.length; i += 1) {
            assert.equal(layout.stones[i].x > layout.stones[i - 1].x, true);
        }

        // Le pont part du dernier appui et atterrit sur la berge d'arrivée.
        assert.equal(layout.deckStart <= layout.stones[STEP_COUNT - 1].x, true);
        assert.equal(layout.deckEnd > layout.width - layout.bankWidth, true);
        assert.equal(layout.chest.x < layout.width, true);
    });
}

// --- Le profil immersif monte en gradins ---------------------------------------
{
    const immersif = createLayout("immersive");
    for (let i = 1; i < immersif.stones.length; i += 1) {
        // Plus on avance, plus on monte : y décroît vers le haut de l'écran.
        assert.equal(
            immersif.stones[i].y < immersif.stones[i - 1].y,
            true,
            "chaque palier doit être plus haut que le précédent"
        );
    }
    const denivele = immersif.stones[0].y - immersif.stones[STEP_COUNT - 1].y;
    assert.equal(denivele >= 120, true, `dénivelé trop faible : ${denivele}`);

    const panoramique = createLayout("panoramic");
    // Le profil panoramique, lui, reste à plat.
    panoramique.stones.forEach((pierre) => {
        assert.equal(pierre.y, panoramique.stones[0].y);
    });
}

// --- Le critère visuel non négociable ------------------------------------------
{
    const immersif = createLayout("immersive");
    const taille = heroScreenSize(immersif, TELEPHONE_PAYSAGE.largeur, TELEPHONE_PAYSAGE.hauteur);

    // Cible fixée avec le sage : environ 38 x 57 pixels à l'écran.
    assert.equal(
        taille.width >= 36 && taille.width <= 42,
        true,
        `héros trop petit ou trop grand : ${taille.width} px de large`
    );
    assert.equal(
        taille.height >= 54 && taille.height <= 62,
        true,
        `héros trop petit ou trop grand : ${taille.height} px de haut`
    );

    // La scène doit occuper la hauteur du panneau, pas la gaspiller.
    const occupation = heightUsage(immersif, TELEPHONE_PAYSAGE.largeur, TELEPHONE_PAYSAGE.hauteur);
    assert.equal(occupation >= 0.9, true, `hauteur gaspillée : occupation de ${occupation}`);
}

// --- Le profil immersif est bien meilleur que ce que voient les enfants ---------
{
    const immersif = createLayout("immersive");
    const panoramique = createLayout("panoramic");

    const aujourdhui = heroScreenSize(
        panoramique,
        TELEPHONE_PORTRAIT.largeur,
        TELEPHONE_PORTRAIT.hauteur
    );
    const demain = heroScreenSize(immersif, TELEPHONE_PAYSAGE.largeur, TELEPHONE_PAYSAGE.hauteur);

    // Le mode immersif n'a d'intérêt que s'il double au moins la taille perçue.
    assert.equal(
        demain.height >= aujourdhui.height * 2,
        true,
        `gain insuffisant : ${aujourdhui.height} px puis ${demain.height} px`
    );

    // Et le simple passage en paysage, sans recomposer la scène, ne suffirait pas.
    const paysageSansRecomposition = heroScreenSize(
        panoramique,
        TELEPHONE_PAYSAGE.largeur,
        TELEPHONE_PAYSAGE.hauteur
    );
    assert.equal(paysageSansRecomposition.height < 40, true);
    assert.equal(demain.height > paysageSansRecomposition.height * 1.5, true);
}

// --- Un panneau absent ne fait pas exploser le calcul ---------------------------
{
    const immersif = createLayout("immersive");
    assert.equal(fitFactor(immersif, 0, 360), 0);
    assert.equal(fitFactor(immersif, 459, 0), 0);
    assert.deepEqual(heroScreenSize(immersif, 0, 0), {width: 0, height: 0, factor: 0});
}

// --- Un profil inconnu retombe sur le panoramique ------------------------------
{
    assert.equal(createLayout("inconnu").name, "panoramic");
    assert.equal(createLayout(undefined).name, "panoramic");
}

console.log("fraction-river-layouts: all tests passed");
