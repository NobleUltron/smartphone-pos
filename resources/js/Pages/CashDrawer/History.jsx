import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Wallet, User, ArrowLeft, History as HistoryIcon, FileDown } from 'lucide-react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';

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

                {/* Segmented Status Tabs & Staff Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-fit">
                        {[
                            { key: 'all', label: 'All Shifts' },
                            { key: 'open', label: 'Open' },
                            { key: 'closed', label: 'Closed' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    statusFilter === tab.key
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {isManager && cashiers.length > 0 && (
                        <div className="sm:w-56">
                            <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className="saas-input !py-2 !text-xs w-full"
                            >
                                <option value="">All Staff</option>
                                {cashiers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                    <DataTable
                        headers={[
                            'Cashier',
                            'Opened',
                            'Closed',
                            { label: 'Opening Float', className: 'text-right' },
                            { label: 'Expected', className: 'text-right' },
                            { label: 'Actual Count', className: 'text-right' },
                            { label: 'Variance', className: 'text-right' },
                            { label: 'Status', className: 'text-center' },
                            { label: 'Report', className: 'text-center' },
                        ]}
                        isEmpty={!drawers.data || drawers.data.length === 0}
                        emptyState={
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                                <Wallet size={44} className="mb-3 text-slate-300 dark:text-slate-600" />
                                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No shifts found</p>
                                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or open a shift to begin audit tracking.</p>
                            </div>
                        }
                    >
                        {drawers.data.map((drawer) => (
                            <tr key={drawer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                            {(drawer.user?.name || 'U').substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">{drawer.user?.name || 'Unknown'}</span>
                                    </div>
                                </td>
                                <td className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(drawer.opened_at).toLocaleString()}
                                </td>
                                <td className="text-xs text-slate-500 dark:text-slate-400">
                                    {drawer.closed_at ? new Date(drawer.closed_at).toLocaleString() : <span className="text-amber-500 font-semibold italic">Ongoing</span>}
                                </td>
                                <td className="text-right font-medium text-slate-700 dark:text-slate-300 text-xs font-mono">
                                    UGX {Number(drawer.starting_cash || 0).toLocaleString()}
                                </td>
                                <td className="text-right font-medium text-slate-700 dark:text-slate-300 text-xs font-mono">
                                    {formatUgxOrDash(drawer.expected_cash)}
                                </td>
                                <td className="text-right font-extrabold text-slate-900 dark:text-white text-xs font-mono">
                                    {formatUgxOrDash(drawer.actual_cash)}
                                </td>
                                <td className="text-right">
                                    {drawer.difference !== null && drawer.difference !== undefined ? (
                                        <Badge
                                            variant={
                                                Number(drawer.difference) > 0
                                                    ? 'success'
                                                    : Number(drawer.difference) < 0
                                                        ? 'danger'
                                                        : 'neutral'
                                            }
                                        >
                                            {Number(drawer.difference) > 0 ? '+UGX ' : Number(drawer.difference) < 0 ? '-UGX ' : 'UGX '}
                                            {Math.abs(Number(drawer.difference)).toLocaleString()}
                                        </Badge>
                                    ) : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="text-center">
                                    <Badge variant={drawer.status === 'open' ? 'success' : 'neutral'}>
                                        {drawer.status.toUpperCase()}
                                    </Badge>
                                </td>
                                <td className="text-center">
                                    <a
                                        href={`/cash-drawer/${drawer.id}/report`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                        title="Download Shift Report PDF"
                                    >
                                        <FileDown size={13} />
                                        PDF
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                </div>

                {/* Mobile Cards View */}
                <Card noPadding className="md:hidden overflow-hidden">
                    {drawers.data.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {drawers.data.map((drawer) => (
                                <div key={drawer.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{drawer.user?.name || 'Unknown'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Opened: {new Date(drawer.opened_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <Badge variant={drawer.status === 'open' ? 'success' : 'neutral'}>
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
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <Wallet size={40} className="mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No shifts found</p>
                        </div>
                    )}
                </Card>

                {/* Pagination */}
                <Pagination data={drawers} className="mt-2" />
            </div>
        </AuthenticatedLayout>
    );
}
