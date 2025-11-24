import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, description, action }) => {
    return (
        <div className={`glass-card rounded-xl p-6 ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between mb-4">
                    <div>
                        {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
                        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="text-slate-300">
                {children}
            </div>
        </div>
    );
};
