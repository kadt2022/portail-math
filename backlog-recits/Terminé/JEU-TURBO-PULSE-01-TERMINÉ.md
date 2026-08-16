# JEU-TURBO-PULSE-01 — Intégration et réalisation professionnelle de Turbo Pulse

## Statut
À développer à partir de la maquette fonctionnelle validée.

## Nom du jeu

**Turbo Pulse**

Sous-titre utilisateur :

**Turbo Pulse — Défi de calcul**

## Objectif

Intégrer dans Portail-Math le jeu éducatif **Turbo Pulse** à partir de la maquette HTML fournie.

La maquette constitue la **référence fonctionnelle du gameplay**. Elle contient déjà les règles validées du jeu.

L'objectif de ce récit n'est donc pas de réinventer le gameplay, mais de :

- reprendre fidèlement sa logique ;
- l'intégrer proprement dans l'architecture React existante de Portail-Math ;
- utiliser Phaser pour la scène interactive ;
- créer un décor original, moderne et de qualité professionnelle ;
- produire une expérience particulièrement soignée sur téléphone, tablette et ordinateur.

---

# 1. Principe du jeu

Turbo Pulse est un jeu de calcul mental, de visée et de stratégie.

Un piston/canon affiche une opération, par exemple :

`2 + 3`

Des fruits portant différentes valeurs se déplacent vers la ligne de défense.

Plusieurs fruits peuvent porter la bonne réponse.

Exemple :

`🍅 rouge 5`  
`🥑 vert 5`  
`🍅 rouge 7`  
`🍎 rouge 9`  
`🥑 vert 8`

Pour l'opération :

`2 + 3`

les deux fruits portant `5` sont des cibles valides.

Le joueur choisit alors stratégiquement lequel détruire.

S'il touche le `5` rouge :

**tous les fruits rouges actuellement présents sont détruits.**

S'il touche le `5` vert :

**tous les fruits verts actuellement présents sont détruits.**

Le calcul détermine donc les cibles autorisées et le choix de la couleur détermine l'effet de la réaction en chaîne.

---

# 2. Règle fondamentale des fruits

Chaque fruit possède au minimum :

`famille + couleur + valeur`

Exemples :

`tomate + rouge + 5`  
`tomate + rouge + 7`  
`avocat + vert + 5`

Une même combinaison :

`famille + couleur + valeur`

ne doit jamais être présente deux fois simultanément.

Ainsi :

`tomate rouge 5 + tomate rouge 5`

est interdit.

En revanche :

`tomate rouge 5 + avocat vert 5`

est autorisé et même souhaitable, puisqu'il offre un choix stratégique au joueur.

Les fruits d'une même couleur peuvent avoir des familles et des valeurs différentes.

---

# 3. Destruction et combos

Une bonne réponse détruit toujours le fruit touché.

Si d'autres fruits de la **même couleur** sont présents, ils sont également détruits, quelles que soient leur famille et leur valeur.

Exemple :

`tomate rouge 5`  
`tomate rouge 9`  
`pomme rouge 14`  
`avocat vert 5`

Le calcul donne `2 + 3`.

Si le joueur détruit la tomate rouge `5` :

les trois fruits rouges explosent.

L'avocat vert `5` reste intact.

Si un seul fruit de cette couleur est présent, seul ce fruit est détruit.

Une mauvaise valeur ne déclenche jamais de combo.

---

# 4. Le piston

Le piston est l'élément central du jeu.

Il doit pivoter sur environ **180 degrés** afin de permettre au joueur de viser :

`droite → haut → gauche`

Un fruit ayant dépassé le piston doit donc encore pouvoir être rattrapé avant de franchir la ligne de défense.

Le calcul courant doit être très visible :

- dans l'interface du jeu ;
- directement sur le piston ;
- directement sur le projectile tiré.

La réponse ne doit jamais être affichée avant que l'enfant ait résolu l'opération.

---

# 5. Ligne de défense et échec

Une ligne de défense clairement identifiable existe derrière le piston.

Dépasser le piston n'est pas encore une faute.

L'intrusion n'est comptabilisée que lorsque le fruit a **entièrement franchi la ligne de défense**.

Le nombre maximal d'intrusions autorisées dépend du niveau :

| Niveau | Limite |
|---|---:|
| 1 — Découverte | 5 |
| 2 — Low | 5 |
| 3 — Medium Low | 4 |
| 4 — Medium | 4 |
| 5 — High | 3 |
| 6 — X High | 2 |
| 7 — Ultra High | 1 |

L'interface affiche clairement le compteur, par exemple :

`🛡️ 2 / 4`

