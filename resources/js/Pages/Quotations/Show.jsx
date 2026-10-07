import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { 
    FileSpreadsheet, 
    ArrowLeft, 
    Download, 
    Printer, 
    ArrowRight, 
    Building2, 
    Calendar, 
    Clock, 
    User, 
    CheckCircle2, 
    Edit2,
    Trash2,
    FileText
} from 'lucide-react';
import dayjs from 'dayjs';

export default function QuotationsShow({ quotation }) {
    const [showConvertModal, setShowConvertModal] = useState(false);

    const convertForm = useForm({
        po_number: '',
        payment_terms: 'Net 30',
        due_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    });

    const handleConvert = (e) => {
        e.preventDefault();
        convertForm.post(route('quotations.convert', quotation.id), {
            onSuccess: () => setShowConvertModal(false),
        });
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete Quotation #${quotation.quotation_number}? This cannot be undone.`)) {
            router.delete(route('quotations.destroy', quotation.id));
        }
    };

    const isConverted = quotation.status === 'Converted' || !!quotation.invoice;

    return (
        <AuthenticatedLayout>
            <Head title={`Quotation #${quotation.quotation_number}`} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('quotations.index')}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                                    Quotation #{quotation.quotation_number}
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                    isConverted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                    {quotation.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                                Issued: {dayjs(quotation.issue_date).format('DD MMM YYYY')} • Valid until: {dayjs(quotation.valid_until).format('DD MMM YYYY')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <a
                            href={route('quotations.pdf', quotation.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <Download size={15} /> PDF Document
                        </a>

                        {!isConverted ? (
                            <>
                                <Link
                                    href={route('quotations.edit', quotation.id)}
                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <Edit2 size={15} /> Edit
                                </Link>
                                <button
                                    onClick={() => setShowConvertModal(true)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                                >
                                    <CheckCircle2 size={15} /> Convert to Invoice
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                    title="Delete Quotation"
                                >
                                    <Trash2 size={15} /> Delete
                                </button>
                            </>
                        ) : (
                            quotation.invoice && (
                                <Link
                                    href={route('invoices.show', quotation.invoice.id)}
                                    className="px-4 py-2 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <FileText size={15} /> View Invoice #{quotation.invoice.invoice_number}
                                </Link>
                            )
                        )}
                    </div>
                </div>

                {/* Client & Overview Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Client Details
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                            {quotation.customer?.company_name || quotation.customer?.name || 'Walk-in Corporate Client'}
                        </div>
                        {quotation.customer?.company_name && quotation.customer?.name && (
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                Contact Person: <strong>{quotation.customer.name}</strong>
                            </div>
                        )}
                        <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                            {quotation.customer?.phone && <div>Phone: {quotation.customer.phone}</div>}
                            {quotation.customer?.email && <div>Email: {quotation.customer.email}</div>}
                            {quotation.customer?.tin_number && <div>TIN: {quotation.customer.tin_number}</div>}
                        </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl shadow-md space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                            Proposal Grand Total
                        </div>
                        <div className="text-3xl font-black font-mono">
                            UGX {Number(quotation.total_amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-200/80 pt-1">
                            Subtotal: UGX {Number(quotation.subtotal).toLocaleString()} • Tax: UGX {Number(quotation.tax_amount).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Items Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
                        Quotation Items & Breakdown
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] bg-slate-50/50 dark:bg-slate-800/30">
                                <th className="py-3 px-4">#</th>
                                <th className="py-3 px-4">Item & Description</th>
                                <th className="py-3 px-4 text-center">Quantity</th>
                                <th className="py-3 px-4 text-right">Unit Price</th>
                                <th className="py-3 px-4 text-right">Line Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {quotation.items.map((it, idx) => (
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

                {/* Terms and Notes */}
                {quotation.terms_conditions && (
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
                        <div className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                            Commercial Terms & Conditions
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                            {quotation.terms_conditions}
                        </div>
                    </div>
                )}
            </div>

            {/* Convert to Invoice Modal */}
            <Modal show={showConvertModal} onClose={() => setShowConvertModal(false)} maxWidth="md">
                <form onSubmit={handleConvert} className="p-6 bg-white dark:bg-slate-900 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Convert to Official Invoice</h3>
                            <p className="text-xs text-slate-500">Transform this quote into an active sales invoice on credit</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                Client Purchase Order (PO #)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. PO-2026-8819 (Optional)"
                                value={convertForm.data.po_number}
                                onChange={e => convertForm.setData('po_number', e.target.value)}
                                className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                    Payment Terms
                                </label>
                                <select
                                    value={convertForm.data.payment_terms}
                                    onChange={e => {
                                        const terms = e.target.value;
                                        let days = 30;
                                        if (terms === 'Immediate') days = 0;
                                        else if (terms === 'Net 15') days = 15;
                                        else if (terms === 'Net 30') days = 30;
                                        else if (terms === 'Net 60') days = 60;
                                        convertForm.setData(prev => ({
                                            ...prev,
                                            payment_terms: terms,
                                            due_date: dayjs().add(days, 'day').format('YYYY-MM-DD')
                                        }));
                                    }}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="Net 30">Net 30 Days</option>
                                    <option value="Net 15">Net 15 Days</option>
                                    <option value="Net 60">Net 60 Days</option>
                                    <option value="Immediate">Due on Delivery</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                    Payment Due Date
                                </label>
                                <input
                                    type="date"
                                    value={convertForm.data.due_date}
                                    onChange={e => convertForm.setData('due_date', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                            <strong>Note:</strong> Converting will create an official Tax Invoice for <strong>UGX {Number(quotation.total_amount).toLocaleString()}</strong> and reserve/dispatch inventory for product line items.
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowConvertModal(false)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={convertForm.processing}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                        >
                            {convertForm.processing ? 'Generating...' : 'Confirm & Generate Invoice'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
