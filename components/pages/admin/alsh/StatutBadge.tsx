export const STATUTS = [
    { value: 'a_transmettre', label: 'À transmettre à la compta', color: 'bg-red-600 text-white' },
    { value: 'transmis', label: 'Transmis', color: 'bg-orange-500 text-white' },
    { value: 'rembourse', label: 'Remboursé', color: 'bg-yellow-500 text-black' },
    { value: 'vire_cj', label: 'Viré sur CJ', color: 'bg-emerald-500 text-white' },
  ] as const
  
  export function StatutBadge({ statut }: { statut: string }) {
    const s = STATUTS.find(st => st.value === statut) || STATUTS[0]
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
  }