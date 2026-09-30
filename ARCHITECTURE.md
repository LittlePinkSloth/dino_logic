# Architecture Little Pink Sloth

## 1. Architecture générale

Little Pink Sloth est une PWA unique, servie en HTTPS par GitHub Pages. Le launcher, le registre et tous les jeux sont dans ce dépôt et sous le même périmètre de service worker. Un jeu n'est pas une PWA séparée. `index.html` est le launcher ; les jeux sont des modules web locaux indépendants.

Les chemins sont relatifs à la racine du déploiement. Le projet fonctionne donc à `https://littlepinksloth.github.io/dino_logic/` sans supposer que le site est hébergé à la racine du domaine.

## 2. Rôle du launcher

`launcher/launcher.js` lit `config/games.json` et construit la liste des jeux. Il affiche l'état installé, vérifie les versions distantes lorsqu'une version locale existe et propose le lancement, l'installation ou la mise à jour. La navigation vers un jeu se fait dans le même onglet : le bouton Retour du navigateur revient au launcher ; chaque jeu fournit aussi un lien explicite vers celui-ci.

## 3. Structure d'un jeu

Chaque jeu est placé sous `games/<id>/`. Il fournit un `index.html`, `game.json`, une feuille de style, un point d'entrée JavaScript et tous ses fichiers nécessaires. Dino Logic conserve ses modules dans `js/` afin que leurs imports relatifs restent inchangés. Son `game.js` est le petit point d'entrée vers le `js/main.js` existant. Le moteur, le générateur, le solveur et la clé de progression `dinoLogicProgress` sont préservés.

Les références aux ressources d'un jeu sont relatives à son dossier. Ne référencez pas les fichiers du launcher depuis le moteur d'un jeu.

## 4. Registre `config/games.json`

Le registre est la liste que lit le launcher. Chaque entrée indique un identifiant stable, un nom, une description, une version de catalogue, le chemin du dossier, la page d'entrée et une icône. Tous les chemins sont relatifs à la racine du déploiement.

## 5. Métadonnées `game.json`

Chaque jeu possède son propre `game.json` avec `id`, `name`, `version`, `description`, `icon` et `files`. `files` est la liste exhaustive des ressources statiques nécessaires au lancement hors ligne, chemins relatifs au dossier du jeu. Le gestionnaire ajoute aussi `game.json` et le point d'entrée du registre. Il n'y a pas de découverte arbitraire des ressources ni de téléchargement depuis un autre domaine.

## 6. Service worker

Il n'existe qu'un service worker, `service-worker.js`, enregistré à la racine du projet avec une portée relative au déploiement. Le manifeste installable unique est `manifest.json`, celui du launcher. Les pages de jeu ne déclarent aucun manifeste ni service worker.

Le worker pré-cache explicitement le shell du launcher pendant l'installation. Il active la nouvelle version après ce pré-cache, puis ne nettoie que les anciens caches `LPS_LAUNCHER_*`. Il ne met pas en cache toutes les requêtes Internet. Les ressources inconnues du launcher suivent le réseau sans être ajoutées automatiquement au cache.

Pour une URL sous `games/<id>/`, il lit le marqueur de version active puis cherche la ressource uniquement dans le cache de cette version. En l'absence d'une copie locale, le réseau est utilisé ; si le réseau échoue, une réponse 503 explicite est renvoyée. Les requêtes de contrôle/téléchargement portant `lps_network=1` contournent le cache du jeu pour vérifier la version publiée.

## 7. Caches et stockage

Le shell utilise `LPS_LAUNCHER_V1`. Chaque version de jeu a son propre cache `LPS_GAME_<id>_<version>`. Le marqueur de version active est dans `LPS_GAME_STATE_V1`. Les métadonnées d'installation (version et dates) sont isolées dans IndexedDB `little-pink-sloth`, via `launcher/storage.js`. Le stockage local de Dino Logic reste séparé et inchangé.

Les caches sont des caches logiques du navigateur, pas des répertoires installés dans le système de fichiers. Les navigateurs peuvent évincer leur stockage ; l'installation peut alors devoir être refaite.

