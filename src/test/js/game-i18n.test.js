"use strict";

const assert = require("node:assert/strict");
const gameI18n = require("../../main/resources/static/js/game-i18n.js");

// --- Résolution de langue -------------------------------------------------
{
    assert.equal(gameI18n.isSupportedLanguage("fr"), true);
    assert.equal(gameI18n.isSupportedLanguage("en"), true);
    assert.equal(gameI18n.isSupportedLanguage("es"), false);
    assert.equal(gameI18n.isSupportedLanguage(null), false);

    // storage/languageTags sont explicitement injectés à vide : Node 21+
    // expose un `navigator.language` global reflétant la locale de la
    // machine qui exécute le test (ex. "fr-CA" en local, "en-US" sur les
    // runners CI), donc s'appuyer sur les globals ambiants rendrait ce test
    // dépendant de l'environnement plutôt que du code.
    assert.equal(gameI18n.resolveLanguage({storage: null, languageTags: []}), "fr");

    // Préférence enregistrée prioritaire sur la langue du navigateur.
    const storedEn = {getItem: (key) => (key === gameI18n.STORAGE_KEY ? "en" : null)};
    assert.equal(
        gameI18n.resolveLanguage({storage: storedEn, languageTags: ["fr-FR"]}),
        "en",
    );

    // Sans préférence enregistrée, la langue du navigateur est utilisée —
    // seul le préfixe compte, et une variante inconnue est ignorée.
    assert.equal(gameI18n.resolveLanguage({storage: null, languageTags: ["en-US"]}), "en");
    assert.equal(gameI18n.resolveLanguage({storage: null, languageTags: ["es-ES", "fr-CA"]}), "fr");

    // Une valeur stockée invalide (langue non supportée) est ignorée, comme
    // une entrée absente.
    const storedInvalid = {getItem: () => "es"};
    assert.equal(gameI18n.resolveLanguage({storage: storedInvalid, languageTags: ["en-GB"]}), "en");
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
