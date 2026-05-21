'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import { Info } from 'lucide-react'

interface IndicateursProps {
  ratioChargesRevenus: number | null
  tauxMaitrise: number | null
  totalDepenses: number
  totalVariablesBudget: number
  objectifEpargne: number
  capaciteEpargne: number | null
  totalEpargnes: number
  top3Depenses: any[]
  top3Categories: any[]
  getMontantNet: (tx: any) => number
}

export default function IndicateursMois({
  ratioChargesRevenus, tauxMaitrise, totalDepenses, totalVariablesBudget,
  objectifEpargne, capaciteEpargne, totalEpargnes,
  top3Depenses, top3Categories, getMontantNet
}: IndicateursProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm text-slate-400">Indicateurs du mois</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {/* Fixes / Revenus */}
          <IndicatorRow icon="💶" label="Fixes / Revenus" value={ratioChargesRevenus !== null ? `${ratioChargesRevenus}%` : '—'}
            color={ratioChargesRevenus !== null && ratioChargesRevenus <= 50 ? 'text-emerald-400' : 'text-amber-400'}
            tooltipKey="ratio" activeTooltip={activeTooltip} setActiveTooltip={setActiveTooltip} />

          {/* Maîtrise */}
          <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <div>
                <span className="text-xs text-slate-400">Maîtrise</span>
                <p className="text-[10px] text-slate-600">{formatEuro(totalDepenses)} / {formatEuro(totalVariablesBudget)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className={`text-lg font-bold ${tauxMaitrise !== null && tauxMaitrise <= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                {tauxMaitrise !== null ? `${tauxMaitrise}%` : '—'}
              </span>
              <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'maitrise' ? null : 'maitrise')} className="text-slate-600 hover:text-slate-400">
                <Info className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Capacité épargne */}
          <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">💰</span>
              <div>
                <span className="text-xs text-slate-400">Épargne (règle 20%)</span>
                <p className="text-[10px] text-slate-600">Objectif : {formatEuro(objectifEpargne)}</p>
                <p className={`text-[10px] ${totalEpargnes >= objectifEpargne && objectifEpargne > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Épargné : {formatEuro(totalEpargnes)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className={`text-lg font-bold ${capaciteEpargne !== null && capaciteEpargne >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {capaciteEpargne !== null ? `${capaciteEpargne}%` : '—'}
              </span>
              <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'surplus' ? null : 'surplus')} className="text-slate-600 hover:text-slate-400">
                <Info className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {activeTooltip === 'ratio' && (
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
            Part des charges fixes dans vos revenus actifs uniquement. Idéalement en dessous de 50%.
          </div>
        )}
        {activeTooltip === 'maitrise' && (
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
            Dépenses réelles par rapport au budget total prévu. En dessous de 100% = vous êtes dans les clous.
          </div>
        )}
        {activeTooltip === 'surplus' && (
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
            Objectif = (Revenus actifs + passifs + Reste M-1 − Charges fixes) × 20%. Atteindre 100% = objectif atteint.
          </div>
        )}

        {top3Depenses.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">🏆 Top 3 dépenses du mois</p>
            <div className="space-y-1">
              {top3Depenses.map((tx: any, i: number) => (
                <div key={tx.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-600">{i + 1}.</span>
                    <span className="text-xs">{tx.categorie?.icone || '📦'}</span>
                    <span className="text-xs text-slate-300 truncate">{tx.infos || tx.categorie?.nom || 'Dépense'}</span>
                  </div>
                  <span className="text-xs font-bold text-pink-400 flex-shrink-0">{formatEuro(getMontantNet(tx))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {top3Categories.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">📊 Top 3 catégories du mois</p>
            <div className="space-y-1">
              {top3Categories.map((cat: any, i: number) => (
                <div key={cat.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-600">{i + 1}.</span>
                    <span className="text-xs">{cat.icone || '📂'}</span>
                    <span className="text-xs text-slate-300 truncate">{cat.nom}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-pink-400">{formatEuro(cat.depense)}</span>
                    {cat.prevu > 0 && (
                      <span className={`text-xs ml-1 ${cat.depense <= cat.prevu ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        / {formatEuro(cat.prevu)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IndicatorRow({ icon, label, value, color, tooltipKey, activeTooltip, setActiveTooltip }: any) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span className={`text-lg font-bold ${color}`}>{value}</span>
        <button type="button" onClick={() => setActiveTooltip(activeTooltip === tooltipKey ? null : tooltipKey)} className="text-slate-600 hover:text-slate-400">
          <Info className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}