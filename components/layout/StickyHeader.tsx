'use client'

import { useScrollDirection } from '@/lib/hooks/useScrollDirection'

type Props = {
  children: React.ReactNode
}

export default function StickyHeader({ children }: Props) {
  const scrollDir = useScrollDirection()

  return (
    <header
      className={[
        'sticky top-0 z-30 flex items-center justify-between px-4 py-2',
        'bg-slate-900 border-b border-slate-800',
        'transition-transform duration-300 ease-in-out',
        // Desktop (lg+) : toujours visible
        'lg:translate-y-0',
        // Mobile : cache quand on scroll vers le bas
        scrollDir === 'down' ? '-translate-y-full' : 'translate-y-0',
      ].join(' ')}
    >
      {children}
    </header>
  )
}