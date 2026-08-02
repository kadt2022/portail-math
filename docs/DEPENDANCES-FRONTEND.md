# Dépendances frontend

Le Portail n’utilise aucun gestionnaire de paquets côté navigateur. Les
bibliothèques tierces sont téléchargées une fois, versionnées dans le dépôt et
servies depuis `src/main/resources/static/`.

**Le chargement depuis un CDN est interdit.** Le mode hors connexion et le
déploiement OpenShift ne doivent dépendre d’aucun service tiers.

---

## Phaser

| | |
|---|---|
| **Nom** | Phaser |
| **Version épinglée** | 3.90.0 |
| **Dépôt officiel** | https://github.com/phaserjs/phaser |
| **Fichier téléchargé** | https://github.com/phaserjs/phaser/releases/download/v3.90.0/phaser.min.js |
| **Destination** | `src/main/resources/static/js/vendor/phaser-3.90.0.min.js` |
| **Taille** | 1 196 122 octets (≈ 1,14 Mo) |
| **SHA-256** | `E92DDEF111BA42E92D316979C732311757093688EA1810591CB7AA2858EBA7A7` |
| **Licence** | MIT — copie conservée dans `static/js/vendor/LICENSE-phaser.txt` |
| **Date d’intégration** | 2 août 2026 |

Le numéro de version figure dans le **nom du fichier**. Une mise à jour doit
donc créer un nouveau fichier et modifier explicitement les balises `script`,
jamais remplacer silencieusement le contenu de l’existant.

### Vérifier l’empreinte

```powershell
Get-FileHash src\main\resources\static\js\vendor\phaser-3.90.0.min.js -Algorithm SHA256
```

```bash
sha256sum src/main/resources/static/js/vendor/phaser-3.90.0.min.js
```

L’empreinte doit correspondre exactement à celle du tableau ci-dessus. Toute
différence signifie que le fichier a été modifié ou re-téléchargé depuis une
autre source : il faut alors le remplacer par la version officielle.

### Périmètre d’usage

Phaser ne gère que la scène interactive du jeu. Les questions, les options de
réponse, la correction et la navigation restent des éléments HTML produits par
Thymeleaf — voir le §4.1 du cahier des charges de La Rivière des fractions.

### Poids et mode hors connexion

Phaser représente à lui seul plus de trois fois le poids de tout le reste du
Portail. Ce coût n’est acceptable que si le fichier est mis en cache
durablement côté navigateur : la mise en place de la PWA et du service worker
conditionne donc l’usage de Phaser sur les connexions facturées au mégaoctet.
