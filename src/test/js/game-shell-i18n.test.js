"use strict";

const assert = require("node:assert/strict");
const shell = require("../../main/resources/static/js/game-shell-i18n.js");

// --- Parité FR/EN -----------------------------------------------------------
// Même principe que frontend/src/i18n/translations.test.ts côté React : les
// deux langues doivent exposer exactement les mêmes clés, avec une valeur
// non vide.
{
    const frKeys = Object.keys(shell.fr).sort();
    const enKeys = Object.keys(shell.en).sort();
    assert.deepEqual(enKeys, frKeys);

    [...frKeys, ...enKeys].forEach((key) => {
        assert.equal(typeof shell.fr[key], "string");
        assert.ok(shell.fr[key].trim().length > 0);
        assert.equal(typeof shell.en[key], "string");
        assert.ok(shell.en[key].trim().length > 0);
    });
}

// --- Consommation par les dictionnaires par jeu ------------------------------
// fraction-river-i18n.js et multiplication-train-i18n.js fusionnent ces clés
// partagées avec leur propre contenu (voir leur commentaire "Coquille HTML") :
// vérifie que le résultat contient bien chaque clé partagée, sans écrasement.
{
    const fractionRiver = require("../../main/resources/static/js/fraction-river-i18n.js");
    const multiplicationTrain = require("../../main/resources/static/js/multiplication-train-i18n.js");

    Object.keys(shell.fr).forEach((key) => {
        assert.equal(fractionRiver.fr[key], shell.fr[key]);
        assert.equal(fractionRiver.en[key], shell.en[key]);
        assert.equal(multiplicationTrain.fr[key], shell.fr[key]);
        assert.equal(multiplicationTrain.en[key], shell.en[key]);
    });
}

console.log("game-shell-i18n: all tests passed");
