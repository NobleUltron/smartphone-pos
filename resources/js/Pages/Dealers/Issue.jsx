import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Handshake, Search, Package, User, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { debounce } from 'lodash';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';

export default function Issue({ dealers }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const { data, setData, post, processing, errors } = useForm({
        dealer_id: '',
        type: 'serialized',
        device_imei_id: '',
        product_id: '',
        quantity: 1,
        dealer_price: '',
        expected_return_date: '',
        notes: ''
    });

    const [selectedDevice, setSelectedDevice] = useState(null);

    const searchDevices = debounce(async (query) => {
        if (!query) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await axios.get(route('dealers.search-device', { query }));
            setSearchResults(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    }, 300);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        searchDevices(e.target.value);
    };

    const selectDevice = (item) => {
        setSelectedDevice(item);
        setData(data => ({
            ...data,
            type: item.type,
            device_imei_id: item.type === 'serialized' ? item.id : '',
            product_id: item.type === 'bulk' ? item.id : '',
            quantity: 1,
            dealer_price: item.selling_price || item.cost_price
        }));
        setSearchQuery('');
        setSearchResults([]);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('dealers.store-issue'));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Issue Item to Dealer" />

            <PageHeader 
                title="Issue Item to Dealer"
                breadcrumbs={[
                    { label: 'Home', href: '/' }, 
                    { label: 'Dealer Management', href: route('dealers.dashboard') },
                    { label: 'Issue Item' }
                ]}
                actions={
                    <Button variant="glass" icon={ArrowLeft} onClick={() => router.visit(route('dealers.dashboard'))}>Back to Dashboard</Button>
                }
            />

            <div className="max-w-3xl">
                <Card noPadding>
                    <form onSubmit={submit}>
                        <div className="p-6 space-y-8">
                            
                            {/* 1. Select Dealer */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                                    <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><User size={14}/></div>
                                    1. Select Dealer
                                </label>
                                <select
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                    value={data.dealer_id}
                                    onChange={e => setData('dealer_id', e.target.value)}
                                    required
                                >
                                    <option value="" className="text-slate-400 dark:text-slate-500">-- Choose a Dealer --</option>
                                    {dealers.map(dealer => (
                                        <option key={dealer.id} value={dealer.id}>{dealer.name} ({dealer.phone})</option>
                                    ))}
                                </select>
                                {errors.dealer_id && <p className="text-rose-500 text-xs mt-1">{errors.dealer_id}</p>}
                            </div>

                            {/* 2. Select Device */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                                    <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Package size={14}/></div>
                                    2. Select Item from Stock
                                </label>
                                
                                {!selectedDevice ? (
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="text-slate-400 dark:text-slate-500" size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            placeholder="Search by IMEI, SKU, or Model Name..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                        />
                                        
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                                                {searchResults.map(item => (
                                                    <button
                                                        key={item.type + '-' + item.id}
                                                        type="button"
                                                        onClick={() => selectDevice(item)}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/80 last:border-0 flex justify-between items-center transition-colors"
                                                    >
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white">
                                                                {item.type === 'serialized' ? `${item.product?.brand?.name || ''} ${item.product?.model_name}` : `${item.brand?.name || ''} ${item.model_name}`}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                {item.type === 'serialized' ? `IMEI: ${item.imei} • ${item.condition}` : `SKU: ${item.sku || 'N/A'} • ${item.quantity} in stock`}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.selling_price || 0)}</div>
                                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase">Retail Price</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {selectedDevice.type === 'serialized' ? `${selectedDevice.product?.brand?.name || ''} ${selectedDevice.product?.model_name}` : `${selectedDevice.brand?.name || ''} ${selectedDevice.model_name}`}
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                                {selectedDevice.type === 'serialized' ? `IMEI: ${selectedDevice.imei}` : `SKU: ${selectedDevice.sku || 'N/A'}`}
                                            </div>
                                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1 uppercase tracking-wide">Retail: {formatCurrency(selectedDevice.selling_price || 0)}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedDevice(null); setData(d => ({...d, device_imei_id: '', product_id: '', quantity: 1})); }}
                                            className="text-indigo-600 dark:text-indigo-300 text-sm font-bold hover:underline bg-indigo-100 dark:bg-indigo-900/60 px-3 py-1.5 rounded-lg"
                                        >
                                            Change Item
                                        </button>
                                    </div>
                                )}
                                {errors.device_imei_id && <p className="text-rose-500 text-xs mt-1">{errors.device_imei_id}</p>}
                                {errors.product_id && <p className="text-rose-500 text-xs mt-1">{errors.product_id}</p>}
                                {errors.type && <p className="text-rose-500 text-xs mt-1">{errors.type}</p>}
                            </div>

                            {/* 3. Deal Terms */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {data.type === 'bulk' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quantity *</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                            value={data.quantity}
                                            onChange={e => setData('quantity', e.target.value)}
                                            required
                                            min="1"
                                            max={selectedDevice?.quantity || 1}
                                        />
                                        {errors.quantity && <p className="text-rose-500 text-xs mt-1">{errors.quantity}</p>}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Agreed Dealer Price *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-500 dark:text-slate-400">UGX</span>
                                        </div>
                                        <input
                                            type="number"
                                            className="w-full pl-12 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                            value={data.dealer_price}
                                            onChange={e => setData('dealer_price', e.target.value)}
                                            required
                                            min="0"
                                        />
                                    </div>
                                    {errors.dealer_price && <p className="text-rose-500 text-xs mt-1">{errors.dealer_price}</p>}
                                </div>
                                
                                <div className={data.type === 'bulk' ? '' : 'col-span-2'}>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Expected Return Date</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.expected_return_date}
                                        onChange={e => setData('expected_return_date', e.target.value)}
                                    />
                                    {errors.expected_return_date && <p className="text-rose-500 text-xs mt-1">{errors.expected_return_date}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Notes</label>
                                <textarea
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                                    rows="2"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Any special conditions..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                            <Button 
                                variant="primary" 
                                type="submit" 
                                disabled={processing || !data.dealer_id || (!data.device_imei_id && !data.product_id)}
                            >
                                Confirm Issue
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
            
        </AuthenticatedLayout>
    );
}