Une mauvaise réponse mathématique ne retire pas directement une vie.

La conséquence naturelle d'un mauvais tir est la perte de temps pendant que les fruits continuent à avancer.

---

# 6. Message d'échec

Le message doit expliquer précisément pourquoi le niveau a été échoué.

Exemple niveau 5 :

**💥 Niveau 5 échoué**

**3 fruits ont franchi la ligne de défense.**

Limite du niveau : **3**.

Bouton :

**Recommencer le niveau 5**

Pour Ultra High :

**💥 Ultra High échoué**

**1 fruit a franchi la ligne de défense.**

À ce niveau, aucune intrusion n'est autorisée.

---

# 7. Tentatives des niveaux experts

Les niveaux 1 à 5 peuvent être recommencés sans retourner au début du parcours.

Les niveaux 6 et 7 constituent le mode expert.

Chaque niveau expert possède **3 tentatives indépendantes**.

Premier ou deuxième échec :

**Tentative 2 sur 3**  
ou  
**Tentative 3 sur 3**

Bouton :

**Réessayer le niveau 6**

ou :

**Réessayer le niveau 7**

Au troisième échec du même niveau expert :

**3 tentatives terminées.**

Le joueur revient au **niveau 1**.

La réussite du niveau 6 réinitialise le compteur pour le niveau 7 : le niveau 7 possède ses propres trois tentatives.

---

# 8. Progression sur 7 niveaux

La difficulté augmente sur trois dimensions :

1. cadence d'arrivée des fruits ;
2. nombre de fruits par arrivée ;
3. complexité des calculs.

### Niveau 1 — Découverte

Arrivée :

`1 fruit toutes les 5,0 à 6,5 secondes`

Mathématiques :

petites additions jusqu'à 10.

Exemples :

`2 + 3`  
`4 + 2`  
`1 + 6`

Le niveau doit être volontairement calme et rassurant.

### Niveau 2 — Low

Arrivée :

`1 à 2 fruits toutes les 4,0 à 5,2 secondes`

Mathématiques :

additions à un chiffre.

### Niveau 3 — Medium Low

Arrivée :

`1 à 2 fruits toutes les 3,0 à 4,0 secondes`

Mathématiques :

additions et soustractions simples.

### Niveau 4 — Medium

Arrivée :

`2 fruits toutes les 2,2 à 3,0 secondes`

Mathématiques :

additions et soustractions avec nombres plus importants.

### Niveau 5 — High

Arrivée :

`2 à 3 fruits toutes les 1,5 à 2,2 secondes`

Mathématiques :

additions, soustractions et premières multiplications.

### Niveau 6 — X High

Arrivée :

`3 à 4 fruits toutes les 0,75 à 1,05 seconde`

Mathématiques avancées.

Exemples :

`26 + 19`  
`96 − 18`  
`7 × 8`

Ce niveau doit représenter un véritable défi expert.

### Niveau 7 — Ultra High

Arrivée :

`4 à 5 fruits toutes les 0,42 à 0,65 seconde`

Mathématiques avancées jusqu'à environ 200.

Exemples :

`5 × 20`  
`83 + 47`  
`146 − 58`

Ultra High doit être extrêmement difficile mais rester mathématiquement et mécaniquement juste.

---

# 9. Fin d'un niveau

Un niveau ne doit jamais se terminer brutalement après le dernier calcul requis.

Après **12 calculs correctement résolus** :

1. les nouvelles arrivées s'arrêtent immédiatement ;
2. les fruits déjà présents restent dans la scène ;
3. le joueur doit tous les détruire ;
4. les calculs continuent à être générés en fonction des fruits restants ;
5. le niveau n'est validé que lorsque le dernier fruit a réellement été détruit.

Le dernier tir doit être entièrement visible.

Séquence obligatoire :

`dernier fruit touché`

→ `explosion complète`

→ `écran nettoyé`

→ **attendre environ 1 seconde**

→ afficher le panneau de réussite.

Le panneau propose ensuite :

**Niveau suivant ▶**

Le jeu ne doit jamais changer automatiquement de niveau sans intervention du joueur.

---

# 10. Réalisation visuelle

La maquette fournie valide la mécanique, **pas la qualité graphique finale**.

Créer une réalisation visuelle originale et nettement plus professionnelle.

Le jeu doit donner l'impression d'un véritable jeu éducatif moderne et non d'un exercice scolaire décoré.

Créer notamment :

