import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { 
    FileSpreadsheet, 
    Plus, 
    Search, 
    FileText, 
    ArrowRight, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    Building2,
    DollarSign,
    Download,
    Eye
} from 'lucide-react';
import dayjs from 'dayjs';

export default function QuotationsIndex({ quotations, filters, metrics }) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');

    const handleFilter = (newFilters = {}) => {
        router.get(route('quotations.index'), {
            search,
            status,
            ...newFilters
        }, {
            preserveState: true,
            replace: true
        });
    };

    const getStatusBadge = (st) => {
        switch (st) {
            case 'Converted':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
            case 'Approved':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
            case 'Sent':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
            case 'Rejected':
            case 'Expired':
                return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Quotations & Proformas" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                                <FileSpreadsheet size={22} />
                            </span>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Corporate Quotations
                            </h1>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Prepare formal price estimates, proforma invoices, and RFQs for corporate clients.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('invoices.index')}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <FileText size={16} /> View Invoices
                        </Link>
                        <Link
                            href={route('quotations.create')}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
                        >
                            <Plus size={16} /> New Quotation
                        </Link>
                    </div>
                </div>

                {/* 4 Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg shadow-blue-900/20">
                        <div className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                            Active Pipeline Value
                        </div>
                        <div className="text-2xl font-black mt-2">
                            UGX {Number(metrics.pipeline_value || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-blue-200/80 mt-1">
                            Across active proposals & RFQs
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Converted Revenue</span>
                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                            UGX {Number(metrics.converted_value || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Won deals turned into Invoices
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Approved Quotes</span>
                            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                            {metrics.approved_count || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            Awaiting client purchase orders
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Draft Proposals</span>
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <Clock size={16} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                            {metrics.draft_count || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            In-progress quotations
                        </div>
                    </div>
                </div>

                {/* Filter and Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by Quote #, Client, Company..."
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    handleFilter({ search: e.target.value });
                                }}
                                className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                                value={status}
                                onChange={e => {
                                    setStatus(e.target.value);
                                    handleFilter({ status: e.target.value });
                                }}
                                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent to Client</option>
                                <option value="Approved">Approved</option>
                                <option value="Converted">Converted to Invoice</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-50/50 dark:bg-slate-800/30">
                                    <th className="py-3 px-4">Quote Ref</th>
                                    <th className="py-3 px-4">Client / Company</th>
                                    <th className="py-3 px-4">Date Issued</th>
                                    <th className="py-3 px-4">Valid Until</th>
                                    <th className="py-3 px-4 text-right">Total (UGX)</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {quotations.data.map(q => (
                                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                                            <Link href={route('quotations.show', q.id)} className="hover:underline">
                                                {q.quotation_number}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {q.customer?.company_name || q.customer?.name || 'Walk-in Corporate'}
                                            </div>
                                            {q.customer?.company_name && q.customer?.name && (
                                                <div className="text-[10px] text-slate-400">
                                                    Contact: {q.customer.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-500">
                                            {dayjs(q.issue_date).format('DD MMM YYYY')}
                                        </td>
                                        <td className="py-3 px-4 font-medium">
                                            <span className={dayjs().isAfter(q.valid_until) && q.status !== 'Converted' ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                                                {dayjs(q.valid_until).format('DD MMM YYYY')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white font-mono">
                                            UGX {Number(q.total_amount).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(q.status)}`}>
                                                {q.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Link
                                                    href={route('quotations.show', q.id)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="View Quotation"
                                                >
                                                    <Eye size={15} />
                                                </Link>
                                                <a
                                                    href={route('quotations.pdf', q.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Download / Print PDF"
                                                >
                                                    <Download size={15} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {quotations.data.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-12 text-slate-400">
                                            No quotations found. Click <strong>"New Quotation"</strong> to create your first corporate proposal.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
