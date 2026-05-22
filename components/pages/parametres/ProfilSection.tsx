type Props = {
    userEmail: string | null
  }
  
  export default function ProfilSection({ userEmail }: Props) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between bg-slate-800 rounded-lg p-3">
          <span className="text-slate-400">Email</span>
          <span className="text-white">{userEmail || '—'}</span>
        </div>
      </div>
    )
  }