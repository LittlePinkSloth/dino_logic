# Little Pink Sloth - Architecture

## 1. Principe général

Little Pink Sloth est une collection de petits jeux de puzzle accessibles depuis une seule PWA.

L'application est servie par GitHub Pages en HTTPS.

Architecture générale :

```text
LittlePinkSloth/
├── index.html
├── manifest.json
├── service-worker.js
├── ARCHITECTURE.md
│
├── launcher/
│   ├── launcher.js
│   └── storage.js
│
├── config/
│   └── games.json
│
├── common/
│   ├── ui/
│   │   ├── game-shell.js
│   │   └── success-animation.js
│   ├── storage/
│   │   └── statistics.js
│   └── styles/
│       └── common.css
│
└── games/
    ├── dino_logic/
    ├── sudoku/
    ├── water_puzzle/
    └── 1080/
````

### Principes fondamentaux

* `index.html` est le launcher.
* Il n'existe qu'une seule PWA.
* Les jeux sont des modules web locaux de cette PWA.
* Les jeux ne sont pas des PWA indépendantes.
* Il n'existe qu'un seul `manifest.json`, à la racine.
* Il n'existe qu'un seul `service-worker.js`, à la racine.
* Les jeux utilisent des chemins relatifs.
* Aucun jeu ne doit supposer que le site est installé à la racine du domaine.
* Le site doit fonctionner correctement sous un chemin GitHub Pages du type :
  `https://utilisateur.github.io/repository/`

---

# 2. Isolation des jeux et infrastructure commune

Chaque jeu possède son propre dossier :

```text
games/<id>/
```

Un jeu doit être autonome concernant :

* ses règles ;
* son gameplay ;
* son état de partie ;
* son générateur ;
* son solveur ;
* ses ressources propres ;
* ses fichiers JavaScript propres ;
* ses fichiers CSS propres ;
* ses images et sons propres.

Cependant, les jeux peuvent utiliser l'infrastructure commune située dans :

```text
common/
```

## Règles strictes de dépendance

### Règle 1

**Un jeu peut importer `common/`.**

Exemple :

```js
import { createGameShell } from "../../common/ui/game-shell.js";
```

### Règle 2

**Un jeu ne peut jamais importer un autre jeu.**

Interdit :

```js
import ... from "../dino_logic/...";
import ... from "../sudoku/...";
```

Un jeu ne doit jamais dépendre directement de l'implémentation interne d'un autre jeu.

### Règle 3

**Toute ressource `common/` utilisée doit être disponible offline via le cache commun.**

Un jeu installé doit pouvoir fonctionner hors ligne même lorsqu'il dépend de :

```text
common/
```

Les ressources communes ne sont donc pas copiées dans les dossiers des jeux.

### Conséquence

Le modèle de dépendance autorisé est :

```text
                ┌──────────────┐
                │   launcher   │
                └──────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │     common/    │
              └────────────────┘
                 ▲    ▲    ▲
                 │    │    │
        ┌────────┘    │    └────────┐
        │             │             │
        ▼             ▼             ▼
     Sudoku       Dino Logic    Water Puzzle
```

Mais jamais :

```text
Sudoku ─────X────> Dino Logic
Dino Logic ─X────> Sudoku
Water Puzzle ─X──> Sudoku
```

---

# 3. `common/`

`common/` contient uniquement les fonctionnalités réellement partagées entre plusieurs jeux.

Structure recommandée :

```text
common/
├── ui/
│   ├── game-shell.js
│   └── success-animation.js
│
├── storage/
│   └── statistics.js
│
└── styles/
    └── common.css
```

## `common/ui/game-shell.js`

Gère les éléments communs de l'interface :

* bouton 🦥 vers le launcher ;
* bouton `?` ;
* bouton trophée ;
* structure commune de l'interface ;
* navigation commune si nécessaire.

## `common/ui/success-animation.js`

Gère le feedback commun de réussite :

* feu d'artifice ;
* animation courte ;
* animation non bloquante ;
* comportement adapté au mobile.

L'animation ne doit être déclenchée que lorsqu'une partie est réellement validée.

## `common/storage/statistics.js`

Centralise la gestion des statistiques communes :

* lecture ;
* écriture ;
* sérialisation ;
* récupération des statistiques d'un jeu.

