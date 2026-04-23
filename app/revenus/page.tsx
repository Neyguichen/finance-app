'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useRevenus } from '@/lib/hooks/useRevenus';
import { formatEuro, currentMonth, pct } from '@/lib/utils';
import { useForm } from 'react-hook-form';

export default function RevenusPage() {
  const [month, setMonth] = useState(currentMonth());
  const [open, setOpen] = useState(false);
  const moisId = undefined; // TODO: connecter avec useMois

  const { data: revenus = [], toggleRecu, create, remove } = useRevenus(moisId);

  const totalEntrants = revenus.reduce((s, r) => s + Number(r.montant), 0);
  const totalActif = revenus
    .filter((r) => r.type === 'actif')
    .reduce((s, r) => s + Number(r.montant), 0);
  const totalPassif = revenus
    .filter((r) => r.type === 'passif')
    .reduce((s, r) => s + Number(r.montant), 0);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0, type: 'actif' as 'actif' | 'passif' },
  });

  const onSubmit = async (values: {
    nom: string;
    montant: number;
    type: 'actif' | 'passif';
  }) => {
    if (!moisId) return;
    await create.mutateAsync({
      mois_id: moisId,
      nom: values.nom,
      montant: values.montant,
      type: values.type,
      recu: false,
      ordre: revenus.length,
    });
    reset();
    setOpen(false);
  };

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Revenus</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle>Nouveau revenu</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  placeholder="Nom"
                  {...register('nom', { required: true })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Montant"
                  {...register('montant', { valueAsNumber: true })}
                />
                <Select
                  defaultValue="actif"
                  onValueChange={(v) =>
                    setValue('type', v as 'actif' | 'passif')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="passif">Passif</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" className="w-full">
                  Ajouter
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Liste des revenus */}
        <div className="space-y-2">
          {revenus.map((rev) => (
            <Card key={rev.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={rev.recu}
                    onCheckedChange={(checked) =>
                      toggleRecu.mutate({ id: rev.id, recu: !!checked })
                    }
                  />
                  <div>
                    <p className="font-medium">{rev.nom}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        rev.type === 'actif'
                          ? 'bg-emerald-900 text-emerald-400'
                          : 'bg-blue-900 text-blue-400'
                      }`}
                    >
                      {rev.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      Number(rev.montant) < 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {formatEuro(Number(rev.montant))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 h-8 w-8"
                    onClick={() => remove.mutate(rev.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Totaux */}
        <Card className="bg-blue-950 border-blue-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Entrants</span>
              <span className="font-bold text-lg">
                {formatEuro(totalEntrants)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Actif</span>
              <span>
                {formatEuro(totalActif)} ({pct(totalActif, totalEntrants)}%)
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Passif</span>
              <span>
                {formatEuro(totalPassif)} ({pct(totalPassif, totalEntrants)}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
