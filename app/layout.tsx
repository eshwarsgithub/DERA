import './globals.css';
import React from 'react';

export const metadata = {
  title: 'DERA — DE Relationship Mapper',
  description: 'Governance and PII risk dashboard for SFMC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="px-6 py-4 border-b border-white/10 sticky top-0 bg-black/30 backdrop-blur">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-semibold">DERA</h1>
            <nav className="text-sm space-x-4">
              <a href="/" className="hover:underline">Dashboard</a>
              <a href="/des" className="hover:underline">Data Extensions</a>
              <a href="/mindmap" className="hover:underline">Mind Map</a>
              <span className="opacity-50">|</span>
              <a href="/api/auth/signin" className="hover:underline">Sign in</a>
              <a href="/api/auth/signout" className="hover:underline">Sign out</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}