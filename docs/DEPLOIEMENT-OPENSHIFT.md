# Déploiement de Portail Math vers OpenShift

Ce document décrit la préparation du déploiement de **Mbuyamba Maths RDC** vers
le projet OpenShift de développement. Il ne contient aucun secret et aucune
commande de déploiement n’a été exécutée pendant la préparation du pipeline.

## Architecture du pipeline

Le workflow [`.github/workflows/ci-cd-openshift.yml`](../.github/workflows/ci-cd-openshift.yml)
contient deux jobs.

### `ci`

Ce job :

1. récupère le dépôt ;
2. configure Java 21 ;
3. valide le Gradle Wrapper ;
4. exécute `./gradlew clean test bootJar --no-daemon` ;
5. vérifie qu’un seul JAR exécutable, hors JAR `plain`, a été produit ;
6. publie ce JAR sous l’artefact `portail-math-jar` ;
7. publie les rapports de tests sous l’artefact
   `portail-math-test-reports`.

Les artefacts sont conservés pendant sept jours.

### `deploy-openshift`

Ce job dépend du succès de `ci`. Il télécharge exactement le JAR validé, le
renomme `app.jar`, applique les manifestes, lance un build binaire OpenShift,
redémarre le Deployment, attend le rollout puis vérifie la santé et les pages
publiques.

Le build OpenShift ne compile pas l’application. Il place le JAR déjà validé
dans une image d’exécution
`registry.access.redhat.com/ubi9/openjdk-21-runtime:latest`. Cette image est
prévue pour Java 21, ne contient ni Gradle ni compilateur et fonctionne avec un
utilisateur non-root.

Pour ce MVP, la mise à jour utilise l’approche explicite :

```bash
oc rollout restart deployment/portail-math
oc rollout status deployment/portail-math --timeout=300s
```

Cette approche rend chaque déploiement observable et force le nouveau pod à
tirer le tag `portail-math:latest`.

## Déclencheurs

| Événement | Job `ci` | Job `deploy-openshift` |
| --- | --- | --- |
| Pull request vers `main` | Oui | Non |
| Push sur `main` | Oui | Oui |
| Lancement manuel | Oui | Oui |

Une pull request ne peut donc ni lire les secrets OpenShift ni déployer.
Le workflow n’utilise pas `pull_request_target`.

La concurrence du job de déploiement est limitée par le groupe
`portail-math-openshift-dev`. Un nouveau déploiement annule le précédent s’il
est encore en cours.

## Ressources OpenShift

Les manifestes du dossier [`openshift`](../openshift) créent ou mettent à jour
les ressources suivantes :

| Fichier | Ressource | Nom |
| --- | --- | --- |
| `imagestream.yml` | ImageStream | `portail-math` |
| `buildconfig.yml` | BuildConfig binaire | `portail-math` |
| `deployment.yml` | Deployment | `portail-math` |
| `service.yml` | Service ClusterIP | `portail-math` |
| `route.yml` | Route TLS edge | `portail` |

Le BuildConfig reçoit uniquement `.openshift-build/app.jar` et publie l’image
dans `portail-math:latest`.

Le Deployment utilise un replica, le port `8080`, des ressources initiales et
les probes :

```text
/actuator/health/liveness
/actuator/health/readiness
```

Le profil `SPRING_PROFILES_ACTIVE=openshift` n’est pas défini, car aucun profil
Spring `openshift` distinct n’existe actuellement. La variable `PORT=8080` est
configurée.

Les labels `app=portail-math` sont identiques sur le Deployment, les pods et le
sélecteur du Service. La Route `portail` cible le port nommé `http` du Service
`portail-math`.

## Configuration GitHub à réaliser manuellement

Dans le dépôt `kadt2022/portail-math`, créer l’environnement GitHub :

```text
openshift-dev
```

Ajouter ensuite le secret suivant à cet environnement :

| Type | Nom | Valeur |
| --- | --- | --- |
| Secret | `OPENSHIFT_TOKEN` | Jeton OpenShift limité au projet de développement |

Ajouter les variables suivantes :

| Nom | Valeur |
| --- | --- |
| `OPENSHIFT_SERVER` | `https://api.rm3.7wse.p1.openshiftapps.com:6443` |
| `OPENSHIFT_NAMESPACE` | `djtm-kb-dev` |
| `OPENSHIFT_ROUTE_HOST` | `portail-mbuyamba.apps.rm3.7wse.p1.openshiftapps.com` |

