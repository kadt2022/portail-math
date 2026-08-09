"use strict";

const assert = require("node:assert/strict");
const gameI18n = require("../../main/resources/static/js/game-i18n.js");

// --- Résolution de langue -------------------------------------------------
{
    assert.equal(gameI18n.isSupportedLanguage("fr"), true);
    assert.equal(gameI18n.isSupportedLanguage("en"), true);
    assert.equal(gameI18n.isSupportedLanguage("es"), false);
    assert.equal(gameI18n.isSupportedLanguage(null), false);

    // Sans window.localStorage/navigator (environnement Node), le repli
    // français par défaut s'applique — même comportement que
    // resolveInitialLanguage côté React lorsque rien n'est disponible.
    assert.equal(gameI18n.resolveLanguage(), "fr");
}

// --- Traduction et interpolation ------------------------------------------
{
    const dictionary = {
        fr: {greeting: "Bonjour {{name}}", onlyFr: "Uniquement en français"},
        en: {greeting: "Hello {{name}}"}
    };

    assert.equal(gameI18n.translate(dictionary, "fr", "greeting", {name: "Kadt"}), "Bonjour Kadt");
    assert.equal(gameI18n.translate(dictionary, "en", "greeting", {name: "Kadt"}), "Hello Kadt");

    // Repli sur le français quand la clé manque dans la langue demandée.
    assert.equal(gameI18n.translate(dictionary, "en", "onlyFr"), "Uniquement en français");

    // Clé absente des deux langues : la clé elle-même est renvoyée plutôt
    // que de faire planter l'affichage.
    assert.equal(gameI18n.translate(dictionary, "en", "inconnue"), "inconnue");

    // Un paramètre manquant dans le gabarit est laissé tel quel.
    assert.equal(gameI18n.translate(dictionary, "fr", "greeting", {}), "Bonjour {{name}}");
}

// --- Traduction du HTML statique ------------------------------------------
{
    const dictionary = {
        fr: {title: "Titre", closeAria: "Fermer"},
        en: {title: "Title", closeAria: "Close"}
    };

    const elements = new Map();
    function makeElement(attributes) {
        const state = {textContent: "", attrs: {...attributes}};
        elements.set(state, state);
        return {
            getAttribute: (name) => state.attrs[name] ?? null,
            setAttribute: (name, value) => {
                state.attrs[name] = value;
            },
            set textContent(value) {
                state.textContent = value;
            },
            get textContent() {
                return state.textContent;
            }
        };
    }

    const titleEl = makeElement({"data-i18n": "title"});
    const closeEl = makeElement({"data-i18n-attr": "aria-label:closeAria"});
    const fakeDocument = {
        querySelectorAll: (selector) => {
            if (selector === "[data-i18n]") {
                return [titleEl];
            }
            if (selector === "[data-i18n-attr]") {
                return [closeEl];
            }
            return [];
        }
    };

    gameI18n.applyStaticTranslations(fakeDocument, dictionary, "en");
    assert.equal(titleEl.textContent, "Title");
    assert.equal(closeEl.getAttribute("aria-label"), "Close");

    // Un document absent ou incomplet ne doit jamais lever d'exception.
    assert.doesNotThrow(() => gameI18n.applyStaticTranslations(null, dictionary, "en"));
}

console.log("game-i18n: all tests passed");
