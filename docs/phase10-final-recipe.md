# Phase 10 — Recette finale V2 initiale

## Responsive mobile
- menu latéral scrollable même sur petit écran et avec toutes les fonctions actives.
- informations base de données/version toujours accessibles sans recouvrir les liens.
- guide d’onboarding utilisable en hauteur réduite et scrollable.
- Todo : formulaire et boutons utilisables en largeur mobile ; textes longs sans débordement.
- Notifications : filtres horizontalement scrollables ; titres/messages longs sans débordement.
- Épargne : enveloppes sur une colonne en très petite largeur, puis 2/3 colonnes selon l’écran.
- Import CSV : actions finales et annulation de lot accessibles sans débordement.

## Paramètres / fonctions par Budget
- activer/désactiver Import CSV, Todo et Notifications indépendamment.
- un module désactivé disparaît du menu et ses données restent intactes.
- accès direct à une route désactivée : message explicite, pas d’erreur.
- réactiver le module restitue les données existantes.

## Référence d’épargne
- référence datée visible sur l’enveloppe.
- aucun faux mouvement créé lors de l’enregistrement.
- période après référence : référence + mouvements ultérieurs.
- période avant référence : comportement historique conservé.
- retirer la référence ne supprime/modifie aucun mouvement.

## Migration V1
- historique toujours accessible.
- aucune opération créée par navigation temporelle.
- solde réel du Budget et références d’épargne contrôlables depuis Aide.
- aucun écrasement de données existantes.

## Phase 7 / 8 / 9 non-régression
- Vérification du solde : calcul, écart, suggestions et confirmation de correction.
- Import CSV : mapping, preview, doublons, choix Créer/Rapprocher/Ignorer, annulation sûre.
- Todo : création, échéance, terminer/réouvrir, suppression, résumé Dashboard.
- Notifications : badge, filtres, lecture, archivage, conversion Todo, alertes échéances.
- anti-spam : pas de notification ou Todo dupliquée pour un même objet.

## Critères de clôture Phase 10
- build Vercel vert.
- aucun défaut bloquant sur desktop/mobile.
- migrations additives présentes.
- aucune perte de données.
- roadmap Notion mise à jour.
- périmètre V2 initial considéré livré ; ne pas commencer V2+ sans décision explicite.
