# Phase 11 — Direction artistique & nettoyage V1

## Direction artistique retenue

**Produit : Neyguichen Finances**

Principes :
- ambiance sombre premium, plus profonde que le thème Slate/DaisyUI V1 ;
- indigo comme couleur de marque, cyan comme accent secondaire, vert pour le positif ;
- surfaces légèrement translucides, bordures discrètes et rayons cohérents ;
- hiérarchie typographique plus nette : eyebrow → titre → contexte ;
- limiter les couleurs fortes aux informations qui ont réellement une signification ;
- navigation et identité cohérentes sur mobile et desktop.

## Bloc 1 — fondations

- tokens visuels globaux dans `app/globals.css`;
- thème DaisyUI personnalisé `neyguichen`;
- primitives Button / Card / Input / Dialog harmonisées ;
- composants `BrandMark` et `PageHeader`;
- shell global, sélecteur de Budget, sélecteur de mois et menu latéral retravaillés ;
- navigation mobile consolidée sur Résumé / Revenus / Dépenses / Épargne / Dettes ;
- métadonnées, manifeste PWA et connexion renommés **Neyguichen Finances** ;
- URL de callback d’inscription mise à jour vers `https://neyguichen-finances.vercel.app/auth/callback`.

## Dashboard

Le Dashboard ne rend plus les cartes V1 conservées temporairement pendant la migration :
- `ResteAVivreCard`
- `EntrantsCard`
- `SortantsCard`
- `RepartitionCategories`
- `IndicateursMois`

Les blocs V2 deviennent l’unique interface du résumé :
- situation financière ;
- prévu / réel ;
- budgets ;
- épargne / dettes ;
- comprendre ;
- Todo.

Un hook `useDashboardInsights` remplace `useDashboardData` pour les quelques indicateurs utiles à « Comprendre » sans recalculer tout le Dashboard historique V1.

## Routes V1

Les routes historiques :
- `/charges-fixes`
- `/variables`

ne sont plus exposées dans la navigation. Elles redirigent vers `/depenses` afin de conserver les anciens favoris/liens sans maintenir deux interfaces concurrentes.

## Nettoyage code

Les composants exclusivement V1 et hooks devenus sans appel peuvent être supprimés dans ce bloc. Les mécanismes de **compatibilité de données historiques** ne doivent pas être supprimés uniquement parce qu’ils sont hérités de V1.

À conserver notamment :
- `solde_initial` pour les périodes historiques antérieures aux références V2 ;
- les fallbacks historiques de dates réelles manquantes dans le moteur de solde ;
- toute donnée V1 existante encore nécessaire aux calculs historiques.

## Non-régression attendue

- aucune modification de règle comptable ;
- aucune migration destructive ;
- aucune opération financière créée par navigation ;
- prévu et réel restent distincts ;
- anciennes URL internes de dépenses redirigées, pas cassées ;
- inscription et callback utilisent le nouveau domaine ;
- mobile et desktop conservent les mêmes fonctions.
