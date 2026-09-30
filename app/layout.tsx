import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import AppLayout from '@/components/layout/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Neyguichen Finances',
  description: 'Pilote ton budget, tes dépenses, ton épargne et tes objectifs simplement.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#07101d',
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
    <html lang="fr" className="h-full" data-theme="neyguichen">
      <body className={`${inter.className} h-full`}>
      <Providers>
        <AppLayout>{children}</AppLayout>
      </Providers>
      </body>
    </html>
  );
}