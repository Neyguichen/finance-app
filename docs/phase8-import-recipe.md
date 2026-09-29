# Phase 8 — Recette ciblée Import CSV

Cette recette est à exécuter dès qu’un build Vercel est de nouveau disponible.

## Mapping et lecture
- CSV avec montant signé.
- CSV avec colonnes Débit / Crédit séparées.
- séparateurs `;`, `,` et tabulation.
- dates françaises et ISO.
- lignes invalides visibles et non importées.

## Décisions explicites
- ligne nouvelle → Créer.
- doublon fort → Rapprocher par défaut, mais possibilité de Créer quand même ou Ignorer.
- charge fixe plausible → Rapprocher par défaut, avec prévu conservé et montant réel issu de la banque.
- toute correspondance doit rester visible avant validation.

## Matching
- même date + montant + libellé proche : doublon fort.
- charge fixe : accepter un petit écart de montant (tolérance max de 1 € ou 5 % du prévu), conserver le prévu et écrire le réel.
- épargne : même date + montant + type → déjà présent.

## Épargne
- versement d’épargne : enveloppe destination obligatoire.
- reprise : enveloppe source obligatoire.
- transfert interne : neutre pour le Budget et ignoré par l’import comptable.
- annulation d’un lot supprime les mouvements créés par ce lot seulement.

## Annulation sûre
- annuler immédiatement un lot non modifié : succès.
- modifier une opération créée par le lot puis tenter l’annulation : refus complet.
- modifier une charge fixe rapprochée puis tenter l’annulation : refus complet.
- aucun lot ne doit être partiellement annulé après un échec de pré-vérification.

## Non-régression
- aucun import ne doit créer de mois en naviguant simplement dans l’interface.
- aucun doublon silencieux.
- prévu et réel restent distincts.
- les caches Dashboard / solde / épargne sont invalidés après import ou annulation.