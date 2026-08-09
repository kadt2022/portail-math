(function initializeMultiplicationTrainI18n(root) {
    "use strict";

    const dictionary = {
        fr: {
            // Coquille HTML — chrome partagé avec les autres jeux "standalone".
            documentTitle: "Le Train des multiplications · Mbuyamba Math",
            metaDescription: "Le Train des multiplications de Mbuyamba Math.",
            skipLink: "Aller au contenu",
            brandName: "✦ Mbuyamba Math",
            brandAria: "Mbuyamba Math — Accueil",
            backToGames: "Retour aux jeux",
            breadcrumbAria: "Fil d’Ariane",
            breadcrumbPortal: "Portail",
            breadcrumbGames: "Jeux éducatifs",
            breadcrumbCurrent: "Train des multiplications",
            panelAria: "Plateau du Train des multiplications",
            consoleAria: "Mode jeu du Train des multiplications",
            quit: "Quitter le jeu",
            rotate: "Tourne ton téléphone pour jouer.",
            chooseAnswerAria: "Choisis une réponse",
            stationLabel: "Gare",
            sceneAria: "Le train avance dans un paysage vers la gare finale",
            rewardAria: "Récompense",
            multipliedBy: "multiplié par",
            questionKicker: "Pour atteindre la prochaine gare :",
            encouragementAria: "Conseil de voyage",
            encouragementStatic: "Tu peux prendre ton temps. Il n’y a pas de chronomètre.",
            sceneStart: "Départ",
            sceneFinish: "Gare finale",
            resultEyebrow: "Gare finale atteinte",
            resultTitle: "Voyage terminé !",
            resultIntro: "Tu es arrivé à la Gare des Multiplications.",
            statScoreLabel: "Résultat",
            statBestLabel: "Meilleur score",
            replayButton: "Rejouer",

            levelLabel: "Niveau 1 · Tables de 2 et 5",
            soundOn: "🔊 Son activé",
            soundOff: "🔇 Son désactivé",
            encouragementDefault: "Ton effort fait avancer le train.",
            encouragementWrong: "Presque, regarde les groupes un par un.",
            encouragementCorrectedMistake: "Bien corrigé ! Ton effort fait avancer le train.",
            encouragementCorrectFirstTry: "Bien joué ! Tu progresses gare après gare.",

            feedbackWrongTitle: "Réponse incorrecte — presque !",
            feedbackWrongDetail: "{{explanation}} Essaie encore.",
            feedbackCorrectTitle: "Bonne réponse — bravo !",
            feedbackCorrectDetail: "{{table}} groupes de {{multiplier}} donnent {{result}}. Le train avance !",
            explanation: "{{table}} × {{multiplier}} signifie : {{groups}} = {{result}}.",
            nextButtonFinal: "Arriver à la gare finale",
            nextButtonContinue: "Continuer vers la prochaine gare",

            starsAriaLabel: "{{count}} grande{{plural}} étoile{{plural}}",
            starsAriaLabelRestart: "Encouragement à recommencer",

            resultMessage3: "Magnifique voyage ! Les tables de 2 et 5 n’ont presque plus de secrets pour toi.",
            resultMessage2: "Très beau voyage ! Continue comme ça pour gagner la troisième étoile.",
            resultMessage1: "Tu progresses ! Un nouveau voyage t’aidera à consolider tes tables.",
            resultMessage0: "Chaque essai te fait avancer. Reprends le train quand tu es prêt."
        },
        en: {
            documentTitle: "The Multiplication Train · Mbuyamba Math",
            metaDescription: "The Multiplication Train from Mbuyamba Math.",
            skipLink: "Skip to main content",
            brandName: "✦ Mbuyamba Math",
            brandAria: "Mbuyamba Math — Home",
            backToGames: "Back to games",
            breadcrumbAria: "Breadcrumb",
            breadcrumbPortal: "Portal",
            breadcrumbGames: "Educational games",
            breadcrumbCurrent: "Multiplication train",
            panelAria: "The Multiplication Train board",
            consoleAria: "The Multiplication Train game mode",
            quit: "Quit game",
            rotate: "Turn your phone to play.",
            chooseAnswerAria: "Choose an answer",
            stationLabel: "Station",
            sceneAria: "The train moves through a landscape toward the final station",
            rewardAria: "Reward",
            multipliedBy: "multiplied by",
            questionKicker: "To reach the next station:",
            encouragementAria: "Journey tip",
            encouragementStatic: "You can take your time. There is no timer.",
            sceneStart: "Start",
            sceneFinish: "Final station",
            resultEyebrow: "Final station reached",
            resultTitle: "Journey complete!",
            resultIntro: "You arrived at Multiplication Station.",
            statScoreLabel: "Result",
            statBestLabel: "Best score",
            replayButton: "Play again",

            levelLabel: "Level 1 · 2 and 5 times tables",
            soundOn: "🔊 Sound on",
            soundOff: "🔇 Sound off",
            encouragementDefault: "Your effort keeps the train moving.",
            encouragementWrong: "Almost — look at the groups one by one.",
            encouragementCorrectedMistake: "Well corrected! Your effort keeps the train moving.",
            encouragementCorrectFirstTry: "Well done! You're progressing station by station.",

            feedbackWrongTitle: "Incorrect answer — so close!",
            feedbackWrongDetail: "{{explanation}} Try again.",
            feedbackCorrectTitle: "Correct answer — well done!",
            feedbackCorrectDetail: "{{table}} groups of {{multiplier}} make {{result}}. The train moves forward!",
            explanation: "{{table}} × {{multiplier}} means: {{groups}} = {{result}}.",
            nextButtonFinal: "Arrive at the final station",
            nextButtonContinue: "Continue to the next station",

            starsAriaLabel: "{{count}} large star{{plural}}",
            starsAriaLabelRestart: "Encouragement to try again",

            resultMessage3: "Wonderful journey! The 2 and 5 times tables have almost no secrets left for you.",
            resultMessage2: "Great journey! Keep it up to earn the third star.",
            resultMessage1: "You're improving! Another journey will help you master your tables.",
            resultMessage0: "Every attempt moves you forward. Hop back on the train whenever you're ready."
        }
    };

    root.MultiplicationTrainI18n = dictionary;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = dictionary;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
