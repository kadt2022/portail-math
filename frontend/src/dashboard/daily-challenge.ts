// Le defi du jour est calcule a partir de la date seule : tous les enfants
// voient le meme calcul le meme jour, il change a minuit, et rien n'est
// stocke ni envoye au serveur. Aucun score n'est compte : c'est un appat
// ludique sur le tableau de bord, pas une evaluation.

export type ChallengeOperator = "+" | "-" | "x";

export interface DailyChallenge {
  left: number;
  right: number;
  operator: ChallengeOperator;
  answer: number;
}

// Melange les chiffres de la date pour que deux jours voisins ne donnent pas
// deux calculs voisins : sans ce brassage, le 12 et le 13 partageraient
// operateur et premier operande.
function shuffledSeed(date: Date): number {
  const day = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return Math.imul(day, 2654435761) >>> 0;
}

export function challengeOfDay(date: Date): DailyChallenge {
  const seed = shuffledSeed(date);
  const first = 2 + ((seed >>> 4) % 9);
  const second = 2 + ((seed >>> 13) % 9);

  if (seed % 3 === 0) {
    return { left: first, right: second, operator: "x", answer: first * second };
  }

  if (seed % 3 === 1) {
    const left = 12 + ((seed >>> 20) % 48);
    return { left, right: second * 3, operator: "+", answer: left + second * 3 };
  }

  // Soustraction : le plus grand d'abord, avec un ecart d'au moins 1, pour ne
  // jamais afficher de nombre negatif ni de resultat nul a des enfants du
  // primaire.
  const big = 20 + ((seed >>> 20) % 40);
  const small = 1 + (first % (big - 1));
  return { left: big, right: small, operator: "-", answer: big - small };
}
