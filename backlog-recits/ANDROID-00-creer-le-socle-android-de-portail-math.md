# ANDROID-00 — Créer le socle Android de Portail-Math

## Contexte constaté dans le dépôt

Le monorepo contient le backend Spring Boot à sa racine et l'application React/Vite dans `frontend`. Le build web Vite est produit dans `frontend/dist` puis intégré au JAR sous `/app` par le build Gradle existant.

Le socle Android doit réutiliser cette application React sans réécrire le tableau de bord, les jeux ou le backend. Le build Android utilise toutefois des URL de ressources relatives et un routeur servi à la racine de la WebView, tandis que le déploiement web existant doit continuer à utiliser `/app`.

## User story

**En tant que développeur de Portail-Math,**  
je veux disposer d'un projet Android Capacitor généré depuis l'application React existante,  
afin d'ouvrir, compiler et exécuter Portail-Math dans Android Studio et sur un téléphone Android.

## Critères d'acceptation

1. `@capacitor/core`, `@capacitor/cli` et `@capacitor/android` sont installés dans `frontend` et verrouillés dans `package-lock.json`.
2. Capacitor est configuré avec le nom `Portail-Math`, l'identifiant `com.portailmath.app` et `webDir: "dist"`.
3. Le projet natif est généré sous `frontend/android` et son `applicationId` vaut `com.portailmath.app`.
4. Le build web historique conserve sa base `/app/` pour Spring Boot et OpenShift.
5. Un build Android dédié génère des ressources relatives et le routeur React fonctionne à la racine de la WebView Capacitor.
6. Des scripts npm permettent de construire le frontend Android, synchroniser le projet natif et ouvrir Android Studio.
7. `npm run build`, `npm run android:sync` et la validation Gradle du projet Android réussissent.
8. Les commandes Windows de génération, synchronisation, compilation et installation sont documentées.
9. Le tableau de bord, les règles des jeux, le backend Spring Boot et le déploiement OpenShift ne sont pas réécrits dans ce récit.
10. Les ressources statiques des jeux historiques sont embarquées dans l'APK et leurs liens de retour sont adaptés à la racine de la WebView.
11. Les appels natifs sont limités à `/api/v1/exetat/**`, utilisent une origine HTTPS configurable et n'embarquent aucun secret.
12. Le portail web conserve ses appels API relatifs actuels et n'utilise pas le client HTTP natif.

## Hors périmètre

- publier l'application sur Google Play ;
- configurer la signature d'une version de production ;
- remplacer les API Spring Boot ou leur déploiement ;
- adapter dans ce récit tous les jeux historiques servis par Spring Boot ;
- modifier le design ou les contenus pédagogiques du portail.

## Définition de terminé

Le récit est terminé lorsque `frontend/android` peut être ouvert dans Android Studio, que les ressources React sont synchronisées, que Gradle reconnaît et compile le projet, et que les commandes Windows nécessaires sont reproductibles depuis un clone du dépôt.