Chaque jeu reste responsable de définir quelles statistiques sont pertinentes.

## `common/styles/common.css`

Contient les styles réellement communs :

* positionnement des contrôles communs ;
* boutons communs ;
* interface mobile ;
* dimensions tactiles ;
* éléments du shell ;
* règles communes de mise en page.

Les styles propres au gameplay restent dans :

```text
games/<id>/css/
```

---

# 4. Utilisation de `common/`

Les fichiers de `common/` sont **partagés directement**.

Ils ne doivent jamais être copiés dans un jeu.

### Correct

```text
common/
└── ui/
    └── game-shell.js

games/
└── sudoku/
    └── js/
        └── main.js
```

Puis dans `main.js` :

```js
import { createGameShell } from "../../common/ui/game-shell.js";
```

### Incorrect

```text
games/
└── sudoku/
    └── js/
        ├── main.js
        └── game-shell.js
```

La duplication de code commun est interdite.

Elle créerait plusieurs copies susceptibles de diverger et rendrait les corrections plus difficiles.

## Avant de créer une nouvelle fonctionnalité commune

Toujours vérifier si une fonctionnalité équivalente existe déjà dans :

```text
common/
```

Si elle existe :

* la réutiliser ;
* ne pas la recopier ;
* ne pas créer une deuxième implémentation.

Si elle n'existe pas mais doit réellement être utilisée par plusieurs jeux, elle peut être ajoutée à `common/`.

Ne pas créer une abstraction commune uniquement par anticipation.

---

# 5. Cache des ressources communes

Les ressources de `common/` sont des dépendances partagées.

Elles ne sont pas copiées dans chaque cache de jeu.

Elles sont disponibles via le cache commun / shell géré par le `service-worker.js`.

Exemple :

```text
Sudoku
   │
   ├── games/sudoku/index.html
   ├── games/sudoku/js/main.js
   │
   └── ../../common/ui/game-shell.js
                         │
                         ▼
                  cache commun
```

Si Sudoku est installé puis lancé hors ligne, `game-shell.js` doit toujours être accessible depuis le cache commun.

## Ressource commune obligatoire

Toute ressource de `common/` réellement utilisée par un jeu doit être incluse dans les ressources précachées du shell.

Il est interdit de compter sur un téléchargement réseau ultérieur pour une ressource commune nécessaire au fonctionnement offline.

---

# 6. Évolution de `common/`

Le cache commun est versionné.

Exemple :

```js
const LAUNCHER_CACHE = "LPS_LAUNCHER_V2";
```

Lorsqu'une ressource de `common/` est ajoutée ou modifiée :

1. mettre à jour la liste des ressources du shell ;
2. incrémenter la version du cache shell ;
3. publier le nouveau service worker ;
4. vérifier que les jeux utilisant cette ressource fonctionnent toujours.

### Compatibilité

Une modification de `common/` qui change le comportement attendu ou le contrat d'un jeu doit également entraîner une augmentation de version de ce jeu.

Règle pratique :

```text
Modification interne compatible de common/
        ↓
nouvelle version du cache commun

Modification de common/ qui nécessite une adaptation d'un jeu
        ↓
nouvelle version du cache commun
+
nouvelle version des jeux concernés
```

Un jeu ne doit jamais être laissé avec une combinaison `jeu + common` incompatible.

---

# 7. Structure d'un jeu

Structure recommandée :

```text
games/<id>/
├── index.html
├── game.json
├── css/
├── js/
├── assets/
│   ├── images/
│   └── icons/
└── fonts/
```

La structure peut être adaptée si le jeu possède des besoins particuliers.

Cependant :

* `index.html` doit normalement rester à la racine du jeu ;
* `game.json` doit normalement rester à la racine du jeu ;
* CSS dans `css/` ;
* JavaScript dans `js/` ;
* images dans `assets/images/` ;
* icônes dans `assets/icons/` ;
* polices dans `fonts/`.

Les autres fichiers à la racine du jeu doivent avoir une justification technique réelle.

---

# 8. `config/games.json`

Le launcher découvre les jeux grâce à :

```text
config/games.json
```

Chaque entrée doit posséder au minimum :

* un `id` stable ;
* un nom ;
* une description ;
* une version ;
* le dossier du jeu ;
* la page d'entrée ;
* l'icône.

Exemple conceptuel :

