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
    FileText, 
    Plus, 
    Search, 
    AlertCircle, 
    AlertTriangle,
    CheckCircle2, 
    Clock, 
    Download,
    Eye,
    TrendingUp,
    FileSpreadsheet,
    Ban,
    Trash2,
    X,
    MessageCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import { buildInvoiceReminderMessage, openWhatsApp } from '@/Utils/whatsapp';

export default function InvoicesIndex({ invoices, filters, metrics }) {
    const { store_settings: storeSettings } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status || 'all');
    const isInitialRender = useRef(true);
    
    // Cancellation & Deletion States
    const [cancellingInvoice, setCancellingInvoice] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

    const [deletingInvoice, setDeletingInvoice] = useState(null);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            router.get(route('invoices.index'), {
                search: search || undefined,
                payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [search, paymentStatus]);

    const getStatusBadge = (st) => {
        switch (st) {
            case 'Paid':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
            case 'Partial':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
            case 'Overdue':
                return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 font-black animate-pulse';
            case 'Cancelled':
                return 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 line-through';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    const handleCancelInvoice = (e) => {
        e.preventDefault();
        if (!cancellingInvoice) return;
        setIsSubmittingCancel(true);
        router.post(route('invoices.cancel', cancellingInvoice.id), {
            reason: cancelReason,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Invoice #${cancellingInvoice.invoice_number} cancelled.`);
                setCancellingInvoice(null);
                setCancelReason('');
            },
            onError: (err) => {
                toast.error(err.error || 'Failed to cancel invoice.');
            },
            onFinish: () => setIsSubmittingCancel(false),
        });
    };

    const handleDeleteInvoice = (e) => {
        e.preventDefault();
        if (!deletingInvoice) return;
        setIsSubmittingDelete(true);
        router.delete(route('invoices.destroy', deletingInvoice.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Invoice #${deletingInvoice.invoice_number} deleted.`);
                setDeletingInvoice(null);
            },
            onError: (err) => {
                toast.error(err.error || 'Failed to delete invoice.');
            },
            onFinish: () => setIsSubmittingDelete(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Corporate Invoices & Credit Sales" />

            <PageHeader
                title="Corporate Invoices & Credit"
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Invoices & Credit' },
                ]}
                actions={
                    <>
                        <Link
                            href={route('quotations.index')}
                            className="saas-btn saas-btn-glass text-xs"
                        >
                            <FileSpreadsheet size={15} /> Quotations
                        </Link>
                        <Link
                            href={route('invoices.create')}
                            className="saas-btn saas-btn-primary text-xs"
                        >
                            <Plus size={15} /> New Tax Invoice
                        </Link>
                    </>
                }
            />

            <div className="space-y-6">

                {/* 4 Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        onClick={() => setPaymentStatus('all')}
                        className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-lg shadow-indigo-900/20 cursor-pointer hover:brightness-110 transition-all"
                    >
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

                    <div
                        onClick={() => setPaymentStatus(paymentStatus === 'Paid' ? 'all' : 'Paid')}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer transition-all ${paymentStatus === 'Paid' ? 'ring-2 ring-emerald-500' : 'hover:ring-2 hover:ring-emerald-400/50'}`}
                    >
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

                    <div
                        onClick={() => setPaymentStatus(paymentStatus === 'Unpaid' ? 'all' : 'Unpaid')}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer transition-all ${paymentStatus === 'Unpaid' ? 'ring-2 ring-amber-500' : 'hover:ring-2 hover:ring-amber-400/50'}`}
                    >
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

                    <div
                        onClick={() => setPaymentStatus(paymentStatus === 'Overdue' ? 'all' : 'Overdue')}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer transition-all ${paymentStatus === 'Overdue' ? 'ring-2 ring-rose-500' : 'hover:ring-2 hover:ring-rose-400/50'}`}
                    >
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

                {/* Standalone Search & Filter Card */}
                <Card>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Invoice #, PO #, Client..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="saas-input !pl-10 w-full"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={paymentStatus}
                                onChange={e => setPaymentStatus(e.target.value)}
                                className="saas-input sm:w-52"
                            >
                                <option value="all">All Payment Statuses</option>
                                <option value="Unpaid">Unpaid</option>
                                <option value="Partial">Partially Paid</option>
                                <option value="Paid">Fully Paid</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                            {(search || paymentStatus !== 'all') && (
                                <Button variant="secondary" onClick={() => { setSearch(''); setPaymentStatus('all'); }}>
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
                            'Invoice #',
                            'Client / Company',
                            'PO Ref',
                            'Due Date',
                            { label: 'Invoiced (UGX)', className: 'text-right' },
                            { label: 'Paid (UGX)', className: 'text-right' },
                            { label: 'Balance Due', className: 'text-right' },
                            { label: 'Status', className: 'text-center' },
                            { label: 'Actions', className: 'text-right' },
                        ]}
                        isEmpty={invoices.data.length === 0}
                        emptyState={
                            <div className="py-12 text-center text-slate-400">
                                <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <p>No corporate invoices recorded. Click <strong>"New Tax Invoice"</strong> or convert a quotation.</p>
                            </div>
                        }
                    >
                        {invoices.data.map(inv => {
                            const balance = inv.status === 'Cancelled' ? 0 : Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount));
                            const isCancelled = inv.status === 'Cancelled' || inv.payment_status === 'Cancelled';
                            const isOverdueDate = !isCancelled && inv.payment_status !== 'Paid' && dayjs().isAfter(inv.due_date, 'day');
                            return (
                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        <Link href={route('invoices.show', inv.id)} className="hover:underline">
                                            {inv.invoice_number}
                                        </Link>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                                {(inv.customer?.company_name || inv.customer?.name || 'C').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {inv.customer?.company_name || inv.customer?.name || 'Corporate Buyer'}
                                                </div>
                                                {inv.customer?.company_name && inv.customer?.name && (
                                                    <div className="text-xs text-slate-400">
                                                        Contact: {inv.customer.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-mono text-slate-500 dark:text-slate-400 text-xs">
                                        {inv.po_number || '—'}
                                    </td>
                                    <td className="font-medium">
                                        <span className={isOverdueDate ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                                            {dayjs(inv.due_date).format('DD MMM YYYY')}
                                        </span>
                                    </td>
                                    <td className="text-right font-mono font-bold text-slate-900 dark:text-white">
                                        UGX {Number(inv.total_amount).toLocaleString()}
                                    </td>
                                    <td className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                        UGX {Number(inv.paid_amount).toLocaleString()}
                                    </td>
                                    <td className="text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                        UGX {balance.toLocaleString()}
                                    </td>
                                    <td className="text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(inv.payment_status)}`}>
                                            {inv.payment_status}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Link
                                                href={route('invoices.show', inv.id)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                title="View Invoice & Collect Payment"
                                            >
                                                <Eye size={16} />
                                            </Link>
                                            {!isCancelled && (
                                                <button
                                                    type="button"
                                                    onClick={() => openWhatsApp(inv.customer?.phone || '', buildInvoiceReminderMessage(inv, storeSettings))}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                    title="Send Invoice / Balance Reminder via WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                            )}
                                            <a
                                                href={route('invoices.pdf', inv.id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                title="Download / Print Tax Invoice PDF"
                                            >
                                                <Download size={16} />
                                            </a>
                                            {!isCancelled && Number(inv.paid_amount) === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCancellingInvoice(inv);
                                                        setCancelReason('');
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                    title="Cancel / Void Invoice"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                            )}
                                            {Number(inv.paid_amount) === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeletingInvoice(inv)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                    title="Permanently Delete Invoice"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) : (
                                                <span
                                                    className="p-2 text-slate-200 dark:text-slate-700 cursor-not-allowed"
                                                    title="Cannot cancel or delete: payments have been collected"
                                                >
                                                    <Trash2 size={16} />
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </DataTable>
                </div>

                {/* Mobile Cards View */}
                <Card noPadding className="md:hidden overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoices.data.map(inv => {
                            const isCancelled = inv.status === 'Cancelled' || inv.payment_status === 'Cancelled';
                            const balance = isCancelled ? 0 : Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount));
                            return (
                                <div key={inv.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <Link href={route('invoices.show', inv.id)} className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                                                {inv.invoice_number}
                                            </Link>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                                                {inv.customer?.company_name || inv.customer?.name || 'Corporate Buyer'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Due: {dayjs(inv.due_date).format('DD MMM YYYY')}{inv.po_number ? ` • PO: ${inv.po_number}` : ''}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(inv.payment_status)}`}>
                                            {inv.payment_status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block uppercase">Invoiced</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{Number(inv.total_amount).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block uppercase">Paid</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{Number(inv.paid_amount).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block uppercase">Balance</span>
                                            <span className="font-bold text-rose-600 dark:text-rose-400">{balance.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link href={route('invoices.show', inv.id)} className="flex-1 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1">
                                            <Eye size={14} /> View
                                        </Link>
                                        <a href={route('invoices.pdf', inv.id)} target="_blank" rel="noopener noreferrer" className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1">
                                            <Download size={14} /> PDF
                                        </a>
                                        {!isCancelled && Number(inv.paid_amount) === 0 && (
                                            <button type="button" onClick={() => { setCancellingInvoice(inv); setCancelReason(''); }} className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                                                <Ban size={14} />
                                            </button>
                                        )}
                                        {Number(inv.paid_amount) === 0 && (
                                            <button type="button" onClick={() => setDeletingInvoice(inv)} className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {invoices.data.length === 0 && (
                            <div className="py-10 text-center text-xs text-slate-400">
                                No corporate invoices recorded.
                            </div>
                        )}
                    </div>
                </Card>

                {/* Pagination */}
                <Pagination data={invoices} className="mt-2" />
            </div>

            {/* Cancel Modal */}
            <Modal show={!!cancellingInvoice} onClose={() => setCancellingInvoice(null)} maxWidth="md">
                {cancellingInvoice && (
                    <form onSubmit={handleCancelInvoice} className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                                <Ban size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Cancel Invoice #{cancellingInvoice.invoice_number}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Void document & return reserved stock to inventory
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle size={14} /> What happens when you cancel:
                            </p>
                            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300/90">
                                <li>All bulk quantities and serialized devices will be restocked immediately.</li>
                                <li>If linked to a quotation, the quote status will revert to Approved.</li>
                                <li>Invoice status will become Cancelled (audit trail is retained).</li>
                            </ul>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Reason for Cancellation (Optional)
                            </label>
                            <textarea
                                rows="3"
                                placeholder="e.g. Order cancelled by client; incorrect price quote; re-issuing new terms..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setCancellingInvoice(null)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                            >
                                Never Mind
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingCancel}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 disabled:opacity-50"
                            >
                                {isSubmittingCancel ? 'Cancelling...' : 'Confirm & Cancel Invoice'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Delete Modal */}
            <Modal show={!!deletingInvoice} onClose={() => setDeletingInvoice(null)} maxWidth="md">
                {deletingInvoice && (
                    <form onSubmit={handleDeleteInvoice} className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                <Trash2 size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Permanently Delete Invoice #{deletingInvoice.invoice_number}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Permanent database removal & inventory restock
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle size={14} /> Warning: This action cannot be undone
                            </p>
                            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300/90">
                                <li>The invoice record and all line items will be purged forever.</li>
                                <li>If not previously cancelled, all items will be automatically returned to stock.</li>
                                <li>Any linked quotation will return to Approved status.</li>
                            </ul>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDeletingInvoice(null)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                            >
                                Keep Invoice
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingDelete}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
                            >
                                {isSubmittingDelete ? 'Deleting...' : 'Yes, Permanently Delete'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
