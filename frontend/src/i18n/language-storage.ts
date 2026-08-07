import { FALLBACK_LANGUAGE, isSupportedLanguage, type SupportedLanguage } from "./supported-languages";

export const LANGUAGE_STORAGE_KEY = "portailMath.preferences.language";

// Lecture tolérante : une valeur absente, corrompue ou inconnue ne doit
// jamais faire planter le portail — elle est simplement ignorée.
export function loadStoredLanguage(storage: Storage | undefined = safeLocalStorage()): SupportedLanguage | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveLanguage(
  language: SupportedLanguage,
  storage: Storage | undefined = safeLocalStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Le stockage peut être indisponible (navigation privée, quota plein) :
    // la langue reste active pour la session, seule la persistance échoue.
  }
}

// Le navigateur annonce parfois des variantes ("en-US", "fr-CA") : seul le
// préfixe compte pour choisir entre les deux langues supportées.
export function detectBrowserLanguage(navigatorLanguages: readonly string[] = safeNavigatorLanguages()): SupportedLanguage | null {
  for (const tag of navigatorLanguages) {
    const prefix = tag.slice(0, 2).toLowerCase();
    if (isSupportedLanguage(prefix)) {
      return prefix;
    }
  }
  return null;
}

// Ordre de résolution : préférence enregistrée, puis langue du navigateur,
// puis français par défaut.
export function resolveInitialLanguage(): SupportedLanguage {
  return loadStoredLanguage() ?? detectBrowserLanguage() ?? FALLBACK_LANGUAGE;
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function safeNavigatorLanguages(): readonly string[] {
  if (typeof navigator === "undefined") {
    return [];
  }
  if (navigator.languages && navigator.languages.length > 0) {
    return navigator.languages;
  }
  return navigator.language ? [navigator.language] : [];
}
