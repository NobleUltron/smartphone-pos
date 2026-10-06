import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { 
    FileSpreadsheet, 
    ArrowLeft, 
    Plus, 
    Trash2, 
    Building2, 
    Calendar, 
    FileText,
    DollarSign,
    Package,
    Wrench,
    CheckCircle2
} from 'lucide-react';
import dayjs from 'dayjs';

export default function QuotationsEdit({ quotation, customers, products }) {
    const { data, setData, put, processing, errors } = useForm({
        customer_id: quotation.customer_id || '',
        issue_date: quotation.issue_date || dayjs().format('YYYY-MM-DD'),
        valid_until: quotation.valid_until || dayjs().add(14, 'day').format('YYYY-MM-DD'),
        status: quotation.status || 'Draft',
        tax_rate: quotation.tax_rate ?? 0,
        discount: quotation.discount ?? 0,
        terms_conditions: quotation.terms_conditions || '',
        notes: quotation.notes || '',
        items: quotation.items?.map(it => ({
            type: it.type || 'product',
            product_id: it.product_id || '',
            item_name: it.item_name || '',
            description: it.description || '',
            quantity: it.quantity || 1,
            unit_price: it.unit_price || 0,
        })) || [
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

    // Calculate subtotal, tax, discount, grand total
    const subtotal = data.items.reduce((acc, it) => {
        const qty = parseFloat(it.quantity) || 0;
        const price = parseFloat(it.unit_price) || 0;
        return acc + (qty * price);
    }, 0);

    const discountVal = parseFloat(data.discount) || 0;
    const netBeforeTax = Math.max(0, subtotal - discountVal);
    const taxRateVal = parseFloat(data.tax_rate) || 0;
    const taxVal = (netBeforeTax * taxRateVal) / 100;
    const grandTotal = netBeforeTax + taxVal;

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('quotations.update', quotation.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Quotation #${quotation.quotation_number}`} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('quotations.show', quotation.id)}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <FileSpreadsheet className="text-blue-600" /> Edit Quotation #{quotation.quotation_number}
                            </h1>
                            <p className="text-xs text-slate-500">
                                Update quote specifications, pricing, client details, or validity status.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Client & Dates Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <Building2 size={16} className="text-blue-600" /> Client & Proposal Dates
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Client / Company *
                                </label>
                                <select
                                    value={data.customer_id}
                                    onChange={e => setData('customer_id', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                >
                                    <option value="">-- Choose Client --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.company_name ? `${c.company_name} (${c.name})` : c.name} — {c.phone}
                                        </option>
                                    ))}
                                </select>
                                {errors.customer_id && <p className="text-red-500 text-[11px]">{errors.customer_id}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Quotation Status *
                                </label>
                                <select
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Sent">Sent to Client</option>
                                    <option value="Approved">Approved by Client</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                                {errors.status && <p className="text-red-500 text-[11px]">{errors.status}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Issue Date *
                                </label>
                                <input
                                    type="date"
                                    value={data.issue_date}
                                    onChange={e => setData('issue_date', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                />
                                {errors.issue_date && <p className="text-red-500 text-[11px]">{errors.issue_date}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Valid Until *
                                </label>
                                <input
                                    type="date"
                                    value={data.valid_until}
                                    onChange={e => setData('valid_until', e.target.value)}
                                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                />
                                {errors.valid_until && <p className="text-red-500 text-[11px]">{errors.valid_until}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Line Items Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Package size={16} className="text-blue-600" /> Products & Services Line Items
                            </h2>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Line Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {data.items.map((item, index) => (
                                <div key={index} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] flex items-center justify-center">
                                                {index + 1}
                                            </span>
                                            <span className="text-xs font-bold uppercase text-slate-500">
                                                Item Type:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleItemChange(index, 'type', item.type === 'product' ? 'service' : 'product')}
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                                                    item.type === 'service'
                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                                }`}
                                            >
                                                {item.type === 'service' ? <Wrench size={10} /> : <Package size={10} />}
                                                {item.type} (Click to toggle)
                                            </button>
                                        </div>

                                        {data.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                                title="Remove Item"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        {/* Product picker or custom description */}
                                        {item.type === 'product' ? (
                                            <div className="md:col-span-5 space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Select Product (Inventory)</label>
                                                <select
                                                    value={item.product_id}
                                                    onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                                                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                >
                                                    <option value="">-- Choose Catalog Product --</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.brand?.name ? `${p.brand.name} ` : ''}{p.model_name} (UGX {Number(p.base_price).toLocaleString()})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="md:col-span-5 space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Service / Labor Title *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Bulk Setup & Configuration, Screen Repair Service"
                                                    value={item.item_name}
                                                    onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                                                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-slate-500">Item Name / Display *</label>
                                            <input
                                                type="text"
                                                value={item.item_name}
                                                onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                                                placeholder="Display name"
                                                className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-slate-500">Quantity *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-slate-500">Unit Price (UGX) *</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.unit_price}
                                                onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                className="w-full text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Line item description */}
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            placeholder="Optional line item details, specs, serials or notes..."
                                            value={item.description}
                                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Summary & Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Terms & Notes */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <FileText size={16} className="text-blue-600" /> Commercial Terms
                            </h2>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Terms & Conditions
                                </label>
                                <textarea
                                    rows={4}
                                    value={data.terms_conditions}
                                    onChange={e => setData('terms_conditions', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Notes (Internal / Customer Note)
                                </label>
                                <input
                                    type="text"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="e.g. Includes delivery to Kampala Office"
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Calculation Summary */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4 flex flex-col justify-between">
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <DollarSign size={16} className="text-emerald-600" /> Quotation Total
                            </h2>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>Subtotal:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">UGX {subtotal.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center gap-4">
                                    <span className="text-slate-500">Discount (UGX):</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.discount}
                                        onChange={e => setData('discount', e.target.value)}
                                        className="w-32 px-2 py-1 text-right text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="flex justify-between items-center gap-4">
                                    <span className="text-slate-500">Tax Rate (%):</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={data.tax_rate}
                                        onChange={e => setData('tax_rate', e.target.value)}
                                        className="w-20 px-2 py-1 text-right text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>

                                {taxVal > 0 && (
                                    <div className="flex justify-between items-center text-slate-500">
                                        <span>Tax Amount:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">UGX {taxVal.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-base font-black text-slate-900 dark:text-white">
                                    <span>Grand Total:</span>
                                    <span className="font-mono text-xl text-blue-600 dark:text-blue-400">UGX {grandTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <Link
                                    href={route('quotations.show', quotation.id)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                                >
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
