import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import MobileNav from '@/components/layout/MobileNav';
import EspaceSelector from '@/components/layout/EspaceSelector';
import AppMenu from '@/components/layout/AppMenu';

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
    <html lang="fr">
      <body className={`${inter.className} bg-slate-950 text-white`}>
      <Providers>
        <EspaceSelector />
        <main className="pb-20 min-h-screen">
          {children}
        </main>
        <MobileNav />
      </Providers>
      </body>
    </html>
  );
}