## 8. Installation

Au premier clic, le gestionnaire récupère `game.json` puis chaque fichier déclaré par des URL du même site. Il vérifie les réponses avant de les placer dans le cache versionné. La version active et ses métadonnées ne sont basculées qu'après la mise en cache complète. Une erreur de téléchargement supprime la tentative incomplète ; le launcher indique qu'une connexion est nécessaire.

## 9. Mise à jour

Quand le jeu est installé et que le navigateur est en ligne, le launcher relit le `game.json` distant avec une requête qui contourne son cache de jeu. Les numéros `major.minor.patch` sont comparés numériquement. Une version supérieure est proposée explicitement. Le nouveau cache complet est préparé d'abord ; après son succès, le marqueur actif et IndexedDB sont mis à jour, puis les anciennes versions du même jeu sont supprimées. Les caches des autres jeux ne sont jamais touchés.

Pour une publication, augmentez la version dans `game.json` et gardez cohérente l'entrée `version` du registre. Changez également le suffixe `LAUNCHER_CACHE` dans le worker quand les fichiers du launcher changent, afin qu'il prépare une nouvelle coquille avant de remplacer l'ancienne.

## 10. Fonctionnement hors ligne

Après la première visite, le launcher et le registre sont disponibles depuis le cache du worker. Les jeux déjà installés sont servis depuis leur cache de version, sans requête réseau nécessaire à leur lancement. Un jeu jamais installé requiert une connexion pour être mis en cache. Le HTML, les scripts, styles, polices et images requis doivent tous apparaître dans `files` ; tout fichier omis peut casser le jeu hors ligne.

## 11. Ajouter un jeu

1. Créez `games/<id>/` avec son `index.html`, ses fichiers de jeu et son `game.json`.
2. Déclarez dans `game.json` chaque ressource statique nécessaire dans `files` ; utilisez des chemins relatifs au dossier.
3. Ajoutez une entrée à `config/games.json` avec le même identifiant, le nom, la version, le chemin, l'entrée et l'icône.
4. Vérifiez que les fichiers s'ouvrent au chemin GitHub Pages avec son préfixe de dépôt, puis installez le jeu et testez-le hors ligne.

Le gestionnaire et le service worker ne doivent pas nécessiter de branche spécifique au nouveau jeu.

## 12. Publication GitHub Pages

Publiez le dépôt tel quel avec GitHub Pages en HTTPS. Le manifeste, les icônes, la page du launcher et les jeux utilisent des chemins relatifs ; ne remplacez pas ces chemins par `/games/...` ou par une URL de dépôt externe. Le service worker doit rester à la racine du projet pour contrôler launcher et jeux.

## 13. Règles pour les futurs changements/agents

- Ne créez pas de manifest ni de service worker dans un jeu.
- Ne chargez jamais le code d'un jeu depuis un dépôt ou un domaine externe.
- Gardez chaque jeu isolé sous `games/<id>/` et donnez à chaque version un identifiant stable.
- Déclarez dans `game.json` toutes les ressources à mettre hors ligne.
- Incrémentez la version du jeu pour toute mise à jour de ses fichiers ; ne supprimez pas une ancienne version avant validation complète de la nouvelle.
- Ne nettoyez que les caches appartenant à votre fonctionnalité ; le worker ne doit jamais supprimer les caches de jeux lors d'une mise à jour du launcher.
- Préservez les chemins relatifs au sous-répertoire GitHub Pages et testez installation, retour au launcher et lancement hors ligne.
- Ne modifiez pas le moteur d'un autre jeu pour l'intégrer au launcher.

## Limites pratiques

GitHub Pages est un hébergement statique : le registre et les fichiers de jeu sont publics et il n'y a pas de téléchargement différentiel. Le navigateur ne permet pas non plus de garantir une conservation permanente du cache si l'espace est sous pression. L'installation explicite et les caches versionnés fournissent le comportement offline attendu tant que le navigateur conserve les données du site.