# Principes généraux

* Nombre de fioles maximum : 15
* Nombre de couleurs différentes maximum : 13
* Organisation sur l'écran (téléphone ou ordinateur) : 3 rangées de 5 fioles

* Ajout progressif des mécaniques de jeu et des couleurs au fil des niveaux
* Progression du générateur :
  * 3 couleurs aux niveaux 1 à 6, 4 aux niveaux 7 à 11, 5 aux niveaux 12 à 16, puis 6 à partir du niveau 17
  * Introduction des mécaniques : pierre au niveau 5, gel au niveau 10, couleur mystère au niveau 15, fiole cachée au niveau 20, source conditionnelle au niveau 25 et fiole géante au niveau 30
  * Une mécanique nouvellement introduite apparaît au niveau de son introduction. Ensuite, le générateur tire une mécanique, deux mécaniques ou toutes les mécaniques déjà introduites, sans retirer les anciennes du tirage
  * Le générateur construit un chemin de résolution, produit plusieurs mélanges candidats et privilégie les plateaux pleins et colorés plutôt que les gros blocs monochromes
  * Le nombre de coups du chemin construit augmente progressivement avec le niveau ; il s'agit d'une solution connue, pas nécessairement du nombre minimal de coups

# Features à ajouter progressivement au cours du développement du jeu :
## Règles générales et règles particulières (implémenté)
* L'infobulle en haut à droite "?" ne contient que les règles générales du jeu, et évoque l'existence de mécaniques particulières
* Lorsqu'une fiole particulière apparaît sur le plateau, son type est signifié en bas du plateau. Un survol ou un clic que ce type ouvre une infobulle spécifique au type considéré

## Règle des fioles monochromes (implémenté)
* Une fois une fiole terminée (monochrome), la fiole est fermée
* Une fiole fermée ne peut plus être ni destination ni source

## Bonus en cas de défaite :
### Fiole bonus (implémenté mais bouton à changer)
* Possibilité d'ajouter une fiole de 1 case
* Comportement : fiole normale (source/destination sans contrainte)
* Capacité : 1 case de n'importe quelle couleur
* Durée : jusqu'à la réussite du niveau
* Nombre d'ajout maximal : une fiole peut être ajoutée à chaque défaite sans limite de nombre jusqu'à réussite du niveau
* Bouton : le bouton "ajouter une fiole bonus" se situe à droite du bouton "recommencer" et n'est affiché qu'en cas de défaite au niveau. Il se présente sous la forme d'un smiley bouteille
* Comportement attendu du jeu : le mécanisme de vérification de la défaite doit prendre en compte cette nouvelle fiole de 1 de capacité dès son ajout : appuyer sur le bouton "bonus" doit enclencher immédiatement un recalcul de la défaite et permettre au joueur de reprendre immédiatement sa partie avec la nouvelle fiole. Une nouvelle défaite est déclarée si la grille ne peut pas être résolue EN PRENANT EN COMPTE cette nouvelle fiole
* Ces fioles peuvent dépasser les capacités du terrain (>15). En cas de dépassement de la capacité normale du terrain, ajouter une rangée supplémentaire
* Les fioles bonus ne sont jamais considérées comme pleines et ne sont jamais fermées : elles restent source/destination jusqu'à résolution du niveau

## Mécaniques de jeu :

### Mélange de fiole (implémenté)
* Un bouton "mélanger" sous forme d'une émoticone "mélange" se trouve sous le board de jeu
* Ce bouton est disponible à tout moment lorsque la partie est en cours et lorsqu'elle est perdue
* En cas de défaite, le bouton est disponible à côté de celui de la fiole bonus et du bouton "recommencer"
* Le joueur peu cliquer sur le bouton, puis sélectionner une fiole non verrouillée 
* Les couleurs se trouvant dans la fiole sélectionnée sont alors mélangées de manière aléatoire
* Si la fiole contenait des couleurs mystères, ces dernières restent masquées, sauf si l'une d'elle se trouve en haut de la fiole (elle est alors révélée)
* A l'issue du mélange, le jeu recalcule la possibilité de victoire et annonce la défaite s'il n'est pas possible de gagner depuis la nouvelle configuration
* Après une défaite, s'il n'est pas possible de gagner la partie en mélangeant une fiole (exemple : impossibilité de dégeler une fiole de glace), le bouton ne doit pas être proposé

