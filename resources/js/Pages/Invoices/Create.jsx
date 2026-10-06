import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { 
    FileText, 
    ArrowLeft, 
    Plus, 
    Trash2, 
    Building2, 
    Calendar, 
    DollarSign,
    Package
} from 'lucide-react';
import dayjs from 'dayjs';

export default function InvoicesCreate({ customers, products, nextNumber, defaultTerms }) {
    const { data, setData, post, processing, errors } = useForm({
        customer_id: '',
        customer_name: '',
        company_name: '',
        customer_phone: '',
        po_number: '',
        issue_date: dayjs().format('YYYY-MM-DD'),
        due_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        payment_terms: 'Net 30',
        tax_rate: 0,
        discount: 0,
        terms_conditions: defaultTerms || '',
        notes: '',
        items: [
            {
                type: 'product',
                product_id: '',
                item_name: '',
                description: '',
                quantity: 1,
                unit_price: '',
            }
        ]
    });

    const [isNewCustomer, setIsNewCustomer] = useState(false);

    const handleCustomerChange = (e) => {
        const val = e.target.value;
        if (val === 'new') {
            setIsNewCustomer(true);
            setData(prev => ({ ...prev, customer_id: '' }));
        } else {
            setIsNewCustomer(false);
            const found = customers.find(c => String(c.id) === String(val));
            setData(prev => ({
                ...prev,
                customer_id: val,
                customer_name: found ? found.name : '',
                company_name: found ? (found.company_name || '') : '',
                customer_phone: found ? found.phone : '',
            }));
        }
    };

    const handleAddItem = () => {
        setData('items', [
            ...data.items,
            {
                type: 'product',
                product_id: '',
                item_name: '',
                description: '',
                quantity: 1,
                unit_price: '',
            }
        ]);
    };

    const handleRemoveItem = (index) => {
        if (data.items.length === 1) return;
        const updated = data.items.filter((_, idx) => idx !== index);
        setData('items', updated);
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...data.items];
        updated[index][field] = value;

        if (field === 'product_id' && value) {
            const prod = products.find(p => String(p.id) === String(value));
            if (prod) {
                updated[index].item_name = `${prod.brand?.name ? prod.brand.name + ' ' : ''}${prod.model_name}`;
                updated[index].unit_price = prod.base_price;
            }
        }

        setData('items', updated);
    };

    const handleTermsChange = (e) => {
        const terms = e.target.value;
        let days = 30;
        if (terms === 'Immediate') days = 0;
        else if (terms === 'Net 15') days = 15;
        else if (terms === 'Net 30') days = 30;
        else if (terms === 'Net 60') days = 60;

        setData(prev => ({
            ...prev,
            payment_terms: terms,
            due_date: dayjs().add(days, 'day').format('YYYY-MM-DD')
        }));
    };

    const subtotal = data.items.reduce((sum, item) => {
        return sum + (Number(item.quantity || 0) * Number(item.unit_price || 0));
    }, 0);

    const discount = Number(data.discount || 0);
    const taxRate = Number(data.tax_rate || 0);
    const netBeforeTax = Math.max(0, subtotal - discount);
    const taxAmount = (netBeforeTax * taxRate) / 100;
    const totalAmount = netBeforeTax + taxAmount;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('invoices.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Generate Tax Invoice" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('invoices.index')}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                                Generate Tax Invoice
                            </h1>
                            <p className="text-xs text-slate-500 font-mono">
                                Reference: #{nextNumber}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Client & Invoice Meta */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Building2 size={16} className="text-indigo-600" /> Buyer & Order Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Select Corporate Client *
                                </label>
                                <select
                                    value={isNewCustomer ? 'new' : data.customer_id}
                                    onChange={handleCustomerChange}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="">-- Choose Existing Client --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.company_name ? `${c.company_name} (${c.name})` : c.name} — {c.phone}
                                        </option>
                                    ))}
                                    <option value="new">+ Quick Add New Corporate Client</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Client Purchase Order (PO Ref)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. PO-UG-99201"
                                    value={data.po_number}
                                    onChange={e => setData('po_number', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Quick New Client Inputs */}
                        {isNewCustomer && (
                            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase">Company Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Stanbic Bank Procurement"
                                        value={data.company_name}
                                        onChange={e => setData('company_name', e.target.value)}
                                        className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase">Contact Person *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Sarah Namubiru"
                                        value={data.customer_name}
                                        onChange={e => setData('customer_name', e.target.value)}
                                        className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase">Phone *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. +256 772 000000"
                                        value={data.customer_phone}
                                        onChange={e => setData('customer_phone', e.target.value)}
                                        className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Payment Terms
                                </label>
                                <select
                                    value={data.payment_terms}
                                    onChange={handleTermsChange}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="Net 30">Net 30 Days (Standard B2B)</option>
                                    <option value="Net 15">Net 15 Days</option>
                                    <option value="Net 60">Net 60 Days</option>
                                    <option value="Immediate">Due on Delivery</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Invoice Date *
                                </label>
                                <input
                                    type="date"
                                    value={data.issue_date}
                                    onChange={e => setData('issue_date', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Payment Due Date *
                                </label>
                                <input
                                    type="date"
                                    value={data.due_date}
                                    onChange={e => setData('due_date', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Package size={16} className="text-indigo-600" /> Invoiced Line Items
                            </h2>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Line Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {data.items.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Item Type</label>
                                            <select
                                                value={item.type}
                                                onChange={e => handleItemChange(idx, 'type', e.target.value)}
                                                className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            >
                                                <option value="product">Hardware / Product</option>
                                                <option value="service">Labor / Service</option>
                                            </select>
                                        </div>

                                        {item.type === 'product' ? (
                                            <div className="md:col-span-4 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Select Stock Item</label>
                                                <select
                                                    value={item.product_id}
                                                    onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                                                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                >
                                                    <option value="">-- Choose Stock Product --</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.brand?.name ? p.brand.name + ' ' : ''}{p.model_name} (Stock: {p.quantity}) — UGX {Number(p.base_price).toLocaleString()}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="md:col-span-4 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Service Description *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Bulk Setup & Configuration"
                                                    value={item.item_name}
                                                    onChange={e => handleItemChange(idx, 'item_name', e.target.value)}
                                                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                                className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Unit Price (UGX)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.unit_price}
                                                onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                                                className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-right"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-1 flex justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                disabled={data.items.length === 1}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Financial Totals */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="w-full md:w-1/2 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Conditions</label>
                                    <textarea
                                        rows={3}
                                        value={data.terms_conditions}
                                        onChange={e => setData('terms_conditions', e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                                <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Subtotal:</span>
                                    <span className="font-mono text-slate-900 dark:text-white font-bold">UGX {subtotal.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span>Discount (UGX):</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.discount}
                                        onChange={e => setData('discount', e.target.value)}
                                        className="w-28 text-right text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span>VAT / Tax (%):</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={data.tax_rate}
                                        onChange={e => setData('tax_rate', e.target.value)}
                                        className="w-20 text-right text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-base font-black text-indigo-600 dark:text-indigo-400">
                                    <span>Total Invoice:</span>
                                    <span className="font-mono">UGX {totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Link
                            href={route('invoices.index')}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {processing ? 'Generating...' : 'Confirm & Issue Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
