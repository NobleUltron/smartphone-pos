import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import Modal from '@/Components/Modal';
import {
    ShieldCheck,
    Search,
    Clock,
    Eye,
    RefreshCw,
    X
} from 'lucide-react';
import dayjs from 'dayjs';

export default function ActivityLogsIndex({ auth, logs, users, modules, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedModule, setSelectedModule] = useState(filters.module || '');
    const [selectedUser, setSelectedUser] = useState(filters.user_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [activeLog, setActiveLog] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('activity-logs.index'), {
            search: search || undefined,
            module: selectedModule || undefined,
            user_id: selectedUser || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleReset = () => {
        setSearch('');
        setSelectedModule('');
        setSelectedUser('');
        setDateFrom('');
        setDateTo('');
        router.get(route('activity-logs.index'), {}, { preserveScroll: true });
    };

    const getActionBadge = (action = '') => {
        if (action.includes('discount') || action.includes('override') || action.includes('delete') || action.includes('refund') || action.includes('cancel')) {
            return <Badge variant="danger" className="text-[10px] uppercase font-bold">{action}</Badge>;
        }
        if (action.includes('checkout') || action.includes('intake') || action.includes('created') || action.includes('payment')) {
            return <Badge variant="success" className="text-[10px] uppercase font-bold">{action}</Badge>;
        }
        if (action.includes('security') || action.includes('backup') || action.includes('warranty')) {
            return <Badge variant="warning" className="text-[10px] uppercase font-bold">{action}</Badge>;
        }
        return <Badge variant="info" className="text-[10px] uppercase font-bold">{action}</Badge>;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Audit Trail Log" />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="System Audit Trail Log"
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Audit Log' }]}
                    actions={
                        <Button variant="glass" icon={RefreshCw} onClick={handleReset}>
                            Reset Filters
                        </Button>
                    }
                />

                {/* Filter & Search Bar */}
                <Card className="p-5 mb-6">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="text"
                                className="saas-input !pl-10 w-full text-xs"
                                placeholder="Search keyword, action, module, or IP..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div>
                            <select
                                className="saas-input w-full text-xs"
                                value={selectedModule}
                                onChange={(e) => setSelectedModule(e.target.value)}
                            >
                                <option value="">All System Modules</option>
                                {modules.map((mod) => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                className="saas-input w-full text-xs"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            >
                                <option value="">All Staff</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                title="From date"
                                className="saas-input !px-2 text-xs w-full"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                title="To date"
                                className="saas-input !px-2 text-xs w-full"
                            />
                        </div>

                        <div>
                            <Button variant="primary" type="submit" className="w-full text-xs">
                                Apply Filter
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Logs Table */}
                <Card noPadding className="overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3.5 px-6">Timestamp</th>
                                    <th className="py-3.5 px-6">Staff Member</th>
                                    <th className="py-3.5 px-6">Module</th>
                                    <th className="py-3.5 px-6">Action</th>
                                    <th className="py-3.5 px-6">Description</th>
                                    <th className="py-3.5 px-6 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                {logs.data.length > 0 ? (
                                    logs.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-4 px-6 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {dayjs(log.created_at).format('MMM DD, YYYY HH:mm:ss')}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-200 dark:border-slate-700">
                                                        {log.user?.name ? log.user.name.charAt(0) : '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{log.user?.name || 'System / Guest'}</p>
                                                        <p className="text-[10px] text-slate-400 capitalize">{log.user?.role || 'System'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap font-bold text-slate-700 dark:text-slate-200">
                                                {log.module}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                {getActionBadge(log.action)}
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-700 dark:text-slate-300 max-w-md truncate" title={log.description}>
                                                {log.description}
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
                                                <Button
                                                    variant="secondary"
                                                    className="py-1 px-2.5 text-xs"
                                                    icon={Eye}
                                                    onClick={() => setActiveLog(log)}
                                                >
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-400">
                                            <ShieldCheck size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">No activity logs recorded yet</p>
                                            <p className="text-xs mt-1">Actions performed by cashiers and staff will be logged here automatically.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {logs.data.length > 0 ? logs.data.map((log) => (
                            <div key={log.id} className="p-4 space-y-2 bg-white dark:bg-slate-900">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center flex-wrap gap-1.5">
                                            <span className="font-bold text-slate-900 dark:text-white text-xs">{log.module}</span>
                                            {getActionBadge(log.action)}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {log.user?.name || 'System'} • {dayjs(log.created_at).format('MMM DD, HH:mm')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveLog(log)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 shrink-0"
                                    >
                                        <Eye size={12} /> View
                                    </button>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{log.description}</p>
                            </div>
                        )) : (
                            <div className="py-10 text-center text-sm text-slate-400">No activity logs found.</div>
                        )}
                    </div>

                    {/* Pagination */}
                    {logs.links && logs.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Showing {logs.from} to {logs.to} of {logs.total} entries
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {logs.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true })}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Audit Log Detail Modal */}
            {activeLog && (
                <Modal show={!!activeLog} onClose={() => setActiveLog(null)} maxWidth="lg">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Audit Log Details</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Event ID #{activeLog.id} • {dayjs(activeLog.created_at).format('MMM DD, YYYY HH:mm:ss')}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setActiveLog(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">User / Staff</span>
                                    <span className="font-semibold text-slate-800 dark:text-white text-sm">{activeLog.user?.name || 'System'}</span>
                                    <span className="block text-slate-400 capitalize">{activeLog.user?.role || 'Guest'}</span>
                                </div>
                                <div>
                                    <span className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">IP Address</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{activeLog.ip_address || '127.0.0.1'}</span>
                                </div>
                            </div>

                            <div>
                                <span className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] mb-1">Description</span>
                                <p className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                                    {activeLog.description}
                                </p>
                            </div>

                            {activeLog.properties && (
                                <div>
                                    <span className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] mb-1">Event Payload & Parameters</span>
                                    <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                                        {JSON.stringify(activeLog.properties, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <Button variant="secondary" onClick={() => setActiveLog(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </AuthenticatedLayout>
    );
}