- un décor riche avec profondeur ;
- un piston/canon original et animé ;
- des projectiles visuellement satisfaisants ;
- des fruits parfaitement lisibles ;
- des couleurs de groupes immédiatement identifiables ;
- des explosions et réactions en chaîne spectaculaires mais adaptées aux enfants ;
- des particules ;
- des animations de combo ;
- des transitions de niveaux ;
- des effets visuels particuliers pour X High et Ultra High ;
- une ligne de défense intégrée naturellement au décor ;
- une interface moderne pour score, progression, niveau et défense.

Ne reprendre aucun design extérieur existant.

La direction artistique doit être propre à **Turbo Pulse / Portail-Math**.

---

# 11. Son

Ajouter une identité sonore propre au jeu.

Prévoir notamment :

tir du piston ; impact incorrect ; destruction simple ; combo ×2 ; combo ×3 ; gros combo ; passage de niveau ; intrusion ; échec ; victoire finale.

Les sons doivent renforcer le plaisir sans être agressifs ni fatigants.

Prévoir la possibilité de couper les sons.

---

# 12. Architecture technique

La maquette HTML fournie est la **source de vérité fonctionnelle**.

Ne pas intégrer le fichier HTML monolithique tel quel dans l'application finale.

Implémenter le jeu conformément à l'architecture existante de Portail-Math :

**React pour l'intégration applicative.**

**Phaser 3 pour la scène et le moteur du jeu.**

React gère notamment la page, la navigation, l'entrée/sortie du jeu et l'intégration au portail.

Phaser gère notamment :

objets, mouvements, piston, projectiles, collisions, réactions en chaîne, particules, animations, sons et boucle de jeu.

Ne pas modifier les règles validées de la maquette sans nécessité technique clairement signalée.

---

# 13. Mobile et responsive

Le jeu doit être conçu téléphone d'abord tout en restant excellent sur tablette et ordinateur.

Obligatoire :

- Pointer Events / tactile ;
- aucune commande dépendant uniquement du survol souris ;
- calculs toujours lisibles ;
- valeurs des fruits lisibles ;
- aucun bouton ou texte en dehors de l'écran ;
- aucun fruit inaccessible à cause du cadrage ;
- piston orientable correctement au doigt ;
- un seul canvas de jeu ;
- aucune duplication de scène après sortie puis retour dans le jeu.

Le mode paysage peut être privilégié lorsque nécessaire à la jouabilité.

---

# 14. Critères d'acceptation

- [ ] La maquette fournie est utilisée comme référence fonctionnelle.
- [ ] Turbo Pulse est intégré dans le frontend React existant.
- [ ] La scène interactive utilise Phaser 3.
- [ ] Le calcul apparaît dans l'interface, sur le piston et sur le projectile.
- [ ] La réponse n'est jamais révélée avant le tir correct.
- [ ] Plusieurs fruits peuvent porter la même bonne réponse.
- [ ] Le même triplet fruit + couleur + nombre ne peut jamais être dupliqué simultanément.
- [ ] Le joueur peut choisir entre plusieurs couleurs portant la bonne réponse.
- [ ] Une bonne cible détruit tous les fruits présents de la couleur choisie.
- [ ] Les autres couleurs restent intactes.
- [ ] Le piston peut viser sur environ 180°.
- [ ] La ligne de défense fonctionne.
- [ ] Les limites d'intrusion 5/5/4/4/3/2/1 sont respectées.
- [ ] Les niveaux 6 et 7 disposent chacun de 3 tentatives.
- [ ] Trois échecs sur le même niveau expert renvoient au niveau 1.
- [ ] Les 7 niveaux augmentent à la fois la cadence, le nombre d'arrivées et la difficulté mathématique.
- [ ] Après 12 calculs, les nouvelles arrivées cessent.
- [ ] Tous les fruits restants doivent réellement être détruits.
- [ ] La dernière explosion reste visible avant l'écran de réussite.
- [ ] Le panneau de niveau apparaît environ 1 seconde après le nettoyage complet.
- [ ] Le passage au niveau suivant nécessite une action sur le bouton.
- [ ] Les messages d'échec indiquent précisément le nombre d'intrusions et la limite.
- [ ] Le décor final est original, moderne et de qualité professionnelle.
- [ ] Le jeu est utilisable au tactile, à la souris et sur téléphone.
- [ ] Les règles de gameplay de la maquette ne sont pas réinventées.

---

# 15. Consigne de développement

Avant développement :

synchroniser `main` puis créer une branche dédiée à Turbo Pulse.

Éviter tout refactoring massif ou non nécessaire du frontend existant.

Tout nouveau code doit être testé.

La maquette jointe constitue le contrat fonctionnel du jeu. L'objectif principal de cette tâche est de **transformer ce prototype validé en une expérience Portail-Math professionnelle sans perdre les mécaniques qui ont déjà été validées**.
