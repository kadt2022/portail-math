// Changements de l'écran qui peuvent dérégler un jeu : rotation, redimensionnement, entrée ou sortie du plein écran, barre du
// navigateur qui apparaît, et surtout retour de veille (la page a pu passer par la taille de l'écran de verrouillage pendant
// qu'elle était cachée). Le rappel est joué une fois la nouvelle disposition réellement appliquée par le navigateur : deux images
// d'animation plus tard (synchronisé sur l'affichage, jamais un délai arbitraire). Une page cachée n'a pas d'images
// d'animation : le rappel attend donc tout seul que la page soit de nouveau visible.

export function onViewportSettled(callback: () => void): () => void {
  let first = 0;
  let second = 0;
  const schedule = () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(callback);
    });
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") schedule();
  };
  const viewport = window.visualViewport;
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  window.addEventListener("pageshow", schedule);
  document.addEventListener("fullscreenchange", schedule);
  document.addEventListener("webkitfullscreenchange", schedule);
  document.addEventListener("visibilitychange", onVisibility);
  viewport?.addEventListener("resize", schedule);
  return () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("orientationchange", schedule);
    window.removeEventListener("pageshow", schedule);
    document.removeEventListener("fullscreenchange", schedule);
    document.removeEventListener("webkitfullscreenchange", schedule);
    document.removeEventListener("visibilitychange", onVisibility);
    viewport?.removeEventListener("resize", schedule);
  };
}

/**
 * La page part en arrière-plan ou en veille : onglet caché, écran éteint, application quittée, page gelée par le navigateur.
 * Le rappel est joué une fois par départ, avant que la page ne soit suspendue.
 */
export function onPageSuspended(callback: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === "hidden") callback();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", callback);
  document.addEventListener("freeze", callback);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", callback);
    document.removeEventListener("freeze", callback);
  };
}
