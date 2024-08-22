# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.8]

### Ajouté

- Système de chat entre les utilisateurs
- Appuie sur touche entrée pour envoyer le message 

### Modifié

- Visuel de la page principale
- Animation de chargement (rond tournant plutôt qu'un texte)
- Code JS dans des fichiers séparés

## [1.0.7]

### Ajouté

- Info de "chargement en cours" (basique) pour mettre plus de vidéo en cache avant lecture

### Modifié

- Téléchargement de plus de paquets pour moins de latence perceptible
- Meilleur comptage du temps (pour meilleure synchronisation) => toutes les 1/2 secondes au lieu d'uniquement des secondes

## [1.0.6]

### Ajouté

- Ajout du contrôle play/pause par les clients

### Bugs connus

- Problème de latence lors de la lecture des vidéos

## [1.0.5]

### Modifié

- Amélioration du transcoding : si déjà en cours, téléchargement à partir du temps courant

### Corrigé

- Problème de synchronisation sur les nouveaux clients corrigé

## [1.0.4]

### Ajouté

- Transcoding en temps réel des vidéos AVI et MKV vers MP4

## [1.0.3]

### Ajouté

- Sélection de la vidéo à lire via le serveur

### En cours

- Acceptation de différent format de vidéo (mp4, mkv, avi, etc.)

## [1.0.2]

### Modifié

- Suppression de la pause lors de la déconnexion
- Suppression limite utilisateurs (max et min)

### Corrigé

- Problème de synchronisation corrigé

## [1.0.1]

### Ajouté
- Synchronisation des vidéos (via cmd)

## [1.0.0]

### Ajouté

- Commande (lecture/pause) via le serveur
- 2 utilisateurs doivent être connectés