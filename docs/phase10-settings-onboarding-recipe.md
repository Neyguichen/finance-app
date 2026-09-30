# Phase 10 — Recette Paramètres / Aide / Onboarding

## Premier Budget
- nouvel utilisateur sans Budget : écran d’accueil explicatif.
- création avec nom + icône.
- aucune opération financière créée avec le Budget.
- le guide de démarrage s’affiche uniquement pour un nouveau Budget.
- un Budget existant avant la migration ne doit pas afficher le guide spontanément.

## Guide
- 4 étapes : concept Budget, solde de référence, préparation du mois, vérification du solde.
- Précédent / Suivant / Commencer.
- Passer le guide.
- relance manuelle depuis Aide & retours.

## Fonctionnalités par Budget
- Import CSV / Todo / Notifications activés par défaut.
- désactiver un module masque son entrée et ne supprime aucune donnée.
- l’accès direct à une page désactivée affiche une explication.
- les alertes automatiques ne tournent pas lorsque Notifications est désactivé.
- la carte Todo du Dashboard disparaît lorsque Todo est désactivée.

## Aide & retours
- page d’aide accessible depuis le menu.
- principes V2 rappelés : Budget, prévu/réel, référence, rapprochement.
- relance du guide.
- signalement Bug ou Suggestion.
- le feedback est associé au Budget courant et protégé par RLS.

## Non-régression
- les réglages existants (double date, statistiques, catégories, habitudes, export) restent fonctionnels.
- aucun toggle fonctionnel ne supprime de données.
- vue administrateur : modules personnels inchangés / masqués selon les règles existantes.
