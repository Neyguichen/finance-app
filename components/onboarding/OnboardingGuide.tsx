'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Landmark, Repeat2, Scale, WalletCards } from 'lucide-react'
import { useApp } from '@/components/AppContext'

const steps = [
  {
    icon: WalletCards,
    title: 'Ton Budget est ton cadre financier',
    text: 'Tu peux créer plusieurs Budgets séparés. Chaque Budget possède ses propres catégories, récurrences, Todo, notifications et réglages.',
  },
  {
    icon: Landmark,
    title: 'Définis un point de départ fiable',
    text: 'Le solde réel de référence permet à Neyguichen de calculer les soldes futurs sans réécrire ton historique.',
  },
  {
    icon: Repeat2,
    title: 'Prépare ton premier mois',
    text: 'Tu peux définir tes récurrences ou commencer avec un mois vide. Changer de mois ne crée jamais d’opération automatiquement.',
  },
  {
    icon: Scale,
    title: 'Vérifie régulièrement le solde',
    text: 'La vérification compare Neyguichen au réel et propose des pistes de rapprochement. Une correction n’est appliquée qu’après confirmation.',
  },
]

export default function OnboardingGuide() {
  const { espace, updateEspace } = useApp()
  const [step, setStep] = useState(0)

  const visible = Boolean(espace && espace.onboarding_completed === false)
  const current = useMemo(() => steps[step], [step])

  if (!visible || !espace) return null

  const finish = async () => {
    await updateEspace(espace.id, { onboarding_completed: true })
  }

  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-[12000] flex items-end justify-center overflow-y-auto bg-black/70 p-3 sm:items-center">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-blue-400">Guide de démarrage</p>
          <span className="text-xs text-slate-600">{step + 1} / {steps.length}</span>
        </div>

        <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row">
          <div className="rounded-xl bg-slate-950 p-3">
            <Icon className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{current.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{current.text}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep(value => Math.max(0, value - 1))}
            disabled={step === 0}
            className="btn btn-ghost btn-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(value => Math.min(steps.length - 1, value + 1))}
              className="btn btn-primary btn-sm"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={finish} className="btn btn-primary btn-sm">
              <CheckCircle2 className="h-4 w-4" />
              Commencer
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={finish}
          className="mt-3 w-full text-center text-xs text-slate-600 hover:text-slate-400"
        >
          Passer le guide
        </button>
      </div>
    </div>
  )
}
