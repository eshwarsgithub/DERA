import React from 'react';
import Link from 'next/link';

export const Navbar = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B1120]/80 backdrop-blur-md">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                            D
                        </div>
                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            DERA
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/des" className="text-slate-400 hover:text-white transition-colors">
                            Data Extensions
                        </Link>
                        <Link href="/mindmap" className="text-slate-400 hover:text-white transition-colors">
                            Mind Map
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                    <div className="flex items-center gap-3 text-sm">
                        <Link href="/api/auth/signin" className="text-slate-400 hover:text-white transition-colors">
                            Sign in
                        </Link>
                        <Link
                            href="/api/auth/signout"
                            className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
                        >
                            Sign out
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};
