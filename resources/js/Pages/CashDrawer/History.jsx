import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Wallet, User, ArrowLeft, History as HistoryIcon, FileDown } from 'lucide-react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Badge from '@/Components/SaaS/Badge';

export default function History({ auth, drawers, cashiers = [], isManager = false, filters = {} }) {
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [userFilter, setUserFilter] = useState(filters?.user_id || '');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        const params = {};
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
        if (userFilter) params.user_id = userFilter;

        router.get(route('cash-drawer.history'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, [statusFilter, userFilter]);

    const formatUgxOrDash = (val) => {
        if (val === null || val === undefined || val === '') return '-';
        return `UGX ${Number(val).toLocaleString()}`;
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Shift History" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="Shift Audit History"
                    breadcrumbs={[
                        { label: 'Home', href: '/' },
                        { label: 'Shift Management', href: route('cash-drawer.index') },
                        { label: 'Shift History' }
                    ]}
                    actions={
                        <Link
                            href={route('cash-drawer.index')}
                            className="saas-btn saas-btn-glass"
                        >
                            <ArrowLeft size={16} />
                            <span>Shift Management</span>
                        </Link>
                    }
                />

                {/* Main Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <HistoryIcon size={18} className="text-indigo-500 dark:text-indigo-400" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Past Register Shifts</h3>
                            {drawers.data.length > 0 && (
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full shadow-sm">
                                    {drawers.total || drawers.data.length} Shifts Recorded
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Status Tabs */}
                            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'open', label: 'Open' },
                                    { key: 'closed', label: 'Closed' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            statusFilter === tab.key
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {isManager && cashiers.length > 0 && (
                                <select
                                    value={userFilter}
                                    onChange={(e) => setUserFilter(e.target.value)}
                                    className="saas-input !py-1.5 !text-xs min-w-[160px]"
                                >
                                    <option value="">All Staff</option>
                                    {cashiers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {drawers.data.length > 0 ? (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-3.5">Cashier</th>
                                            <th className="px-6 py-3.5">Opened</th>
                                            <th className="px-6 py-3.5">Closed</th>
                                            <th className="px-6 py-3.5 text-right">Opening Float</th>
                                            <th className="px-6 py-3.5 text-right">Expected</th>
                                            <th className="px-6 py-3.5 text-right">Actual Count</th>
                                            <th className="px-6 py-3.5 text-right">Variance</th>
                                            <th className="px-6 py-3.5 text-center">Status</th>
                                            <th className="px-6 py-3.5 text-center">Report</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                        {drawers.data.map((drawer) => (
                                            <tr key={drawer.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs shrink-0">
                                                            <User size={14} />
                                                        </div>
                                                        <span className="font-bold text-slate-900 dark:text-white">{drawer.user?.name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                                    {new Date(drawer.opened_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                                    {drawer.closed_at ? new Date(drawer.closed_at).toLocaleString() : <span className="text-amber-500 font-semibold italic">Ongoing</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300 text-xs">
                                                    UGX {Number(drawer.starting_cash || 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300 text-xs">
                                                    {formatUgxOrDash(drawer.expected_cash)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-slate-900 dark:text-white text-xs">
                                                    {formatUgxOrDash(drawer.actual_cash)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {drawer.difference !== null && drawer.difference !== undefined ? (
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                                            Number(drawer.difference) > 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                                                            Number(drawer.difference) < 0 ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                                                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                            {Number(drawer.difference) > 0 ? '+UGX ' : Number(drawer.difference) < 0 ? '-UGX ' : 'UGX '}
                                                            {Math.abs(Number(drawer.difference)).toLocaleString()}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={drawer.status === 'open' ? 'success' : 'default'}>
                                                        {drawer.status.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <a
                                                        href={`/cash-drawer/${drawer.id}/report`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold transition-colors"
                                                        title="Download Shift Report PDF"
                                                    >
                                                        <FileDown size={13} />
                                                        PDF
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards View */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {drawers.data.map((drawer) => (
                                    <div key={drawer.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{drawer.user?.name || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Opened: {new Date(drawer.opened_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <Badge variant={drawer.status === 'open' ? 'success' : 'default'}>
                                                {drawer.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block uppercase">Float</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{Number(drawer.starting_cash || 0).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block uppercase">Expected</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{drawer.expected_cash !== null && drawer.expected_cash !== undefined ? Number(drawer.expected_cash).toLocaleString() : '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block uppercase">Counted</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{drawer.actual_cash !== null && drawer.actual_cash !== undefined ? Number(drawer.actual_cash).toLocaleString() : '-'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="text-xs">
                                                {drawer.difference !== null && drawer.difference !== undefined ? (
                                                    <span className={`font-bold ${Number(drawer.difference) < 0 ? 'text-rose-600 dark:text-rose-400' : Number(drawer.difference) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                                        Variance: {Number(drawer.difference) > 0 ? '+' : ''}{Number(drawer.difference).toLocaleString()} UGX
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-500 font-semibold italic">Shift in progress</span>
                                                )}
                                            </div>
                                            <a
                                                href={`/cash-drawer/${drawer.id}/report`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold"
                                            >
                                                <FileDown size={13} /> PDF
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                            <Wallet size={48} className="mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No shifts found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or open a shift to begin audit tracking.</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {drawers.links && drawers.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Showing <strong className="text-slate-700 dark:text-slate-200">{drawers.from || 0}</strong>–<strong className="text-slate-700 dark:text-slate-200">{drawers.to || 0}</strong> of <strong className="text-slate-700 dark:text-slate-200">{drawers.total || 0}</strong>
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {drawers.links.map((link, k) => (
                                    <Link
                                        key={k}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                            link.active
                                                ? 'bg-rose-500 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                        } ${!link.url && 'opacity-40 cursor-not-allowed pointer-events-none'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
