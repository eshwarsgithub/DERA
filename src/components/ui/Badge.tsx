import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
    const variants = {
        default: "bg-slate-800 text-slate-300 border-slate-700",
        success: "bg-emerald-900/30 text-emerald-400 border-emerald-800/50",
        warning: "bg-amber-900/30 text-amber-400 border-amber-800/50",
        danger: "bg-red-900/30 text-red-400 border-red-800/50",
        info: "bg-blue-900/30 text-blue-400 border-blue-800/50"
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
            {children}
        </span>
    );
};
