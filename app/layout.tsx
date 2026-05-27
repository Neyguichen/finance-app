import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import AppLayout from '@/components/layout/AppLayout';

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
      <body className={`${inter.className} bg-slate-950 text-white h-full`}>
      <Providers>
        <AppLayout>{children}</AppLayout>
      </Providers>
      </body>
    </html>
  );
}