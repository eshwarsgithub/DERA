import './globals.css';
import React from 'react';
import { Navbar } from '@/src/components/layout/Navbar';

export const metadata = {
  title: 'DERA — DE Relationship Mapper',
  description: 'Governance and PII risk dashboard for SFMC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased selection:bg-blue-500/30">
        <Navbar />
        <main className="container mx-auto px-6 py-8 animate-in fade-in duration-500">
          {children}
        </main>
      </body>
    </html>
  );
}