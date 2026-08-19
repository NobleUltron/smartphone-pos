import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function PageHeader({ title, breadcrumbs = [], actions = null }) {
    return (
        <div className="mb-8 p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl relative overflow-hidden animate-slide-up border border-slate-700/60">
            {/* Background Glow & Sparkle Effects */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-32 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl -mb-20 pointer-events-none"></div>
            
            <div className="absolute -top-4 right-4 p-6 opacity-10 pointer-events-none text-indigo-300">
                <Sparkles size={130} strokeWidth={1} />
            </div>

            <div className="relative z-10 shrink-0">
                {breadcrumbs.length > 0 && (
                    <nav className="flex items-center gap-2 text-sm text-slate-300 mb-2 font-medium">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <ChevronRight size={14} className="text-slate-500 shrink-0" />}
                                {crumb.href ? (
                                    <Link href={crumb.href} className="hover:text-white transition-colors duration-150">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-slate-400 font-normal">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                )}
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{title}</h1>
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
