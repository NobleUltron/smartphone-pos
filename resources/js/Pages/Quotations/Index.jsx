import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';
import toast from 'react-hot-toast';
import { 
    FileSpreadsheet, 
    Plus, 
    Search, 
    FileText, 
    CheckCircle2, 
    Clock, 
    Download,
    Eye,
    Trash2,
    AlertTriangle,
    X,
    MessageCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import { buildQuotationMessage, openWhatsApp } from '@/Utils/whatsapp';

export default function QuotationsIndex({ quotations, filters, metrics }) {
    const { store_settings: storeSettings } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [deletingQuote, setDeletingQuote] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            router.get(route('quotations.index'), {
                search: search || undefined,
                status: status !== 'all' ? status : undefined,
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [search, status]);

    const confirmDelete = (e) => {
        e.preventDefault();
        if (!deletingQuote) return;
        setIsDeleting(true);
        router.delete(route('quotations.destroy', deletingQuote.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Quotation #${deletingQuote.quotation_number} deleted.`);
                setDeletingQuote(null);
            },
            onError: (err) => {
                toast.error(err.error || 'Failed to delete quotation.');
            },
            onFinish: () => setIsDeleting(false),
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

            <PageHeader
                title="Corporate Quotations"
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Quotations & Proformas' },
                ]}
                actions={
                    <>
                        <Link
                            href={route('invoices.index')}
                            className="saas-btn saas-btn-glass text-xs"
                        >
                            <FileText size={15} /> View Invoices
                        </Link>
                        <Link
                            href={route('quotations.create')}
                            className="saas-btn saas-btn-primary text-xs"
                        >
                            <Plus size={15} /> New Quotation
                        </Link>
                    </>
                }
            />

            <div className="space-y-6">

                {/* 4 Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        onClick={() => setStatus('all')}
                        className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg shadow-blue-900/20 cursor-pointer hover:brightness-110 transition-all"
                    >
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

                    <div
                        onClick={() => setStatus(status === 'Converted' ? 'all' : 'Converted')}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer transition-all ${status === 'Converted' ? 'ring-2 ring-emerald-500' : 'hover:ring-2 hover:ring-emerald-400/50'}`}
                    >
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

                    <div
                        onClick={() => setStatus(status === 'Approved' ? 'all' : 'Approved')}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer transition-all ${status === 'Approved' ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-400/50'}`}
                    >
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

                    <div
                        onClick={() => setStatus(status === 'Draft' ? 'all' : 'Draft')}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer transition-all ${status === 'Draft' ? 'ring-2 ring-slate-500' : 'hover:ring-2 hover:ring-slate-400/50'}`}
                    >
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

                {/* Standalone Search & Filter Card */}
                <Card>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Quote #, Client, Company..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="saas-input !pl-10 w-full"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="saas-input sm:w-48"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent to Client</option>
                                <option value="Approved">Approved</option>
                                <option value="Converted">Converted to Invoice</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                            {(search || status !== 'all') && (
                                <Button variant="secondary" onClick={() => { setSearch(''); setStatus('all'); }}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Desktop Table */}
                <div className="hidden md:block">
                    <DataTable
                        headers={[
                            'Quote Ref',
                            'Client / Company',
                            'Date Issued',
                            'Valid Until',
                            { label: 'Total (UGX)', className: 'text-right' },
                            { label: 'Status', className: 'text-center' },
                            { label: 'Actions', className: 'text-right' },
                        ]}
                        isEmpty={quotations.data.length === 0}
                        emptyState={
                            <div className="py-12 text-center text-slate-400">
                                <FileSpreadsheet size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <p>No quotations found. Click <strong>"New Quotation"</strong> to create your first corporate proposal.</p>
                            </div>
                        }
                    >
                        {quotations.data.map(q => (
                            <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    <Link href={route('quotations.show', q.id)} className="hover:underline">
                                        {q.quotation_number}
                                    </Link>
                                </td>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                                            {(q.customer?.company_name || q.customer?.name || 'C').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {q.customer?.company_name || q.customer?.name || 'Walk-in Corporate'}
                                            </div>
                                            {q.customer?.company_name && q.customer?.name && (
                                                <div className="text-xs text-slate-400">
                                                    Contact: {q.customer.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="font-medium text-slate-500 dark:text-slate-400">
                                    {dayjs(q.issue_date).format('DD MMM YYYY')}
                                </td>
                                <td className="font-medium">
                                    <span className={dayjs().isAfter(q.valid_until, 'day') && q.status !== 'Converted' ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                                        {dayjs(q.valid_until).format('DD MMM YYYY')}
                                    </span>
                                </td>
                                <td className="text-right font-black text-slate-900 dark:text-white font-mono">
                                    UGX {Number(q.total_amount).toLocaleString()}
                                </td>
                                <td className="text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(q.status)}`}>
                                        {q.status}
                                    </span>
                                </td>
                                <td className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Link
                                            href={route('quotations.show', q.id)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                            title="View Quotation"
                                        >
                                            <Eye size={16} />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => openWhatsApp(q.customer?.phone || '', buildQuotationMessage(q, storeSettings))}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                            title="Share Quotation via WhatsApp"
                                        >
                                            <MessageCircle size={16} />
                                        </button>
                                        <a
                                            href={route('quotations.pdf', q.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                            title="Download / Print PDF"
                                        >
                                            <Download size={16} />
                                        </a>
                                        {q.status !== 'Converted' && (
                                            <button
                                                type="button"
                                                onClick={() => setDeletingQuote(q)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                title="Delete Quotation"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                </div>

                {/* Mobile Cards View */}
                <Card noPadding className="md:hidden overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {quotations.data.map(q => (
                            <div key={q.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <Link href={route('quotations.show', q.id)} className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                                            {q.quotation_number}
                                        </Link>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                                            {q.customer?.company_name || q.customer?.name || 'Walk-in Corporate'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Valid until: {dayjs(q.valid_until).format('DD MMM YYYY')}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(q.status)}`}>
                                        {q.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
                                    <span className="font-mono font-black text-slate-900 dark:text-white">UGX {Number(q.total_amount).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={route('quotations.show', q.id)} className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1">
                                        <Eye size={14} /> View
                                    </Link>
                                    <a href={route('quotations.pdf', q.id)} target="_blank" rel="noopener noreferrer" className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1">
                                        <Download size={14} /> PDF
                                    </a>
                                    {q.status !== 'Converted' && (
                                        <button type="button" onClick={() => setDeletingQuote(q)} className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {quotations.data.length === 0 && (
                            <div className="py-10 text-center text-xs text-slate-400">
                                No quotations found.
                            </div>
                        )}
                    </div>
                </Card>

                {/* Pagination */}
                <Pagination data={quotations} className="mt-2" />
            </div>

            {/* Custom Delete Quotation Modal */}
            <Modal show={!!deletingQuote} onClose={() => setDeletingQuote(null)} maxWidth="md">
                {deletingQuote && (
                    <form onSubmit={confirmDelete} className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                <Trash2 size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Delete Quotation #{deletingQuote.quotation_number}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Remove draft proposal and all line items
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle size={14} /> Warning: This action cannot be undone
                            </p>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                                This quotation record will be permanently purged. Since it has not been converted into an active tax invoice, no stock inventory or accounting balances will be affected.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDeletingQuote(null)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                            >
                                Keep Quotation
                            </button>
                            <button
                                type="submit"
                                disabled={isDeleting}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Yes, Permanently Delete'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
