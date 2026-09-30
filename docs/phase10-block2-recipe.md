# Phase 10 — Recette Bloc 2

## Référence d'épargne
- une enveloppe existante peut recevoir un solde réel de référence + une date.
- définir cette référence ne crée aucun mouvement d'épargne.
- sur un mois postérieur à la référence, le solde = référence + mouvements strictement postérieurs à la date.
- sur une période antérieure à la référence, conserver le calcul historique V1 basé sur solde_initial.
- modifier ou retirer la référence ne doit pas modifier les mouvements existants.
- les statistiques mensuelles ne doivent jamais compter le stock de référence comme versement ou reprise.

## États vides
- Épargne sans enveloppe : expliquer quoi faire et proposer Créer une enveloppe.
- Épargne sans mouvement : expliquer qu'un mouvement n'est créé que lorsqu'il a réellement lieu.
- Variables sans dépense : expliquer la différence prévu/réel et proposer une action uniquement si le mois existe.
- Dépenses prévues vides : aider à ajouter une charge fixe ou préparer le mois.
- Budgets variables sans catégorie : orienter vers les catégories sans créer de donnée automatiquement.

## Migration V1
- la page Aide affiche un bloc Migration V1 → V2.
- compter les mois historiques conservés.
- indiquer si le solde réel de référence du Budget est défini.
- indiquer combien d'enveloppes possèdent une référence V2.
- fournir des accès directs à Vérifier le solde et Épargne.
- ne jamais forcer de réécriture des données V1.

## Non-régression
- solde_initial reste disponible pour les périodes historiques.
- aucune navigation temporelle ne crée de mois ou d'opération.
- les enveloppes archivées restent lisibles.
- desktop et mobile restent utilisables.
