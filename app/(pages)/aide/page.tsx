'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bug,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  HelpCircle,
  Import,
  Landmark,
  Lightbulb,
  Mail,
  PiggyBank,
  ReceiptText,
  RefreshCcw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useFeedback } from '@/lib/hooks/useFeedback'
import MigrationV1Card from '@/components/migration/MigrationV1Card'
import { APP_VERSION } from '@/lib/version'

type Article = {
  id: string
  title: string
  description: string
  category: 'start' | 'feature' | 'popular' | 'about'
  icon: any
  duration?: string
  keywords: string[]
  sections: Array<{ title: string; body: string }>
}

const articles: Article[] = [
  {
    id: 'premiers-pas',
    title: 'Premiers pas',
    description: 'Découvrir l’application et comprendre sa logique générale.',
    category: 'start',
    icon: Rocket,
    duration: '5 min',
    keywords: ['débuter', 'prise en main', 'budget', 'navigation'],
    sections: [
      { title: '1. Créer ou sélectionner un budget', body: 'Un budget est un espace financier indépendant. Il regroupe ses revenus, dépenses, épargne, dettes et réglages.' },
      { title: '2. Préparer le mois', body: 'Prépare le mois courant pour retrouver tes revenus, charges fixes et budgets variables prévus. Tu peux ensuite ajuster chaque élément.' },
      { title: '3. Enregistrer le réel', body: 'Au fil du mois, valide les revenus reçus, les charges payées et les dépenses réellement effectuées.' },
      { title: '4. Lire le tableau de bord', body: 'Le tableau de bord synthétise ta situation du mois : disponible, prévu fin de mois, projection, budgets et tendances.' },
    ],
  },
  {
    id: 'creer-budget',
    title: 'Créer un budget',
    description: 'Configurer un nouvel espace financier étape par étape.',
    category: 'start',
    icon: WalletCards,
    duration: '4 min',
    keywords: ['budget', 'création', 'espace'],
    sections: [
      { title: '1. Accéder aux budgets', body: 'Utilise le sélecteur de budget en haut de l’application puis choisis « Créer un budget ».' },
      { title: '2. Renseigner les informations', body: 'Choisis un nom, une icône et les paramètres de base de ton nouvel espace financier.' },
      { title: '3. Définir ton point de départ', body: 'Renseigne un solde réel daté afin que Neyguichen puisse calculer correctement ta trésorerie.' },
      { title: '4. Préparer ton premier mois', body: 'Ajoute ensuite tes revenus, charges fixes, budgets variables et objectifs d’épargne.' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Comprendre le tableau de bord',
    description: 'Lire rapidement les indicateurs utiles du mois.',
    category: 'start',
    icon: BarChart3,
    duration: '3 min',
    keywords: ['dashboard', 'tableau de bord', 'disponible', 'projection'],
    sections: [
      { title: 'Disponible aujourd’hui', body: 'C’est le solde calculé à partir des mouvements réellement enregistrés jusqu’à aujourd’hui.' },
      { title: 'Prévu fin de mois', body: 'Cette valeur suit ton budget prévu : solde actuel, revenus attendus et sorties encore planifiées.' },
      { title: 'Projection fin de mois', body: 'Cette estimation tient compte de ton rythme actuel de dépenses variables et le projette jusqu’à la fin du mois.' },
      { title: 'À surveiller', body: 'Cette zone met en avant les éléments qui nécessitent ton attention, comme un budget proche de sa limite.' },
    ],
  },
  {
    id: 'prevu-reel',
    title: 'Prévu vs réel',
    description: 'Comprendre les écarts entre ton budget et ce qui s’est réellement passé.',
    category: 'start',
    icon: TrendingUp,
    duration: '4 min',
    keywords: ['prévu', 'réel', 'écart', 'comparaison'],
    sections: [
      { title: 'Le prévu', body: 'Le montant prévu correspond à ce que tu avais budgété pour la période.' },
      { title: 'Le réel', body: 'Le réel correspond aux revenus reçus, charges payées, dépenses validées et mouvements effectivement enregistrés.' },
      { title: 'L’écart', body: 'L’écart te permet de repérer rapidement si tu as dépensé plus ou moins que prévu, ou si un revenu attendu manque encore.' },
    ],
  },
  {
    id: 'revenus',
    title: 'Revenus',
    description: 'Gérer les revenus attendus, reçus et récurrents.',
    category: 'feature',
    icon: TrendingUp,
    duration: '6 articles',
    keywords: ['revenus', 'salaire', 'récurrence', 'prévision'],
    sections: [
      { title: 'Revenus prévus', body: 'Ajoute les revenus que tu attends pour le mois afin de construire ton budget prévisionnel.' },
      { title: 'Revenus reçus', body: 'Valide un revenu lorsqu’il est effectivement reçu. La date de validation permet de suivre le réel.' },
      { title: 'Récurrences', body: 'Les revenus récurrents peuvent être préparés automatiquement pour les prochains mois.' },
    ],
  },
  {
    id: 'depenses',
    title: 'Dépenses',
    description: 'Ajouter, catégoriser et suivre tes dépenses.',
    category: 'feature',
    icon: ReceiptText,
    duration: '8 articles',
    keywords: ['dépenses', 'charges', 'catégories', 'validation'],
    sections: [
      { title: 'Dépenses prévues', body: 'Les charges fixes et budgets variables construisent la partie prévisionnelle de tes dépenses.' },
      { title: 'Dépenses réelles', body: 'Une dépense devient réelle lorsqu’elle possède une date de validation.' },
      { title: 'Catégories et sous-catégories', body: 'Classe les dépenses par catégorie puis affine ton analyse avec les sous-catégories.' },
    ],
  },
  {
    id: 'epargne',
    title: 'Épargne',
    description: 'Gérer tes enveloppes, objectifs et mouvements.',
    category: 'feature',
    icon: PiggyBank,
    duration: '5 articles',
    keywords: ['épargne', 'enveloppe', 'objectif'],
    sections: [
      { title: 'Enveloppes', body: 'Chaque enveloppe représente un objectif ou une réserve distincte.' },
      { title: 'Épargner ou reprendre', body: 'Les mouvements alimentent ou diminuent une enveloppe tout en conservant son historique.' },
      { title: 'Objectifs', body: 'Associe un objectif à une enveloppe pour suivre ta progression.' },
    ],
  },
  {
    id: 'dettes',
    title: 'Dettes & créances',
    description: 'Suivre ce que tu dois et ce que l’on te doit.',
    category: 'feature',
    icon: Landmark,
    duration: '6 articles',
    keywords: ['dette', 'créance', 'crédit', 'remboursement'],
    sections: [
      { title: 'Je dois', body: 'Enregistre les montants que tu dois rembourser et suis leur solde restant.' },
      { title: 'On me doit', body: 'Les créances permettent de suivre les sommes que d’autres personnes doivent te rembourser.' },
      { title: 'Remboursements', body: 'Chaque remboursement réduit le montant restant et peut, selon sa configuration, impacter le budget du mois.' },
    ],
  },
  {
    id: 'analyses',
    title: 'Analyses',
    description: 'Lire et comprendre les tendances de tes finances.',
    category: 'feature',
    icon: BarChart3,
    duration: '7 articles',
    keywords: ['analyse', 'statistiques', 'tendance', 'bilan annuel'],
    sections: [
      { title: 'Tendances', body: 'Compare les revenus, dépenses, épargne et résultats sur plusieurs mois.' },
      { title: 'Répartition', body: 'Identifie les catégories qui représentent la plus grande part de tes dépenses.' },
      { title: 'Bilan annuel', body: 'Le bilan annuel rassemble les indicateurs de l’année et permet des comparaisons sur une période plus longue.' },
    ],
  },
  {
    id: 'import',
    title: 'Import bancaire',
    description: 'Importer un relevé CSV puis valider les opérations progressivement.',
    category: 'feature',
    icon: Import,
    duration: '8 min',
    keywords: ['csv', 'import', 'banque', 'rapprochement', 'date validation', 'date opération', 'débit', 'crédit', 'catégorie', 'sous-catégorie', 'épargne', 'validation'],
    sections: [
      { title: 'Principe', body: 'Neyguichen sépare l’import du classement. Le fichier est d’abord analysé puis enregistré dans une file « Transactions importées à valider ». Les lignes de cette file n’impactent pas encore les revenus, dépenses, épargne ou statistiques tant qu’elles ne sont pas validées.' },
      { title: 'Imports successifs et file commune', body: 'Une fois un fichier enregistré, tu peux immédiatement importer un autre relevé même si certaines transactions précédentes restent à valider. Chaque fichier conserve son propre lot dans l’historique, tandis que toutes les lignes non traitées alimentent une file commune « Transactions importées à valider ».' },
      { title: 'Colonnes obligatoires', body: 'Date bancaire / validation : date à laquelle l’opération apparaît comme validée par la banque. Libellé : texte décrivant l’opération. Montant : soit une colonne « Montant (+ / −) » avec dépenses négatives et entrées positives, soit deux colonnes séparées Débit et Crédit.' },
      { title: 'Date d’opération — facultative', body: 'Valeur attendue : une date lisible, par exemple 02/10/2026 ou 2026-10-02. Si elle n’existe pas, Neyguichen reprend automatiquement la Date bancaire / validation comme date d’opération.' },
      { title: 'Catégorie — facultative', body: 'Valeur attendue : le nom exact d’une catégorie existante du Budget, par exemple « Alimentation ». Si le nom correspond, la catégorie est préaffectée ; sinon elle pourra être choisie dans l’écran de validation.' },
      { title: 'Sous-catégorie — facultative', body: 'Valeur attendue : le nom exact d’une sous-catégorie appartenant à la catégorie indiquée, par exemple « Courses ». Elle reste modifiable avant validation.' },
      { title: 'Nature — facultative', body: 'Valeurs reconnues : Dépense, Revenu, Versement épargne, Reprise épargne, Remboursement d’une dépense ou Ignorer. Si la nature est absente, Neyguichen propose par défaut Revenu pour un montant positif et Dépense pour un montant négatif. Un remboursement doit ensuite être rattaché à la dépense concernée, qu’elle soit déjà validée ou encore dans la file d’attente.' },
      { title: 'Note — facultative', body: 'Valeur attendue : texte libre. Elle complète le libellé et pourra être corrigée dans la file de validation.' },
      { title: 'Type de revenu — facultatif', body: 'Valeurs reconnues : Actif ou Passif. Ce champ n’est utilisé que lorsque la ligne est classée en Revenu.' },
      { title: 'Enveloppe d’épargne — facultative', body: 'Valeur attendue : le nom exact d’une enveloppe existante. Ce champ est utilisé pour les versements et reprises d’épargne.' },
      { title: 'Prévisualisation', body: 'La prévisualisation vérifie surtout que les dates, libellés et montants sont lisibles. Il n’est pas nécessaire de classer toutes les lignes à ce stade. Les doublons potentiels avec les opérations déjà validées et les doublons internes au fichier sont signalés.' },
      { title: 'Transactions importées à valider', body: 'Après enregistrement, toutes les lignes rejoignent un écran global dédié, quel que soit leur fichier d’origine. Tu peux filtrer par fichier puis modifier date d’opération, date de validation, libellé, montant, nature, catégorie, sous-catégorie, note, type de revenu ou enveloppe. Chaque modification est sauvegardée pour pouvoir reprendre plus tard.' },
      { title: 'Détection des doublons pendant la validation', body: 'La file est de nouveau analysée avant validation : Neyguichen signale les correspondances avec les opérations déjà validées et les doublons potentiels entre toutes les transactions encore à valider, y compris lorsqu’elles proviennent de fichiers différents. Un doublon potentiel reste « À décider » jusqu’à ce que tu choisisses Créer quand même, Rapprocher ou Ignorer.' },
      { title: 'Validation individuelle, en lot ou globale', body: 'Tu peux valider une ligne, sélectionner plusieurs lignes pour leur appliquer une affectation commune, ou valider toutes les opérations suffisamment renseignées. Les lignes incomplètes restent dans la file pour être traitées plus tard.' },
      { title: 'Format mémorisé', body: 'Les associations de colonnes peuvent être enregistrées sous un nom afin de retrouver automatiquement le même mapping lors du prochain export de cette banque.' },
    ],
  },
  {
    id: 'rapprochement',
    title: 'Comment fonctionne le rapprochement bancaire ?',
    description: 'Comprendre les propositions de rapprochement et leur validation.',
    category: 'popular',
    icon: RefreshCcw,
    keywords: ['rapprochement', 'banque', 'csv'],
    sections: [
      { title: 'Principe', body: 'Le rapprochement compare les opérations importées avec celles déjà présentes dans l’application.' },
      { title: 'Validation manuelle', body: 'Une correspondance proposée n’est jamais appliquée silencieusement : tu gardes la main sur la décision finale.' },
    ],
  },
  {
    id: 'solde-reporte',
    title: 'Qu’est-ce que le solde reporté M-1 ?',
    description: 'Comprendre comment le solde du mois précédent influence le mois courant.',
    category: 'popular',
    icon: WalletCards,
    keywords: ['solde', 'reporté', 'm-1', 'référence'],
    sections: [
      { title: 'Principe', body: 'Le solde reporté correspond au montant restant à la fin du mois précédent et sert de point de départ au mois suivant.' },
      { title: 'Référence réelle', body: 'Lorsqu’un solde réel daté existe, il sert de point d’ancrage aux calculs sans réécrire l’historique.' },
    ],
  },
  {
    id: 'sous-categories',
    title: 'Comment créer et gérer les sous-catégories ?',
    description: 'Affiner le classement de tes dépenses.',
    category: 'popular',
    icon: ReceiptText,
    keywords: ['catégorie', 'sous-catégorie', 'dépenses'],
    sections: [
      { title: 'Depuis les dépenses', body: 'Les catégories et sous-catégories se gèrent depuis la page Dépenses afin de rester proches de leur usage.' },
      { title: 'Analyse', body: 'Les sous-catégories permettent ensuite d’affiner la répartition et les analyses de dépenses.' },
    ],
  },
  {
    id: 'faq',
    title: 'Foire aux questions',
    description: 'Réponses rapides aux questions les plus fréquentes.',
    category: 'about',
    icon: HelpCircle,
    keywords: ['faq', 'question', 'aide'],
    sections: [
      { title: 'Mes données sont-elles modifiées automatiquement ?', body: 'Non. Les fonctions de rapprochement et de préparation peuvent proposer des actions, mais les opérations sensibles restent sous ton contrôle.' },
      { title: 'Puis-je utiliser plusieurs budgets ?', body: 'Oui. Chaque budget est indépendant et peut avoir ses propres revenus, dépenses, épargne et paramètres.' },
      { title: 'Puis-je revenir sur un ancien mois ?', body: 'Oui. La navigation temporelle permet de consulter les mois précédents sans recréer les données.' },
    ],
  },
  {
    id: 'confidentialite',
    title: 'Politique de confidentialité',
    description: 'Comprendre quelles données sont utilisées par l’application.',
    category: 'about',
    icon: ShieldCheck,
    keywords: ['confidentialité', 'données', 'vie privée'],
    sections: [
      { title: 'Données financières', body: 'Les données saisies servent au fonctionnement des budgets et calculs de l’application.' },
      { title: 'Retours support', body: 'Lorsqu’un rapport technique est joint volontairement à un retour, il sert uniquement à faciliter le diagnostic.' },
    ],
  },
  {
    id: 'conditions',
    title: 'Conditions d’utilisation',
    description: 'Règles générales d’utilisation de Neyguichen Finances.',
    category: 'about',
    icon: FileText,
    keywords: ['conditions', 'utilisation', 'règles'],
    sections: [
      { title: 'Outil d’aide à la gestion', body: 'Neyguichen Finances aide à organiser et analyser un budget personnel. Les calculs dépendent des données renseignées.' },
      { title: 'Responsabilité des données', body: 'Vérifie les montants et informations importés ou saisis avant de prendre une décision financière.' },
    ],
  },
]

const updates = [
  { title: 'Centre d’aide repensé', description: 'Recherche, guides par fonctionnalité et accès support regroupés au même endroit.', date: '1 oct. 2026', tone: 'bg-fuchsia-500/10 text-fuchsia-300', label: 'Nouveau' },
  { title: 'Tableau de bord amélioré', description: 'Nouvelle hiérarchie visuelle, tendances financières et alertes plus lisibles.', date: '1 oct. 2026', tone: 'bg-emerald-500/10 text-emerald-300', label: 'Amélioration' },
  { title: 'Import bancaire', description: 'Les relevés CSV peuvent être importés puis rapprochés avec les opérations existantes.', date: 'sept. 2026', tone: 'bg-cyan-500/10 text-cyan-300', label: 'Fonctionnalité' },
]

export default function AidePage() {
  const { espace, updateEspace, isAdminViewing } = useApp()
  const feedback = useFeedback(espace?.id)
  const [query, setQuery] = useState('')
  const [articleId, setArticleId] = useState<string | null>(null)

  useEffect(() => {
    const requestedArticle = new URLSearchParams(window.location.search).get('article')
    if (requestedArticle && articles.some(article => article.id === requestedArticle)) {
      setArticleId(requestedArticle)
    }
  }, [])
  const [feedbackKind, setFeedbackKind] = useState<'bug' | 'suggestion' | null>(null)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState('')
  const [includeTech, setIncludeTech] = useState(true)
  const [sent, setSent] = useState(false)

  const selectedArticle = articles.find(article => article.id === articleId) || null

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr-FR')
    if (!normalized) return []
    return articles.filter(article => {
      const haystack = [article.title, article.description, ...article.keywords].join(' ').toLocaleLowerCase('fr-FR')
      return haystack.includes(normalized)
    }).slice(0, 8)
  }, [query])

  if (isAdminViewing) {
    return <div className="p-4 text-sm text-slate-400">L’aide personnelle est désactivée en vue administrateur.</div>
  }

  const openArticle = (id: string) => {
    setFeedbackKind(null)
    setArticleId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openFeedback = (kind: 'bug' | 'suggestion') => {
    setArticleId(null)
    setFeedbackKind(kind)
    setSent(false)
    setMessage('')
    setPage(typeof window !== 'undefined' ? window.location.pathname : '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const backHome = () => {
    setArticleId(null)
    setFeedbackKind(null)
    setSent(false)
  }

  const submitFeedback = async () => {
    if (!feedbackKind || !message.trim()) return
    const tech = includeTech && typeof window !== 'undefined'
      ? `\n\n--- Informations techniques ---\nVersion : ${APP_VERSION}\nPage : ${page || window.location.pathname}\nNavigateur : ${navigator.userAgent}`
      : ''
    await feedback.create.mutateAsync({
      kind: feedbackKind,
      title: feedbackKind === 'bug' ? 'Signalement depuis le centre d’aide' : 'Suggestion depuis le centre d’aide',
      message: message.trim() + tech,
    })
    setSent(true)
  }

  if (selectedArticle) {
    const Icon = selectedArticle.icon
    return (
      <div className="mx-auto w-full max-w-3xl p-3 pb-24 sm:p-4">
        <button type="button" onClick={backHome} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Retour à l’aide
        </button>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-500/10">
              <Icon className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{selectedArticle.title}</h1>
              {selectedArticle.duration && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{selectedArticle.duration}</p>}
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">{selectedArticle.description}</p>
          <div className="mt-6 space-y-5">
            {selectedArticle.sections.map(section => (
              <section key={section.title} className="relative border-l border-slate-700 pl-5">
                <h2 className="text-sm font-semibold text-slate-100">{section.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-400">{section.body}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    )
  }

  if (feedbackKind) {
    const isBug = feedbackKind === 'bug'
    return (
      <div className="mx-auto w-full max-w-2xl p-3 pb-24 sm:p-4">
        <button type="button" onClick={backHome} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Retour à l’aide
        </button>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isBug ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300'}`}>
              {isBug ? <Bug className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{isBug ? 'Signaler un bug' : 'Proposer une amélioration'}</h1>
              <p className="text-xs text-slate-500">{isBug ? 'Décris ce qui s’est passé afin de faciliter le diagnostic.' : 'Décris ton idée et ce qu’elle améliorerait.'}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-300">{isBug ? 'Que s’est-il passé ?' : 'Votre suggestion'} <span className="text-rose-400">*</span></span>
              <textarea
                value={message}
                onChange={event => { setMessage(event.target.value); setSent(false) }}
                className="textarea textarea-bordered mt-2 min-h-32 w-full bg-slate-950"
                placeholder={isBug ? 'Décrivez le problème…' : 'Décrivez votre idée…'}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-300">{isBug ? 'Sur quelle page ?' : 'Concerne principalement'}</span>
              <input
                value={page}
                onChange={event => setPage(event.target.value)}
                className="input input-bordered mt-2 w-full bg-slate-950"
                placeholder={isBug ? '/depenses' : 'Ex. Analyses, Dépenses, Dashboard…'}
              />
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <input type="checkbox" className="checkbox checkbox-sm mt-0.5" checked={includeTech} onChange={event => setIncludeTech(event.target.checked)} />
              <span>
                <span className="block text-xs font-medium text-slate-300">Joindre les informations techniques</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-slate-600">Version, navigateur et page actuelle. Aucune donnée financière n’est transmise.</span>
              </span>
            </label>

            <div className="flex items-center justify-between gap-3">
              {sent ? <span className="text-sm text-emerald-400">Merci, ton retour a été enregistré.</span> : <span />}
              <button type="button" onClick={submitFeedback} disabled={!message.trim() || feedback.create.isPending} className="btn btn-primary btn-sm min-w-28">
                Envoyer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const startArticles = articles.filter(article => article.category === 'start')
  const featureArticles = articles.filter(article => article.category === 'feature')
  const popularArticles = articles.filter(article => article.category === 'popular')
  const aboutArticles = articles.filter(article => article.category === 'about')

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-3 pb-24 sm:p-4">
      <div className="grid gap-4 xl:grid-cols-[1.7fr_.9fr]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Aide & Support</h1>
          <p className="mt-1 text-sm text-slate-500">Trouve rapidement une réponse, découvre l’application et fais-nous part de tes retours.</p>

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Rechercher dans l’aide… (ex. budget, import CSV, solde reporté…)"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-11 pr-10 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-400"
            />
            {query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 hover:text-slate-300"><X className="h-4 w-4" /></button>}
            {query && (
              <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
                {results.length === 0 ? <p className="p-4 text-sm text-slate-500">Aucun résultat.</p> : results.map(article => (
                  <button key={article.id} type="button" onClick={() => { openArticle(article.id); setQuery('') }} className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left last:border-0 hover:bg-slate-900">
                    <article.icon className="h-4 w-4 shrink-0 text-indigo-300" />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-200">{article.title}</span><span className="block truncate text-xs text-slate-600">{article.description}</span></span>
                    <ChevronRight className="h-4 w-4 text-slate-700" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.10] to-slate-900 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-100">Première fois sur Neyguichen ?</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">Découvre l’application pas à pas en quelques minutes.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15"><Sparkles className="h-6 w-6 text-indigo-300" /></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {espace && <button type="button" onClick={() => updateEspace(espace.id, { onboarding_completed: false })} className="btn btn-primary btn-sm"><RefreshCcw className="h-4 w-4" />Relancer la visite guidée</button>}
            <button type="button" onClick={() => document.getElementById('guides')?.scrollIntoView({ behavior: 'smooth' })} className="btn btn-outline btn-sm">Explorer seul</button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_.72fr]">
        <main className="space-y-4">
          <HelpSection title="Démarrer avec Neyguichen" action="Voir tous les guides">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {startArticles.map(article => <GuideCard key={article.id} article={article} onOpen={openArticle} />)}
            </div>
          </HelpSection>

          <HelpSection id="guides" title="Guides par fonctionnalités" action="Voir tous les guides">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {featureArticles.map(article => <FeatureCard key={article.id} article={article} onOpen={openArticle} />)}
            </div>
          </HelpSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <HelpSection title="Articles populaires">
              <div className="divide-y divide-slate-800">
                {popularArticles.map(article => <ArticleRow key={article.id} article={article} onOpen={openArticle} />)}
              </div>
            </HelpSection>

            <HelpSection id="updates" title="Nouveautés récentes">
              <div className="space-y-2">
                {updates.map(update => (
                  <div key={update.title} className="rounded-xl border border-slate-800 bg-slate-950/25 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-200">{update.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${update.tone}`}>{update.label}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{update.description}</p>
                    <p className="mt-1 text-[10px] text-slate-700">{update.date}</p>
                  </div>
                ))}
              </div>
            </HelpSection>
          </div>

          <MigrationV1Card espace={espace} />
        </main>

        <aside className="space-y-4">
          <HelpSection title="Besoin d’aide ?">
            <div className="space-y-2">
              <ActionCard icon={Bug} tone="rose" title="Signaler un bug" description="Un problème avec l’application ?" onClick={() => openFeedback('bug')} />
              <ActionCard icon={Lightbulb} tone="amber" title="Proposer une amélioration" description="Une idée pour la rendre encore meilleure ?" onClick={() => openFeedback('suggestion')} />
              <a href="mailto:larzet.s@gmail.com" className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 transition hover:border-slate-700 hover:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10"><Mail className="h-4 w-4 text-violet-300" /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">Contacter le support</p><p className="truncate text-xs text-slate-600">Une question ? Notre équipe vous répond.</p></div>
                <ChevronRight className="h-4 w-4 text-slate-700" />
              </a>
            </div>
          </HelpSection>

          <HelpSection title="À propos">
            <div className="divide-y divide-slate-800">
              <InfoRow icon={Sparkles} label="Nouveautés de la version" detail={`Version ${APP_VERSION}`} onClick={() => document.getElementById('updates')?.scrollIntoView({ behavior: 'smooth' })} />
              {aboutArticles.map(article => <InfoRow key={article.id} icon={article.icon} label={article.title} detail={article.description} onClick={() => openArticle(article.id)} />)}
              <div className="py-3">
                <div className="flex items-center gap-3">
                  <CircleHelp className="h-4 w-4 shrink-0 text-indigo-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-slate-300">Neyguichen Finances</span>
                    <span className="block text-[10px] text-slate-600">Version {APP_VERSION} · Next.js · Supabase · Vercel</span>
                  </span>
                </div>
                <p className="mt-2 pl-7 text-[10px] leading-4 text-slate-600">Application de gestion budgétaire personnelle conçue pour suivre le prévu, le réel, l’épargne, les dettes et les tendances financières.</p>
              </div>
            </div>
          </HelpSection>
        </aside>
      </div>
    </div>
  )
}

function HelpSection({ title, action, id, children }: { title: string; action?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-slate-800 bg-slate-900/75 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100 sm:text-base">{title}</h2>
        {action && <span className="text-[10px] text-cyan-300 sm:text-xs">{action} <ArrowRight className="ml-1 inline h-3 w-3" /></span>}
      </div>
      {children}
    </section>
  )
}

function GuideCard({ article, onOpen }: { article: Article; onOpen: (id: string) => void }) {
  const Icon = article.icon
  return (
    <button type="button" onClick={() => onOpen(article.id)} className="min-h-36 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-left transition hover:border-slate-700 hover:bg-slate-900">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10"><Icon className="h-4 w-4 text-indigo-300" /></div>
      <p className="mt-3 text-sm font-semibold text-slate-200">{article.title}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-600">{article.description}</p>
      {article.duration && <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-500"><Clock3 className="h-3 w-3" />{article.duration}</p>}
    </button>
  )
}

function FeatureCard({ article, onOpen }: { article: Article; onOpen: (id: string) => void }) {
  const Icon = article.icon
  return (
    <button type="button" onClick={() => onOpen(article.id)} className="flex min-h-28 flex-col rounded-xl border border-slate-800 bg-slate-950/25 p-3 text-left transition hover:border-slate-700 hover:bg-slate-900">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10"><Icon className="h-4 w-4 text-cyan-300" /></div>
      <p className="mt-2 text-sm font-semibold text-slate-200">{article.title}</p>
      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-600">{article.description}</p>
      {article.duration && <p className="mt-auto pt-2 text-[10px] text-slate-500">{article.duration}</p>}
    </button>
  )
}

function ArticleRow({ article, onOpen }: { article: Article; onOpen: (id: string) => void }) {
  const Icon = article.icon
  return (
    <button type="button" onClick={() => onOpen(article.id)} className="flex w-full items-center gap-3 py-3 text-left">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800"><Icon className="h-3.5 w-3.5 text-cyan-300" /></div>
      <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{article.title}</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
    </button>
  )
}

function ActionCard({ icon: Icon, tone, title, description, onClick }: { icon: any; tone: 'rose' | 'amber'; title: string; description: string; onClick: () => void }) {
  const toneClass = tone === 'rose' ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300'
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-left transition hover:border-slate-700 hover:bg-slate-900">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{title}</p><p className="truncate text-xs text-slate-600">{description}</p></div>
      <ChevronRight className="h-4 w-4 text-slate-700" />
    </button>
  )
}

function InfoRow({ icon: Icon, label, detail, onClick }: { icon: any; label: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <Icon className="h-4 w-4 shrink-0 text-indigo-300" />
      <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-300">{label}</span><span className="block truncate text-[10px] text-slate-600">{detail}</span></span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
    </button>
  )
}