### La couleur mystère (implémenté)
* Tous les types de fioles peuvent contenir des couleurs mystères en début de partie.
* Cette couleur mystère doit être facilement identifiable grâce à une étiquette "?" placée sur elle.
* Une même fiole ne peut pas contenir plus de 2 couleurs mystères simultanément.
* Le joueur ne connaît pas la réelle couleur de la couleur mystère tant qu'il ne l'a pas libérée en versant ailleurs la couleur immédiatement au dessus de la couleur mystère.
* La couleur mystère ne peut donc pas être la première couleur d'une fiole.
* Une fois libérée, la couleur mystère se révèle et se comporte comme une couleur normale.
* Le jeu connaît la couleur de la couleur mystère, seul le joueur ne la connaît pas tant qu'il ne la révèle pas.
* Elle doit être prise en compte lors de la génération de la grille, qui doit rester solvable.

### La boîte à clé
* Entre 2 et 3 fioles peuvent être enfermées dans une même boîte opaque à serrure
* La clé de la serrure se situe dans une couleur d'une des fioles
* Pour libérer la clé, le joueur doit accéder à la couleur qui la contient en versant les couleurs situées au dessus de la clé
* Une fois la clé obtenue, la boîte s'ouvre et révèle les fioles dissimulées
* Les fioles dissimulées peuvent être de tout type et contenir des couleurs mystères
* Le couple générateur/solveur devra s'assurer que la clé est accessible et que le niveau est résolvable
* Afin de garder la cohérence de l'affichage sur téléphone, les fioles emprisonnées dans une boîte devront impérativement être consécutives et se trouver sur la même rangée

### La fiole gelée (déjà implémentée)
* Une fiole gelée ne peut être ni source ni destination tant qu'elle n'est pas dégelée
* Pour être dégelée, le joueur doit remplir une fiole monochrome immédiatement à côté d'une fiole gelée
* Une fois dégelée, la fiole se comporte comme une fiole normale
* Il peut y avoir 0, 1 ou plusieurs fioles gelées dans une même partie tant que cette dernière est résolvable
* L'organisation de l'écran étant sur 3 rangées, la fiole gelée ne peut être dégelée que par les fioles de sa propre rangée et non pas par la rangée précédente/suivante, même si certaines fioles pourraient être à côté si toutes les fioles étaient sur la même rangée

### La fiole en pierre (déjà implémentée)
* Une fiole en pierre ne peut jamais être source
* Elle est vide en début de partie
* Il peut y avoir 0, 1 ou plusieurs fioles en pierre dans une même partie tant que cette dernière est résolvable

### La fiole cachée (déjà implémentée)
* Le joueur ne connaît pas le contenu en début de partie
* Elle comporte une étiquette de couleur qui indique au joueur comment la libérer
* Lorsque le joueur a réalisé une fiole monochrome de la même couleur que celle indiqué par l'étiquette de la fiole cachée, celle-ci se révèle
* Une fois révélée, elle se comporte comme une fiole classique
* Il peut y avoir 0, 1 ou plusieurs fioles cachées dans une même partie tant que cette dernière est résolvable
* Si plusieurs fioles cachées apparaissent dans un même niveau, elles peuvent avoir la même étiquette ou des étiquettes différentes

### La fiole géante (implémenté)
* Une fiole géante ne peut être que destination et jamais source
* Une fiole géante est vide en début de partie
* Elle est de hauteur et de capacité de 2 ou 3 fioles
* Sur téléphone, elle doit donc s'insérer correctement sur les rangées inférieures de l'écran pour ne pas dépasser et perturber l'affichage
* Elle doit être remplie de manière monochrome
* Le jeu doit veiller à fournir au joueur 2 à 3 fois plus de couleurs identiques pour pouvoir la remplir
* Les parties contenant une fiole géante ne peuvent être gagnées que si la fiole géante est remplie
* Une fiole géante ne peut jamais être gelée, masquée ou en boîte

### La fiole source conditionnelle (implémenté)
* Elle est remplie en début de partie, de manière aléatoire
* Elle comporte une étiquette de couleur qui ne devra pas être confondue avec celle des fioles cachées
* Elle peut être source sans restriction
* Elle n'accepte que la couleur de son étiquette en tant que destination