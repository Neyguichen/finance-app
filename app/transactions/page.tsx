'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import MonthSelector from '@/components/layout/MonthSelector';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { formatEuro, formatDate } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { useApp } from '@/components/AppContext';
import { useState } from 'react';

// TODO: Importer les catégories depuis un hook useCategories
const CATEGORIES_TEMP = [
  'Courses',
  'Nourrice',
  'Garderie',
  'Animaux',
  'Restaurant',
  'Véhicule',
  'Carburant',
  'Santé',
  'Shopping',
  'Loisirs & Sorties',
  'Logement',
  'Achats Divers',
  'Activité Périscolaire',
  'Cadeaux',
];

export default function TransactionsPage() {
  const [open, setOpen] = useState(false);
  const { moisId, month, setMonth } = useApp()

  const { data: transactions = [], create, remove } = useTransactions(moisId);
  const total = transactions.reduce((s, t) => s + Number(t.montant), 0);

  const { register, handleSubmit, control, reset } = useForm({
    defaultValues: { date: '', categorie_id: '', montant: 0, infos: '' },
  });

  const onSubmit = async (values: any) => {
    if (!moisId) return;
    await create.mutateAsync({
      mois_id: moisId,
      categorie_id: values.categorie_id,
      date: values.date,
      montant: values.montant,
      infos: values.infos || null,
    });
    reset();
    setOpen(false);
  };

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Dépenses</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle>Nouvelle dépense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input type="date" {...register('date', { required: true })} />
                {/* TODO: Remplacer par un vrai Select avec catégories de la BDD */}
                <Input placeholder="Catégorie" {...register('categorie_id')} />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Montant"
                  {...register('montant', { valueAsNumber: true })}
                />
                <Input
                  placeholder="Infos (ex: Hyper U)"
                  {...register('infos')}
                />
                <Button type="submit" className="w-full">
                  Ajouter
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Journal */}
        <div className="space-y-2">
          {transactions.map((tx) => (
            <Card key={tx.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">
                    {tx.categorie?.nom || 'Sans catégorie'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(tx.date)}
                    {tx.infos ? ` — ${tx.infos}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-400">
                    {formatEuro(Number(tx.montant))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 h-8 w-8"
                    onClick={() => remove.mutate(tx.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Total */}
        <Card className="bg-rose-950 border-rose-800">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <span className="font-semibold">Total dépenses</span>
              <span className="font-bold text-lg text-rose-300">
                {formatEuro(total)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
