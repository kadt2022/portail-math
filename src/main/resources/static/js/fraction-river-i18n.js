(function initializeFractionRiverI18n(root) {
    "use strict";

    const shell = typeof require === "function" && typeof module !== "undefined"
        ? require("./game-shell-i18n.js")
        : root.GameShellI18n;

    const dictionary = {
        fr: {
            // Coquille HTML : voir game-shell-i18n.js pour les clés partagées
            // avec les autres jeux "standalone" (skipLink, brandName...).
            ...shell.fr,
            documentTitle: "La Rivière des fractions · Mbuyamba Math",
            metaDescription: "La Rivière des fractions de Mbuyamba Math.",
            breadcrumbCurrent: "La Rivière des fractions",
            panelAria: "Plateau de La Rivière des fractions",
            consoleAria: "Mode jeu de La Rivière des fractions",
            progressionLabel: "Progression",
            encouragementAria: "Conseil de traversée",
            encouragementStatic: "Une erreur ne fait jamais tomber à l’eau. Tu peux toujours recommencer.",
            resultEyebrow: "Autre rive atteinte",
            resultTitle: "Traversée terminée !",
            resultIntro: "Tu as ouvert le coffre du village.",
            statStepsLabel: "Étapes terminées",
            statFirstTryLabel: "Réussites au premier essai",
            statCorrectedLabel: "Erreurs corrigées",
            badgesAria: "Badges obtenus",
            replayButton: "Retraverser",

            // Progression et encouragements.
            stepKicker: "Étape {{index}} sur {{total}}",
            encouragementDefault: "Prends ton temps, il n’y a pas de chronomètre.",
            encouragementCorrectedMistake: "Ton effort t’a fait traverser cette étape.",
            encouragementCorrectFirstTry: "Tu avances de pierre en pierre.",
            encouragementTryAgain: "Tu peux essayer autant de fois que tu veux.",

            // Retour après une réponse.
            feedbackCorrectedTitle: "Bien corrigé !",
            feedbackCorrectTitle: "Bonne réponse — bravo !",
            feedbackCorrectSuffix: " Une pierre apparaît dans la rivière.",
            feedbackIncorrectTitle: "Pas encore — regarde bien le dessin.",
            answerStateCorrect: "réponse correcte",
            answerStateWrong: "réponse incorrecte, essaie un autre choix",
            fractionAria: "{{numerator}} sur {{denominator}}",
            nextButtonFinale: "Rejoindre le village maintenant →",
            nextButtonContinue: "Continuer maintenant →",
            validateSelection: "Valider ma sélection",

            // Résultat final.
            resultMessagePerfect: "Traversée parfaite ! Tu lis les fractions comme un explorateur chevronné.",
            resultMessageGreat: "Belle traversée ! Tu reconnais déjà bien les parts d’un tout.",
            resultMessageProgress: "Tu progresses ! Chaque erreur corrigée t’a fait avancer d’une pierre.",
            resultMessagePersistence: "Tu as traversé la rivière grâce à ta persévérance. Recommence quand tu veux.",

            // Badges.
            "badge.EXPLORATEUR_DES_DEMIS": "Explorateur des demis",
            "badge.MAITRE_DES_QUARTS": "Maître des quarts",

            // Représentations visuelles.
            "visual.DISC": "pizza",
            "visual.BAR": "tablette de chocolat",
            "visual.BASKET": "panier de fruits",
            "visual.default": "objet",
            visualPartSingular: "part",
            visualPartPlural: "parts",
            visualDescription: "Une {{support}} partagée en {{total}} parts égales, {{filled}} {{partWord}} sur {{total}} de couleur différente.",
            selectablePartsAria: "Parts à sélectionner",
            selectablePartAria: "Part {{position}} sur {{total}}",

            // Trois formes grammaticales différentes du même "part(s) colorée(s)"
            // selon le contexte de la phrase : verbe ("part est coloriée"),
            // adjectif ("part coloriée") ou nom nu ("part"). Calculées côté JS
            // (fraction-river-questions.js) selon le nombre, puis injectées
            // dans les gabarits ci-dessous.
            coloredVerbPhraseSingular: "part est coloriée",
            coloredVerbPhrasePlural: "parts sont coloriées",
            coloredAdjPhraseSingular: "part coloriée",
            coloredAdjPhrasePlural: "parts coloriées",

            // Questions — reconnaissance de fraction.
            "prompt.IDENTIFY": "Quelle fraction est représentée ?",
            "prompt.IDENTIFY.short": "Quelle fraction ?",
            "explanation.IDENTIFY": "{{numerator}} {{coloredVerbPhrase}} sur {{denominator}} : la fraction est {{fraction}}.",
            "prompt.MATCH_VISUAL": "Quel dessin représente {{fraction}} ?",
            "prompt.MATCH_VISUAL.short": "Quel dessin montre {{fraction}} ?",
            "explanation.MATCH_VISUAL": "{{fraction}} veut dire {{numerator}} {{coloredAdjPhrase}} sur {{denominator}} parts égales.",
            "prompt.SELECT_PARTS": "Sélectionne {{numerator}} {{partWord}} sur {{denominator}}.",
            "explanation.SELECT_PARTS": "Il fallait colorier {{numerator}} {{partWord}} sur {{denominator}}, c’est-à-dire {{fraction}}.",

            // Questions — numérateur / dénominateur : le vrai terme est introduit
            // avec un pont vers la formulation déjà connue de l'enfant.
            "prompt.NUMERATOR": "{{numerator}} {{coloredVerbPhrase}} sur {{denominator}}. Quel est le numérateur (le nombre du haut) ?",
            "prompt.NUMERATOR.short": "Numérateur ?",
            "explanation.NUMERATOR": "Le numérateur compte les parts coloriées : {{numerator}}.",
            "prompt.DENOMINATOR": "{{numerator}} {{coloredVerbPhrase}} et le tout contient {{denominator}} parts. Quel est le dénominateur (le nombre du bas) ?",
            "prompt.DENOMINATOR.short": "Dénominateur ?",
            "explanation.DENOMINATOR": "Le dénominateur compte toutes les parts égales : {{denominator}}.",
            fractionLegend: "A/B — A est appelé le numérateur, B est appelé le dénominateur.",

            // Indices sur une mauvaise réponse (§5.1 du récit).
            "hint.INVERTED": "Le numérateur compte les parts coloriées, le dénominateur toutes les parts.",
            "hint.OFF_BY_ONE": "Recompte seulement les parties coloriées, une par une.",
            "hint.WHOLE_CONFUSION": "Ce nombre est le total des parts, pas les parts coloriées.",
            "hint.COLORED_CONFUSION": "Le dénominateur indique toutes les parts égales du tout.",
            "hint.DENOMINATOR_CONFUSION": "Vérifie que toutes les parts du tout ont été comptées.",
            "hint.default": "Regarde à nouveau le dessin et compte les parts."
        },
        en: {
            ...shell.en,
            documentTitle: "The Fraction River · Mbuyamba Math",
            metaDescription: "The Fraction River from Mbuyamba Math.",
            breadcrumbCurrent: "The Fraction River",
            panelAria: "The Fraction River board",
            consoleAria: "The Fraction River game mode",
            progressionLabel: "Progress",
            encouragementAria: "Crossing tip",
            encouragementStatic: "A mistake never makes you fall in the water. You can always try again.",
            resultEyebrow: "Other shore reached",
            resultTitle: "Crossing complete!",
            resultIntro: "You opened the village chest.",
            statStepsLabel: "Steps completed",
            statFirstTryLabel: "First-try successes",
            statCorrectedLabel: "Corrected mistakes",
            badgesAria: "Badges earned",
            replayButton: "Cross again",

            stepKicker: "Step {{index}} of {{total}}",
            encouragementDefault: "Take your time, there is no timer.",
            encouragementCorrectedMistake: "Your effort got you across this step.",
            encouragementCorrectFirstTry: "You're moving forward, stone by stone.",
            encouragementTryAgain: "You can try as many times as you like.",

            feedbackCorrectedTitle: "Nicely corrected!",
            feedbackCorrectTitle: "Correct answer — well done!",
            feedbackCorrectSuffix: " A stone appears in the river.",
            feedbackIncorrectTitle: "Not yet — look closely at the drawing.",
            answerStateCorrect: "correct answer",
            answerStateWrong: "incorrect answer, try another choice",
            fractionAria: "{{numerator}} over {{denominator}}",
            nextButtonFinale: "Reach the village now →",
            nextButtonContinue: "Continue now →",
            validateSelection: "Validate my selection",

            resultMessagePerfect: "Perfect crossing! You read fractions like a seasoned explorer.",
            resultMessageGreat: "Great crossing! You already recognize the parts of a whole well.",
            resultMessageProgress: "You're improving! Every corrected mistake moved you one stone further.",
            resultMessagePersistence: "You crossed the river through sheer persistence. Try again whenever you like.",

            "badge.EXPLORATEUR_DES_DEMIS": "Halves explorer",
            "badge.MAITRE_DES_QUARTS": "Quarters master",

            "visual.DISC": "pizza",
            "visual.BAR": "chocolate bar",
            "visual.BASKET": "basket of fruit",
            "visual.default": "object",
            visualPartSingular: "part",
            visualPartPlural: "parts",
            visualDescription: "A {{support}} shared into {{total}} equal parts, {{filled}} {{partWord}} out of {{total}} in a different colour.",
            selectablePartsAria: "Parts to select",
            selectablePartAria: "Part {{position}} of {{total}}",

            coloredVerbPhraseSingular: "part is colored",
            coloredVerbPhrasePlural: "parts are colored",
            coloredAdjPhraseSingular: "colored part",
            coloredAdjPhrasePlural: "colored parts",

            "prompt.IDENTIFY": "Which fraction is shown?",
            "prompt.IDENTIFY.short": "Which fraction?",
            "explanation.IDENTIFY": "{{numerator}} {{coloredVerbPhrase}} out of {{denominator}}: the fraction is {{fraction}}.",
            "prompt.MATCH_VISUAL": "Which drawing represents {{fraction}}?",
            "prompt.MATCH_VISUAL.short": "Which drawing shows {{fraction}}?",
            "explanation.MATCH_VISUAL": "{{fraction}} means {{numerator}} {{coloredAdjPhrase}} out of {{denominator}} equal parts.",
            "prompt.SELECT_PARTS": "Select {{numerator}} {{partWord}} out of {{denominator}}.",
            "explanation.SELECT_PARTS": "You needed to colour {{numerator}} {{partWord}} out of {{denominator}}, which is {{fraction}}.",

            "prompt.NUMERATOR": "{{numerator}} {{coloredVerbPhrase}} out of {{denominator}}. What is the numerator (the top number)?",
            "prompt.NUMERATOR.short": "Numerator?",
            "explanation.NUMERATOR": "The numerator counts the colored parts: {{numerator}}.",
            "prompt.DENOMINATOR": "{{numerator}} {{coloredVerbPhrase}} and the whole has {{denominator}} parts. What is the denominator (the bottom number)?",
            "prompt.DENOMINATOR.short": "Denominator?",
            "explanation.DENOMINATOR": "The denominator counts all the equal parts: {{denominator}}.",
            fractionLegend: "A/B — A is called the numerator, B is called the denominator.",

            "hint.INVERTED": "The numerator counts the colored parts, the denominator counts them all.",
            "hint.OFF_BY_ONE": "Count only the colored parts again, one by one.",
            "hint.WHOLE_CONFUSION": "That number is the total of all parts, not the colored ones.",
            "hint.COLORED_CONFUSION": "The denominator is the total number of equal parts in the whole.",
            "hint.DENOMINATOR_CONFUSION": "Check that every part of the whole was counted.",
            "hint.default": "Look at the drawing again and count the parts."
        }
    };

    root.FractionRiverI18n = dictionary;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = dictionary;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
