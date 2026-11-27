# Math Flow

Moteur commun (`@mbuyamba/math-flow`) de la famille Addi'Flow, Soustra'Flow, Multipli'Flow et Divi'Flow. Seul Multipli'Flow est développé.
Plan validé par le Capitaine Pi (branche `feat/math-flow`). Le moteur est du TypeScript pur : ni React, ni DOM, ni rendu.

## État

- **MF-01** : plateau immuable, couleurs des illustrations, alignements, suppression, permutation.
- **MF-02** : chemins, déplacement simultané des nombres, tuyau unique (un seul nombre à la fois).
- **MF-03** : opérations configurables, construction des expressions, solveur exhaustif, générateur à solution vérifiée par rejeu,
  niveaux, mélange de secours, indice, garde-fou optionnel contre les impasses.
- MF-04 à MF-07 : interface, animations, intégration (voir le plan).

## Règles du socle

- Une tuile imagée appartient à un groupe de couleur ; un alignement (≥ 3, horizontal ou vertical) se forme par couleur.
- Une permutation n'est acceptée que pour deux tuiles imagées voisines et seulement si elle produit un alignement touchant l'une d'elles.
- Jamais de déplacement vers une case vide, jamais de nombre permuté ou détruit. Ni chute ni remplissage : les cases libérées sont des chemins.

## Commandes

`npm test`, `npm run typecheck`, `npm run verify:isolation` (depuis ce dossier).
