// Plein écran natif quand le navigateur le permet (Fullscreen API, préfixe WebKit compris) ; sans lui, l'appelant
// garde sa présentation immersive de remplacement (élément fixé sur toute la fenêtre). Rien ici ne suppose qu'un
// navigateur mobile autorise le plein écran ni le verrouillage de l'orientation.

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface LockableOrientation {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
}

export function fullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** Demande le plein écran natif pour l'élément ; renvoie false (sans erreur) s'il est indisponible ou refusé. */
export async function enterNativeFullscreen(element: HTMLElement, lockLandscape: boolean): Promise<boolean> {
  const target = element as FullscreenElement;
  const request = target.requestFullscreen ?? target.webkitRequestFullscreen;
  if (!request) {
    return false;
  }
  try {
    await request.call(target);
  } catch {
    return false;
  }
  if (lockLandscape) {
    try {
      // Le verrouillage en paysage n'est pas garanti (iOS, certains navigateurs) : sans lui, la mise en page s'adapte au portrait.
      await (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
    } catch {
      // Refusé ou non pris en charge : on continue.
    }
  }
  return true;
}

export async function exitNativeFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  try {
    if (fullscreenElement()) {
      await (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
    }
  } catch {
    // Déjà sorti : rien à faire.
  }
  try {
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
  } catch {
    // Pas de verrou à lever.
  }
}
