'use client';

import React from 'react';

/**
 * PageHeader - Reusable header component for dashboard pages.
 * Provides a consistent title + description layout across all dashboard routes.
 */
interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-slate-400 mt-1">{description}</p>
                )}
            </div>
            {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
    );
}
