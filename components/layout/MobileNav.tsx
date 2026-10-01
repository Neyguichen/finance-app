'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpCircle, LayoutDashboard, PiggyBank, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/dashboard', label: 'Résumé', icon: LayoutDashboard },
  { href: '/revenus', label: 'Revenus', icon: ArrowUpCircle },
  { href: '/depenses', label: 'Dépenses', icon: ReceiptText },
  { href: '/epargne', label: 'Épargne', icon: PiggyBank },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800/80 bg-[#08111f]/94 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-4 px-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition',
                active ? 'text-indigo-300' : 'text-slate-600 hover:text-slate-300'
              )}
            >
              {active && <span className="absolute top-1 h-0.5 w-5 rounded-full bg-indigo-400" />}
              <Icon className={cn('h-5 w-5 transition', active && 'drop-shadow-[0_0_10px_rgba(129,140,248,.35)]')} />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
