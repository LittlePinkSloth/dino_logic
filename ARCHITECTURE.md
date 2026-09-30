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


# Design System & UX Guidelines

Cette section définit les règles communes à TOUS les mini-jeux de Little Pink Sloth.

IMPORTANT :
Ces règles sont des conventions obligatoires pour tout nouveau jeu.

Lorsqu'un nouveau jeu est créé, l'agent doit automatiquement appliquer ces règles sans qu'elles aient besoin d'être répétées dans le prompt de création du jeu.

L'objectif est que tous les jeux Little Pink Sloth donnent l'impression d'appartenir à la même collection, tout en conservant leur propre identité visuelle.

Un nouveau jeu peut avoir ses propres couleurs, éléments graphiques et particularités, mais il doit respecter les conventions d'interface, de navigation et d'expérience utilisateur définies ci-dessous.

---

## 1. Philosophie générale de l'interface

Les jeux Little Pink Sloth doivent privilégier :

- simplicité
- lisibilité
- sobriété
- confort d'utilisation
- interface mobile-first
- interactions tactiles évidentes
- absence de surcharge visuelle
- cohérence entre les différents jeux

L'interface doit être pensée d'abord pour un smartphone en mode portrait, sauf indication contraire explicite.

Le jeu doit rester agréable sur un petit écran sans nécessiter de zoom ou de défilement horizontal.

La décoration ne doit jamais prendre le dessus sur le jeu.

La priorité est :

1. jouabilité
2. lisibilité
3. ergonomie
4. identité visuelle

Éviter les interfaces excessivement complexes, les animations permanentes et les éléments décoratifs inutiles.

---

# 2. Identité commune Little Pink Sloth

Tous les jeux doivent partager une structure d'interface reconnaissable.

L'utilisateur doit retrouver certains éléments communs d'un jeu à l'autre.

Structure générale :

┌─────────────────────────────────────┐
│ 🦥                              ❔  │
│                                🏆  │
│                                     │
│                                     │
│          CONTENU DU JEU             │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘

Les positions exactes peuvent être adaptées à la taille du contenu, mais les éléments suivants doivent rester cohérents :

- bouton "paresseux" en haut à gauche
- bouton "?" en haut à droite
- bouton "trophée" sous le bouton "?"
- contenu principal centré et optimisé pour le jeu

Ces éléments constituent la navigation et les fonctionnalités communes de Little Pink Sloth.

---

# 3. Bouton Paresseux

Chaque jeu doit posséder le même petit bouton de navigation Little Pink Sloth en haut à gauche.

Le bouton représente le petit paresseux de Little Pink Sloth.

Il sert à retourner au launcher.

Il doit :

- être présent sur tous les jeux
- rester à la même position relative
- avoir une taille adaptée au tactile
- rester discret
- être facilement identifiable
- avoir une zone tactile suffisamment grande
- utiliser la navigation prévue par l'architecture Little Pink Sloth

Le bouton ne doit pas être redessiné arbitrairement pour chaque jeu.

Utiliser l'asset commun Little Pink Sloth lorsque celui-ci existe.

Si l'architecture fournit un composant ou une fonction commune pour ce bouton, il doit être réutilisé.

Le bouton doit également fonctionner correctement avec la navigation Android et le bouton "retour" du navigateur lorsque cela est pertinent.

---

# 4. Bouton Aide "?"

Chaque jeu doit posséder le même bouton d'aide en haut à droite.

Il doit être représenté par un petit bouton contenant :

"?"

Le bouton doit rester discret et cohérent entre les jeux.

Il permet d'afficher les règles et instructions du jeu.

## Comportement

Sur desktop :

- le survol peut afficher une information courte
- un clic doit également permettre d'ouvrir les règles complètes

Sur mobile :

- il ne faut PAS dépendre uniquement du survol
- un appui doit ouvrir les règles

Les règles doivent apparaître dans une interface légère :

- panneau
- modal
- popover
- ou composant équivalent

Le choix dépend de ce qui existe déjà dans Little Pink Sloth.

Éviter de naviguer vers une nouvelle page simplement pour afficher les règles.

## Contenu

Chaque jeu doit fournir ses propres règles.

Le composant d'aide doit conserver la même apparence et le même comportement général entre les jeux.

Exemple :

┌──────────────────────────┐
│ Règles                   │
│                          │
│ Comment jouer            │
│                          │
│ Explication courte et    │
│ claire du fonctionnement │
│ du jeu.                  │
│                          │
│             [ Fermer ]   │
└──────────────────────────┘

Les règles doivent être courtes et pédagogiques.

---

