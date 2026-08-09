(function initializeFractionRiverQuestions(root) {
    "use strict";

    const gameI18n = typeof require === "function" && typeof module !== "undefined"
        ? require("./game-i18n.js")
        : root.GameI18n;
    const fractionRiverI18n = typeof require === "function" && typeof module !== "undefined"
        ? require("./fraction-river-i18n.js")
        : root.FractionRiverI18n;

    const STEP_COUNT = 5;

    // Niveau 1 — Le Gué des parts : uniquement la reconnaissance (§7.4).
    const ALLOWED_FRACTIONS = [
        {numerator: 1, denominator: 2},
        {numerator: 1, denominator: 3},
        {numerator: 1, denominator: 4},
        {numerator: 2, denominator: 3},
        {numerator: 2, denominator: 4},
        {numerator: 3, denominator: 4}
    ];

    // Les cinq étapes du niveau 1, dans l'ordre où l'enfant les rencontre.
    //
    // SELECT_PARTS a été retiré. Non pas masqué : retiré du générateur, donc il
    // ne peut plus sortir. Il demandait une grille de parts cliquables et un
    // bouton « Valider », et la question vit désormais sur le parchemin peint de
    // l'illustration — une bande de 18 % de la largeur de la scène, soit 115 px
    // sur un téléphone en paysage. Une grille et un gros bouton n'y tiennent pas,
    // et les rapetisser jusqu'à ce qu'ils tiennent aurait donné des cibles
    // tactiles sous les 48 px exigés.
    //
    // Il est remplacé par une seconde reconnaissance de fraction, à une autre
    // fraction et sur un autre type de dessin : cinq étapes, toutes jouables
    // avec trois grandes réponses.
    const STEP_TYPES = [
        "IDENTIFY",
        "MATCH_VISUAL",
        "IDENTIFY",
        "NUMERATOR",
        "DENOMINATOR"
    ];

    // Type retiré du parcours. Conservé nommé pour que les tests puissent
    // prouver son absence plutôt que de vérifier une liste de longueur cinq.
    const RETIRED_STEP_TYPES = ["SELECT_PARTS"];

    // Vue French de dictionary.fr["hint.*"] : conservée pour la forme d'API
    // existante (clé = code de distracteur). Le contenu réel vit dans
    // fraction-river-i18n.js, seule source de vérité pour les deux langues.
    const HINTS = {
        INVERTED: fractionRiverI18n.fr["hint.INVERTED"],
        OFF_BY_ONE: fractionRiverI18n.fr["hint.OFF_BY_ONE"],
        WHOLE_CONFUSION: fractionRiverI18n.fr["hint.WHOLE_CONFUSION"],
        COLORED_CONFUSION: fractionRiverI18n.fr["hint.COLORED_CONFUSION"],
        DENOMINATOR_CONFUSION: fractionRiverI18n.fr["hint.DENOMINATOR_CONFUSION"]
    };

    const SCENARIOS = [
        {id: "S01", type: "IDENTIFY", visualKind: "DISC", fractions: ["1/2", "1/4", "3/4", "2/4"]},
        {id: "S02", type: "IDENTIFY", visualKind: "BAR", fractions: ["1/3", "2/3", "1/4", "3/4"]},
        {id: "S03", type: "MATCH_VISUAL", visualKind: "DISC", fractions: ["1/2", "1/4", "3/4"]},
        {id: "S04", type: "MATCH_VISUAL", visualKind: "BAR", fractions: ["1/3", "2/3", "2/4"]},
        {id: "S05", type: "SELECT_PARTS", visualKind: "BAR", fractions: ["1/2", "2/4", "3/4", "1/4"]},
        {id: "S06", type: "SELECT_PARTS", visualKind: "BASKET", fractions: ["1/3", "2/3", "1/2"]},
        {id: "S07", type: "NUMERATOR", visualKind: "DISC", fractions: ["2/3", "3/4", "1/2"]},
        {id: "S08", type: "NUMERATOR", visualKind: "BAR", fractions: ["1/4", "2/4", "1/3"]},
        {id: "S09", type: "DENOMINATOR", visualKind: "BASKET", fractions: ["2/4", "1/3", "3/4"]},
        {id: "S10", type: "DENOMINATOR", visualKind: "BAR", fractions: ["1/2", "2/3", "1/4"]}
    ];

    function fractionKey(fraction) {
        return `${fraction.numerator}/${fraction.denominator}`;
    }

    function parseFraction(key) {
        const [numerator, denominator] = key.split("/").map(Number);
        return {numerator, denominator};
    }

    // Trois formes grammaticales du même "part(s) colorée(s)" selon le contexte
    // de la phrase (voir les commentaires dans fraction-river-i18n.js).
    function coloredVerbPhrase(numerator, lang) {
        return gameI18n.translate(
            fractionRiverI18n,
            lang,
            numerator > 1 ? "coloredVerbPhrasePlural" : "coloredVerbPhraseSingular",
        );
    }

    function coloredAdjPhrase(numerator, lang) {
        return gameI18n.translate(
            fractionRiverI18n,
            lang,
            numerator > 1 ? "coloredAdjPhrasePlural" : "coloredAdjPhraseSingular",
        );
    }

    function partWord(numerator, lang) {
        return gameI18n.translate(
            fractionRiverI18n,
            lang,
            numerator > 1 ? "visualPartPlural" : "visualPartSingular",
        );
    }

    // Générateur déterministe : une graine donnée reproduit exactement la même
    // traversée, ce qui rend les tests reproductibles (§6).
    function createSeededRandom(seed) {
        let state = (Number(seed) || 1) >>> 0;
        return function nextRandom() {
            state += 0x6d2b79f5;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffle(values, random) {
        const items = [...values];
        for (let index = items.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(random() * (index + 1));
            [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
        }
        return items;
    }

    function isPlausibleFraction({numerator, denominator}) {
        return Number.isInteger(numerator)
            && Number.isInteger(denominator)
            && denominator >= 2
            && numerator >= 1
            && numerator <= denominator;
    }

    function fractionDistractors({numerator, denominator}) {
        const candidates = [
            {type: "INVERTED", value: {numerator: denominator, denominator: numerator}},
            {type: "OFF_BY_ONE", value: {numerator: numerator - 1, denominator}},
            {type: "OFF_BY_ONE", value: {numerator: numerator + 1, denominator}},
            {type: "WHOLE_CONFUSION", value: {numerator: denominator, denominator}},
            {type: "COLORED_CONFUSION", value: {numerator, denominator: numerator}},
            {type: "DENOMINATOR_CONFUSION", value: {numerator, denominator: denominator + 1}},
            {type: "DENOMINATOR_CONFUSION", value: {numerator, denominator: denominator - 1}}
        ];

        const correctKey = fractionKey({numerator, denominator});
        const seen = new Set([correctKey]);
        return candidates.filter((candidate) => {
            if (!isPlausibleFraction(candidate.value)) {
                return false;
            }
            const key = fractionKey(candidate.value);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    function numberDistractors(correct, alternatives) {
        const seen = new Set([correct]);
        return alternatives.filter((candidate) => {
            if (!Number.isInteger(candidate.value) || candidate.value < 1 || seen.has(candidate.value)) {
                return false;
            }
            seen.add(candidate.value);
            return true;
        });
    }

    function pickTwo(candidates, random) {
        if (candidates.length < 2) {
            throw new Error("Distracteurs pédagogiques insuffisants pour cette question");
        }
        return shuffle(candidates, random).slice(0, 2);
    }

    function buildFractionOptions(fraction, random) {
        const wrong = pickTwo(fractionDistractors(fraction), random);
        const options = [
            {key: fractionKey(fraction), label: fractionKey(fraction), correct: true, distractor: null},
            ...wrong.map((candidate) => ({
                key: fractionKey(candidate.value),
                label: fractionKey(candidate.value),
                correct: false,
                distractor: candidate.type
            }))
        ];
        return shuffle(options, random);
    }

    function buildNumberOptions(correct, candidates, random) {
        const wrong = pickTwo(numberDistractors(correct, candidates), random);
        const options = [
            {key: String(correct), label: String(correct), correct: true, distractor: null},
            ...wrong.map((candidate) => ({
                key: String(candidate.value),
                label: String(candidate.value),
                correct: false,
                distractor: candidate.type
            }))
        ];
        return shuffle(options, random);
    }

    function buildVisualOptions(fraction, visualKind, random) {
        const {numerator, denominator} = fraction;
        const candidates = [
            {
                type: "OFF_BY_ONE",
                visual: {kind: visualKind, total: denominator, filled: numerator - 1}
            },
            {
                type: "OFF_BY_ONE",
                visual: {kind: visualKind, total: denominator, filled: numerator + 1}
            },
            {
                type: "DENOMINATOR_CONFUSION",
                visual: {kind: visualKind, total: denominator + 1, filled: numerator}
            },
            {
                type: "DENOMINATOR_CONFUSION",
                visual: {kind: visualKind, total: denominator - 1, filled: numerator}
            }
        ].filter((candidate) => candidate.visual.total >= 2
            && candidate.visual.filled >= 1
            && candidate.visual.filled <= candidate.visual.total
            && !(candidate.visual.total === denominator && candidate.visual.filled === numerator));

        const seen = new Set();
        const unique = candidates.filter((candidate) => {
            const key = `${candidate.visual.total}:${candidate.visual.filled}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

        const wrong = pickTwo(unique, random);
        const options = [
            {
                key: `${denominator}:${numerator}`,
                visual: {kind: visualKind, total: denominator, filled: numerator},
                correct: true,
                distractor: null
            },
            ...wrong.map((candidate) => ({
                key: `${candidate.visual.total}:${candidate.visual.filled}`,
                visual: candidate.visual,
                correct: false,
                distractor: candidate.type
            }))
        ];
        return shuffle(options, random);
    }

    function buildStep(scenario, fraction, random, lang = "fr") {
        const {numerator, denominator} = fraction;
        const id = `${scenario.id}-${fractionKey(fraction).replace("/", "-")}`;
        const base = {
            id,
            scenarioId: scenario.id,
            type: scenario.type,
            fraction,
            visualKind: scenario.visualKind
        };
        const key = fractionKey(fraction);

        if (scenario.type === "IDENTIFY") {
            return {
                ...base,
                prompt: gameI18n.translate(fractionRiverI18n, lang, "prompt.IDENTIFY"),
                visual: {kind: scenario.visualKind, total: denominator, filled: numerator},
                options: buildFractionOptions(fraction, random),
                explanation: gameI18n.translate(fractionRiverI18n, lang, "explanation.IDENTIFY", {
                    numerator,
                    denominator,
                    fraction: key,
                    coloredVerbPhrase: coloredVerbPhrase(numerator, lang)
                })
            };
        }

        if (scenario.type === "MATCH_VISUAL") {
            return {
                ...base,
                prompt: gameI18n.translate(fractionRiverI18n, lang, "prompt.MATCH_VISUAL", {fraction: key}),
                visual: null,
                options: buildVisualOptions(fraction, scenario.visualKind, random),
                explanation: gameI18n.translate(fractionRiverI18n, lang, "explanation.MATCH_VISUAL", {
                    numerator,
                    denominator,
                    fraction: key,
                    coloredAdjPhrase: coloredAdjPhrase(numerator, lang)
                })
            };
        }

        if (scenario.type === "SELECT_PARTS") {
            return {
                ...base,
                prompt: gameI18n.translate(fractionRiverI18n, lang, "prompt.SELECT_PARTS", {
                    numerator,
                    denominator,
                    partWord: partWord(numerator, lang)
                }),
                visual: {kind: scenario.visualKind, total: denominator, filled: 0},
                requiredCount: numerator,
                totalParts: denominator,
                options: [],
                explanation: gameI18n.translate(fractionRiverI18n, lang, "explanation.SELECT_PARTS", {
                    numerator,
                    denominator,
                    fraction: key,
                    partWord: partWord(numerator, lang)
                })
            };
        }

        if (scenario.type === "NUMERATOR") {
            return {
                ...base,
                prompt: gameI18n.translate(fractionRiverI18n, lang, "prompt.NUMERATOR", {
                    numerator,
                    denominator,
                    coloredVerbPhrase: coloredVerbPhrase(numerator, lang)
                }),
                visual: {kind: scenario.visualKind, total: denominator, filled: numerator},
                options: buildNumberOptions(numerator, [
                    {type: "WHOLE_CONFUSION", value: denominator},
                    {type: "OFF_BY_ONE", value: numerator + 1},
                    {type: "OFF_BY_ONE", value: numerator - 1},
                    {type: "DENOMINATOR_CONFUSION", value: denominator + 1}
                ], random),
                explanation: gameI18n.translate(fractionRiverI18n, lang, "explanation.NUMERATOR", {numerator})
            };
        }

        return {
            ...base,
            prompt: gameI18n.translate(fractionRiverI18n, lang, "prompt.DENOMINATOR", {
                numerator,
                denominator,
                coloredVerbPhrase: coloredVerbPhrase(numerator, lang)
            }),
            visual: {kind: scenario.visualKind, total: denominator, filled: numerator},
            options: buildNumberOptions(denominator, [
                {type: "COLORED_CONFUSION", value: numerator},
                {type: "DENOMINATOR_CONFUSION", value: denominator + 1},
                {type: "DENOMINATOR_CONFUSION", value: denominator - 1},
                {type: "OFF_BY_ONE", value: denominator + 2}
            ], random),
            explanation: gameI18n.translate(fractionRiverI18n, lang, "explanation.DENOMINATOR", {denominator})
        };
    }

    function scenariosFor(type) {
        return SCENARIOS.filter((scenario) => scenario.type === type);
    }

    function createLevel1Steps(random = Math.random, recentQuestionIds = [], lang = "fr") {
        const recent = new Set(recentQuestionIds);
        const usedFractions = new Set();

        return STEP_TYPES.map((type) => {
            const scenarios = shuffle(scenariosFor(type), random);
            const attempts = [];
            scenarios.forEach((scenario) => {
                shuffle(scenario.fractions, random).forEach((fractionKeyValue) => {
                    attempts.push({scenario, fraction: parseFraction(fractionKeyValue)});
                });
            });

            const fresh = attempts.find((attempt) => {
                const id = `${attempt.scenario.id}-${attempt.fraction.numerator}-${attempt.fraction.denominator}`;
                return !recent.has(id) && !usedFractions.has(fractionKey(attempt.fraction));
            });
            const fallback = attempts.find((attempt) => !usedFractions.has(fractionKey(attempt.fraction)));
            const chosen = fresh || fallback || attempts[0];

            usedFractions.add(fractionKey(chosen.fraction));
            return buildStep(chosen.scenario, chosen.fraction, random, lang);
        });
    }

    // Climax — la passerelle des représentations (§7.6) : une séquence distincte
    // qui suit les cinq étapes, elle ne les remplace pas.
    const BRIDGE_FRACTIONS = ["1/2", "1/4", "3/4"];

    function createBridgePairs(random = Math.random) {
        const pairs = BRIDGE_FRACTIONS.map((key) => {
            const fraction = parseFraction(key);
            return {
                key,
                fraction,
                visual: {kind: "DISC", total: fraction.denominator, filled: fraction.numerator}
            };
        });
        return {
            slabs: pairs,
            visualOrder: shuffle(pairs.map((pair) => pair.key), random),
            fractionOrder: shuffle(pairs.map((pair) => pair.key), random)
        };
    }

    function hintFor(distractorType, lang = "fr") {
        const key = `hint.${distractorType}`;
        const exists = Boolean(
            (fractionRiverI18n.fr && Object.prototype.hasOwnProperty.call(fractionRiverI18n.fr, key))
            || (fractionRiverI18n.en && Object.prototype.hasOwnProperty.call(fractionRiverI18n.en, key)),
        );
        return gameI18n.translate(fractionRiverI18n, lang, exists ? key : "hint.default");
    }

    function countLevel1Variants() {
        return SCENARIOS.reduce((total, scenario) => total + scenario.fractions.length, 0);
    }

    const api = {
        STEP_COUNT,
        STEP_TYPES,
        RETIRED_STEP_TYPES,
        SCENARIOS,
        ALLOWED_FRACTIONS,
        BRIDGE_FRACTIONS,
        HINTS,
        fractionKey,
        parseFraction,
        createSeededRandom,
        shuffle,
        fractionDistractors,
        buildStep,
        createLevel1Steps,
        createBridgePairs,
        hintFor,
        countLevel1Variants
    };

    root.FractionRiverQuestions = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
