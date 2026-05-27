import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import MobileNav from '@/components/layout/MobileNav';
import EspaceSelector from '@/components/layout/EspaceSelector';
import AppMenu from '@/components/layout/AppMenu';
import AdminBanner from '@/components/layout/AdminBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finance App',
  description: 'Gestion de budget personnel',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} bg-slate-950 text-white h-full flex flex-col overflow-hidden`}>
      <Providers>
        <AdminBanner />
        {/* Header — hors de la zone scrollable, ne disparait jamais */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 z-30">
          <EspaceSelector />
          <AppMenu />
        </header>
        {/* Zone scrollable */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <MobileNav />
      </Providers>
      </body>
    </html>
  );
}