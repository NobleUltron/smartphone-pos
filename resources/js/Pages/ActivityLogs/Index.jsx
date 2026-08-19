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
    Filter, 
    User, 
    Clock, 
    Eye, 
    AlertTriangle, 
    ShoppingCart, 
    Tag, 
    Database, 
    Key, 
    RefreshCw,
    X
} from 'lucide-react';
import dayjs from 'dayjs';

export default function ActivityLogsIndex({ auth, logs, users, modules, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedModule, setSelectedModule] = useState(filters.module || '');
    const [selectedUser, setSelectedUser] = useState(filters.user_id || '');
    const [activeLog, setActiveLog] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('activity-logs.index'), {
            search,
            module: selectedModule,
            user_id: selectedUser
        }, { preserveState: true });
    };

    const handleReset = () => {
        setSearch('');
        setSelectedModule('');
        setSelectedUser('');
        router.get(route('activity-logs.index'));
    };

    const getActionBadge = (action) => {
        if (action.includes('discount') || action.includes('override') || action.includes('delete')) {
            return <Badge variant="danger" className="text-[10px] uppercase font-bold">{action}</Badge>;
        }
        if (action.includes('checkout') || action.includes('intake') || action.includes('created')) {
            return <Badge variant="success" className="text-[10px] uppercase font-bold">{action}</Badge>;
        }
        if (action.includes('security') || action.includes('backup')) {
            return <Badge variant="warning" className="text-[10px] uppercase font-bold">{action}</Badge>;
        }
        return <Badge variant="info" className="text-[10px] uppercase font-bold">{action}</Badge>;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Cashier Audit Trail Log" />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <PageHeader 
                    title="Cashier Audit Trail Log"
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Audit Log' }]}
                    actions={
                        <Button variant="glass" icon={RefreshCw} onClick={handleReset}>
                            Reset Filters
                        </Button>
                    }
                />

                {/* Filter & Search Bar */}
                <Card className="p-6 mb-8">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                            <input 
                                type="text"
                                className="saas-input pl-10 w-full text-xs"
                                placeholder="Search logs by keyword or IP..."
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
                                <option value="">All Cashiers & Staff</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="primary" type="submit" className="w-full text-xs">
                                Apply Filter
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Logs Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-6">Timestamp</th>
                                    <th className="py-3.5 px-6">Staff Member</th>
                                    <th className="py-3.5 px-6">Module</th>
                                    <th className="py-3.5 px-6">Action</th>
                                    <th className="py-3.5 px-6">Description</th>
                                    <th className="py-3.5 px-6 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {logs.data.length > 0 ? (
                                    logs.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 font-semibold text-slate-600 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {dayjs(log.created_at).format('MMM DD, YYYY HH:mm:ss')}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs border border-slate-200">
                                                        {log.user?.name ? log.user.name.charAt(0) : '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{log.user?.name || 'System / Guest'}</p>
                                                        <p className="text-[10px] text-slate-400 capitalize">{log.user?.role || 'System'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap font-bold text-slate-700">
                                                {log.module}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                {getActionBadge(log.action)}
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-700 max-w-md truncate">
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
                                            <ShieldCheck size={48} className="mx-auto mb-3 text-slate-300" />
                                            <p className="text-base font-semibold text-slate-600">No activity logs recorded yet</p>
                                            <p className="text-xs mt-1">Actions performed by cashiers and staff will be logged here automatically.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs.links && logs.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Showing {logs.from} to {logs.to} of {logs.total} entries
                            </span>
                            <div className="flex gap-1">
                                {logs.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => link.url && router.get(link.url)}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            link.active 
                                                ? 'bg-indigo-600 text-white' 
                                                : 'text-slate-600 hover:bg-slate-100'
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
                            <button onClick={() => setActiveLog(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
                                <p className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
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
