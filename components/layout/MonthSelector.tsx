'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMois, nextMonth, prevMonth } from '@/lib/utils';

interface Props {
  currentMonth: string;
  onChange: (month: string) => void;
}

export default function MonthSelector({ currentMonth, onChange }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-900 sticky top-0 z-40">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(prevMonth(currentMonth))}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <h2 className="text-lg font-semibold capitalize">
        {formatMois(currentMonth)}
      </h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(nextMonth(currentMonth))}
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
