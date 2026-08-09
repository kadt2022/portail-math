(function initializeGameI18n(root) {
    "use strict";

    const STORAGE_KEY = "portailMath.preferences.language";
    const SUPPORTED_LANGUAGES = ["fr", "en"];
    const FALLBACK_LANGUAGE = "fr";

    function isSupportedLanguage(value) {
        return typeof value === "string" && SUPPORTED_LANGUAGES.indexOf(value) !== -1;
    }

    function readStoredLanguage() {
        try {
            if (!root.localStorage) {
                return null;
            }
            const raw = root.localStorage.getItem(STORAGE_KEY);
            return isSupportedLanguage(raw) ? raw : null;
        } catch (error) {
            return null;
        }
    }

    function detectBrowserLanguage() {
        try {
            const nav = root.navigator;
            if (!nav) {
                return null;
            }
            const tags = nav.languages && nav.languages.length > 0
                ? nav.languages
                : (nav.language ? [nav.language] : []);
            for (let index = 0; index < tags.length; index += 1) {
                const prefix = String(tags[index]).slice(0, 2).toLowerCase();
                if (isSupportedLanguage(prefix)) {
                    return prefix;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // Même ordre de résolution que frontend/src/i18n/language-storage.ts
    // (resolveInitialLanguage) : préférence enregistrée, puis langue du
    // navigateur, puis français par défaut. Réimplémenté en JS vanille car ces
    // pages jeux ne chargent pas le bundle React — mais lisent la même clé
    // localStorage, posée par le sélecteur de langue du portail (même origine).
    function resolveLanguage() {
        return readStoredLanguage() || detectBrowserLanguage() || FALLBACK_LANGUAGE;
    }

    function interpolate(template, params) {
        if (!params) {
            return template;
        }
        return template.replace(/\{\{(\w+)\}\}/g, (match, name) => (
            Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
        ));
    }

    function translate(dictionary, lang, key, params) {
        const table = (dictionary && dictionary[lang]) || {};
        const fallbackTable = (dictionary && dictionary[FALLBACK_LANGUAGE]) || {};
        const template = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : fallbackTable[key];
        if (typeof template !== "string") {
            return key;
        }
        return interpolate(template, params);
    }

    // Traduit tout élément [data-i18n] (texte) et [data-i18n-attr="attr:clé"]
    // (attribut, ex. aria-label — plusieurs paires séparées par des virgules)
    // du document : le HTML statique jamais réécrit par la logique de jeu
    // (titre, fil d'ariane, boutons fixes...).
    function applyStaticTranslations(doc, dictionary, lang) {
        if (!doc || typeof doc.querySelectorAll !== "function") {
            return;
        }
        doc.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.getAttribute("data-i18n");
            element.textContent = translate(dictionary, lang, key);
        });
        doc.querySelectorAll("[data-i18n-attr]").forEach((element) => {
            element.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
                const [attr, key] = pair.split(":").map((part) => part.trim());
                if (attr && key) {
                    element.setAttribute(attr, translate(dictionary, lang, key));
                }
            });
        });
    }

    const api = {
        STORAGE_KEY,
        SUPPORTED_LANGUAGES,
        FALLBACK_LANGUAGE,
        isSupportedLanguage,
        resolveLanguage,
        translate,
        applyStaticTranslations
    };

    root.GameI18n = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
