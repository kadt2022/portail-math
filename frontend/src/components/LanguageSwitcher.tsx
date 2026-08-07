import { useTranslation } from "react-i18next";

import { saveLanguage } from "../i18n/language-storage";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n/supported-languages";
import styles from "./LanguageSwitcher.module.css";

const LABEL_KEYS: Record<SupportedLanguage, string> = {
  fr: "language.french",
  en: "language.english",
};

const SHORT_LABELS: Record<SupportedLanguage, string> = {
  fr: "FR",
  en: "EN",
};

// Changement immédiat : i18next met à jour tous les composants abonnés sans
// recharger la page, sans toucher à la route ni aux données de progression.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const current = i18n.language as SupportedLanguage;

  function switchTo(language: SupportedLanguage) {
    if (language === current) {
      return;
    }
    void i18n.changeLanguage(language);
    saveLanguage(language);
  }

  return (
    <div className={styles.switcher} role="group" aria-label={t("language.label")}>
      {SUPPORTED_LANGUAGES.map((language) => {
        const isActive = language === current;
        return (
          <button
            key={language}
            type="button"
            className={isActive ? `${styles.option} ${styles.optionActive}` : styles.option}
            aria-pressed={isActive}
            aria-label={t(LABEL_KEYS[language])}
            onClick={() => switchTo(language)}
          >
            {SHORT_LABELS[language]}
          </button>
        );
      })}
    </div>
  );
}
