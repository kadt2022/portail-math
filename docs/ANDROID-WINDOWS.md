# Android avec Capacitor sous Windows

Le projet Capacitor se trouve dans `frontend/android`. Il embarque le build de l'application React existante ; le backend Spring Boot et le déploiement OpenShift restent séparés et inchangés.

## Prérequis

- Node.js 24, conformément à `.nvmrc` et à `frontend/package.json` ;
- Java 21 ;
- Android Studio avec le SDK Android 36 ;
- un téléphone Android avec le débogage USB activé, ou un émulateur Android Studio.

## Installer les dépendances

Depuis la racine du dépôt :

```powershell
cd .\frontend
npm ci
```

`npx cap add android` sert uniquement à créer la plateforme la première fois. Le dossier `android` étant versionné, il ne faut pas rejouer cette commande après un clone normal.

## Construire et synchroniser Android

Après chaque modification du frontend :

```powershell
cd .\frontend
npm run android:sync
```

Cette commande produit un build Vite adapté à la WebView Android, embarque les ressources statiques du Train des multiplications et de la Rivière des fractions, puis copie les ressources et met à jour les plugins natifs. Le script web habituel reste disponible séparément :

```powershell
npm run build
```

## Ouvrir Android Studio

Depuis `frontend` :

```powershell
npm run android:open
```

On peut aussi cliquer sur **Open** dans Android Studio et sélectionner directement :

```text
D:\PROTAIL-ENSEIGNEMENT\portail-math\frontend\android
```

Attendre la fin de la synchronisation Gradle avant de lancer l'application.

## Vérifier avec Gradle

Depuis `frontend/android` :

```powershell
.\gradlew.bat tasks
.\gradlew.bat assembleDebug
```

L'APK de développement est alors créé sous `app\build\outputs\apk\debug`.

## Installer sur un téléphone

Activer les options développeur et le débogage USB, connecter le téléphone, puis accepter l'autorisation affichée sur l'appareil. Vérifier ensuite la connexion :

```powershell
adb devices
```

Dans Android Studio, sélectionner le téléphone dans la barre d'outils puis cliquer sur **Run**. Il est aussi possible d'installer la version de développement en ligne de commande depuis `frontend/android` :

```powershell
.\gradlew.bat installDebug
```

## Différence entre les builds web et Android

`npm run build` conserve la base `/app/` attendue par Spring Boot. `npm run build:android` utilise des chemins de ressources relatifs, puis `npm run android:sync` les copie dans le projet natif. Cette séparation évite de modifier le portail web ou son déploiement OpenShift.

Les parcours EXETAT utilisent uniquement l'origine HTTPS déclarée dans `VITE_EXETAT_API_BASE_URL` sous `.env.android`. Pour tester une autre origine sans modifier le fichier versionné, créer `frontend/.env.android.local` avec la même variable ; ce fichier local est ignoré par Git.

L'URL doit être une origine HTTPS sans chemin, paramètre, identifiant ni secret. Le client natif refuse les URL HTTP et les routes extérieures à `/api/v1/exetat/**`. Une connexion Internet reste nécessaire pour les quiz EXETAT, tandis que les trois jeux du catalogue sont embarqués dans l'APK.
