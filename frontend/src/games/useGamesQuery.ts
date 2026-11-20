import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Recherche de la page Jeux, partagée par l'adresse (?q=) entre la grande barre de l'en-tête et la recherche du téléphone.
// Chaque champ garde sa propre valeur pour la saisie (une frappe rapide ne perd jamais de lettre, même si le routeur met l'adresse à
// jour un peu plus tard) ; il ne reprend la valeur de l'adresse que lorsqu'elle vient d'ailleurs (l'autre champ, un lien, « Mes jeux »).
export function useGamesQuery(): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const urlValue = params.get("q") ?? "";
  const [value, setValue] = useState(urlValue);
  const [seenUrl, setSeenUrl] = useState(urlValue);
  // Valeurs écrites par ce champ et pas encore revenues dans l'adresse.
  const [pending, setPending] = useState<string[]>([]);

  if (urlValue !== seenUrl) {
    setSeenUrl(urlValue);
    const index = pending.indexOf(urlValue);
    if (index >= 0) {
      setPending(pending.slice(index + 1));
    } else {
      setPending([]);
      setValue(urlValue);
    }
  }

  const update = useCallback(
    (next: string) => {
      setValue(next);
      setPending((list) => [...list, next]);
      setParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (next) params.set("q", next);
          else params.delete("q");
          return params;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [value, update];
}
