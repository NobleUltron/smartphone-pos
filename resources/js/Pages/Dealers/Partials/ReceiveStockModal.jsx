import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Download, X, Search, Plus, Package, Check, Sparkles, CheckCircle2, Trash2, Smartphone, Layers, AlertCircle } from 'lucide-react';

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
    const [stagedItems, setStagedItems] = useState([]);
    const [submitError, setSubmitError] = useState(null);

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
        return products.filter(p =>
            p.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 8);
    }, [products, searchTerm]);

    const handleSelectProduct = (prod) => {
        setSelectedProduct(prod);
        setData(prev => ({
            ...prev,
            product_id: prod.id,
            category_id: prod.category_id || '',
            brand_id: prod.brand_id || '',
            model_name: prod.model_name,
            type: prod.type || 'serialized',
            retail_price: prod.selling_price || '',
            wholesale_cost: prod.cost_price || ''
        }));
        setSearchTerm('');
        setSubmitError(null);
    };

    const handleClearProduct = () => {
        setSelectedProduct(null);
        setData(prev => ({
            ...prev,
            product_id: '',
            category_id: '',
            brand_id: '',
            model_name: '',
            wholesale_cost: '',
            retail_price: '',
            quantity: 1
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

    const handleAddCurrentToBatch = () => {
        // Validation before staging
        if (mode === 'existing' && !selectedProduct && !data.product_id) {
            alert('Please select an existing catalog product first.');
            return;
        }
        if (mode === 'new' && !data.model_name.trim()) {
            alert('Please enter a product model name.');
            return;
        }
        if (!data.wholesale_cost || Number(data.wholesale_cost) < 0) {
            alert('Please enter dealer wholesale cost.');
            return;
        }
        if (!data.retail_price || Number(data.retail_price) <= 0) {
            alert('Please enter target retail price.');
            return;
        }

        const isSerialized = data.type === 'serialized';
        const cat = categories.find(c => String(c.id) === String(data.category_id));
        const br = brands.find(b => String(b.id) === String(data.brand_id));
        const title = mode === 'existing' && selectedProduct 
            ? `${selectedProduct.brand?.name || ''} ${selectedProduct.model_name || ''}`.trim()
            : `${br?.name || ''} ${data.model_name}`.trim();
        const detail = isSerialized
            ? (data.imei_number ? `IMEI: ${data.imei_number}` : 'Serialized Device')
            : (cat?.name ? `Category: ${cat.name}` : 'Bulk Item');

        const newItem = {
            title,
            detail,
            type: data.type,
            product_id: mode === 'existing' ? (selectedProduct ? selectedProduct.id : data.product_id) : null,
            category_id: mode === 'new' ? data.category_id : null,
            brand_id: mode === 'new' ? data.brand_id : null,
            model_name: mode === 'new' ? data.model_name : null,
            imei_number: isSerialized ? data.imei_number : null,
            condition: isSerialized ? data.condition : null,
            storage_capacity: data.storage_capacity,
            color: data.color,
            wholesale_cost: Number(data.wholesale_cost),
            retail_price: Number(data.retail_price),
            quantity: isSerialized ? 1 : Number(data.quantity || 1)
        };

        if (isSerialized && newItem.imei_number && stagedItems.some(i => i.imei_number === newItem.imei_number)) {
            alert('This IMEI is already in the intake batch slip.');
            return;
        }

        setStagedItems(prev => [...prev, newItem]);
        
        // Reset item fields for the next entry
        handleClearProduct();
        setData(prev => ({
            ...prev,
            imei_number: '',
            wholesale_cost: '',
            retail_price: '',
            quantity: 1,
            model_name: ''
        }));
    };

    const handleRemoveFromBatch = (index) => {
        setStagedItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleClose = () => {
        reset();
        setSelectedProduct(null);
        setStagedItems([]);
        setSearchTerm('');
        setMode('existing');
        setSubmitError(null);
        clearErrors();
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitError(null);

        let finalItems = [...stagedItems];

        // Auto-include currently configured item in form if user filled in fields and clicked submit
        const hasValidItem = (mode === 'existing' && (selectedProduct || data.product_id)) || (mode === 'new' && data.model_name?.trim());
        const hasPrices = data.wholesale_cost !== '' && Number(data.wholesale_cost) >= 0 && data.retail_price !== '' && Number(data.retail_price) > 0;

        if (hasValidItem && hasPrices) {
            const isSerialized = data.type === 'serialized';
            const cat = categories.find(c => String(c.id) === String(data.category_id));
            const br = brands.find(b => String(b.id) === String(data.brand_id));
            const title = mode === 'existing' && selectedProduct
                ? `${selectedProduct.brand?.name || ''} ${selectedProduct.model_name || ''}`.trim()
                : `${br?.name || ''} ${data.model_name}`.trim();
            const detail = isSerialized
                ? (data.imei_number ? `IMEI: ${data.imei_number}` : 'Serialized Device')
                : (cat?.name ? `Category: ${cat.name}` : 'Bulk Item');

            const autoItem = {
                title,
                detail,
                type: data.type,
                product_id: mode === 'existing' ? (selectedProduct ? selectedProduct.id : data.product_id) : null,
                category_id: mode === 'new' ? data.category_id : null,
                brand_id: mode === 'new' ? data.brand_id : null,
                model_name: mode === 'new' ? data.model_name : null,
                imei_number: isSerialized ? data.imei_number : null,
                condition: isSerialized ? data.condition : null,
                storage_capacity: data.storage_capacity,
                color: data.color,
                wholesale_cost: Number(data.wholesale_cost),
                retail_price: Number(data.retail_price),
                quantity: isSerialized ? 1 : Number(data.quantity || 1)
            };

            if (!finalItems.some(i => isSerialized && i.imei_number && i.imei_number === autoItem.imei_number)) {
                finalItems.push(autoItem);
            }
        }

        // If batch has items ready
        if (finalItems.length > 0) {
            if (!data.dealer_id) {
                setSubmitError('Please select a partner dealer.');
                return;
            }

            router.post(route('dealers.store-inward'), {
                dealer_id: data.dealer_id,
                notes: data.notes || null,
                items: finalItems
            }, {
                onSuccess: (page) => {
                    if (page?.props?.flash?.error) {
                        setSubmitError(page.props.flash.error);
                        return;
                    }
                    handleClose();
                },
                onError: (errs) => {
                    console.error('Batch inward errors:', errs);
                    setSubmitError(errs.items || Object.values(errs)[0] || 'Error receiving stock into inventory.');
                }
            });
            return;
        }

        // Single item fallback
        if (mode === 'existing' && !selectedProduct && !data.product_id) {
            setSubmitError('Please select an existing catalog product.');
            return;
        }
        if (mode === 'new' && !data.model_name?.trim()) {
            setSubmitError('Please enter a product model name.');
            return;
        }
        if (data.wholesale_cost === '' || Number(data.wholesale_cost) < 0) {
            setSubmitError('Please enter dealer wholesale cost.');
            return;
        }
        if (!data.retail_price || Number(data.retail_price) <= 0) {
            setSubmitError('Please enter target retail price.');
            return;
        }

        post(route('dealers.store-inward'), {
            onSuccess: (page) => {
                if (page?.props?.flash?.error) {
                    setSubmitError(page.props.flash.error);
                    return;
                }
                handleClose();
            },
            onError: (errs) => {
                setSubmitError(errs.items || Object.values(errs)[0] || 'Error receiving stock into inventory.');
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
            <div className="flex flex-col max-h-[88vh] bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl overflow-hidden shadow-2xl">
                {/* Fixed / Sticky Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
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

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Error Banner */}
                    {(submitError || Object.keys(errors).length > 0) && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{submitError || errors.items || errors.error || Object.values(errors)[0]}</span>
                        </div>
                    )}
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
                                    step="any"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                    placeholder="Price owed to dealer upon sale"
                                    value={data.wholesale_cost}
                                    onChange={(e) => setData('wholesale_cost', e.target.value)}
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
                                    step="any"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                    placeholder="POS shelf price"
                                    value={data.retail_price}
                                    onChange={(e) => setData('retail_price', e.target.value)}
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

                    {/* Add to Batch Button */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleAddCurrentToBatch}
                            className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                            <Plus size={16} /> Add This Item to Intake Batch Slip
                        </button>
                    </div>

                    {/* Staged Intake Batch Slip Table */}
                    {stagedItems.length > 0 && (
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Download size={14} className="text-emerald-600" />
                                    Intake Batch Slip ({stagedItems.length} {stagedItems.length === 1 ? 'item' : 'items'})
                                </span>
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                    Total Dealer Cost: {formatCurrency(stagedItems.reduce((acc, i) => acc + (i.wholesale_cost * i.quantity), 0))}
                                </span>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/40 max-h-48 overflow-y-auto">
                                {stagedItems.map((staged, idx) => (
                                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`p-1.5 rounded-lg ${staged.type === 'serialized' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {staged.type === 'serialized' ? <Smartphone size={14} /> : <Layers size={14} />}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">{staged.title}</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {staged.detail} • Cost: {formatCurrency(staged.wholesale_cost)} • Shelf: {formatCurrency(staged.retail_price)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(staged.wholesale_cost * staged.quantity)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFromBatch(idx)}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                                title="Remove item from batch"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400 italic">
                                Fill in another product above to add more items to this same consignment intake batch.
                            </p>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Batch Notes <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                            rows="2"
                            placeholder="Condition notes, agreement specifics, warranty..."
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                        />
                    </div>
                </div>

                {/* Fixed / Sticky Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0 flex items-center justify-between gap-2.5">
                    <div className="text-xs text-slate-500 font-medium">
                        {stagedItems.length > 0 ? (
                            <span>
                                Slip contains <strong className="text-emerald-600 dark:text-emerald-400">{stagedItems.length} items</strong> (Cost: {formatCurrency(stagedItems.reduce((acc, i) => acc + (i.wholesale_cost * i.quantity), 0))})
                            </span>
                        ) : (
                            <span>Ready to intake</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.dealer_id || (stagedItems.length === 0 && ((mode === 'existing' && !selectedProduct && !data.product_id) || (mode === 'new' && !data.model_name)))}
                            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Download size={16} />
                            {processing 
                                ? 'Receiving...' 
                                : stagedItems.length > 0 
                                    ? `Receive All (${stagedItems.length} Items)`
                                    : 'Receive into Shop Stock'
                            }
                        </button>
                    </div>
                </div>
                </form>
            </div>
        </Modal>
    );
}
