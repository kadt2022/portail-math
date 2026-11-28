# Turbo Pulse 3D — étape 1 : le vaisseau

Le vaisseau est l'actif central et réutilisable du futur jeu. Cette étape ne contient **ni obstacle, ni pilotage, ni calcul** : seulement le vaisseau, son hangar de présentation et un atelier minimal. Page cachée (hors catalogue) : `/jeux/turbo-pulse-3d` (`?debug` affiche les mesures, `?light` coupe les ombres).

## B. Proposition technique

| Option | Verdict |
|---|---|
| Image fixe | Pas de rotation, pas de variantes : écartée. |
| Calques 2D / 2.5D | Bon pour un jeu de côté, mais le vaisseau doit se voir sous tous les angles : écartée. |
| Pseudo-3D (sprites pré-rendus) | Une image par angle et par variante : lourd, peu modifiable. |
| **3D réelle avec Babylon.js 9 (WebGL)** | **Retenue.** Même moteur que le Train des multiplications et la Rivière des fractions. Un vaisseau ≈ 4 300 triangles, 22 maillages. |

Rendu « jouet laqué » : matériaux PBR avec vernis (clearCoat), reflets d'un ciel fabriqué sur place (sonde de réflexion, aucun fichier téléchargé), ombre sur le socle. WebGPU : option ultérieure, non testable ici.

## Organisation des parties

`ShipSpec` (palette, ailes, moteurs, bouclier) décrit le vaisseau ; `buildPart(part, spec)` fabrique la géométrie de chaque partie :

`hull` (fuselage, nez rouge, entrées d'air, aération) · `cockpit` (dôme, siège) · `wings` (delta, grandes) · `engines` (jumeaux, trio) · `tail` (double dérive) · `gear` (coussin lumineux : le vaisseau flotte) · `shield` (bulle).

- Un seul maillage par matériau et par partie (peu d'appels de dessin).
- Changer de couleurs ne reconstruit rien (seuls les matériaux changent) ; changer d'ailes ou de moteurs ne reconstruit que cette partie.
- Géométrie pure (`src/ship/`, sans Babylon, testée) séparée de la scène (`src/scene/`) et de l'interface (`src/ui/`).
- Repère : x droite, y haut, z avant (nez en +z).

## C. Atelier (proposition simple)

Le vaisseau tourne doucement sur un socle de hangar. En bas, cinq pièces : **Cockpit · Ailes · Moteurs · Bouclier · Couleurs**. Toucher une pièce cadre la caméra dessus et propose 2–4 choix (puces à grande zone tactile). Aujourd'hui : ailes (2), moteurs (2), bouclier (oui/non), couleurs (4). Le cockpit est cadré mais pas encore modifiable. Plus tard : débloquer des pièces avec les victoires, sauvegarder la fiche.

## Hors périmètre (volontairement)

Gameplay, obstacles-sphères, pilotage, calculs, sons, progression, entrée au catalogue.

---

# Étape 2 — Pilotage et premiers obstacles

Page cachée : `/jeux/turbo-pulse-3d` (l'atelier est passé à `/jeux/turbo-pulse-3d/atelier`). Réglages d'essai dans l'adresse : `?debug` (images/s, appels de dessin, boules actives), `?light` (rendu allégé), `?distance=200` (trajet court), `?fixed` (résolution fixe).

**Commandes.** Clavier : flèches ou ZQSD/WASD (position physique des touches, donc AZERTY et QWERTY), Espace = accélérer, Maj = ralentir. Tactile : joystick à gauche (zone morte, réponse progressive), boutons « Accélérer » et « Ralentir » à droite (maintenus au doigt).

**Organisation.**
- `src/flight/flightModel.ts` — logique pure, testée : dynamique du vaisseau (lissage exponentiel, bords de la boîte de jeu, roulis/tangage/lacet déduits des vitesses), tas de 40 boules recyclées, collisions sphère/boîtes, distance restante, arrivée.
- `src/flight/flightEngine.ts` — assemble le modèle et la scène Babylon.js ; `space.ts` (ciel, étoiles, planète, 150 traînées de poussière, éclairage), `orbs.ts`, `station.ts`, `impactFx.ts`, `audio.ts`.
- `src/ui/` — `FlightGame` (HUD, écrans de départ et d'arrivée), `Joystick`, `controls` (regroupe clavier, joystick, boutons).

**Principe.** Le vaisseau reste à l'origine ; le monde vient vers lui. Caméra de suivi derrière (16 en arrière, 3,6 au-dessus), champ horizontal fixe, pour voir loin et garder le vaisseau à environ un tiers de la largeur.

**Boules.** Cinq modèles (un maillage + un matériau PBR vernis chacun) ; les 40 boules sont des instances qui partagent géométrie et matériau. Elles naissent à ~170 m, grossissent en fondu, filent vers le vaisseau, et sont rendues au tas en sortant (z < −16). Plus aucune boule dans les 150 derniers mètres. Un choc : gerbe d'étincelles et anneau de la couleur de la boule, tremblement de caméra, éclat rouge à l'écran, son synthétisé, vaisseau ralenti et protégé ~1 s (clignote). Ni score, ni calcul, ni tir.

**Destination.** Station « Orion » (provisoire) à 1 000 m : anneau-porte, moyeu, balises vertes, cœur lumineux visible de loin. Distance restante et barre de progression en haut ; à 24 m, le vaisseau s'arrête et l'écran d'arrivée propose de rejouer.

**Performances.** Mode `light` : 41 appels de dessin mesurés (87 en mode complet avec halo, en rendu logiciel), sans halo, boules à 12 segments, moins d'étoiles. Résolution adaptative : si l'image tombe sous ~42 i/s pendant 1,5 s, la résolution baisse par paliers (le halo est coupé au-delà) ; elle remonte si tout va bien. Aucune création d'objet pendant le jeu.

**Limites connues.** Les fréquences d'images n'ont été mesurées qu'en rendu logiciel (SwiftShader), pas sur un vrai GPU ni sur mobile. Le son n'a pas pu être écouté ici.
