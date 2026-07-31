# Mbuyamba Maths RDC

Portail éducatif de mathématiques réunissant un parcours de préparation à
l’EXETAT et un parcours d’apprentissage pour le primaire.

Le nom technique de l’application est `portail-math`. Sa classe principale est
`cd.portailmath.PortailMathApplication`.

## Prérequis

- Java 21

## Démarrer l’application

Sous Windows :

```powershell
.\gradlew.bat bootRun
```

Le portail est alors disponible sur `http://localhost:8080`.

## Vérifier et construire

```powershell
.\gradlew.bat clean test bootJar
```

Le JAR exécutable est produit dans `build/libs`.

## Déploiement OpenShift

Le pipeline GitHub Actions et les manifestes OpenShift sont décrits dans
[`docs/DEPLOIEMENT-OPENSHIFT.md`](docs/DEPLOIEMENT-OPENSHIFT.md).

## Santé de l’application

- `/actuator/health`
- `/actuator/health/liveness`
- `/actuator/health/readiness`

## Catalogue EXETAT

- `/exetat` : catalogue des matières
- `/exetat/matieres/cercle` : exemple de page matière
- `/exetat/matieres/cercle/entrainement` : aperçu d’une session
- `/api/v1/exetat/matieres` : catalogue public au format JSON
- `/api/v1/exetat/matieres/cercle/questions` : questions publiques sans réponses ni solutions
- `/progression` : résultats EXETAT enregistrés localement dans le navigateur

Les quatre banques JSON se trouvent dans `src/main/resources/content/exetat`.
Elles contiennent 20 questions validées au démarrage, soit cinq par matière.

Les résultats des quiz standards sont conservés dans `localStorage` sous la clé
`portailMath.exetat.progress.v1`. Une révision ciblée peut être créée depuis une
tentative terminée pour retravailler uniquement les questions échouées.
