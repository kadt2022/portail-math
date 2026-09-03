// Le tableau de bord change de ton au fil de la journee : c'est ce qui lui
// donne l'air vivant sans dependre d'aucune donnee serveur ni progression
// enregistree. Fonction pure : l'heure est toujours fournie par l'appelant,
// jamais lue ici, pour rester testable.

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPartAt(date: Date): DayPart {
  const hour = date.getHours();
  if (hour < 12) {
    return "morning";
  }
  if (hour < 18) {
    return "afternoon";
  }
  return "evening";
}