```json
{
  "id": "sudoku",
  "name": "Sudoku",
  "description": "Jeu de sudoku",
  "version": "1.0.0",
  "path": "games/sudoku/",
  "entry": "index.html",
  "icon": "assets/icons/icon.png"
}
```

L'ID d'un jeu ne doit pas changer après publication.

---

# 9. `game.json`

Chaque jeu possède :

```text
games/<id>/game.json
```

Exemple :

```json
{
  "id": "sudoku",
  "name": "Sudoku",
  "version": "1.0.0",
  "description": "Jeu de sudoku",
  "icon": "assets/icons/icon.png",
  "files": [
    "index.html",
    "game.json",
    "css/style.css",
    "js/main.js",
    "js/game.js",
    "assets/icons/icon.png"
  ]
}
```

## `files`

`files` doit être une liste exhaustive des ressources statiques propres au jeu nécessaires à son fonctionnement offline.

Elle doit notamment contenir :

* HTML ;
* JSON ;
* JavaScript ;
* CSS ;
* images ;
* icônes ;
* sons ;
* polices ;
* Workers ;
* autres ressources statiques ;
* dépendances propres au jeu.

Les ressources de `common/` ne sont pas copiées dans cette liste comme ressources du jeu.

Elles sont gérées par le cache commun.

Les chemins doivent correspondre exactement à l'arborescence réelle.

---

# 10. Launcher

Le launcher est accessible depuis :

```text
index.html
```

Le code principal se trouve dans :

```text
launcher/launcher.js
```

Il :

* lit `config/games.json` ;
* affiche les jeux disponibles ;
* détecte les jeux installés ;
* vérifie les versions distantes lorsque le réseau est disponible ;
* propose l'installation ;
* propose les mises à jour ;
* lance les jeux ;
* permet le retour au launcher.

Les jeux ne doivent pas importer directement les fichiers internes du launcher.

Ils utilisent uniquement les mécanismes de navigation prévus.

---

# 11. Navigation

Les jeux sont ouverts dans le même contexte que le launcher.

Chaque jeu doit fournir un moyen explicite de revenir au launcher.

Le bouton commun 🦥 doit revenir au launcher.

Le bouton retour du navigateur doit également rester cohérent avec cette navigation.

Les chemins doivent être relatifs.

Interdit :

```text
/games/sudoku/index.html
```

Préférer les chemins relatifs adaptés au contexte.

---

# 12. Service Worker

Il n'existe qu'un seul service worker :

```text
service-worker.js
```

Il se trouve à la racine du projet.

Il contrôle le launcher et les ressources de l'application.

Les jeux ne possèdent pas leur propre service worker.

## Rôle du service worker

Il gère notamment :

* le cache du launcher ;
* le cache commun ;
* les caches versionnés des jeux ;
* le fonctionnement offline ;
* les mises à jour ;
* le nettoyage des anciennes versions.

Le service worker ne doit pas mettre automatiquement en cache toutes les requêtes Internet.

---

# 13. Caches

Convention :

```text
LPS_LAUNCHER_V1
LPS_GAME_<id>_<version>
LPS_GAME_STATE_V1
```

Le cache launcher contient notamment :

* launcher ;
* configuration nécessaire ;
* manifest ;
* service worker ;
* ressources communes ;
* ressources nécessaires au fonctionnement du shell.

Les ressources propres à un jeu sont stockées dans son cache versionné.

Exemple :

```text
LPS_GAME_SUDOKU_1.0.0
```

Un jeu ne doit jamais supprimer ou modifier le cache d'un autre jeu.

---

# 14. Installation d'un jeu

Lorsqu'un utilisateur installe un jeu :

1. récupérer `game.json` ;
2. lire `files` ;
3. télécharger chaque ressource nécessaire ;
4. vérifier que les réponses sont valides ;
5. créer le cache correspondant à la version ;
6. terminer complètement le cache ;
7. seulement ensuite déclarer cette version comme active ;
8. enregistrer l'installation dans IndexedDB.

Si une étape échoue :

* ne pas déclarer la version comme active ;
* supprimer le cache incomplet ;
* conserver l'ancienne version fonctionnelle s'il en existe une ;
* indiquer que la connexion est nécessaire pour terminer l'installation.

---

# 15. Mise à jour d'un jeu

Lorsqu'un jeu installé est utilisé avec une connexion :

