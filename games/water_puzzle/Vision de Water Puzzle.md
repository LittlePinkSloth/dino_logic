# Principes généraux

* Nombre de fioles maximum : 15
* Nombre de couleurs différentes maximum : 13
* Organisation sur l'écran (téléphone ou ordinateur) : 3 rangées de 5 fioles

* Ajout progressif des mécaniques de jeu et des couleurs au fil des niveaux

# Features à ajouter progressivement au cours du développement du jeu :
## Règle des fioles monochromes
* Une fois une fiole terminée (monochrome), la fiole est fermée
* Une fiole fermée ne peut plus être ni destination ni source

## Bonus en cas de défaite :
* Possibilité d'ajouter une fiole de 1 case
* Comportement : fiole normale (source/destination sans contrainte)
* Capacité : 1 case de n'importe quelle couleur
* Durée : jusqu'à la réussite du niveau
* Nombre d'ajout maximal : une fiole peut être ajoutée à chaque défaite sans limite de nombre jusqu'à réussite du niveau
* Bouton : le bouton "ajouter une fiole bonus" se situe à droite du bouton "recommencer" et n'est affiché qu'en cas de défaite au niveau
* Comportement attendu du jeu : le mécanisme de vérification de la défaite doit prendre en compte cette nouvelle fiole de 1 de capacité dès son ajout : appuyer sur le bouton "bonus" doit enclencher immédiatement un recalcul de la défaite et permettre au joueur de reprendre immédiatement sa partie avec la nouvelle fiole. Une nouvelle défaite est déclarée si la grille ne peut pas être résolue EN PRENANT EN COMPTE cette nouvelle fiole


## Mécaniques de jeu :
### La couleur mystère
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

### La fiole géante
* Une fiole géante ne peut être que destination et jamais source
* Une fiole géante est vide en début de partie
* Elle est de hauteur et de capacité de 2 ou 3 fioles
* Sur téléphone, elle doit donc s'insérer correctement sur les rangées inférieures de l'écran pour ne pas dépasser et perturber l'affichage
* Elle doit être remplie de manière monochrome
* Le jeu doit veiller à fournir au joueur 2 à 3 fois plus de couleurs identiques pour pouvoir la remplir
* Les parties contenant une fiole géante ne peuvent être gagnées que si la fiole géante est remplie
* Une fiole géante ne peut jamais être gelée, masquée ou en boîte

### La fiole source conditionnelle
* Elle est remplie en début de partie
* Elle comporte une étiquette de couleur qui ne devra pas être confondue avec celle des fioles cachées
* Elle peut être source sans restriction
* Elle n'accepte que la couleur de son étiquette en tant que destination