import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  open: boolean
  onToggle: () => void
  icon: LucideIcon
  title: string
  color: string
  children: React.ReactNode
}

export default function Section({ open, onToggle, icon: Icon, title, color, children }: Props) {
  return (
    <Card className={`border-slate-800 ${open ? 'bg-slate-900' : 'bg-slate-900/50'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  )
}