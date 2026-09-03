import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Handshake, X, Search, Package, Check, Smartphone, Layers, Calendar, ArrowUpRight, AlertCircle, Loader2, Trash2, Plus } from 'lucide-react';
import axios from 'axios';
import { debounce } from 'lodash';
import dayjs from 'dayjs';

export default function IssueStockModal({
    isOpen,
    onClose,
    dealers = [],
    preselectedDealerId = null,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [stagedItems, setStagedItems] = useState([]);

    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        dealer_id: preselectedDealerId || '',
        type: 'serialized',
        device_imei_id: '',
        product_id: '',
        quantity: 1,
        dealer_price: '',
        expected_return_date: '',
        notes: ''
    });

    useEffect(() => {
        if (preselectedDealerId) {
            setData('dealer_id', preselectedDealerId);
        }
    }, [preselectedDealerId]);

    // Debounced search for available in-stock devices / bulk items
    const searchStock = useMemo(
        () =>
            debounce(async (query) => {
                if (!query || query.trim().length < 1) {
                    setSearchResults([]);
                    setIsSearching(false);
                    return;
                }
                setIsSearching(true);
                try {
                    const res = await axios.get(route('dealers.search-device', { query: query.trim() }));
                    setSearchResults(res.data || []);
                } catch (error) {
                    console.error('Error searching inventory for dealer issue:', error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 250),
        []
    );

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        searchStock(val);
    };

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        setData(prev => ({
            ...prev,
            type: item.type,
            device_imei_id: item.type === 'serialized' ? item.id : '',
            product_id: item.type === 'bulk' ? item.id : '',
            quantity: 1,
            dealer_price: item.selling_price || item.cost_price || ''
        }));
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleClearItem = () => {
        setSelectedItem(null);
        setData(prev => ({
            ...prev,
            device_imei_id: '',
            product_id: '',
            quantity: 1,
            dealer_price: ''
        }));
    };

    const handleAddCurrentToSlip = () => {
        if (!selectedItem || !data.dealer_price || Number(data.dealer_price) <= 0) {
            return;
        }

        const isSerialized = selectedItem.type === 'serialized';
        const title = isSerialized
            ? `${selectedItem.product?.brand?.name || ''} ${selectedItem.product?.model_name || ''}`.trim()
            : `${selectedItem.brand?.name || ''} ${selectedItem.model_name || ''}`.trim();
        const detail = isSerialized
            ? `IMEI: ${selectedItem.imei}`
            : `SKU: ${selectedItem.sku || 'N/A'}`;

        const newItem = {
            title,
            detail,
            type: selectedItem.type,
            device_imei_id: isSerialized ? selectedItem.id : null,
            product_id: !isSerialized ? selectedItem.id : null,
            quantity: isSerialized ? 1 : Number(data.quantity || 1),
            dealer_price: Number(data.dealer_price),
            notes: data.notes || ''
        };

        // Prevent adding duplicate IMEI
        if (isSerialized && stagedItems.some(i => i.device_imei_id === newItem.device_imei_id)) {
            alert('This device IMEI is already in the consignment slip.');
            return;
        }

        setStagedItems(prev => [...prev, newItem]);
        handleClearItem();
    };

    const handleRemoveFromSlip = (index) => {
        setStagedItems(prev => prev.filter((_, i) => i !== index));
    };

    const setQuickDueDate = (days) => {
        const target = dayjs().add(days, 'day').format('YYYY-MM-DD');
        setData('expected_return_date', target);
    };

    const handleClose = () => {
        reset();
        setSelectedItem(null);
        setStagedItems([]);
        setSearchQuery('');
        setSearchResults([]);
        clearErrors();
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // If user has staged items, submit the batch via router.post
        if (stagedItems.length > 0) {
            router.post(route('dealers.store-issue'), {
                dealer_id: data.dealer_id,
                expected_return_date: data.expected_return_date,
                notes: data.notes,
                items: stagedItems
            }, {
                onSuccess: () => {
                    handleClose();
                }
            });
            return;
        }

        // If single item is selected but not added to slip yet
        if (selectedItem) {
            post(route('dealers.store-issue'), {
                onSuccess: () => {
                    handleClose();
                }
            });
            return;
        }
    };

    const formatCurrency = (val) => {
        if (!val || isNaN(val)) return 'UGX 0';
        return 'UGX ' + Number(val).toLocaleString();
    };

    const targetDealer = dealers.find(d => String(d.id) === String(data.dealer_id));

    return (
        <Modal show={isOpen} onClose={handleClose} maxWidth="2xl">
            <div className="flex flex-col max-h-[88vh] bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl overflow-hidden shadow-2xl">
                {/* Fixed / Sticky Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Handshake size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Issue Stock to Partner Dealer (Outward Consignment)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Hand over stock from your active inventory to a dealer to sell on your behalf.
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

                {/* Form with Scrollable Content */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                        
                        {/* Error Banner */}
                        {Object.keys(errors).length > 0 && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{errors.items || errors.error || Object.values(errors)[0]}</span>
                            </div>
                        )}

                        {/* 1. Select Dealer */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                1. Select Partner Dealer (Recipient Shop) *
                            </label>
                            {preselectedDealerId && targetDealer ? (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{targetDealer.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{targetDealer.phone} {targetDealer.address ? `• ${targetDealer.address}` : ''}</div>
                                    </div>
                                    <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg">
                                        Consignment Partner
                                    </span>
                                </div>
                            ) : (
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
                            )}
                            {errors.dealer_id && <p className="text-xs text-rose-500 font-bold">{errors.dealer_id}</p>}
                        </div>

                        {/* 2. Select Stock Item */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                2. Select Active Item from Shop Stock *
                            </label>

                            {!selectedItem ? (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-10 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                            placeholder="Search by IMEI, SKU, or Model Name..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            autoFocus
                                        />
                                        {isSearching && (
                                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={16} />
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {searchQuery.trim().length > 0 && (
                                        <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                                            {searchResults.length === 0 ? (
                                                <div className="p-4 text-center">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {isSearching ? 'Searching active inventory...' : 'No in-stock item found matching your search.'}
                                                    </p>
                                                    <span className="text-[11px] text-slate-400 block mt-1">
                                                        Items must currently have status "In Stock" with quantity &gt; 0.
                                                    </span>
                                                </div>
                                            ) : (
                                                searchResults.map(item => {
                                                    const isSerialized = item.type === 'serialized';
                                                    const title = isSerialized
                                                        ? `${item.product?.brand?.name || ''} ${item.product?.model_name || ''}`.trim()
                                                        : `${item.brand?.name || ''} ${item.model_name || ''}`.trim();
                                                    const subtitle = isSerialized
                                                        ? `IMEI: ${item.imei} • Condition: ${item.condition || 'Good'}`
                                                        : `SKU: ${item.sku || 'N/A'} • Available: ${item.quantity} in stock`;

                                                    return (
                                                        <button
                                                            key={`${item.type}-${item.id}`}
                                                            type="button"
                                                            onClick={() => handleSelectItem(item)}
                                                            className="w-full p-3 text-left hover:bg-indigo-50/70 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${isSerialized ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'}`}>
                                                                    {isSerialized ? <Smartphone size={16} /> : <Layers size={16} />}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(item.selling_price || item.cost_price || 0)}
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Shop Shelf Price</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Selected Item Badge Card */
                                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-600 text-white rounded-lg">
                                            {selectedItem.type === 'serialized' ? <Smartphone size={18} /> : <Layers size={18} />}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                <Check size={14} /> Selected Active Stock Item
                                            </div>
                                            <div className="text-sm font-black text-slate-900 dark:text-white">
                                                {selectedItem.type === 'serialized'
                                                    ? `${selectedItem.product?.brand?.name || ''} ${selectedItem.product?.model_name || ''}`.trim()
                                                    : `${selectedItem.brand?.name || ''} ${selectedItem.model_name || ''}`.trim()}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {selectedItem.type === 'serialized'
                                                    ? `IMEI: ${selectedItem.imei} • Condition: ${selectedItem.condition || 'Brand New'}`
                                                    : `SKU: ${selectedItem.sku || 'N/A'} • Available in Stock: ${selectedItem.quantity} units`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearItem}
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Change Item
                                    </button>
                                </div>
                            )}

                            {errors.device_imei_id && <p className="text-xs text-rose-500 font-bold">{errors.device_imei_id}</p>}
                            {errors.product_id && <p className="text-xs text-rose-500 font-bold">{errors.product_id}</p>}
                        </div>

                        {/* 3. Deal Terms */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                3. Consignment Terms & Return Timeline
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.type === 'bulk' && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Quantity to Issue *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedItem?.quantity || 999}
                                            className="w-full px-3.5 py-2.5 text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                            value={data.quantity}
                                            onChange={(e) => setData('quantity', e.target.value)}
                                            required
                                        />
                                        {selectedItem && (
                                            <span className="text-[11px] text-slate-500 block">
                                                Max available: <strong className="text-indigo-600 dark:text-indigo-400">{selectedItem.quantity}</strong> units
                                            </span>
                                        )}
                                        {errors.quantity && <p className="text-xs text-rose-500 font-bold">{errors.quantity}</p>}
                                    </div>
                                )}

                                <div className={data.type === 'bulk' ? 'space-y-1.5' : 'space-y-1.5 col-span-1'}>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Agreed Dealer Price (UGX) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="500"
                                            className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                            placeholder="Agreed payout upon sale"
                                            value={data.dealer_price}
                                            onChange={(e) => setData('dealer_price', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <span className="text-[11px] text-slate-500 block">Amount dealer must pay your shop when sold</span>
                                    {errors.dealer_price && <p className="text-xs text-rose-500 font-bold">{errors.dealer_price}</p>}
                                </div>

                                <div className={data.type === 'bulk' ? 'space-y-1.5 col-span-2 md:col-span-2' : 'space-y-1.5 col-span-1'}>
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Expected Return Date <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setQuickDueDate(3)}
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                                            >
                                                +3d
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQuickDueDate(7)}
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                                            >
                                                +7d
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQuickDueDate(14)}
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                                            >
                                                +14d
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                            value={data.expected_return_date}
                                            onChange={(e) => setData('expected_return_date', e.target.value)}
                                        />
                                    </div>
                                    <span className="text-[11px] text-slate-500 block">Triggers overdue alert if not settled or returned by this date</span>
                                    {errors.expected_return_date && <p className="text-xs text-rose-500 font-bold">{errors.expected_return_date}</p>}
                                </div>
                            </div>

                            {/* Add to Slip Button (Allows adding multiple items to same dealer) */}
                            {selectedItem && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleAddCurrentToSlip}
                                        disabled={!selectedItem || !data.dealer_price || Number(data.dealer_price) <= 0}
                                        className="w-full py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        <Plus size={16} /> Add This Item to Consignment Slip
                                    </button>
                                </div>
                            )}

                            {/* Staged Consignment Slip Table */}
                            {stagedItems.length > 0 && (
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <Handshake size={14} className="text-indigo-600" />
                                            Consignment Slip ({stagedItems.length} {stagedItems.length === 1 ? 'item' : 'items'})
                                        </span>
                                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                            Slip Total: {formatCurrency(stagedItems.reduce((acc, i) => acc + (i.dealer_price * i.quantity), 0))}
                                        </span>
                                    </div>

                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/40 max-h-48 overflow-y-auto">
                                        {stagedItems.map((staged, idx) => (
                                            <div key={idx} className="p-3 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-lg ${staged.type === 'serialized' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {staged.type === 'serialized' ? <Smartphone size={14} /> : <Layers size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900 dark:text-white">{staged.title}</div>
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {staged.detail} • Qty: {staged.quantity} × {formatCurrency(staged.dealer_price)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {formatCurrency(staged.dealer_price * staged.quantity)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFromSlip(idx)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                                        title="Remove item from slip"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-slate-400 italic">
                                        Search and select another item above to add more items to this same consignment slip.
                                    </p>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    General Notes <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                    rows="2"
                                    placeholder="Handover terms, physical condition notes, agreement details..."
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                />
                            </div>
                        </div>

                    </div>

                    {/* Fixed / Sticky Footer Actions */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0 flex items-center justify-between gap-2.5">
                        <div className="text-xs text-slate-500 font-medium">
                            {stagedItems.length > 0 ? (
                                <span>
                                    Slip contains <strong className="text-indigo-600 dark:text-indigo-400">{stagedItems.length} items</strong> (worth {formatCurrency(stagedItems.reduce((acc, i) => acc + (i.dealer_price * i.quantity), 0))})
                                </span>
                            ) : (
                                <span>Ready to issue</span>
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
                                disabled={processing || !data.dealer_id || (stagedItems.length === 0 && (!data.device_imei_id && !data.product_id))}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <ArrowUpRight size={16} />
                                {processing 
                                    ? 'Issuing Stock...' 
                                    : stagedItems.length > 0 
                                        ? `Confirm & Issue All (${stagedItems.length} Items)`
                                        : 'Confirm Issue to Dealer'
                                }
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
