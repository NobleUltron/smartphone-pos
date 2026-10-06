import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { 
    FileText, 
    Plus, 
    Search, 
    DollarSign, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    Building2,
    Download,
    Eye,
    TrendingUp,
    FileSpreadsheet
} from 'lucide-react';
import dayjs from 'dayjs';

export default function InvoicesIndex({ invoices, filters, metrics }) {
    const [search, setSearch] = useState(filters.search || '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status || 'all');

    const handleFilter = (newFilters = {}) => {
        router.get(route('invoices.index'), {
            search,
            payment_status: paymentStatus,
            ...newFilters
        }, {
            preserveState: true,
            replace: true
        });
    };

    const getStatusBadge = (st) => {
        switch (st) {
            case 'Paid':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
            case 'Partial':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
            case 'Overdue':
                return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 font-black animate-pulse';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Corporate Invoices & Credit Sales" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <FileText size={22} />
                            </span>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Corporate Invoices & Credit
                            </h1>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Manage B2B orders taken on credit, dispatch stock, track payment terms, and collect receivables.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('quotations.index')}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <FileSpreadsheet size={16} /> Quotations
                        </Link>
                        <Link
                            href={route('invoices.create')}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-500/20"
                        >
                            <Plus size={16} /> New Tax Invoice
                        </Link>
                    </div>
                </div>

                {/* 4 Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-lg shadow-indigo-900/20">
                        <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp size={14} /> Total Invoiced
                        </div>
                        <div className="text-2xl font-black mt-2">
                            UGX {Number(metrics.total_invoiced || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-indigo-200/80 mt-1">
                            All B2B orders billed to date
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Collected Revenue</span>
                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                            UGX {Number(metrics.total_collected || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Credited directly to Treasury
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Outstanding Debtors</span>
                            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                                <Clock size={16} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-2">
                            UGX {Number(metrics.total_outstanding || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            {metrics.pending_count || 0} active credit accounts
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Overdue Receivables</span>
                            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                                <AlertCircle size={16} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2">
                            UGX {Number(metrics.overdue_amount || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-rose-500 font-semibold mt-1">
                            {metrics.overdue_count || 0} past agreed payment due date
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
                                placeholder="Search by Invoice #, PO #, Client..."
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    handleFilter({ search: e.target.value });
                                }}
                                className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                                value={paymentStatus}
                                onChange={e => {
                                    setPaymentStatus(e.target.value);
                                    handleFilter({ payment_status: e.target.value });
                                }}
                                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                            >
                                <option value="all">All Payment Statuses</option>
                                <option value="Unpaid">Unpaid</option>
                                <option value="Partial">Partially Paid</option>
                                <option value="Paid">Fully Paid</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-50/50 dark:bg-slate-800/30">
                                    <th className="py-3 px-4">Invoice #</th>
                                    <th className="py-3 px-4">Client / Company</th>
                                    <th className="py-3 px-4">PO Ref</th>
                                    <th className="py-3 px-4">Due Date</th>
                                    <th className="py-3 px-4 text-right">Invoiced (UGX)</th>
                                    <th className="py-3 px-4 text-right">Paid (UGX)</th>
                                    <th className="py-3 px-4 text-right">Balance Due</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {invoices.data.map(inv => {
                                    const balance = Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount));
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                <Link href={route('invoices.show', inv.id)} className="hover:underline">
                                                    {inv.invoice_number}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {inv.customer?.company_name || inv.customer?.name || 'Corporate Buyer'}
                                                </div>
                                                {inv.customer?.company_name && inv.customer?.name && (
                                                    <div className="text-[10px] text-slate-400">
                                                        Attn: {inv.customer.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                                                {inv.po_number || '—'}
                                            </td>
                                            <td className="py-3 px-4 font-medium">
                                                <span className={dayjs().isAfter(inv.due_date) && inv.payment_status !== 'Paid' ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                                                    {dayjs(inv.due_date).format('DD MMM YYYY')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                UGX {Number(inv.total_amount).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                                UGX {Number(inv.paid_amount).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                                UGX {balance.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(inv.payment_status)}`}>
                                                    {inv.payment_status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={route('invoices.show', inv.id)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                        title="View Invoice & Collect Payment"
                                                    >
                                                        <Eye size={15} />
                                                    </Link>
                                                    <a
                                                        href={route('invoices.pdf', inv.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                        title="Download / Print Tax Invoice PDF"
                                                    >
                                                        <Download size={15} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {invoices.data.length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="text-center py-12 text-slate-400">
                                            No corporate invoices recorded. Click <strong>"New Tax Invoice"</strong> or convert a quotation.
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
