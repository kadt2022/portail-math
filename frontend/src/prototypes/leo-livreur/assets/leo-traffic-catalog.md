# Catalogue du trafic Léo (LEO-TRAFFIC-02)

Source de vérité : `leoVehicleCatalog.ts`. Les dimensions viennent d'une
**échelle commune** : la voiture de Léo (rapport 1, 132 px affichés) sert de
référence, chaque véhicule est défini par un rapport de longueur. Une seule
échelle uniforme par illustration : aucune déformation.

| Véhicule | Fichier | Longueur / Léo | Longueur affichée | Profils |
| --- | --- | ---: | ---: | --- |
| Léo | `leo-car-right/left.webp` | 1,00 | 132 px | joueur |
| Compacte verte | `leo-traffic-compact-green-v1.webp` | 1,20 | 158 px | normal, rapide |
| Familiale bleue | `leo-traffic-family-blue-v1.webp` | 1,40 | 185 px | lent, normal |
| Berline grise | `leo-traffic-sedan-gray-v1.webp` | 1,50 | 198 px | normal, rapide |
| Taxi | `leo-traffic-taxi-v1.webp` | 1,38 | 182 px | normal, rapide |
| Minibus | `leo-traffic-minibus-v1.webp` | 1,80 | 238 px | lent, normal |
| Bus scolaire | `leo-traffic-school-bus-v1.webp` | 2,40 | 317 px | lent |
| Autobus urbain | `leo-traffic-city-bus-v1.webp` | 3,00 | 396 px | lent, normal |

Vitesses du trafic (px/s) : lent 215-265, normal 300-375, rapide 415-475.
Ces paliers représentent environ +25 % par rapport à la première calibration,
tout en conservant un écart net entre les profils. Les bus scolaires utilisent
uniquement `slow`, les autobus/minibus `slow` ou `normal`, les voitures
particulières des profils variables, et les taxis `normal` ou `fast`.

## Géométrie de la chaussée

L'asphalte entre les lignes blanches de `leo-road-straight-v1.png` (181 px source)
est mis à l'échelle uniforme pour valoir `ROAD_WIDTH` = 200 px : deux voies de
100 px. Le point logique d'un véhicule est le **centre de son empreinte au sol**,
donc le centre de la voie ; les pneus touchent le bord de l'empreinte
(`profondeur / 2` sous le centre) et la carrosserie s'élève au-dessus. Marge
visible entre les pneus et la bordure comme la ligne centrale : plus de 30 px.

## Roues

Les roues sont celles des illustrations. Pour chacune, un disque circulaire
(86 % du rayon détecté) est découpé au chargement dans la même texture
(technique du masque) et pivote exactement sur la roue d'origine : angle =
distance parcourue / rayon de roulement, signe selon le sens de marche, immobile
à vitesse nulle. Aucun pneu n'est ajouté. Les mesures (boîte, roues) sont dans
le catalogue, relevées sur les sprites.

## Trafic

`leoTraffic.ts` : pool fixe de 12 véhicules réaffectés (jamais créés ni détruits
pendant la partie), deux sens (voie de Léo vers l'est, voie opposée vers
l'ouest), apparition hors de la zone visible, suivi du véhicule de devant
(Léo compris), recyclage hors écran, densité adaptée à la largeur d'écran et à la
fluidité mesurée (`DensityGovernor`). Pas de dépassement entre véhicules du
trafic ; Léo ne traverse aucun véhicule mais peut le contourner.

## Occupants (LEO-TRAFFIC-03, illustrations de Crochet)

Le taxi et le bus scolaire utilisent les versions habitées `leo-traffic-taxi-occupied-v1.webp` et
`leo-traffic-school-bus-occupied-v1.webp` (chauffeurs et passagers d apparences variées derrière les
vitres). Carrosserie et roues sont identiques aux versions vides (centres de jante revérifiés, écart
de moins de 1,3 px) : le catalogue ne change que la boîte englobante. Compacte, familiale, berline,
minibus et autobus urbain attendent encore leur version habitée.
