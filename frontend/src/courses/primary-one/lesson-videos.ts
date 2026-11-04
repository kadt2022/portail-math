import memeOuDifferent from "../../assets/videos/yamba-1p-u01-l01-meme-ou-different.mp4";
import triCouleurForme from "../../assets/videos/yamba-1p-u01-l02-tri-couleur-forme.mp4";

// Vidéos d'introduction affichées dans l'étape « Je découvre », par identifiant
// de leçon. Une leçon absente de cette table n'affiche aucune vidéo.
export const LESSON_VIDEOS: Readonly<Record<string, string>> = {
  "MATH-1P-U01-L01": memeOuDifferent,
  "MATH-1P-U01-L02": triCouleurForme,
};
