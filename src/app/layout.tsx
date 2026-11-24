import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QUANTRIX – The Price Is Right? | Thiagarajar School of Management',
  description: 'Round 1: Know Your Customer • Data Analytics Simulation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
