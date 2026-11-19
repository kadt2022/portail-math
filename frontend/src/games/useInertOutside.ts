import { useEffect, type RefObject } from "react";

// Pendant la présentation plein écran (y compris le repli CSS), tout ce qui entoure le jeu devient inerte : ni focus clavier ni lecture
// d'écran derrière lui (en-tête, menu latéral, pied de page de l'application compris). On remonte du jeu jusqu'au <body> et on rend inertes
// les frères de chaque ancêtre : le jeu lui-même, et donc sa partie, ne sont jamais touchés ni remontés.
export function useInertOutside(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root) {
      return;
    }
    const changed: HTMLElement[] = [];
    let node: HTMLElement = root;
    while (node.parentElement) {
      const parent: HTMLElement = node.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && sibling instanceof HTMLElement && !sibling.hasAttribute("inert")) {
          sibling.setAttribute("inert", "");
          changed.push(sibling);
        }
      }
      node = parent;
    }
    // Le focus entre dans le jeu : sinon un élément devenu inerte le garderait en l'air.
    root.focus({ preventScroll: true });
    return () => {
      for (const element of changed) {
        element.removeAttribute("inert");
      }
    };
  }, [ref, enabled]);
}
