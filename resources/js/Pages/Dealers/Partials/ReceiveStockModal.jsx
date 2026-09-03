import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Download, X, Search, Plus, Package, Check, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ReceiveStockModal({
    isOpen,
    onClose,
    dealers = [],
    preselectedDealerId = null,
    categories = [],
    brands = [],
    products = []
}) {
    const [mode, setMode] = useState('existing'); // 'existing' | 'new'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        dealer_id: preselectedDealerId || '',
        type: 'serialized',
        product_id: '',
        category_id: '',
        brand_id: '',
        model_name: '',
        imei_number: '',
        condition: 'Brand New',
        storage_capacity: '',
        color: '',
        wholesale_cost: '',
        retail_price: '',
        quantity: 1,
        notes: ''
    });

    useEffect(() => {
        if (preselectedDealerId) {
            setData('dealer_id', preselectedDealerId);
        }
    }, [preselectedDealerId]);

    // Filter products based on search term
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return products.filter(p => {
            const brandName = p.brand?.name?.toLowerCase() || '';
            const modelName = p.model_name?.toLowerCase() || '';
            const catName = p.category?.name?.toLowerCase() || '';
            return brandName.includes(term) || modelName.includes(term) || catName.includes(term);
        }).slice(0, 10);
    }, [searchTerm, products]);

    const handleSelectProduct = (prod) => {
        setSelectedProduct(prod);
        setData(prev => ({
            ...prev,
            product_id: prod.id,
            type: prod.type,
            brand_id: prod.brand_id || '',
            category_id: prod.category_id || '',
            model_name: prod.model_name || '',
            wholesale_cost: prev.wholesale_cost || (prod.cost_price > 0 ? prod.cost_price : ''),
            retail_price: prev.retail_price || (prod.selling_price > 0 ? prod.selling_price : '')
        }));
        setSearchTerm('');
    };

    const handleClearProduct = () => {
        setSelectedProduct(null);
        setData(prev => ({
            ...prev,
            product_id: '',
            model_name: '',
            brand_id: '',
            category_id: ''
        }));
    };

    const handleSwitchToNew = () => {
        setMode('new');
        handleClearProduct();
    };

    const handleSwitchToExisting = () => {
        setMode('existing');
        handleClearProduct();
    };

    const handleClose = () => {
        reset();
        setSelectedProduct(null);
        setSearchTerm('');
        setMode('existing');
        clearErrors();
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('dealers.store-inward'), {
            onSuccess: () => {
                handleClose();
            }
        });
    };

    const formatCurrency = (val) => {
        if (!val || isNaN(val)) return 'UGX 0';
        return 'UGX ' + Number(val).toLocaleString();
    };

    const margin = Number(data.retail_price || 0) - Number(data.wholesale_cost || 0);

    return (
        <Modal show={isOpen} onClose={handleClose} maxWidth="2xl">
            <div className="p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <Download size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Receive Stock from Partner Dealer (Inward Intake)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Source devices or accessories from another shop to sell on consignment in your store.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Dealer Selection */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Select Partner Dealer (Source Shop) *
                        </label>
                        <select
                            className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                            value={data.dealer_id}
                            onChange={(e) => setData('dealer_id', e.target.value)}
                            required
                        >
                            <option value="">-- Choose Partner Dealer --</option>
                            {dealers.map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                            ))}
                        </select>
                        {errors.dealer_id && <p className="text-xs text-rose-500 font-bold">{errors.dealer_id}</p>}
                    </div>

                    {/* Mode Selector Toggle */}
                    <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex gap-1 border border-slate-200/80 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={handleSwitchToExisting}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                mode === 'existing'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Package size={15} /> Select Existing Inventory Product
                        </button>
                        <button
                            type="button"
                            onClick={handleSwitchToNew}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                mode === 'new'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Plus size={15} /> Register Brand New Product
                        </button>
                    </div>

                    {/* Mode: Existing Product Selection */}
                    {mode === 'existing' ? (
                        <div className="space-y-3">
                            {!selectedProduct ? (
                                <div className="relative">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Search Product in Your Inventory *
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                            placeholder="Type model name, brand or category (e.g. 5Dz, iPhone 14, Charger)..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {/* Dropdown Results */}
                                    {searchTerm.trim().length > 0 && (
                                        <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                                            {filteredProducts.length === 0 ? (
                                                <div className="p-4 text-center">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">No matching product found in inventory.</p>
                                                    <button
                                                        type="button"
                                                        onClick={handleSwitchToNew}
                                                        className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                                    >
                                                        + Register "{searchTerm}" as a new product instead
                                                    </button>
                                                </div>
                                            ) : (
                                                filteredProducts.map(prod => (
                                                    <button
                                                        key={prod.id}
                                                        type="button"
                                                        onClick={() => handleSelectProduct(prod)}
                                                        className="w-full p-3 text-left hover:bg-indigo-50/70 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {prod.brand?.name ? `${prod.brand.name} ` : ''}{prod.model_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                {prod.category?.name || 'General'} • Type: <span className="capitalize font-semibold">{prod.type}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                Stock: {prod.quantity}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-600 text-white rounded-lg">
                                            <Check size={18} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                Selected Inventory Item (No Duplicates)
                                            </div>
                                            <div className="text-sm font-black text-slate-900 dark:text-white">
                                                {selectedProduct.brand?.name ? `${selectedProduct.brand.name} ` : ''}{selectedProduct.model_name}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {selectedProduct.category?.name || 'Uncategorized'} • Type: <span className="capitalize font-semibold">{selectedProduct.type}</span> • Existing Stock: <strong className="text-slate-900 dark:text-white">{selectedProduct.quantity}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearProduct}
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Mode: Register New Product */
                        <div className="space-y-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                <Sparkles size={14} /> New Product Catalog Entry
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Device Type *
                                    </label>
                                    <select
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                        value={data.type}
                                        onChange={(e) => setData('type', e.target.value)}
                                    >
                                        <option value="serialized">Serialized (Phone / Tablet / Laptop with IMEI)</option>
                                        <option value="bulk">Bulk Accessory / Non-serialized</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Brand *
                                    </label>
                                    <select
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                        value={data.brand_id}
                                        onChange={(e) => setData('brand_id', e.target.value)}
                                        required={mode === 'new'}
                                    >
                                        <option value="">-- Select Brand --</option>
                                        {brands.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    {errors.brand_id && <p className="text-xs text-rose-500 font-bold">{errors.brand_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Category *
                                    </label>
                                    <select
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                        value={data.category_id}
                                        onChange={(e) => setData('category_id', e.target.value)}
                                        required={mode === 'new'}
                                    >
                                        <option value="">-- Select Category --</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {errors.category_id && <p className="text-xs text-rose-500 font-bold">{errors.category_id}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Model Name *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                        placeholder="e.g. iPhone 14 Pro Max 256GB"
                                        value={data.model_name}
                                        onChange={(e) => setData('model_name', e.target.value)}
                                        required={mode === 'new'}
                                    />
                                    {errors.model_name && <p className="text-xs text-rose-500 font-bold">{errors.model_name}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Serialized Specific Fields */}
                    {data.type === 'serialized' ? (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    IMEI / Serial Number *
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                    placeholder="e.g. 354891029384210"
                                    value={data.imei_number}
                                    onChange={(e) => setData('imei_number', e.target.value)}
                                    required
                                />
                                {errors.imei_number && <p className="text-xs text-rose-500 font-bold">{errors.imei_number}</p>}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Condition</label>
                                    <select
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                        value={data.condition}
                                        onChange={(e) => setData('condition', e.target.value)}
                                    >
                                        <option value="Brand New">Brand New</option>
                                        <option value="Refurbished">Refurbished</option>
                                        <option value="Used Grade A">Used Grade A</option>
                                        <option value="Used Grade B">Used Grade B</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Storage</label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                        placeholder="e.g. 128GB, 256GB"
                                        value={data.storage_capacity}
                                        onChange={(e) => setData('storage_capacity', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Color</label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                        placeholder="e.g. Black, Gold, Silver"
                                        value={data.color}
                                        onChange={(e) => setData('color', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Bulk Accessory Quantity */
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Quantity Received into Stock *
                            </label>
                            <input
                                type="number"
                                min="1"
                                className="w-full px-3.5 py-2.5 text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                value={data.quantity}
                                onChange={(e) => setData('quantity', e.target.value)}
                                required
                            />
                            {selectedProduct && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    This will add <strong className="text-emerald-600 dark:text-emerald-400">+{data.quantity || 0}</strong> units to existing stock (New total: {Number(selectedProduct.quantity || 0) + Number(data.quantity || 0)}).
                                </p>
                            )}
                            {errors.quantity && <p className="text-xs text-rose-500 font-bold">{errors.quantity}</p>}
                        </div>
                    )}

                    {/* Financial Terms */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Dealer Wholesale Cost *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                    placeholder="Price owed to dealer upon sale"
                                    value={data.wholesale_cost}
                                    onChange={(e) => setData('wholesale_cost', e.target.value)}
                                    required
                                />
                            </div>
                            <span className="text-[11px] text-slate-500 block">Amount owed to dealer upon sale</span>
                            {errors.wholesale_cost && <p className="text-xs text-rose-500 font-bold">{errors.wholesale_cost}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Target Retail Price *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                    placeholder="POS shelf price"
                                    value={data.retail_price}
                                    onChange={(e) => setData('retail_price', e.target.value)}
                                    required
                                />
                            </div>
                            <span className="text-[11px] text-slate-500 block">Selling price at shop checkout</span>
                            {errors.retail_price && <p className="text-xs text-rose-500 font-bold">{errors.retail_price}</p>}
                        </div>
                    </div>

                    {/* Margin Indicator */}
                    {data.wholesale_cost && data.retail_price && (
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Projected Shop Gross Margin:</span>
                            <span className={`font-black ${margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {margin >= 0 ? '+' : ''}{formatCurrency(margin)} per unit
                            </span>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Notes <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                            rows="2"
                            placeholder="Condition notes, agreement specifics, warranty..."
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || (mode === 'existing' && !selectedProduct && !data.product_id)}
                            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Download size={16} />
                            {processing ? 'Receiving...' : 'Receive into Shop Stock'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
