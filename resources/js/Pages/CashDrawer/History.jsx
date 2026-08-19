import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Wallet, Search, Calendar, User, ArrowLeft, History as HistoryIcon, Clock, CheckCircle2, FileDown } from 'lucide-react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';

export default function History({ auth, drawers }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Shift History" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                
                {/* Header */}
                <PageHeader 
                    title="Shift Audit History" 
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <HistoryIcon size={18} className="text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Past Register Shifts</h3>
                        </div>
                        {drawers.data.length > 0 && (
                            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                                {drawers.total || drawers.data.length} Shifts Recorded
                            </span>
                        )}
                    </div>

                    {drawers.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {drawers.data.map((drawer) => (
                                        <tr key={drawer.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs shrink-0">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="font-bold text-slate-900">{drawer.user?.name || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {new Date(drawer.opened_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {drawer.closed_at ? new Date(drawer.closed_at).toLocaleString() : <span className="text-amber-500 font-semibold italic">Ongoing</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700 text-xs">
                                                UGX {Number(drawer.starting_cash).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700 text-xs">
                                                {drawer.expected_cash ? `UGX ${Number(drawer.expected_cash).toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-xs">
                                                {drawer.actual_cash ? `UGX ${Number(drawer.actual_cash).toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {drawer.difference !== null ? (
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                                        Number(drawer.difference) > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        Number(drawer.difference) < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                        'bg-slate-100 text-slate-700 border border-slate-200'
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
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
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
                    ) : (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                            <Wallet size={48} className="mb-3 text-slate-300" />
                            <p className="text-base font-semibold text-slate-700">No past shifts recorded</p>
                            <p className="text-xs text-slate-400 mt-1">Closed shift logs will appear here for audit tracking.</p>
                        </div>
                    )}
                    
                    {/* Pagination */}
                    {drawers.links && drawers.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {drawers.links.map((link, k) => (
                                    <Link 
                                        key={k}
                                        href={link.url || '#'}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                            link.active 
                                                ? 'bg-rose-500 text-white shadow-sm' 
                                                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
                                        } ${!link.url && 'opacity-40 cursor-not-allowed'}`}
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