# 5. Bouton Trophée

Sous le bouton "?" doit se trouver un bouton représentant un trophée.

Le trophée donne accès à la progression du joueur.

Ce système doit être commun à tous les jeux.

Le bouton doit :

- rester à la même position relative
- utiliser le même style général
- être discret
- être facilement identifiable
- être utilisable sur téléphone

Le contenu affiché dépend du jeu.

Chaque jeu doit conserver ses propres statistiques.

Les statistiques doivent être persistantes localement.

Elles doivent donc survivre à la fermeture du jeu et au redémarrage de l'application.

Utiliser le système de stockage prévu par l'architecture Little Pink Sloth lorsque celui-ci existe.

Sinon utiliser localStorage ou IndexedDB selon la quantité et la structure des données.

---

# 6. Statistiques et progression

Chaque jeu doit proposer des statistiques adaptées à son gameplay.

Il n'est PAS nécessaire que tous les jeux affichent exactement les mêmes statistiques.

Le principe est :

"Conserver les informations qui rendent la progression du joueur intéressante."

Pour un jeu de puzzles, les statistiques peuvent par exemple inclure :

- nombre de puzzles terminés
- nombre de puzzles terminés par difficulté
- nombre de parties jouées
- meilleure série
- meilleur temps
- temps moyen
- taux de réussite
- progression par mode
- autres statistiques pertinentes au jeu

L'agent doit choisir les statistiques les plus pertinentes pour le gameplay du jeu.

Ne pas ajouter artificiellement des statistiques inutiles uniquement pour remplir l'écran.

---

# 7. Exemple de statistiques Sudoku

Pour un Sudoku classique, une interface de trophée pourrait afficher :

Sudoku

Puzzles résolus
42

Facile
18

Moyen
15

Difficile
9

Autres statistiques éventuellement pertinentes :

- parties commencées
- taux de réussite
- meilleur temps par difficulté
- meilleur temps global
- série actuelle

Ne conserver que les statistiques réellement utiles.

Le système doit pouvoir évoluer si de nouveaux modes Sudoku sont ajoutés ultérieurement.

---

# 8. Persistance des statistiques

Les statistiques doivent être persistantes localement.

Elles ne doivent pas dépendre d'un compte utilisateur ou d'un serveur.

Objectif :

Utilisateur joue une partie
↓
partie terminée
↓
statistiques mises à jour
↓
fermeture de l'application
↓
réouverture
↓
statistiques toujours présentes

Les données doivent fonctionner hors ligne.

Ne pas introduire de backend simplement pour stocker les statistiques.

---

# 9. Écran de réussite

Lorsqu'un joueur réussit un puzzle, Little Pink Sloth doit fournir un retour visuel positif.

La réussite doit notamment déclencher de petits feux d'artifice.

Les feux d'artifice doivent être :

- courts
- légers
- visuellement agréables
- non bloquants
- adaptés à un écran de téléphone

Ils doivent accompagner la réussite sans empêcher le joueur de continuer.

Ne pas utiliser une animation extrêmement lourde ou permanente.

Le jeu doit immédiatement indiquer que le puzzle est terminé avec succès.

Exemple conceptuel :

Puzzle terminé !

        🎉

[ Nouveau puzzle ]

L'animation de réussite doit être déclenchée uniquement lorsqu'une vraie réussite est détectée.

Ne jamais déclencher les feux d'artifice simplement lorsqu'une grille est remplie si celle-ci est incorrecte.

---

# 10. Réutilisation de l'interface de Dino Logic

Dino Logic constitue actuellement la référence principale de l'expérience utilisateur Little Pink Sloth.

Lorsqu'un nouveau jeu est créé, l'agent doit examiner l'interface et les fonctionnalités communes déjà présentes dans Dino Logic avant de créer de nouveaux composants.

Il doit réutiliser les mécanismes existants lorsque cela est pertinent.

En particulier, vérifier l'existence de :

- bouton paresseux
- bouton d'aide
- panneau de règles
- bouton trophée
- affichage des statistiques
- système de réussite
- feux d'artifice
- animations de réussite
- composants communs
- styles communs
- assets communs
- système de stockage des statistiques
- système de navigation vers le launcher

Ne pas recréer une deuxième version d'une fonctionnalité qui existe déjà.

Si une fonctionnalité actuellement spécifique à Dino Logic devrait manifestement devenir commune à Little Pink Sloth, privilégier sa généralisation plutôt que sa duplication.

---

# 11. Évolution vers des composants communs

Si plusieurs jeux ont besoin des mêmes fonctionnalités, elles doivent progressivement être extraites dans une infrastructure commune.

