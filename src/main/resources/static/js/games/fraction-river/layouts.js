(function initializeFractionRiverLayouts(root) {
    "use strict";

    const STEP_COUNT = 5;
    // Taille du héros dans les coordonnées du monde. Elle ne change pas d'un
    // profil à l'autre : c'est le monde qui se resserre, pas le personnage.
    const HERO_WORLD = {width: 40, height: 60};
    // Écart entre la pierre et la hauteur où le héros se tient dessus.
    const STAND_ABOVE_STONE = 22;
    // Le tablier du pont est légèrement plus bas que la station sur pierre.
    const DECK_BELOW_STAND = 8;

    function evenlySpaced(first, last, count) {
        if (count < 2) {
            return [first];
        }
        const gap = (last - first) / (count - 1);
        return Array.from({length: count}, (unused, index) => Math.round(first + gap * index));
    }

    // Profil panoramique : la rivière rectiligne, telle qu'elle est servie dans
    // la page. Rapport très étiré, adapté à une bande horizontale.
    function panoramicLayout() {
        const width = 840;
        const height = 320;
        const waterline = 176;
        const bankWidth = 78;
        const standY = waterline - 12;

        const xs = evenlySpaced(bankWidth + 28, width - bankWidth - 168, STEP_COUNT);
        const stones = xs.map((x) => ({
            x,
            y: waterline + 10,
            standY
        }));

        return {
            name: "panoramic",
            width,
            height,
            waterline,
            bankWidth,
            leftWaterY: waterline,
            stones,
            deckSurfaceY: standY + DECK_BELOW_STAND,
            deckStart: stones[STEP_COUNT - 1].x - 6,
            deckEnd: width - bankWidth + 28,
            chest: {x: width - 58},
            village: {x: width - 30, y: waterline - 46},
            explorerHome: {x: 34, y: standY},
            frog: {x: 196, y: waterline - 26},
            trees: [{x: 38, scale: 0.8}, {x: width - 34, scale: 0.75}],
            palms: [300, 640],
            fish: [
                {x: 190, y: waterline + 46},
                {x: 400, y: waterline + 92},
                {x: 610, y: waterline + 60},
                {x: 300, y: waterline + 118}
            ]
        };
    }

    // Profil immersif : la rivière remonte en gradins vers le village. Le cadre
    // est presque carré, donc la hauteur du téléphone en paysage est enfin
    // occupée et le héros peut être affiché près de sa taille nominale.
    function immersiveLayout() {
        const width = 480;
        const height = 360;
        const bankWidth = 52;
        const leftWaterY = 300;

        const xs = evenlySpaced(88, 372, STEP_COUNT);
        // Les paliers montent régulièrement de la rive de départ vers le village.
        const ys = evenlySpaced(292, 160, STEP_COUNT);
        const stones = xs.map((x, index) => ({
            x,
            y: ys[index],
            standY: ys[index] - STAND_ABOVE_STONE
        }));

        const dernierPalier = stones[STEP_COUNT - 1];

        return {
            name: "immersive",
            width,
            height,
            waterline: leftWaterY,
            bankWidth,
            leftWaterY,
            stones,
            deckSurfaceY: dernierPalier.standY + DECK_BELOW_STAND,
            deckStart: dernierPalier.x - 6,
            deckEnd: width - bankWidth + 26,
            chest: {x: width - 40},
            village: {x: width - 20, y: dernierPalier.standY - 62},
            explorerHome: {x: 26, y: leftWaterY - 12},
            frog: {x: 128, y: 268},
            trees: [{x: 24, scale: 0.62}, {x: width - 22, scale: 0.58}],
            palms: [206, 330],
            fish: [
                {x: 130, y: 330},
                {x: 250, y: 300},
                {x: 330, y: 262}
            ]
        };
    }

    const BUILDERS = {
        panoramic: panoramicLayout,
        immersive: immersiveLayout
    };

    function createLayout(name) {
        const builder = BUILDERS[name] || BUILDERS.panoramic;
        return builder();
    }

    // Facteur d'affichage réel : la scène est ajustée pour tenir entièrement
    // dans le panneau, donc c'est la contrainte la plus serrée qui l'emporte.
    function fitFactor(layout, panelWidth, panelHeight) {
        if (!panelWidth || !panelHeight) {
            return 0;
        }
        return Math.min(panelWidth / layout.width, panelHeight / layout.height);
    }

    // Taille du héros telle que l'enfant la voit, en pixels d'écran. C'est la
    // mesure qui décide si le jeu est jouable ou non sur un téléphone.
    function heroScreenSize(layout, panelWidth, panelHeight) {
        const factor = fitFactor(layout, panelWidth, panelHeight);
        return {
            width: Math.round(HERO_WORLD.width * factor),
            height: Math.round(HERO_WORLD.height * factor),
            factor: Number(factor.toFixed(3))
        };
    }

    // Part de la hauteur du panneau réellement occupée par la scène.
    function heightUsage(layout, panelWidth, panelHeight) {
        const factor = fitFactor(layout, panelWidth, panelHeight);
        return Number(((layout.height * factor) / panelHeight).toFixed(3));
    }

    const api = {
        STEP_COUNT,
        HERO_WORLD,
        STAND_ABOVE_STONE,
        DECK_BELOW_STAND,
        createLayout,
        fitFactor,
        heroScreenSize,
        heightUsage
    };

    root.FractionRiverLayouts = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
