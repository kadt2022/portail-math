// Chrome partagé entre tous les jeux "standalone" (lien retour, fil
// d'Ariane, bandeau de marque, boutons de la console immersive) : ces
// clés sont strictement identiques d'un jeu à l'autre, contrairement au
// contenu propre à chaque jeu (titre, questions...) qui reste dans son
// propre dictionnaire fraction-river-i18n.js / multiplication-train-i18n.js.
(function initializeGameShellI18n(root) {
    "use strict";

    const dictionary = {
        fr: {
            skipLink: "Aller au contenu",
            brandName: "✦ Mbuyamba Math",
            brandAria: "Mbuyamba Math — Accueil",
            backToGames: "Retour aux jeux",
            breadcrumbAria: "Fil d’Ariane",
            breadcrumbPortal: "Portail",
            breadcrumbGames: "Jeux éducatifs",
            quit: "Quitter le jeu",
            quitShort: "Quitter",
            rotate: "Tourne ton téléphone pour jouer.",
            soundOn: "🔊 Son activé",
            soundOff: "🔇 Son désactivé",
            soundOnShort: "Son activé",
            soundOffShort: "Son coupé",
            chooseAnswerAria: "Choisis une réponse"
        },
        en: {
            skipLink: "Skip to main content",
            brandName: "✦ Mbuyamba Math",
            brandAria: "Mbuyamba Math — Home",
            backToGames: "Back to games",
            breadcrumbAria: "Breadcrumb",
            breadcrumbPortal: "Portal",
            breadcrumbGames: "Educational games",
            quit: "Quit game",
            quitShort: "Quit",
            rotate: "Turn your phone to play.",
            soundOn: "🔊 Sound on",
            soundOff: "🔇 Sound off",
            soundOnShort: "Sound on",
            soundOffShort: "Sound off",
            chooseAnswerAria: "Choose an answer"
        }
    };

    root.GameShellI18n = dictionary;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = dictionary;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