1. récupérer la version distante de `game.json` avec contournement du cache ;
2. comparer les versions `major.minor.patch` ;
3. si la version distante est supérieure, proposer la mise à jour ;
4. télécharger toutes les ressources de la nouvelle version ;
5. créer le nouveau cache ;
6. vérifier que le téléchargement est complet ;
7. changer la version active ;
8. mettre à jour IndexedDB ;
9. supprimer les anciennes versions du même jeu.

Ne jamais supprimer l'ancienne version avant que la nouvelle soit entièrement valide.

Ne jamais modifier les caches des autres jeux.

---

# 16. Versionnement

Lorsqu'un fichier propre à un jeu est modifié :

```text
games/<id>/...
```

augmenter la version du jeu dans :

```text
games/<id>/game.json
config/games.json
```

Les deux versions doivent rester cohérentes.

Lorsqu'un fichier de `common/` est modifié :

* augmenter la version du cache commun / shell ;
* vérifier les jeux concernés ;
* augmenter la version d'un jeu si son contrat avec `common/` a changé.

Lorsqu'un fichier du launcher est modifié :

* augmenter la version du cache launcher ;
* permettre au nouveau service worker de précacher le nouveau shell avant remplacement.

---

# 17. Fonctionnement offline

Après une première visite :

* le launcher doit pouvoir être affiché hors ligne ;
* les ressources communes nécessaires doivent être disponibles hors ligne ;
* les jeux installés doivent pouvoir démarrer hors ligne ;
* les ressources propres d'un jeu doivent provenir de son cache versionné ;
* les ressources `common/` doivent provenir du cache commun.

Un jeu non installé nécessite une connexion pour être installé.

Aucune ressource indispensable au fonctionnement d'un jeu installé ne doit dépendre d'un téléchargement Internet au moment du lancement.

---

# 18. Workers et génération lourde

Un Web Worker doit être utilisé lorsqu'une opération de génération ou de résolution est suffisamment coûteuse pour provoquer un blocage perceptible de l'interface.

Ne pas utiliser de Worker uniquement par principe.

Structure recommandée pour un jeu nécessitant un générateur lourd :

```text
games/<id>/js/
├── main.js
├── game.js
├── ui.js
├── generator.js
├── solver.js
├── levelManager.js
└── generator.worker.js
```

## `generator.js`

Contient la logique de génération.

Il doit :

* être indépendant du DOM ;
* ne pas dépendre de l'interface ;
* pouvoir être exécuté dans un Worker ;
* retourner des données sérialisables.

## `solver.js`

Contient les algorithmes de résolution.

Il doit :

* être indépendant du DOM ;
* ne pas manipuler directement l'interface ;
* pouvoir être utilisé par le générateur ou le Worker.

## `generator.worker.js`

Le Worker sert de passerelle.

Il :

1. reçoit une demande ;
2. appelle le générateur ;
3. retourne le résultat ;
4. ne modifie jamais directement l'état de la partie.

Protocole recommandé :

```js
{
  type: "generate",
  requestId,
  levelNumber
}
```

Réponse :

```js
{
  type: "generated",
  requestId,
  levelNumber,
  level
}
```

Erreur :

```js
{
  type: "error",
  requestId,
  levelNumber,
  error: {
    message,
    stack
  }
}
```

## `levelManager.js`

Gère :

* création du Worker ;
* demandes de génération ;
* identifiants de requête ;
* réponses ;
* erreurs ;
* niveaux en attente ;
* préchargement éventuel du niveau suivant.

Lorsque les niveaux sont indépendants, un niveau peut être généré à l'avance pendant que le joueur joue au précédent.

Si le joueur termine avant que le Worker ait terminé :

* attendre le résultat ;
* ne pas relancer la génération lourde sur le thread principal.

Le premier niveau peut être généré sur le thread principal s'il est suffisamment léger.

---

# 19. Gameplay et thread principal

Le thread principal gère :

* affichage ;
* interactions ;
* sélection ;
* déplacements ;
* état courant de la partie ;
* score ;
* progression ;
* victoire / défaite ;
* animations ;
* interface.

Éviter d'appeler un solveur complet à chaque interaction si une vérification locale suffit.

Les calculs réellement lourds peuvent être déplacés dans un Worker.

---

# 20. Dépendances des Workers

