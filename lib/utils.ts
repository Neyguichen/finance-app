import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formater un montant en euros
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Formater une date
export function formatDate(date: string): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
}

// Nom du mois
export function formatMois(date: string): string {
  return format(new Date(date), 'MMMM yyyy', { locale: fr });
}

// Premier jour du mois courant
export function currentMonth(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
}

// Navigation entre mois
export function nextMonth(date: string): string {
  return format(addMonths(new Date(date), 1), 'yyyy-MM-dd');
}

export function prevMonth(date: string): string {
  return format(subMonths(new Date(date), 1), 'yyyy-MM-dd');
}

// Pourcentage
export function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 10000) / 100;
}
