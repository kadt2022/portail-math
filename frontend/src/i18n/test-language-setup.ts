// jsdom rapporte "en-US" par défaut : sans ce réglage AVANT l'initialisation
// de i18next (voir vitest.setup.ts, qui importe ce module avant "./i18n"),
// toute la suite de tests s'exécuterait en anglais au lieu du français
// attendu par les composants déjà écrits. Les tests dédiés à la résolution
// de langue redéfinissent navigator eux-mêmes pour vérifier le cas anglais.
Object.defineProperty(window.navigator, "language", { value: "fr-FR", configurable: true });
Object.defineProperty(window.navigator, "languages", { value: ["fr-FR"], configurable: true });
