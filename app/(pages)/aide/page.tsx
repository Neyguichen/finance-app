'use client'

import { useState } from 'react'
import { BookOpen, Bug, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useFeedback } from '@/lib/hooks/useFeedback'
import MigrationV1Card from '@/components/migration/MigrationV1Card'

export default function AidePage() {
  const { espace, updateEspace, isAdminViewing } = useApp()
  const feedback = useFeedback(espace?.id)
  const [kind, setKind] = useState<'bug' | 'suggestion'>('bug')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!title.trim() || !message.trim()) return
    await feedback.create.mutateAsync({
      kind,
      title: title.trim(),
      message: message.trim(),
    })
    setTitle('')
    setMessage('')
    setSent(true)
  }

  if (isAdminViewing) {
    return <div className="p-4 text-sm text-slate-400">L’aide personnelle est désactivée en vue administrateur.</div>
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-3 pb-24 sm:p-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-blue-400">Aide & accompagnement</p>
        <h1 className="mt-1 text-2xl font-bold">Bien utiliser Neyguichen</h1>
        <p className="mt-2 text-sm text-slate-400">
          Retrouve les principes importants de la V2 et relance le guide de démarrage quand tu en as besoin.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <HelpCard
          icon={BookOpen}
          title="Le Budget"
          text="Un Budget est un espace financier indépendant. Naviguer dans le temps ne crée jamais automatiquement de données."
        />
        <HelpCard
          icon={CheckCircle2}
          title="Prévu ≠ réel"
          text="Les prévisions restent distinctes des opérations réellement reçues, payées ou validées."
        />
        <HelpCard
          icon={RotateCcw}
          title="Solde de référence"
          text="Le solde réel daté sert de point d’ancrage. Les calculs futurs repartent de ce stock sans réécrire l’historique."
        />
        <HelpCard
          icon={Lightbulb}
          title="Rapprochement"
          text="Neyguichen peut proposer des pistes mais ne corrige jamais silencieusement une opération financière."
        />
      </section>

      <MigrationV1Card espace={espace} />

      {espace && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-semibold">Guide de démarrage</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tu peux relancer le guide pour le Budget <strong className="text-slate-300">{espace.nom}</strong>.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm mt-3"
            onClick={() => updateEspace(espace.id, { onboarding_completed: false })}
          >
            <RotateCcw className="h-4 w-4" />
            Relancer le guide
          </button>
        </section>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start gap-3">
          <Bug className="mt-0.5 h-5 w-5 text-amber-400" />
          <div>
            <h2 className="font-semibold">Signaler un bug ou proposer une amélioration</h2>
            <p className="mt-1 text-xs text-slate-500">
              Le message est enregistré avec le Budget courant pour faciliter le suivi.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            className={`btn btn-sm ${kind === 'bug' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setKind('bug')}
          >
            Bug
          </button>
          <button
            type="button"
            className={`btn btn-sm ${kind === 'suggestion' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setKind('suggestion')}
          >
            Suggestion
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <input
            className="input input-bordered w-full bg-slate-950"
            placeholder="Titre"
            value={title}
            onChange={event => { setTitle(event.target.value); setSent(false) }}
          />
          <textarea
            className="textarea textarea-bordered min-h-28 w-full bg-slate-950"
            placeholder="Décris le problème ou l’idée le plus précisément possible…"
            value={message}
            onChange={event => { setMessage(event.target.value); setSent(false) }}
          />
          <div className="flex items-center justify-between gap-3">
            {sent ? (
              <span className="text-sm text-emerald-400">Merci, ton retour a été enregistré.</span>
            ) : <span />}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={submit}
              disabled={!title.trim() || !message.trim() || feedback.create.isPending}
            >
              Envoyer
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function HelpCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <Icon className="h-5 w-5 text-blue-400" />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </article>
  )
}
