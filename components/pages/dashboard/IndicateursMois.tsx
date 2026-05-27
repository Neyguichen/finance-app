'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import { Info } from 'lucide-react'

interface Props {
  ratioChargesRevenus: number | null
  tauxMaitrise: number | null
  totalDepenses: number
  totalVariablesBudget: number
  objectifEpargne: number
  capaciteEpargne: number | null
  totalEpargnes: number
  top3Depenses: any[]
  top3Categories: any[]
  top3SubCategories?: any[]
  getMontantNet: (tx: any) => number
  showRatioCharges?: boolean
  showMaitrise?: boolean
  showEpargne20?: boolean
  showTop3Depenses?: boolean
  showTop3Categories?: boolean
  showTop3SubCategories?: boolean
}

export default function IndicateursMois({
  ratioChargesRevenus, tauxMaitrise, totalDepenses, totalVariablesBudget,
  objectifEpargne, capaciteEpargne, totalEpargnes,
  top3Depenses, top3Categories, top3SubCategories = [], getMontantNet,
  showRatioCharges = true, showMaitrise = true, showEpargne20 = true,
  showTop3Depenses = true, showTop3Categories = true, showTop3SubCategories = true,
}: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm text-slate-400">Indicateurs du mois</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {/* Fixes / Revenus */}
          {showRatioCharges && (
            <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">💶</span>
                <span className="text-xs text-slate-400">Fixes / Revenus</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className={`text-lg font-bold ${ratioChargesRevenus !== null && ratioChargesRevenus <= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {ratioChargesRevenus !== null ? `${ratioChargesRevenus}%` : '—'}
                </span>
                <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'ratio' ? null : 'ratio')} className="text-slate-600 hover:text-slate-400">
                  <Info className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          {/* Maîtrise */}
          {showMaitrise && (
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
          )}
          {/* Capacité d'épargne — règle 20% */}
          {showEpargne20 && (
            <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">💰</span>
                <div>
                  <span className="text-xs text-slate-400">Épargne (règle 20%)</span>
                  <p className="text-[10px] text-slate-600">
                    Objectif : {formatEuro(objectifEpargne)}
                  </p>
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
          )}
        </div>
        {showRatioCharges && activeTooltip === 'ratio' && (
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
            Part des charges fixes dans vos revenus actifs uniquement. Idéalement en dessous de 50%.
          </div>
        )}
        {showMaitrise && activeTooltip === 'maitrise' && (
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
            Dépenses réelles par rapport au budget total prévu. En dessous de 100% = vous êtes dans les clous.
          </div>
        )}
        {showEpargne20 && activeTooltip === 'surplus' && (
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
            Objectif d&apos;épargne mensuel = (Revenus actifs + passifs − Charges fixes) × 20%. Atteindre 100% signifie que vous épargnez au moins ce que la règle recommande.
          </div>
        )}

        {/* Top 3 dépenses */}
        {showTop3Depenses && top3Depenses.length > 0 && (
          <div className="bg-pink-950/20 border border-pink-900/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-pink-400 mb-2">🏆 Top 3 dépenses du mois</p>
            <div className="space-y-1">
              {top3Depenses.map((tx: any, i: number) => (
                <div key={tx.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-600">{i + 1}.</span>
                    <span className="text-xs">{tx.categorie?.icone || '📦'}</span>
                    <span className="text-xs text-slate-300 truncate">
                      {tx.infos || tx.categorie?.nom || 'Dépense'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-pink-400 flex-shrink-0">{formatEuro(getMontantNet(tx))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 3 catégories avec détail sous-catégories */}
        {showTop3Categories && top3Categories.length > 0 && (
          <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-400 mb-2">📊 Top 3 catégories du mois</p>
            <div className="space-y-1">
              {top3Categories.map((cat: any, i: number) => (
                <div key={cat.id}>
                  {/* Ligne catégorie parente */}
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-2 py-1.5">
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
                  {/* Détail sous-catégories */}
                  {cat.subCats && cat.subCats.length > 0 && (
                    <div className="ml-5 mt-0.5 space-y-0.5">
                      {cat.subCats.map((sc: any) => (
                        <div key={sc.id} className="flex items-center justify-between px-2 py-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px]">{sc.icone || '📎'}</span>
                            <span className="text-[10px] text-slate-400 truncate">{sc.nom}</span>
                          </div>
                          <span className="text-[10px] font-medium text-pink-400/80 flex-shrink-0">{formatEuro(sc.depense)}</span>
                        </div>
                      ))}
                      {/* Dépenses sans sous-cat si il y en a */}
                      {cat.depenseSansSousCat > 0 && cat.subCats.length > 0 && (
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-[10px] text-slate-500 italic">Sans sous-catégorie</span>
                          <span className="text-[10px] font-medium text-pink-400/60 flex-shrink-0">{formatEuro(cat.depenseSansSousCat)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 3 sous-catégories (classement indépendant) */}
        {showTop3SubCategories && top3SubCategories.length > 0 && (
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-emerald-400 mb-2">🏷️ Top 3 sous-catégories du mois</p>
            <div className="space-y-1">
              {top3SubCategories.map((sc: any, i: number) => (
                <div key={sc.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-600">{i + 1}.</span>
                    <span className="text-xs">{sc.icone || '📎'}</span>
                    <span className="text-xs text-slate-300 truncate">{sc.nom}</span>
                    <span className="text-[10px] text-slate-600">({sc.parentIcone} {sc.parentNom})</span>
                  </div>
                  <span className="text-xs font-bold text-pink-400 flex-shrink-0">{formatEuro(sc.depense)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}