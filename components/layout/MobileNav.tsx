'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Résumé', icon: LayoutDashboard },
  { href: '/revenus', label: 'Revenus', icon: ArrowDownCircle },
  { href: '/charges-fixes', label: 'Fixes', icon: ArrowUpCircle },
  { href: '/epargne', label: 'Épargne', icon: PiggyBank },
  { href: '/transactions', label: 'Dépenses', icon: Receipt },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 text-xs transition-colors',
                active ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
