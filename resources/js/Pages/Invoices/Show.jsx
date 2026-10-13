import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { 
    FileText, 
    ArrowLeft, 
    Download, 
    Printer, 
    CreditCard, 
    Building2, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    AlertTriangle,
    User,
    DollarSign,
    Receipt,
    Wallet,
    FileSpreadsheet,
    FileCheck,
    Ban,
    Trash2
} from 'lucide-react';
import dayjs from 'dayjs';

export default function InvoicesShow({ invoice, paymentAccounts }) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    
    // Cancellation & Deletion States
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isCancelled = invoice.status === 'Cancelled' || invoice.payment_status === 'Cancelled';
    const isPaid = invoice.payment_status === 'Paid';
    const isOverdue = invoice.payment_status === 'Overdue';
    const isPartial = invoice.payment_status === 'Partial';

    const balanceDue = (invoice.balance_due !== undefined && invoice.balance_due !== null)
        ? Number(invoice.balance_due)
        : Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));

    const paymentForm = useForm({
        amount: balanceDue > 0 ? balanceDue : '',
        payment_account_id: paymentAccounts?.[0]?.id || '',
        payment_method: 'Bank Transfer',
        transaction_reference: '',
        payment_date: dayjs().format('YYYY-MM-DD'),
        notes: '',
    });

    const handleRecordPayment = (e) => {
        e.preventDefault();
        paymentForm.post(route('invoices.payments.store', invoice.id), {
            onSuccess: () => {
                setShowPaymentModal(false);
                paymentForm.reset();
            },
        });
    };

    const handleCancelInvoice = (e) => {
        e.preventDefault();
        setIsCancelling(true);
        router.post(route('invoices.cancel', invoice.id), {
            reason: cancelReason,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowCancelModal(false);
                setCancelReason('');
            },
            onFinish: () => setIsCancelling(false),
        });
    };

    const handleDeleteInvoice = (e) => {
        e.preventDefault();
        setIsDeleting(true);
        router.delete(route('invoices.destroy', invoice.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteModal(false);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const percentPaid = invoice.total_amount > 0 
        ? Math.min(100, Math.round((Number(invoice.paid_amount) / Number(invoice.total_amount)) * 100))
        : 0;

    return (
        <AuthenticatedLayout>
            <Head title={`Invoice #${invoice.invoice_number}`} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('invoices.index')}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                                    Invoice #{invoice.invoice_number}
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                    isCancelled
                                        ? 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 line-through'
                                        : isPaid 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400' 
                                            : isOverdue 
                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400'
                                                : isPartial 
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400'
                                }`}>
                                    {invoice.payment_status}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                                <span>Issued: {dayjs(invoice.issue_date).format('DD MMM YYYY')}</span>
                                <span>•</span>
                                <span className={isOverdue && !isCancelled ? 'text-red-600 font-bold' : ''}>
                                    Due: {dayjs(invoice.due_date).format('DD MMM YYYY')} ({invoice.payment_terms})
                                </span>
                                {invoice.po_number && (
                                    <>
                                        <span>•</span>
                                        <span>PO #{invoice.po_number}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {invoice.quotation && (
                            <Link
                                href={route('quotations.show', invoice.quotation.id)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                <FileSpreadsheet size={15} /> Quote #{invoice.quotation.quotation_number}
                            </Link>
                        )}

                        <a
                            href={route('invoices.pdf', invoice.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <Download size={15} /> A4 Tax Invoice PDF
                        </a>

                        {!isCancelled && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCancelReason('');
                                    setShowCancelModal(true);
                                }}
                                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-200 dark:border-amber-800"
                            >
                                <Ban size={15} /> Cancel Invoice
                            </button>
                        )}

                        {Number(invoice.paid_amount) === 0 && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(true)}
                                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-800"
                            >
                                <Trash2 size={15} /> Delete
                            </button>
                        )}

                        {!isPaid && !isCancelled && (
                            <button
                                onClick={() => {
                                    paymentForm.setData('amount', balanceDue);
                                    setShowPaymentModal(true);
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                            >
                                <CreditCard size={15} /> Record Payment
                            </button>
                        )}
                    </div>
                </div>

                {/* Cancelled Warning Banner */}
                {isCancelled && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3.5 text-amber-800 dark:text-amber-300 shadow-sm">
                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 mt-0.5">
                            <Ban size={20} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                                Voided & Cancelled Invoice
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
                                This invoice has been cancelled and voided. All reserved items and serialized device IMEIs were automatically returned to active inventory stock. Debtors and receivables metrics have been adjusted accordingly.
                            </p>
                        </div>
                    </div>
                )}

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Client Card */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Bill To Client
                            </span>
                            <Building2 size={16} className="text-slate-400" />
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                            {invoice.customer?.company_name || invoice.customer?.name || 'Corporate Client'}
                        </div>
                        {invoice.customer?.company_name && invoice.customer?.name && (
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                Contact: <strong>{invoice.customer.name}</strong>
                            </div>
                        )}
                        <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                            {invoice.customer?.phone && <div>Phone: {invoice.customer.phone}</div>}
                            {invoice.customer?.email && <div>Email: {invoice.customer.email}</div>}
                            {invoice.customer?.tin_number && <div>TIN: {invoice.customer.tin_number}</div>}
                        </div>
                    </div>

                    {/* Financial Status Summary */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Payment Breakdown
                            </span>
                            <DollarSign size={16} className="text-slate-400" />
                        </div>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-slate-500">
                                <span>Grand Total:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">UGX {Number(invoice.total_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-600">
                                <span>Total Paid:</span>
                                <span className="font-mono font-bold">UGX {Number(invoice.paid_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="font-bold">Remaining Balance:</span>
                                <span className={`font-mono font-black ${balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                                    UGX {balanceDue.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                <span>COLLECTION PROGRESS</span>
                                <span>{percentPaid}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${
                                        percentPaid === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${percentPaid}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Outstanding Balance Banner */}
                    <div className={`p-5 rounded-2xl shadow-md space-y-2 text-white flex flex-col justify-between ${
                        isCancelled
                            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60'
                            : balanceDue > 0 
                                ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950' 
                                : 'bg-gradient-to-br from-emerald-900 to-teal-950'
                    }`}>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                {isCancelled ? 'Invoice Status' : balanceDue > 0 ? 'Outstanding Due' : 'Invoice Settlement'}
                            </div>
                            <div className={`text-3xl font-black font-mono mt-1 ${isCancelled ? 'line-through text-slate-300' : ''}`}>
                                {isCancelled ? 'CANCELLED' : balanceDue > 0 ? `UGX ${balanceDue.toLocaleString()}` : 'Fully Paid'}
                            </div>
                        </div>
                        <div className="text-xs text-slate-300/80">
                            {isCancelled ? (
                                <span>This invoice was voided and all items restored to stock.</span>
                            ) : balanceDue > 0 ? (
                                <span>Payment terms: <strong>{invoice.payment_terms}</strong> due by {dayjs(invoice.due_date).format('DD MMM YYYY')}.</span>
                            ) : (
                                <span>All payments have been settled and credited to Treasury accounts.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items Breakdown Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                        <span>Invoice Items & Service Breakdown</span>
                        <span className="text-xs font-normal text-slate-400">{invoice.items?.length || 0} line items</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] bg-slate-50/50 dark:bg-slate-800/30">
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Item / Description</th>
                                    <th className="py-3 px-4 text-center">Qty</th>
                                    <th className="py-3 px-4 text-right">Unit Price</th>
                                    <th className="py-3 px-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {invoice.items?.map((it, idx) => (
                                    <tr key={it.id}>
                                        <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 dark:text-white">{it.item_name}</span>
                                                {it.type === 'service' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
                                                        Service
                                                    </span>
                                                )}
                                            </div>
                                            {it.description && <div className="text-[11px] text-slate-500 mt-0.5">{it.description}</div>}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold">{it.quantity}</td>
                                        <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">UGX {Number(it.unit_price).toLocaleString()}</td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">UGX {Number(it.total_price).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Subtotal, Tax, Discount, Total calculation */}
                    <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <div className="w-full sm:w-72 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">UGX {Number(invoice.subtotal).toLocaleString()}</span>
                            </div>
                            {Number(invoice.discount) > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Discount:</span>
                                    <span className="font-mono font-bold">-UGX {Number(invoice.discount).toLocaleString()}</span>
                                </div>
                            )}
                            {Number(invoice.tax_amount) > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>Tax ({invoice.tax_rate}%):</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">UGX {Number(invoice.tax_amount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span>Total Amount:</span>
                                <span className="font-mono text-blue-600 dark:text-blue-400">UGX {Number(invoice.total_amount).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payments Ledger Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Receipt size={18} className="text-emerald-600" />
                            <span>Payment Receipts & Treasury Collection History</span>
                        </div>
                        {!isPaid && !isCancelled && (
                            <button
                                onClick={() => {
                                    paymentForm.setData('amount', balanceDue);
                                    setShowPaymentModal(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                                <CreditCard size={13} /> Collect Payment
                            </button>
                        )}
                    </div>

                    {(!invoice.payments || invoice.payments.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                            No payment installments recorded yet. Use the "Record Payment" button when a remittance or check is received.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] bg-slate-50/50 dark:bg-slate-800/30">
                                        <th className="py-3 px-4">Receipt #</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Destination Treasury Account</th>
                                        <th className="py-3 px-4">Method & Ref</th>
                                        <th className="py-3 px-4">Recorded By</th>
                                        <th className="py-3 px-4 text-right">Amount Received</th>
                                        <th className="py-3 px-4 text-center">Receipt PDF</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {invoice.payments.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                {p.receipt_number}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {dayjs(p.payment_date).format('DD MMM YYYY')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    <Wallet size={13} className="text-slate-400" />
                                                    {p.payment_account?.name || 'Treasury Account'}
                                                </div>
                                                <span className="text-[10px] text-slate-400 capitalize">
                                                    {p.payment_account?.type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                                    {p.payment_method}
                                                </div>
                                                {p.transaction_reference && (
                                                    <div className="text-[11px] text-slate-400 font-mono">
                                                        Ref: {p.transaction_reference}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {p.user?.name || 'Staff'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                UGX {Number(p.amount).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <a
                                                    href={route('invoices.payments.receipt-pdf', p.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all"
                                                >
                                                    <Printer size={12} /> Receipt
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Terms and Notes */}
                {(invoice.terms_conditions || invoice.notes) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {invoice.terms_conditions && (
                            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
                                <div className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                    Payment Terms & Settlement Instructions
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                                    {invoice.terms_conditions}
                                </div>
                            </div>
                        )}
                        {invoice.notes && (
                            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
                                <div className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                    Internal Notes / Reference
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                                    {invoice.notes}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Record Payment Modal */}
            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} maxWidth="md">
                <form onSubmit={handleRecordPayment} className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Invoice Payment</h3>
                            <p className="text-xs text-slate-500">Collect payment and credit Treasury account immediately</p>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Outstanding Balance:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                            UGX {balanceDue.toLocaleString()}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {/* Amount */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Payment Amount (UGX) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={balanceDue}
                                value={paymentForm.data.amount}
                                onChange={(e) => paymentForm.setData('amount', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                            {paymentForm.errors.amount && (
                                <p className="text-red-500 text-[11px]">{paymentForm.errors.amount}</p>
                            )}
                        </div>

                        {/* Destination Treasury Account */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Destination Treasury Account <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={paymentForm.data.payment_account_id}
                                onChange={(e) => paymentForm.setData('payment_account_id', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                                required
                            >
                                <option value="" disabled>-- Select Destination Account --</option>
                                {paymentAccounts?.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.type.toUpperCase()}) — Balance: UGX {Number(acc.current_balance).toLocaleString()}
                                    </option>
                                ))}
                            </select>
                            {paymentForm.errors.payment_account_id && (
                                <p className="text-red-500 text-[11px]">{paymentForm.errors.payment_account_id}</p>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Payment Method
                                </label>
                                <select
                                    value={paymentForm.data.payment_method}
                                    onChange={(e) => paymentForm.setData('payment_method', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="Bank Transfer">Bank Wire / EFT</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Cash">Cash at Office</option>
                                    <option value="POS Card">Card</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Payment Date
                                </label>
                                <input
                                    type="date"
                                    value={paymentForm.data.payment_date}
                                    onChange={(e) => paymentForm.setData('payment_date', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Transaction Reference / Cheque # */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Transaction Ref / Cheque # (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. EFT-982341 or CHQ #002341"
                                value={paymentForm.data.transaction_reference}
                                onChange={(e) => paymentForm.setData('transaction_reference', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Note / Remarks (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. First 50% milestone installment"
                                value={paymentForm.data.notes}
                                onChange={(e) => paymentForm.setData('notes', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowPaymentModal(false)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={paymentForm.processing}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                        >
                            {paymentForm.processing ? 'Recording...' : 'Confirm & Issue Receipt'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Cancel Modal */}
            <Modal show={showCancelModal} onClose={() => setShowCancelModal(false)} maxWidth="md">
                <form onSubmit={handleCancelInvoice} className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                            <Ban size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Cancel Invoice #{invoice.invoice_number}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Void document & restore reserved stock to inventory
                            </p>
                        </div>
                    </div>

                    <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                            <AlertTriangle size={14} /> What happens when you cancel:
                        </p>
                        <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300/90">
                            <li>All line items and serialized devices will be restocked immediately.</li>
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
                            placeholder="e.g. Client cancelled agreement, pricing amended, or wrong items billed..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowCancelModal(false)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                            Never Mind
                        </button>
                        <button
                            type="submit"
                            disabled={isCancelling}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 disabled:opacity-50"
                        >
                            {isCancelling ? 'Cancelling...' : 'Confirm & Cancel Invoice'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth="md">
                <form onSubmit={handleDeleteInvoice} className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                            <Trash2 size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Permanently Delete Invoice #{invoice.invoice_number}
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
                            onClick={() => setShowDeleteModal(false)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                            Keep Invoice
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
            </Modal>
        </AuthenticatedLayout>
    );
}
