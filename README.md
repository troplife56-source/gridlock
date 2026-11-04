# Gridlock

**▶ Jouer : https://troplife56-source.github.io/gridlock/**

Puzzle de parking en HTML, CSS et JavaScript pur. Fais glisser les véhicules pour ouvrir un passage et faire sortir la voiture rouge par la barrière.

## Ce qui rend le jeu difficile

- **150 niveaux en 5 chapitres** : Centre-ville, Port, Aéroport, Ville de nuit, Grand Prix.
  La difficulté monte de 6 coups au premier niveau jusqu'à plus de 40 coups minimum.
- **Coups limités** : chaque niveau donne un nombre de coups maximum. La marge se réduit à chaque chapitre
  (+60 % au Centre-ville, +22 % au Grand Prix). Plus de coups = niveau perdu.
- **Cônes fixes** à partir du chapitre 2 : ils ne bougent jamais et réduisent l'espace libre.
- **Étoiles** : 3 ★ uniquement si tu trouves la solution la plus courte possible.
- **Pièces** : gagnées en terminant des niveaux, dépensées en indices (25) ou en coups supplémentaires (30).
- **Défi du jour** : un niveau difficile différent chaque jour, 50 pièces à gagner.

Chaque niveau est **garanti soluble** et son nombre de coups minimum est calculé exactement par un solveur.

## Atelier : crée et partage tes niveaux

- Pose des voitures, des camions et des cônes d'un simple toucher ; touche une pièce pour l'enlever.
- Le solveur vérifie en direct que le niveau a une solution et donne le nombre de coups minimum.
- **Plus dur** : le solveur essaie toutes les positions de départ possibles avec tes véhicules
  et garde la plus difficile.
- **Partager** : donne un code court (`GL-XXXX-...`) et un lien direct.
  Exemple d'idée de vidéo : « Battez mon niveau », tes abonnés collent leurs codes en commentaire.
- Les codes s'ouvrent dans **Atelier → Jouer le niveau d'un ami**, ou via le lien `.../#GL-XXXX-...`.

## Garage

9 voitures à débloquer avec les pièces gagnées : bolides, voitures rétro, police, formules et le bolide en or.
La voiture choisie est celle que tu dois sortir du parking.

## Jeu installable (hors-ligne)

Une fois en ligne sur GitHub Pages, le jeu peut s'installer comme une application :
- **Android / ordinateur (Chrome, Edge)** : bouton « Installer Gridlock » dans le menu ou les réglages.
- **iPhone (Safari)** : Partager → « Sur l'écran d'accueil ».

Il fonctionne ensuite sans internet. **À chaque mise à jour du jeu**, change la valeur `VERSION`
en haut de `sw.js` (par exemple `gridlock-v4`) pour que les joueurs reçoivent la nouvelle version.

## Mode vidéo (pour YouTube)

Dans **Réglages → Mode vidéo** : tous les niveaux sont ouverts, les indices sont gratuits
et un bouton **Solution** rejoue automatiquement la solution parfaite. Idéal pour enregistrer des vidéos
du type « Niveau 150 résolu en 42 coups ».

## Lancer le jeu

Ouvre `index.html` dans un navigateur. Aucune installation.

## Mettre en ligne avec GitHub Pages

1. Crée un dépôt sur GitHub, puis :
   ```bash
   git init
   git add .
   git commit -m "Gridlock"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/gridlock.git
   git push -u origin main
   ```
2. Sur GitHub : **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`**.
3. Le jeu est en ligne sur `https://TON-PSEUDO.github.io/gridlock/`.

## Structure

```
index.html                page du jeu
manifest.webmanifest      nom, couleurs et icônes de l'application installée
sw.js                     fonctionnement hors-ligne
icons/                    icônes de l'application
style.css                 apparence (un thème de couleurs par chapitre)
js/solver.js              règles et solveur optimal (recherche en largeur)
js/art.js                 dessins SVG des véhicules et des cônes
js/levels.js              les 150 niveaux : [plateau, coups minimum]
js/game.js                carte, plateau, glisser-déposer, pièces, sauvegarde
tools/search-hard.js      recherche de niveaux difficiles
tools/build-levels.js     sélection des 150 niveaux selon la courbe de difficulté
```

## Format d'un niveau

Plateau 6×6 en chaîne de 36 caractères, lue ligne par ligne :
`.` case vide, `x` cône fixe, `A` voiture rouge (3e ligne), autres lettres = véhicules
(2 cases = voiture, 3 cases = camion ou bus). La sortie est à droite de la 3e ligne.

## Créer de nouveaux niveaux

```bash
node tools/search-hard.js 600 1 > a.jsonl     # 10 minutes de recherche, graine 1
node tools/search-hard.js 600 2 > b.jsonl     # lance-en plusieurs en parallèle
node tools/build-levels.js a.jsonl b.jsonl > js/levels.js
```

La recherche part d'un parking au hasard et le modifie pas à pas (ajouter, retirer ou déplacer
un véhicule, poser un cône), en gardant chaque changement qui rend le puzzle plus dur.
Pour chaque parking, elle explore toutes les positions possibles et garde celle qui est
la plus éloignée de la sortie. Plus elle tourne longtemps, plus elle trouve de niveaux extrêmes.

## Statistiques

Le jeu utilise Google Analytics (`G-04KBZCZKWJ`, défini en haut de `index.html`) **uniquement si le joueur accepte**
le bandeau au premier lancement. Événements envoyés : `level_start`, `level_complete` (coups, étoiles, temps),
`level_fail`, `hint_used`, `share_level`, `car_unlocked`. Ils sont visibles dans Google Analytics → Rapports → Engagement → Événements.

## Licence

MIT, voir `LICENSE`.
