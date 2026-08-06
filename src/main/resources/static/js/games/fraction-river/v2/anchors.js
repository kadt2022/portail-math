(function initializeFractionRiverAnchors(root) {
    "use strict";

    // Grille d'ancrage de La Rivière des fractions, version illustrée.
    //
    // Le partage des rôles :
    //
    //   l'illustration est l'autorité VISUELLE — elle porte la rivière, le
    //   village, le pont, la végétation, la lumière, et les cinq pierres qui
    //   servent de repères du trajet ;
    //
    //   ce fichier est l'autorité INTERACTIVE — il dit où le chien pose les
    //   pattes, où la pierre s'allume, où volent les oiseaux et nagent les
    //   poissons.
    //
    // Les deux sont alignés par des POURCENTAGES, jamais par des pixels : le
    // même jeu tourne sur un téléphone de 640 px et sur un écran de 1600, et
    // seule une proportion survit à cet écart.
    //
    // Les chiffres ci-dessous ne sont pas relevés à l'œil. Ils viennent d'une
    // analyse des pixels de river-scene.png : les zones non bleues de la
    // rivière ont été isolées en composantes connexes, et les cinq plus grandes
    // sont les pierres. Recadrer ou remplacer l'illustration invalide ces
    // nombres — il faut alors rouvrir avec ?debugAnchors=true et remesurer.

    // Monde logique en 16/9, comme l'illustration. Le canvas est rendu au double
    // pour rester net.
    const WORLD = {width: 800, height: 450};
    const RENDER_SCALE = 2;

    // Taille du chien, en part de la hauteur de l'image, à l'appui le plus
    // proche. Un chien est plus bas et plus long qu'un enfant : il tient dans
    // moins de hauteur, mais il lui faut de la largeur.
    //
    // 0,115 x 450 = 51,75 unités du monde. Sur un téléphone en paysage, la
    // scène s'affiche en 640 x 360, soit un facteur 0,8 : le chien fait donc
    // 41 px de haut au départ et 37 px au cinquième appui. La consigne est
    // 34 à 42 px — et c'est elle qui interdit de le laisser rétrécir vraiment.
    const HERO_HEIGHT_RATIO = 0.115;
    const HERO_ASPECT = 1.35;

    // Tailles de base des oiseaux et des poissons, en unités du monde. Chaque
    // animal applique ensuite sa propre échelle : les plus petits donnent de la
    // profondeur, les plus grands restent faciles à repérer sur téléphone.
    const BIRD_WORLD_WIDTH = 32;
    const FISH_WORLD_WIDTH = 30;

    const ANCHORS = {
        // Les cinq appuis, du plus proche au plus lointain. Le point est la
        // PLANTE DES PATTES : le centre mesuré de la pierre, remonté de la
        // moitié haute de son galbe.
        //
        // `scale` fait rétrécir le chien à mesure qu'il s'éloigne. Ce n'est pas
        // un réglage esthétique : les pierres peintes mesurent 161, 164, 151,
        // 135 puis 117 px de large. Le chien doit suivre la même perspective,
        // sinon il grandit en s'éloignant du village.
        // `painted` est l'encombrement de la pierre DESSINÉE, mesuré lui aussi
        // sur l'image. C'est lui qui dimensionne le halo de la pierre active :
        // un halo qui déborde de la pierre peinte se voit immédiatement.
        // L'échelle ne suit plus la perspective des pierres. Elle l'esquisse.
        // À 0,75 sur le cinquième appui, le chien tombait à 31 px sur un
        // téléphone : un point au bord du pont, que l'enfant ne retrouvait plus.
        // L'écart est donc resserré entre 1 et 0,89 — la profondeur se lit
        // encore, et le chien reste identifiable partout.
        stones: [
            {xRatio: 0.283, yRatio: 0.825, scale: 1,
                painted: {w: 0.096, h: 0.112, cy: 0.845}},
            {xRatio: 0.316, yRatio: 0.672, scale: 0.98,
                painted: {w: 0.098, h: 0.104, cy: 0.691}},
            {xRatio: 0.377, yRatio: 0.527, scale: 0.95,
                painted: {w: 0.090, h: 0.095, cy: 0.544}},
            {xRatio: 0.454, yRatio: 0.424, scale: 0.92,
                painted: {w: 0.081, h: 0.085, cy: 0.439}},
            {xRatio: 0.524, yRatio: 0.341, scale: 0.89,
                painted: {w: 0.070, h: 0.077, cy: 0.355}}
        ],
        // Sur l'herbe de la berge de départ, sous le panneau DÉPART peint.
        heroStart: {xRatio: 0.125, yRatio: 0.790, scale: 1},

        // L'ARRIVÉE : le centre du bois du tablier.
        //
        // Le chien finissait dans l'eau. La faute vient de deux points de pont
        // choisis à l'œil, dont l'un tombait à côté du bois. Celui-ci est mesuré :
        // on a cherché, dans la zone du pont, le point dont le disque de bois
        // environnant est le plus large. À 57,4 % / 29,0 % le bois s'étend sur
        // 9 px dans toutes les directions — c'est le maximum de l'illustration.
        //
        // Le chien y arrive en UN seul saut depuis la pierre 5, et il n'y a plus
        // d'étape intermédiaire où il pouvait manquer sa cible.
        arrival: {xRatio: 0.574, yRatio: 0.290, scale: 0.85},

        // Zone de la question HTML. Ce n'est plus l'intérieur exact du parchemin
        // peint — celui-ci ne fait que 18,9 % de large, ce qui donnait une
        // question de 121 px sur un téléphone, illisible. Le panneau HTML
        // reprend donc le style parchemin et le PROLONGE vers la gauche jusqu'à
        // 36 % de la scène. Le dessin sert de socle, pas de cadre rigide.
        questionPanel: {
            xRatio: 0.62,
            yRatio: 0.18,
            widthRatio: 0.36,
            heightRatio: 0.72
        },
        // Le parchemin réellement peint, mesuré sur l'image. Conservé pour que
        // le panneau HTML sache où le dessin commence et s'y fonde.
        paintedPanel: {
            xRatio: 0.797,
            yRatio: 0.265,
            widthRatio: 0.189,
            heightRatio: 0.508
        },

        // Longues ondulations, en travers du courant. `t` place la vague le long
        // de la rivière, `lateral` la décale de son axe, `width` est sa longueur
        // en unités du monde. Elles couvrent plusieurs zones et plusieurs
        // profondeurs : des cercles autour des pierres ne se voyaient pas.
        // Les ondelettes, posées en COORDONNÉES DU MONDE et non le long de l'axe.
        //
        // Placées sur l'axe, elles se retrouvaient toutes alignées sur la file
        // des pierres — donc autour d'elles, exactement là où il n'en faut pas.
        // Chacune vise ici une zone d'eau libre, et `validateWaveSpots()` vérifie
        // qu'elle est bien dans la rivière ET hors de la zone d'exclusion des
        // pierres. Les six zones demandées sont couvertes.
        // Ces six positions ne sont pas choisies à vue. Elles viennent d'un
        // balayage de chaque zone d'eau libre, retenant le point qui maximise la
        // distance aux pierres — au départ ET à la fin de la dérive. La marge
        // retenue est de 1,18 à 2,4 fois la zone d'exclusion, et deux ondelettes
        // ne sont jamais à moins de 70 unités l'une de l'autre.
        waves: [
            {zone: "basse, avant la cascade", x: 338, y: 377, length: 150, alpha: 0.30, speed: 0.90},
            {zone: "rive gauche, mi-hauteur", x: 182, y: 325, length: 110, alpha: 0.26, speed: 0.55},
            {zone: "centrale droite", x: 391, y: 287, length: 135, alpha: 0.28, speed: 0.90},
            {zone: "eau libre entre 2 et 3", x: 229, y: 248, length: 100, alpha: 0.24, speed: 0.55},
            {zone: "centrale droite haute", x: 423, y: 233, length: 90, alpha: 0.22, speed: 0.84},
            {zone: "haute, près du village", x: 505, y: 88, length: 70, alpha: 0.20, speed: 0.45}
        ],

        // Impacts circulaires : trois anneaux naissent l'un après l'autre, comme
        // après la chute d'un petit caillou. Ils sont séparés des longues crêtes
        // ci-dessus afin que les deux mouvements de l'eau restent lisibles.
        ripples: [
            {zone: "amont lointain", x: 442, y: 110, radius: 26, alpha: 0.38, period: 5200},
            {zone: "milieu calme", x: 403, y: 230, radius: 42, alpha: 0.34, period: 6100},
            {zone: "aval rive gauche", x: 184, y: 324, radius: 54, alpha: 0.30, period: 7000}
        ],

        // Les poissons, eux aussi en coordonnées du monde et validés. Aucune
        // position tirée au hasard : l'un d'eux se retrouvait sur une pierre.
        // Les deux premiers nagent très loin, près du village : leur échelle et
        // leur transparence suivent la perspective. Toutes les courses survivent
        // au validateur, du départ au demi-tour.
        fish: [
            {x: 442, y: 110, sens: 1, teinte: 0xffd43b, course: 42, scale: 0.46, alpha: 0.58},
            {x: 485, y: 130, sens: -1, teinte: 0x74c0fc, course: 45, scale: 0.56, alpha: 0.64},
            {x: 419, y: 242, sens: -1, teinte: 0x1864ab, course: 26, scale: 0.72, alpha: 0.74},
            {x: 351, y: 294, sens: 1, teinte: 0x94d82d, course: 36, scale: 0.80, alpha: 0.78},
            {x: 351, y: 357, sens: -1, teinte: 0xffd43b, course: 38, scale: 0.90, alpha: 0.82},
            {x: 275, y: 440, sens: 1, teinte: 0xffa94d, course: 45, scale: 1, alpha: 0.86}
        ],

        // Bande de ciel où passent les oiseaux : elle s'arrête avant le panneau
        // agrandi pour que même les plus petits restent visibles.
        sky: {xRatio: 0.14, yRatio: 0.02, widthRatio: 0.46, heightRatio: 0.18},

        // Sept oiseaux, avec plusieurs profondeurs et deux sens de vol. Les
        // échelles de 0,42 à 1,08 produisent de vraies silhouettes lointaines,
        // au lieu de quatre oiseaux presque identiques.
        birds: [
            {vertical: 0.18, scale: 0.42, speed: 0.78, sens: 1, palette: 2, inside: 0.30, bob: 4},
            {vertical: 0.34, scale: 0.58, speed: 0.92, sens: -1, palette: 3, inside: 0.78, bob: 6},
            {vertical: 0.52, scale: 0.76, speed: 1.06, sens: 1, palette: 0, inside: 0.54, bob: 8},
            {vertical: 0.72, scale: 1.08, speed: 0.84, sens: 1, palette: 1, inside: 0.20, bob: 11},
            {vertical: 0.25, scale: 0.50, speed: 1.18, sens: -1, palette: 0, bob: 5},
            {vertical: 0.62, scale: 0.66, speed: 0.98, sens: 1, palette: 3, inside: 0.86, bob: 7},
            {vertical: 0.84, scale: 0.88, speed: 1.10, sens: -1, palette: 2, bob: 9}
        ],

        // Axe de la rivière, du bas vers le pont, avec sa demi-largeur. Sert à
        // semer les reflets et les poissons DANS l'eau et nulle part ailleurs.
        river: [
            {xRatio: 0.30, yRatio: 0.98, halfWidth: 0.10},
            {xRatio: 0.31, yRatio: 0.86, halfWidth: 0.11},
            {xRatio: 0.34, yRatio: 0.72, halfWidth: 0.12},
            {xRatio: 0.39, yRatio: 0.58, halfWidth: 0.12},
            {xRatio: 0.44, yRatio: 0.46, halfWidth: 0.11},
            {xRatio: 0.50, yRatio: 0.36, halfWidth: 0.10},
            {xRatio: 0.56, yRatio: 0.26, halfWidth: 0.08},
            {xRatio: 0.61, yRatio: 0.17, halfWidth: 0.05}
        ]
    };

    // Frontière entre la scène jouable et le panneau. Rien d'interactif ne doit
    // vivre à droite : le HTML y passerait devant.
    const PLAY_AREA_RIGHT = ANCHORS.questionPanel.xRatio;

    function toWorld(anchor) {
        return {
            x: anchor.xRatio * WORLD.width,
            y: anchor.yRatio * WORLD.height,
            scale: anchor.scale === undefined ? 1 : anchor.scale
        };
    }

    function toWorldRect(anchor) {
        return {
            x: anchor.xRatio * WORLD.width,
            y: anchor.yRatio * WORLD.height,
            width: anchor.widthRatio * WORLD.width,
            height: anchor.heightRatio * WORLD.height
        };
    }

    // Le trajet complet : départ, les cinq appuis, le ponton d'arrivée.
    // Sept points, pas huit : le saut final est unique.
    function journey() {
        return [toWorld(ANCHORS.heroStart)]
            .concat(ANCHORS.stones.map(toWorld))
            .concat([toWorld(ANCHORS.arrival)]);
    }

    // Taille du chien à un point donné du trajet, en pixels du monde.
    function heroSizeAt(anchor) {
        const echelle = anchor.scale === undefined ? 1 : anchor.scale;
        const height = WORLD.height * HERO_HEIGHT_RATIO * echelle;
        return {width: Math.round(height * HERO_ASPECT), height: Math.round(height)};
    }

    // Taille du chien telle que l'enfant la voit, sur un écran donné. C'est la
    // mesure qui décide si le jeu est jouable sur un téléphone — l'image occupe
    // l'écran entier, panneau de question compris.
    function heroScreenSize(screenWidth, screenHeight, anchor) {
        if (!screenWidth || !screenHeight) {
            return {width: 0, height: 0, factor: 0};
        }
        const factor = Math.min(screenWidth / WORLD.width, screenHeight / WORLD.height);
        const monde = heroSizeAt(anchor || ANCHORS.heroStart);
        return {
            width: Math.round(monde.width * factor),
            height: Math.round(monde.height * factor),
            factor: Number(factor.toFixed(3))
        };
    }

    // Encombrement de la pierre peinte, en coordonnées du monde.
    function paintedStoneAt(index) {
        const appui = ANCHORS.stones[index];
        if (!appui || !appui.painted) {
            return null;
        }
        return {
            x: appui.xRatio * WORLD.width,
            y: appui.painted.cy * WORLD.height,
            width: appui.painted.w * WORLD.width,
            height: appui.painted.h * WORLD.height
        };
    }

    // Contour du lit de la rivière, en coordonnées du monde : la rive gauche
    // descendante puis la rive droite remontante. Sert de masque géométrique —
    // vagues et poissons y sont enfermés, et ne traversent jamais les berges.
    function riverPolygon() {
        const axe = ANCHORS.river;
        const gauche = axe.map((p) => ({
            x: (p.xRatio - p.halfWidth) * WORLD.width,
            y: p.yRatio * WORLD.height
        }));
        const droite = axe
            .slice()
            .reverse()
            .map((p) => ({
                x: (p.xRatio + p.halfWidth) * WORLD.width,
                y: p.yRatio * WORLD.height
            }));
        return gauche.concat(droite);
    }

    // ---------- gardes géométriques ----------

    // Marge d'exclusion autour d'une pierre, en multiple de son encombrement
    // peint. 1,6 couvre la pierre, le devant et l'arrière immédiat : une
    // ondelette n'a le droit d'exister nulle part là-dedans.
    // Rayon d'exclusion, en multiple de l'encombrement peint de la pierre. À 1,8
    // il vaut 0,9 fois la largeur de la pierre — au-delà, deux des six zones
    // d'eau libre n'ont plus aucun point valide : la rivière n'y est pas assez
    // large, et il faudrait renoncer à des ondelettes.
    //
    // Ce n'est pas la valeur qui laissait un poisson posé sur une pierre : c'est
    // que le contrôle ne portait que sur les EXTRÉMITÉS des trajets. Un poisson
    // partait d'une eau libre, arrivait dans une eau libre, et passait sur la
    // pierre entre les deux. Le trajet est maintenant échantillonné.
    const STONE_EXCLUSION = 1.8;
    // Nombre de points contrôlés le long de chaque trajet, bornes comprises.
    const PATH_SAMPLES = 9;

    // Le point est-il dans le lit de la rivière ? Lancer de rayon classique sur
    // le polygone du lit.
    function isInsideRiver(x, y) {
        const contour = riverPolygon();
        let dedans = false;
        for (let i = 0, j = contour.length - 1; i < contour.length; j = i, i += 1) {
            const a = contour[i];
            const b = contour[j];
            const traverse = (a.y > y) !== (b.y > y);
            if (traverse && x < a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)) {
                dedans = !dedans;
            }
        }
        return dedans;
    }

    // Le point est-il trop près d'une pierre ? Test elliptique, à l'échelle de
    // la pierre concernée : les pierres du fond sont plus petites, leur zone
    // d'exclusion aussi.
    function isNearStone(x, y, facteur = STONE_EXCLUSION) {
        return ANCHORS.stones.some((appui, index) => {
            const pierre = paintedStoneAt(index);
            const dx = (x - pierre.x) / (pierre.width * facteur / 2);
            const dy = (y - pierre.y) / (pierre.height * facteur / 2);
            return dx * dx + dy * dy <= 1;
        });
    }

    // La seule porte d'entrée pour placer quoi que ce soit dans l'eau. Berges,
    // ponton et pont sont exclus par construction : ils sont hors du polygone.
    function isValidWaterSpot(x, y) {
        return isInsideRiver(x, y) && !isNearStone(x, y);
    }

    // Contrôle des positions déclarées. Retourne la liste des fautives — vide
    // si tout va bien. Les tests s'en servent, et c'est ce qui empêche un
    // poisson de remonter sur une pierre.
    // Contrôle du TRAJET entier, pas de ses deux bouts. Un poisson qui part d'une
    // eau libre et arrive dans une eau libre peut très bien passer sur une pierre
    // au milieu — c'est exactement ce qui donnait l'impression d'un poisson posé
    // dessus.
    function validatePath(genre, index, depart, arrivee, fautes) {
        for (let pas = 0; pas < PATH_SAMPLES; pas += 1) {
            const t = pas / (PATH_SAMPLES - 1);
            const x = depart.x + (arrivee.x - depart.x) * t;
            const y = depart.y + (arrivee.y - depart.y) * t;
            if (isValidWaterSpot(x, y)) {
                continue;
            }
            const cause = isInsideRiver(x, y) ? "passe sur une pierre" : "sort de l'eau";
            fautes.push(
                `${genre} ${index + 1} ${cause} à ${Math.round(t * 100)} % de son trajet `
                + `(${Math.round(x)},${Math.round(y)})`
            );
            return;
        }
    }

    function validateWaterSpots() {
        const fautes = [];

        // Une ondelette dérive vers l'aval ; un poisson nage et revient. Les deux
        // sont contrôlés sur toute leur course. Les impacts circulaires restent
        // centrés et sont masqués par la forme de la rivière.
        ANCHORS.waves.forEach((onde, index) => {
            validatePath("ondelette", index, onde, waveDriftEnd(onde), fautes);
        });
        ANCHORS.fish.forEach((poisson, index) => {
            const bout = {x: poisson.x + poisson.course * poisson.sens, y: poisson.y};
            validatePath("poisson", index, poisson, bout, fautes);
        });
        ANCHORS.ripples.forEach((impact, index) => {
            validatePath("impact", index, impact, impact, fautes);
        });

        return fautes;
    }

    // Longueur de la dérive d'une ondelette, en unités du monde. La scène et le
    // validateur doivent lire le MÊME nombre, sinon on valide un trajet qui n'est
    // pas celui qui sera joué.
    const WAVE_DRIFT = 46;

    // Où finit une ondelette après sa dérive vers l'aval.
    function waveDriftEnd(onde) {
        const aval = (flowAngleAt(onde.x, onde.y) + 180) * Math.PI / 180;
        const distance = WAVE_DRIFT * onde.speed;
        return {
            x: onde.x + Math.cos(aval) * distance,
            y: onde.y + Math.sin(aval) * distance
        };
    }

    // Direction locale du courant à un point donné du monde : l'ondelette doit
    // s'écouler vers l'aval, donc vers le bas de l'image.
    function flowAngleAt(x, y) {
        const axe = ANCHORS.river;
        let proche = 0;
        let meilleure = Infinity;
        axe.forEach((p, index) => {
            const d = Math.abs(p.yRatio * WORLD.height - y);
            if (d < meilleure) {
                meilleure = d;
                proche = index;
            }
        });
        const a = axe[Math.max(0, proche - 1)];
        const b = axe[Math.min(axe.length - 1, proche + 1)];
        return Math.atan2(
            (b.yRatio - a.yRatio) * WORLD.height,
            (b.xRatio - a.xRatio) * WORLD.width
        ) * 180 / Math.PI;
    }

    // Une vague : sa position sur l'axe, sa longueur, et DEUX angles.
    //
    // `flowAngle` est la direction du courant. `crestAngle` est celle de la
    // crête, perpendiculaire au courant — et c'est elle qui oriente le dessin.
    // Les avoir confondues donnait des vagues à 84°, dressées à la verticale
    // comme des piquets : une crête traverse la rivière, elle ne la longe pas.
    // La vague dérive le long du courant, mais s'étend en travers.
    function waveAt(spec) {
        const point = riverPointAt(spec.t, spec.lateral);
        const avant = riverPointAt(Math.max(0, spec.t - 0.05), spec.lateral);
        const apres = riverPointAt(Math.min(1, spec.t + 0.05), spec.lateral);
        const flowAngle = Math.atan2(apres.y - avant.y, apres.x - avant.x) * 180 / Math.PI;
        return {
            x: point.x,
            y: point.y,
            width: spec.width * point.scale,
            flowAngle,
            crestAngle: flowAngle + 90,
            scale: point.scale,
            alpha: spec.alpha,
            speed: spec.speed
        };
    }

    // Un point au hasard dans le lit de la rivière, à une hauteur donnée du
    // parcours. `t` va de 0 (aval, en bas) à 1 (amont, sous le pont).
    function riverPointAt(t, lateral) {
        const axe = ANCHORS.river;
        const position = Math.min(0.9999, Math.max(0, t)) * (axe.length - 1);
        const index = Math.floor(position);
        const reste = position - index;
        const a = axe[index];
        const b = axe[Math.min(axe.length - 1, index + 1)];
        const xRatio = a.xRatio + (b.xRatio - a.xRatio) * reste;
        const yRatio = a.yRatio + (b.yRatio - a.yRatio) * reste;
        const demi = a.halfWidth + (b.halfWidth - a.halfWidth) * reste;
        return {
            x: (xRatio + demi * lateral) * WORLD.width,
            y: yRatio * WORLD.height,
            // Loin en amont, tout rétrécit : les poissons aussi.
            scale: 1 - t * 0.45
        };
    }

    const api = {
        WORLD,
        RENDER_SCALE,
        HERO_HEIGHT_RATIO,
        HERO_ASPECT,
        BIRD_WORLD_WIDTH,
        FISH_WORLD_WIDTH,
        ANCHORS,
        PLAY_AREA_RIGHT,
        toWorld,
        toWorldRect,
        journey,
        heroSizeAt,
        heroScreenSize,
        paintedStoneAt,
        riverPointAt,
        riverPolygon,
        waveAt,
        STONE_EXCLUSION,
        isInsideRiver,
        isNearStone,
        isValidWaterSpot,
        validateWaterSpots,
        flowAngleAt,
        WAVE_DRIFT,
        waveDriftEnd
    };

    root.FractionRiverAnchors = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
