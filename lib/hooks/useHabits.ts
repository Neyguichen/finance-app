'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type HabitKind = 'income' | 'fixed' | 'savings' | 'budget'
export type HabitRow = { id:string; kind:HabitKind; label:string; amount:number; actif:boolean; frequence_mois:number; categoryId?:string; envelopeId?:string }
export type BudgetHabitInput = { categoryId:string; amount:number; frequence_mois:number }

export function useHabits(espaceId?: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey:['habits', espaceId],
    enabled:!!espaceId,
    queryFn:async()=>{
      const [income,fixed,savings,budgets,envelopes]=await Promise.all([
        supabase.from('revenus_recurrents').select('*').eq('espace_id',espaceId!),
        supabase.from('charges_fixes_recurrentes').select('*').eq('espace_id',espaceId!),
        supabase.from('epargne_recurrentes').select('*').eq('espace_id',espaceId!),
        supabase.from('budget_habitudes').select('*, categorie:categories(nom)').eq('espace_id',espaceId!),
        supabase.from('enveloppes').select('id,nom').eq('espace_id',espaceId!),
      ])
      for(const r of [income,fixed,savings,budgets,envelopes]) if(r.error) throw r.error
      const env=new Map((envelopes.data||[]).map(x=>[x.id,x.nom]))
      const rows:HabitRow[]=[]
      for(const x of income.data||[]) rows.push({id:x.id,kind:'income',label:x.nom,amount:Number(x.montant),actif:x.actif!==false,frequence_mois:x.frequence_mois||1})
      for(const x of fixed.data||[]) rows.push({id:x.id,kind:'fixed',label:x.nom,amount:Number(x.montant),actif:x.actif!==false,frequence_mois:x.frequence_mois||1})
      for(const x of savings.data||[]) rows.push({id:x.id,kind:'savings',label:x.note||env.get(x.enveloppe_dest_id)||'Épargne',amount:Number(x.montant),actif:x.actif!==false,frequence_mois:x.frequence_mois||1,envelopeId:x.enveloppe_dest_id})
      for(const x of budgets.data||[]) rows.push({id:x.id,kind:'budget',label:(x.categorie as {nom?:string}|null)?.nom||'Budget variable',amount:Number(x.montant),actif:x.actif!==false,frequence_mois:x.frequence_mois||1,categoryId:x.categorie_id})
      return rows
    }
  })
  const toggle=useMutation({
    mutationFn:async(h:HabitRow)=>{
      const table=h.kind==='income'?'revenus_recurrents':h.kind==='fixed'?'charges_fixes_recurrentes':h.kind==='savings'?'epargne_recurrentes':'budget_habitudes'
      const {error}=await supabase.from(table).update({actif:!h.actif}).eq('id',h.id)
      if(error) throw error
    },
    onSuccess:()=>{qc.invalidateQueries({queryKey:['habits',espaceId]});qc.invalidateQueries({queryKey:['month_preparation',espaceId]})}
  })
  const saveBudget=useMutation({
    mutationFn:async(input:BudgetHabitInput)=>{
      if(!espaceId) throw new Error('Budget manquant')
      const {error}=await supabase.from('budget_habitudes').upsert({espace_id:espaceId,categorie_id:input.categoryId,montant:input.amount,frequence_mois:input.frequence_mois,actif:true},{onConflict:'espace_id,categorie_id'})
      if(error) throw error
    },
    onSuccess:()=>{qc.invalidateQueries({queryKey:['habits',espaceId]});qc.invalidateQueries({queryKey:['month_preparation',espaceId]})}
  })
  const removeBudget=useMutation({
    mutationFn:async(id:string)=>{const {error}=await supabase.from('budget_habitudes').delete().eq('id',id);if(error) throw error},
    onSuccess:()=>{qc.invalidateQueries({queryKey:['habits',espaceId]});qc.invalidateQueries({queryKey:['month_preparation',espaceId]})}
  })
  return {...query,toggle,saveBudget,removeBudget}
}