Tous les fichiers nécessaires à un Worker doivent être disponibles offline.

Cela comprend :

* le fichier Worker ;
* ses imports directs ;
* les imports indirects nécessaires ;
* les données statiques utilisées ;
* les autres ressources nécessaires.

Les ressources propres au Worker doivent être déclarées dans :

```text
game.json
```

Exemple :

```js
new Worker("./js/generator.worker.js", {
  type: "module"
});
```

Les chemins doivent fonctionner :

* sur GitHub Pages ;
* sous le chemin du repository ;
* hors ligne.

---

# 21. Interface commune Little Pink Sloth

Tous les nouveaux jeux doivent respecter une identité visuelle commune.

Objectif :

> Les jeux peuvent avoir leur propre personnalité, mais doivent clairement appartenir à la même collection.

Référence principale actuelle :

```text
Dino Logic
```

Avant de créer un nouveau jeu, examiner l'implémentation actuelle de Dino Logic et les composants présents dans `common/`.

Réutiliser les mécanismes existants plutôt que les recréer.

---

# 22. Structure d'interface commune

Disposition générale :

```text
┌───────────────────────────────┐
│ 🦥                         ❔ │
│                            🏆 │
│                               │
│          GAME CONTENT         │
│                               │
└───────────────────────────────┘
```

## Bouton 🦥

Toujours présent en haut à gauche.

Il :

* retourne au launcher ;
* utilise le composant / asset commun ;
* possède une zone tactile suffisante ;
* conserve une position cohérente entre les jeux.

## Bouton `?`

Toujours présent en haut à droite.

Il donne accès aux règles du jeu.

Sur desktop :

* un survol peut afficher une courte information ;
* un clic doit permettre d'accéder aux règles complètes.

Sur mobile :

* ne jamais dépendre uniquement du hover ;
* un tap doit ouvrir les règles.

Les règles peuvent être affichées dans :

* un panneau ;
* une modale ;
* un popover.

Ne pas créer une nouvelle page uniquement pour les règles sans nécessité technique.

## Bouton trophée

Situé sous le bouton `?`.

Il affiche la progression du joueur.

Les statistiques doivent être persistantes localement et fonctionner hors ligne.

---

# 23. Statistiques

Chaque jeu définit les statistiques réellement pertinentes.

Exemples :

* puzzles résolus ;
* puzzles résolus par difficulté ;
* parties jouées ;
* série actuelle ;
* meilleur temps ;
* temps moyen ;
* taux de réussite ;
* progression par mode.

Ne pas ajouter des statistiques uniquement pour remplir l'écran.

Exemple Sudoku :

```text
Puzzles résolus : 42

Facile   : 18
Moyen    : 15
Difficile: 9
```

D'autres statistiques peuvent être ajoutées si elles apportent réellement quelque chose au jeu.

La persistance se fait localement :

* `localStorage` ;
* ou IndexedDB ;

selon l'infrastructure commune disponible.

Aucun compte serveur n'est nécessaire.

---

# 24. Feedback de réussite

Lorsqu'un puzzle est réellement réussi :

* afficher une petite animation de feu d'artifice ;
* rester léger ;
* ne pas bloquer le joueur ;
* être adapté aux petits écrans.

L'animation ne doit jamais être déclenchée simplement parce que la grille est remplie.

Elle doit être déclenchée uniquement après validation réelle de la solution.

La logique commune doit utiliser :

```text
common/ui/success-animation.js
```

lorsque cette fonctionnalité est disponible.

---

# 25. Responsive / mobile-first

Les jeux sont principalement destinés au téléphone.

Priorités :

1. gameplay ;
2. lisibilité ;
3. ergonomie tactile ;
4. identité visuelle.

Tous les jeux doivent fonctionner correctement :

* en portrait ;
* sur petits écrans ;
* sans scroll horizontal ;
* sans zoom obligatoire ;
* avec des boutons suffisamment grands ;
* avec du texte lisible ;
* avec une utilisation à un doigt lorsque le gameplay le permet.

Une interaction essentielle ne doit jamais dépendre uniquement du hover.

---

# 26. Identité visuelle

Chaque jeu peut avoir :

* ses propres couleurs ;
* ses illustrations ;
* ses animations ;
* son ambiance ;
* ses éléments graphiques ;
* ses mécaniques de gameplay.

