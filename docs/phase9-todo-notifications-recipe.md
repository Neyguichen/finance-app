# Phase 9 — Recette Todo & Notifications

## Todo
- créer une tâche manuelle avec et sans échéance.
- terminer puis réouvrir une tâche.
- supprimer une tâche.
- vérifier le résumé Dashboard et les compteurs du menu.
- convertir une notification en tâche ; un deuxième clic ne doit pas créer de doublon.

## Centre de notifications
- badge menu = nombre de notifications non lues.
- filtres Toutes / Finances / Actions / Neyguichen.
- filtre Non lues uniquement.
- marquer une notification lue en l’ouvrant.
- Tout marquer lu.
- archiver une notification.
- ouvrir l’action liée.

## Alertes financières automatiques
- charge fixe non payée avec date prévue aujourd’hui ou passée → notification Finances.
- revenu non reçu avec date prévue aujourd’hui ou passée → notification Finances.
- Todo arrivée à échéance → notification Actions.
- une alerte de règle ne doit être créée qu’une seule fois par objet.
- quand l’objet est résolu (charge payée, revenu reçu, Todo terminée), la notification active correspondante doit être archivée automatiquement.
- une notification archivée manuellement ne doit pas réapparaître en boucle.

## Anti-spam
- `dedupe_key` unique par Budget pour les événements.
- index unique Todo sur `(Budget, object_type, object_id)` pour empêcher la conversion multiple d’une même notification.
- imports CSV et corrections de rapprochement conservent leurs clés de déduplication.

## Non-régression
- aucune notification ne crée ou ne modifie une opération financière par elle-même.
- le moteur automatique ne tourne que pour le mois courant préparé.
- vue administrateur : Todo et notifications personnelles désactivées.