Exemples :

common/
├── ui/
│   ├── back-button.js
│   ├── help-button.js
│   ├── trophy-button.js
│   └── success-animation.js
│
├── storage/
│   └── statistics.js
│
└── styles/
    └── common.css

La structure exacte peut être différente.

L'implémentation commune actuelle se trouve dans `common/` : `ui/game-shell.js` génère les boutons paresseux, aide et trophée ; `ui/success-animation.js` fournit le feedback de réussite ; `storage/statistics.js` centralise la sérialisation des statistiques ; `styles/common.css` porte les styles partagés. Les données et règles de chaque jeu restent définies dans le jeu lui-même.

Les ressources `common/` consommées par les jeux doivent être ajoutées à la liste explicite du cache shell dans `service-worker.js`. À chaque changement de ces ressources, incrémenter la version du cache shell afin que le nouveau worker les pré-cache avant activation. La version des ressources propres à un jeu doit aussi être incrémentée dans ses deux registres pour renouveler son cache de jeu.

IMPORTANT :

Ne pas créer cette abstraction simplement par anticipation.

Elle doit être créée lorsqu'elle apporte une réelle réduction de duplication ou une meilleure cohérence.

Avant de créer un composant commun, vérifier si une fonctionnalité équivalente existe déjà.

---

# 12. Cohérence sans uniformisation

Les jeux ne doivent PAS tous devenir visuellement identiques.

Chaque jeu peut avoir :

- ses propres couleurs
- ses propres illustrations
- ses propres animations
- sa propre ambiance
- ses propres éléments de gameplay

Cependant, les éléments suivants doivent rester cohérents :

- position du bouton paresseux
- position du bouton ?
- position du trophée
- comportement des boutons communs
- présentation des règles
- présentation générale des statistiques
- retour au launcher
- feedback de réussite
- principes d'ergonomie mobile

L'objectif est :

"des jeux différents appartenant clairement à la même collection."

---

# 13. Mobile-first obligatoire

Tout nouveau jeu doit être conçu d'abord pour smartphone.

Avant de considérer un jeu terminé, vérifier :

- écran portrait
- petite largeur d'écran
- boutons tactiles suffisamment grands
- texte lisible
- absence de débordement horizontal
- absence de zoom nécessaire
- interface utilisable avec un seul doigt lorsque possible
- pas d'interaction dépendant exclusivement du survol de souris

Le desktop est secondaire.

Le jeu peut s'adapter aux écrans plus grands, mais ne doit jamais sacrifier l'expérience mobile.

---

# 14. Mode sombre et apparence

Si le projet possède déjà un système de thème, respecter celui-ci.

Ne pas créer un système de thème spécifique au jeu sans nécessité.

Si aucun système commun n'existe encore, le nouveau jeu doit au minimum rester lisible dans les conditions normales d'utilisation du launcher.

Les couleurs spécifiques au jeu peuvent être utilisées pour différencier son identité.

Éviter cependant les contrastes insuffisants.

---

# 15. Règle pour tout futur agent IA

Lorsqu'un agent reçoit une demande de création ou de modification d'un jeu Little Pink Sloth, il doit :

1. lire ARCHITECTURE.md
2. lire cette section Design System & UX Guidelines
3. examiner au moins un jeu existant, en particulier Dino Logic si celui-ci est disponible
4. identifier les composants communs existants
5. les réutiliser lorsque cela est pertinent
6. respecter la position et le comportement des éléments communs
7. créer les statistiques adaptées au nouveau jeu
8. intégrer le bouton d'aide
9. intégrer le bouton trophée
10. intégrer le bouton paresseux
11. intégrer le feedback de réussite
12. intégrer les petits feux d'artifice lorsqu'un puzzle est réussi
13. tester l'expérience mobile
14. ne pas créer de doublons de fonctionnalités communes

Ces éléments font partie de l'identité Little Pink Sloth et ne doivent pas être considérés comme des options à demander à l'utilisateur.

---

# 16. Principe général

Pour chaque nouveau jeu :

GAMEPLAY = identité propre du jeu

INTERFACE COMMUNE = identité Little Pink Sloth

Exemple :

Dino Logic
→ gameplay dinosaures
→ interface Little Pink Sloth

Sudoku
→ gameplay Sudoku
→ interface Little Pink Sloth

Water Puzzle
→ gameplay Water Puzzle
→ interface Little Pink Sloth

1080
→ gameplay 1080
→ interface Little Pink Sloth

Les jeux doivent être différents dans leur contenu mais immédiatement reconnaissables comme appartenant à la même collection.