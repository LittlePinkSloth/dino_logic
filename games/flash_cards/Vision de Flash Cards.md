# Principes généraux
* Flash cards est une application de révision basée sur la technique des Flash cards
* Elle utilise également le principe des rappels espacés 
* Le but est de proposer une interface simple et un modèle de bibliothèque de cartes permettant à l'utilisateur de faire générer facilement une série de cartes directement utilisable dans l'application

# Bibliothèques
## Composition
* Chaque carte est rangée dans une bibliothèque (un fichier JSON)
* Chaque bibliothque possède :
    * nom : chaîne de caractère
    * domaines : liste[str]
    * date : date à laquelle au moins 1 carte a été révisée pour la dernière fois
    * cartesListe : liste[carte]
* Chaque flash card est matérialisée par un dictionnaire contenant les informations suivantes :
    * recto : chaîne de caractère
    * verso : chaîne de caractère
    * date : date à laquelle la carte a été révisée pour la dernière fois
    * memorisee : int : correspond à la mémorisation de l'utilisateur (+1 à chaque bonne réponse, remis à 0 en cas de mauvaise réponse)

## Modèle
* Un modèle de bibliothèque est disponible dans flash_cards/assets/bib_model.json
* Ce modèle est indicatif et peut être adapté selon les besoins lors du développement de l'application
* Toute évolution du modèle doit être mis en oeuvre dans le fichier bib_model.json qui doit toujours être à jour
* Le fichier bib_model.json doit pouvoir servir de base à l'utilisateur pour la création de bibliothèques immédiatement compatibles avec l'application


# Application
## Interfaces
* Le bouton retour, le bouton "?" et le bouton statistique sont présents aux endroits définis par l'application LittlePinkSloth
* L'interface est minimaliste et la couleur principale est choisie pour minimiser la fatigue occulaire et maximiser la lisibilité des cartes

### Page d'accueil / choix des bibliothèques
* Au lancement de l'application, l'utilisateur accède à la page d'accueil, composée de :
    * liste des bibliothèques disponibles : le nom, les domaines et le nombre de cartes de chaque bibliothèques sont affichés
    * barre de recherche de bibliothèques
    * possibilité de basculer l'affichage en "tri par nom" ou "tri par domaine"
    * bouton pour démarrer une session de révision
    * bouton de configuration décrit ci-dessous dans la partie "interface de configuration"
* L'utilisateur peut choisir de réviser une/plusieurs bibliothèques ou un/plusieurs domaines lors de la même session

### Interface de configuration
* Un bouton "roue crantée" est disponible sous le bouton "paresseux" de l'interface générique : ce bouton ouvre le panneau de configuration
* Le bouton "roue crantée" n'est disponible que sur la page d'accueil de l'application (page de sélection des bibliothèques)
* Les configurations suivantes doivent être disponibles :
    * sélection du dossier bibliothèques (par défaut dans le dossier flash_cards/assets/bibliotheques) : une fois que l'utilisateur a indiqué son propre chemin, ce dernier doit persister à la fermeture/redémarrage de l'application
    * choix du volume de carte à réviser (volume personnalisé ou "toutes les cartes") : le volume par défaut est fixé à 15 cartes/session
    * téléchargement du modèle de bibliothèque .json : ce fichier doit permettre à l'utilisateur d'avoir un modèle à donner à un LLM pour générer automatiquement une nouvelle bibliothèque compatible

### Interface de révision
* La quasi intégralité de l'écran est occupée par le recto ou le verso de la carte
    * lorsque l'utilisateur clic ou touche cet espace, cela affiche le verso (ou le recto le cas échéant)
* La partie basse de l'écran est occupée par deux boutons : OK/KO permettant d'indiquer si la carte est maîtrisée ou non
* Ces boutons ne s'affichent qu'une fois les deux côtés de la carte ont été consultés
* Dès qu'un des deux boutons est sélectionné :
    * l'application met silencieusement à jour la carte courante (date, memorisee (++ ou 0))
    * l'application affiche la carte suivante
* En fin de session, les mises à jour de la bibliothèque (mise à jour des cartes révisées cf point précédent + mise à jour de la date de la bibliothèque) sont enregistrées dans la bibliothèque

### Panneau de fin de session
* En fin de session, les statistiques de la session sont affichées :
    * Nombre de cartes connues / nombre de cartes totales 
    * % de réussite
    * confirmation de mise à jour des cartes et de la bibliothèque
* bouton "retour" qui ramène l'utilisateur à la page d'accueil / choix des bibliothèques

## Algorithme de sélection des cartes à réviser dans le corpus de cartes sélectionnées
### Cartes sélectionnées
* L'ensemble des cartes sélectionnées par l'utilisateur constitue le corpus de départ
* Si l'utilisateur a coché "toutes les cartes", l'application se contente de mélanger les cartes sélectionnées et de toutes les proposer à l'utilisateur une à une

### Déterminer le corpus des cartes "à réviser"
* si l'utilisateur a opté pour une révision partielle (15 cartes par défaut, ou le nombre indiqué par l'utilisateur) :
    * une carte ayant pour attribut "memorisee : 0" se voit attribuer une probabilité de 1
    * une carte ayant pour attribut "memorisee > 0" se voit attribuer une probabilité d'être sélectionnée selon le calcul : probabilité = (0.1 * (durée depuis la dernière révision de cette carte en jours)) - (0.1*carte.memorisee). Si probabilite est en dehors de l'intervalle [0;1], elle est fixée à 0 ou 1 selon si elle est > 1 ou < 0. 
    * une fois les probabilités attribuées, les cartes sont ajoutées à un corpus de carte "à réviser" selon leur probabilité (donc une carte de proba 0.187 a un peu moins d'une chance sur 5 d'être ajoutée à ce corpus)

### Sélection de l'échantillon de cartes proposé à l'utilisateur
* l'échantillon qui sera effectivement révisé par l'utilisateur est tiré aléatoirement dans le corpus de carte "à réviser" (donc si "à réviser" contient 45 cartes mais que l'utilisateur ne veut en réviser que 30, l'application sélectionne aléatoirement 30 cartes parmi les 45 "à réviser" et les propose à l'utilisateur)
* si l'utilisateur veut réviser 30 cartes mais que seules 17 cartes sont "à réviser", l'application sélectionne en priorité les 17 cartes "à réviser" et comble les cartes manquantes par les cartes qui n'avaient pas été sélectionnées, jusqu'à obtenir 30 cartes ou jusqu'à atteindre la totalité des cartes sélectionnées (donc si le total de carte est de 28 mais que l'utilisateur a indiqué une session de 30 cartes, il ne révisera que ses 28 cartes puisqu'il n'y a pas 30 cartes)
* C'est cet échantillon de cartes qui est réellement proposé à l'utilisateur pour sa session de révision
    
    