Le jeton ne doit jamais être copié dans un fichier, un manifeste, une issue ou
un message de log. Le workflow le lit uniquement par
`secrets.OPENSHIFT_TOKEN`.

Il est recommandé d’ajouter une règle d’approbation à l’environnement
`openshift-dev` avant d’autoriser les premiers déploiements.

## Premier lancement manuel

Après vérification et fusion des fichiers :

1. ouvrir le dépôt GitHub ;
2. ouvrir l’onglet **Actions** ;
3. sélectionner **CI/CD OpenShift** ;
4. choisir **Run workflow** ;
5. sélectionner la branche `main` ;
6. lancer le workflow ;
7. suivre d’abord le job **Tests et construction** ;
8. approuver l’environnement si une protection a été configurée ;
9. suivre le job **Déploiement OpenShift dev**.

Le nom du build OpenShift apparaît dans les logs de l’étape
**Construire l’image depuis le JAR validé**.

## Vérifications automatiques

Après le rollout, le workflow affiche :

```bash
oc get deployment portail-math
oc get pods -l app=portail-math
oc get service portail-math
oc get route portail
```

Il tente ensuite jusqu’à douze fois, avec dix secondes entre les tentatives,
d’obtenir :

```text
GET https://portail-mbuyamba.apps.rm3.7wse.p1.openshiftapps.com/actuator/health
HTTP 200
{"status":"UP"}
```

Il vérifie enfin que `/` et `/exetat` répondent avec le statut HTTP `200`.

## Lire les logs et retrouver la Route

Dans GitHub, ouvrir l’exécution du workflow puis développer l’étape concernée.
Les deux artefacts sont téléchargeables depuis la page de l’exécution.

Depuis un terminal déjà authentifié manuellement sur le bon projet :

```bash
oc get pods
oc logs deployment/portail-math
oc describe pod <pod>
oc get builds
oc logs build/<nom-du-build>
oc rollout status deployment/portail-math
oc get route portail
```

La Route attendue est :

```text
https://portail-mbuyamba.apps.rm3.7wse.p1.openshiftapps.com
```

## Relancer un déploiement

La méthode normale consiste à relancer **CI/CD OpenShift** depuis l’onglet
**Actions**. Le workflow reconstruit et revalide le JAR avant tout déploiement.

Pour relancer seulement un pod après un diagnostic, un opérateur déjà connecté
au bon projet peut utiliser :

```bash
oc rollout restart deployment/portail-math
oc rollout status deployment/portail-math --timeout=300s
```

## Diagnostiquer un pod non prêt

1. afficher les pods et repérer celui de `portail-math` ;
2. lire ses événements et l’état des probes ;
3. lire les logs applicatifs ;
4. vérifier que l’image `portail-math:latest` existe ;
5. vérifier les limites mémoire et CPU ;
6. contrôler les endpoints de santé.

Commandes utiles :

```bash
oc get pods -l app=portail-math
oc describe pod <pod>
oc logs <pod>
oc get imagestream portail-math
oc get builds
oc logs build/<nom-du-build>
```

Un échec de startup probe laisse jusqu’à 150 secondes à l’application pour
démarrer. La readiness probe empêche le Service d’envoyer du trafic tant que
l’application n’est pas prête.

## Révoquer et remplacer le token

En cas d’expiration, de fuite supposée ou de changement de droits :

1. révoquer le jeton dans OpenShift selon la procédure de l’organisation ;
2. générer un nouveau jeton limité au projet `djtm-kb-dev` ;
3. remplacer uniquement la valeur du secret `OPENSHIFT_TOKEN` dans
   l’environnement GitHub `openshift-dev` ;
4. relancer manuellement le workflow ;
5. vérifier la connexion et le rollout ;
6. confirmer que l’ancien jeton ne fonctionne plus.

Ne jamais enregistrer le nouveau jeton dans le dépôt.

## Idempotence et sécurité

Le pipeline utilise `oc apply` sans suppression préalable. Les lancements
suivants mettent à jour les mêmes ressources nommées et ne créent pas de
doublons.

Les permissions GitHub sont limitées à :

```yaml
permissions:
  contents: read
```

Aucun mot de passe, token ou secret n’est présent dans le workflow, les
manifestes ou cette documentation.
