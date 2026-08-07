import { useEffect } from "react";
import { useTranslation } from "react-i18next";

// Synchronise <html lang="…"> et le titre de l'onglet avec la langue active.
// Un seul appel, monté une fois dans AppLayout : toutes les routes en
// bénéficient sans avoir à le répéter.
export function useSyncDocumentLanguage() {
  const { i18n, t } = useTranslation("common");

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.title = t("documentTitle");
  }, [i18n.language, t]);
}
