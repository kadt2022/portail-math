# Direction — La Grille magique (taquin mathématique)

`grille-magique-taquin-2.txt` est le prototype JSX fourni comme point de
départ **visuel et structurel uniquement** pour le récit
`backlog-recits/GRILLE-MAGIQUE-01-creer-le-taquin-mathematique.md`. Il n'a
jamais été intégré tel quel, et ne doit pas servir de base de code.

## Ce qui est repris

- l'idée générale de la mise en page : une grille 3×3 avec opérateurs et
  résultats fixes autour, une carte magique posée hors cadre, un panneau de
  statistiques (temps, score, coups, niveau) ;
- l'adjacence non diagonale de la grille (`NEIGHBORS`) et le principe de
  mélange par déplacements légaux successifs depuis une disposition résolue,
  qui garantit la résolvabilité par construction.

## Ce qui n'est délibérément pas repris

- **La règle de validation.** Le prototype compare la grille remplie à une
  disposition secrète mémorisée (`isRingSolved(tiles, solution.solved)`) pour
  savoir si la carte peut être posée, et ne recalcule jamais les égalités.
  Le récit interdit explicitement cette approche (CA-05 : « la validation ne
  compare jamais la position des tuiles avec une disposition secrète
  mémorisée ») : toute disposition qui respecte mathématiquement les
  opérations affichées doit être acceptée, pas seulement celle utilisée pour
  générer le niveau.
- **Le couplage révélation/pose.** Dans le prototype, la carte ne devient
  cliquable qu'une fois la grille jugée « résolue » selon la disposition
  secrète. Le récit sépare les deux actions (CA-03/CA-04) : la révélation est
  libre dès le début et n'affecte ni le statut ni le chronomètre ; seule la
  position de la case vide au centre conditionne la pose.
- **Le niveau Difficile / Expert.** Le prototype propose une troisième
  difficulté avec multiplication implicite ; ce récit ne couvre que Facile et
  Moyen (addition, puis addition et soustraction sans résultat négatif).
- **La dépendance `lucide-react`** (icônes) : absente du projet et non
  ajoutée pour ce récit — le portail n'a aujourd'hui aucune librairie
  d'icônes.
- **Les couleurs codées en dur et l'import de police Google Fonts distant** :
  remplacés par les variables de design déjà utilisées ailleurs dans
  `frontend/src/games` (`var(--pm-*)`), sans ressource chargée depuis un
  service externe.
- **Les cellules cliquables en `<div onClick>`** : remplacées par de vrais
  `<button>` accessibles au clavier (CA-11).