En revanche, les éléments suivants doivent rester cohérents :

* navigation ;
* bouton launcher ;
* aide ;
* trophée ;
* statistiques ;
* ergonomie mobile ;
* feedback de réussite ;
* structure générale du shell.

Principe :

```text
Gameplay = identité du jeu

Interface commune = identité Little Pink Sloth
```

---

# 27. Création d'un nouveau jeu

Pour créer un nouveau jeu :

### Étape 1

Créer le dossier :

```text
games/<id>/
```

et son arborescence avant de créer les fichiers.

### Étape 2

Créer au minimum :

```text
games/<id>/
├── index.html
├── game.json
├── css/
├── js/
└── assets/
```

Ajouter les autres dossiers uniquement si nécessaires.

### Étape 3

Créer le gameplay dans les fichiers propres au jeu.

### Étape 4

Identifier les fonctionnalités communes nécessaires.

Avant de créer une fonctionnalité :

```text
common/
```

doit être vérifié.

Si une fonctionnalité existe déjà :

```text
réutiliser
```

et non :

```text
copier
```

### Étape 5

Importer directement les composants communs nécessaires.

Exemple :

```js
import { createGameShell } from "../../common/ui/game-shell.js";
```

### Étape 6

Ajouter toutes les ressources propres du jeu à :

```text
game.json
```

### Étape 7

Ajouter le jeu à :

```text
config/games.json
```

### Étape 8

Tester :

* GitHub Pages ;
* chemin avec sous-répertoire ;
* installation ;
* lancement ;
* retour au launcher ;
* bouton `?` ;
* bouton trophée ;
* statistiques ;
* réussite ;
* animation ;
* fonctionnement offline ;
* fonctionnement des Workers s'il y en a ;
* comportement mobile.

---

# 28. Ce qu'un nouveau jeu ne doit jamais faire

Un nouveau jeu ne doit jamais :

* créer un `manifest.json` ;
* créer un `service-worker.js` ;
* devenir une PWA indépendante ;
* importer un autre jeu ;
* copier des fichiers de `common/` ;
* dépendre d'une ressource réseau pour fonctionner offline ;
* utiliser des chemins absolus supposant que le site est à la racine du domaine ;
* modifier les fichiers internes d'un autre jeu ;
* supprimer le cache d'un autre jeu ;
* modifier les statistiques d'un autre jeu ;
* créer une deuxième implémentation d'un composant commun existant.

---

# 29. Règles absolues de dépendance

Ces règles doivent être considérées comme des contraintes d'architecture.

```text
┌──────────────────────────────────────────────┐
│ RÈGLE 1                                      │
│ Un jeu PEUT importer common/.                │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ RÈGLE 2                                      │
│ Un jeu NE PEUT JAMAIS importer un autre jeu.│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ RÈGLE 3                                      │
│ Toute ressource common/ utilisée par un jeu  │
│ DOIT être disponible offline via le cache    │
│ commun.                                      │
└──────────────────────────────────────────────┘
```

Exemples :

```text
Sudoku
  ├── common/           → AUTORISÉ
  ├── launcher/         → via navigation prévue uniquement
  └── dino_logic/       → INTERDIT
```

```text
Dino Logic
  ├── common/           → AUTORISÉ
  ├── sudoku/           → INTERDIT
  └── water_puzzle/     → INTERDIT
```

---

# 30. GitHub Pages

GitHub Pages est un hébergement statique.

Il n'y a pas :

* de backend applicatif ;
* de téléchargement différentiel garanti ;
* de stockage serveur des parties ;
* de garantie que les caches du navigateur seront conservés indéfiniment.

Les chemins doivent donc être relatifs.

Ne jamais écrire :

```text
/games/sudoku/
```

si cela suppose que le repository est installé à la racine du domaine.

Ne jamais dépendre d'une URL externe pour les ressources indispensables au fonctionnement offline.

Le service worker reste à la racine afin de contrôler l'ensemble de l'application.

---

# 31. Stockage

Les données du launcher sont stockées dans IndexedDB :

```text
little-pink-sloth
```

via :

```text
launcher/storage.js
```

Les informations peuvent notamment contenir :

* jeux installés ;
* version active ;
* métadonnées d'installation.

Les données propres aux jeux restent isolées.

Exemple :

