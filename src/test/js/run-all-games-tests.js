// Agrégateur exécuté sous c8 (voir testGamesCoverage dans build.gradle) pour
// produire un unique rapport lcov couvrant tout src/main/resources/static/js.
// Chaque fichier de test conserve son exécution indépendante (testXxx dans
// build.gradle) : celui-ci n'existe que pour la couverture agrégée.
"use strict";

require("./multiplication-train.test.js");
require("./fraction-river.test.js");
require("./fraction-river-anchors.test.js");
require("./game-i18n.test.js");
require("./game-shell-i18n.test.js");
require("./progress-store.test.js");
