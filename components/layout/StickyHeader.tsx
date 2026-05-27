'use client'

export default function StickyHeader({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800"
      >
        {children}
      </header>
      <div className="h-11" aria-hidden="true" />
    </>
  )
}