```text
Dino Logic
└── localStorage propre au jeu

Sudoku
└── statistiques / progression propres au jeu
```

Un jeu ne doit pas modifier directement les données internes d'un autre jeu.

Les données utilisateur doivent rester fonctionnelles hors ligne.

---

# 32. Vérifications avant publication

Avant de considérer un jeu comme terminé, vérifier :

### Architecture

* [ ] Le jeu est dans `games/<id>/`.
* [ ] L'ID est stable.
* [ ] Le jeu n'importe aucun autre jeu.
* [ ] Les fonctionnalités communes utilisent `common/`.
* [ ] Aucun fichier de `common/` n'a été copié dans le jeu.

### Ressources

* [ ] `game.json` existe.
* [ ] `game.json.files` contient toutes les ressources propres nécessaires.
* [ ] Les chemins correspondent exactement aux fichiers.
* [ ] Les Workers et leurs dépendances sont déclarés.
* [ ] Les ressources communes utilisées sont précachées par le cache commun.

### Launcher

* [ ] `config/games.json` contient le jeu.
* [ ] La version est cohérente.
* [ ] Le jeu peut être installé.
* [ ] Le jeu peut être lancé.
* [ ] Le retour au launcher fonctionne.

### Offline

* [ ] Le jeu démarre hors ligne après installation.
* [ ] Les ressources propres sont disponibles.
* [ ] Les ressources `common/` sont disponibles.
* [ ] Les statistiques fonctionnent hors ligne.
* [ ] Les Workers fonctionnent hors ligne.

### Interface

* [ ] Bouton 🦥 présent.
* [ ] Bouton `?` présent.
* [ ] Trophée présent.
* [ ] Règles accessibles sur mobile.
* [ ] Statistiques persistantes.
* [ ] Feedback de réussite présent.
* [ ] Aucun scroll horizontal.
* [ ] Interface utilisable sur petit écran.
* [ ] Aucune interaction essentielle dépend du hover.

### Publication

* [ ] Version du jeu incrémentée si nécessaire.
* [ ] Version du launcher incrémentée si nécessaire.
* [ ] Version du cache commun incrémentée si `common/` a changé.
* [ ] Anciennes versions conservées jusqu'à validation de la nouvelle.
* [ ] Aucun cache d'un autre jeu n'est supprimé ou modifié.

---

# 33. Règle de priorité pour un agent de développement

Avant toute modification ou création de jeu :

1. Lire `ARCHITECTURE.md`.
2. Inspecter la structure de `common/`.
3. Inspecter Dino Logic comme référence actuelle.
4. Vérifier si la fonctionnalité demandée existe déjà dans `common/`.
5. Réutiliser `common/` plutôt que copier du code.
6. Vérifier qu'aucune dépendance vers un autre jeu n'est créée.
7. Vérifier que toutes les ressources nécessaires fonctionneront offline.
8. Respecter les conventions de navigation et d'interface.
9. Tester les chemins sous GitHub Pages.
10. Tester le fonctionnement offline.

Ne jamais résoudre un problème local en cassant l'isolation entre les jeux.

---

# 34. Résumé architectural

```text
                    Little Pink Sloth
                           │
             ┌─────────────┴─────────────┐
             │                           │
          launcher                    common/
             │                           │
             │              ┌────────────┼────────────┐
             │              │            │            │
             │             UI         storage       styles
             │
             ▼
        config/games.json
             │
      ┌──────┼──────────┬──────────┐
      ▼      ▼          ▼          ▼
    Dino   Sudoku   Water Puzzle   1080
    Logic
      │      │          │          │
      └──────┴──────────┴──────────┘
                     │
              chacun peut importer
                     │
                     ▼
                  common/

Mais :

Dino Logic ──X──> Sudoku
Sudoku ──────X──> Dino Logic
Sudoku ──────X──> Water Puzzle
```

## Règle fondamentale

**Les jeux sont indépendants entre eux, mais partagent directement l'infrastructure de `common/`.**

```text
JEU
 ├── gameplay propre
 ├── ressources propres
 ├── état propre
 └── peut importer common/
                     │
                     ▼
              infrastructure
                 partagée
```

`common/` est donc une **dépendance partagée**, pas une bibliothèque copiée dans chaque jeu.

Toute ressource commune utilisée doit rester disponible offline via le cache commun.


