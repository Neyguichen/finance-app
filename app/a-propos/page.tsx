'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ExternalLink, Mail, BookOpen, Code2 } from 'lucide-react'

export default function AProposPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">À propos</h1>

      {/* Stack technique */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-blue-400">Stack technique</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'Framework', value: 'Next.js 14' },
              { label: 'UI', value: 'Tailwind + daisyUI' },
              { label: 'BDD', value: 'Supabase' },
              { label: 'Auth', value: 'Supabase Auth' },
              { label: 'Graphiques', value: 'Recharts' },
              { label: 'PWA', value: 'Serwist' },
              { label: 'Hébergement', value: 'Vercel' },
              { label: 'État', value: 'React Query' },
            ].map(item => (
              <div key={item.label} className="flex justify-between bg-slate-800 rounded-lg px-3 py-2">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center mt-2">
            100% gratuit · Open source
          </p>
        </CardContent>
      </Card>

      {/* Crédit */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <p className="text-sm text-slate-300">
            Développé avec ❤️ par <span className="font-semibold text-white">Stéphane</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">v2.0 — Architecture Espaces</p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-purple-400" />
            <h2 className="font-semibold text-purple-400 text-sm">Contact</h2>
          </div>
          <a
            href="mailto:larzet.s@gmail.com"
            className="text-sm text-blue-400 underline"
          >
            larzet.s@gmail.com
          </a>
        </CardContent>
      </Card>

      {/* Guide utilisateur */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <a
            href="https://elslafo.notion.site/Finance-App-Guide-utilisateur-0c8a6c8f125545d09b522038da1bb096?source=app"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-semibold">Guide utilisateur</span>
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        </CardContent>
      </Card>
    </div>
  )
}