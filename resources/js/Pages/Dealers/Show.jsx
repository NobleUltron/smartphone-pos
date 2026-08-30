import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Handshake, Phone, MapPin, PackageOpen, CheckCircle, RotateCcw, X, DollarSign, Edit2, Receipt, Printer, Eye, MessageCircle, FileText, Download, TrendingUp, Clock, ShieldCheck, Award, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import Barcode from 'react-barcode';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';

dayjs.extend(relativeTime);

export default function Show({ dealer, metrics, settings, monthlyTrends = [], analytics = {}, topProducts = [], categories = [], brands = [], products = [] }) {
    const [actionItem, setActionItem] = useState(null);
    const [actionType, setActionType] = useState(null); // 'sold' or 'returned'

    const [previewSale, setPreviewSale] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Direction Filter State ('all', 'outward', 'inward')
    const [directionTab, setDirectionTab] = useState('all');

    // Inward Intake Modal State
    const [showInwardModal, setShowInwardModal] = useState(false);
    const { data: inwardData, setData: setInwardData, post: postInward, processing: processingInward, errors: inwardErrors, reset: resetInward } = useForm({
        dealer_id: dealer.id,
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

    const handleInwardSubmit = (e) => {
        e.preventDefault();
        postInward(route('dealers.store-inward'), {
            onSuccess: () => {
                setShowInwardModal(false);
                resetInward({
                    dealer_id: dealer.id,
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
            }
        });
    };

    // Statement Modal States
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [statementFilter, setStatementFilter] = useState('all');
    const [statementStartDate, setStatementStartDate] = useState('');
    const [statementEndDate, setStatementEndDate] = useState('');

    const handleGenerateStatement = (mode = 'download') => {
        let url = route('dealers.statement', dealer.id) + `?status=${statementFilter}&mode=${mode}`;
        if (statementStartDate) url += `&start_date=${statementStartDate}`;
        if (statementEndDate) url += `&end_date=${statementEndDate}`;
        window.open(url, '_blank');
        setShowStatementModal(false);
    };

    const openReceiptPreview = (saleId) => {
        setPreviewLoading(true);
        fetch(`/pos/receipt/${saleId}?json=true`, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
            .then(r => r.json())
            .then(data => { setPreviewSale(data.sale); })
            .catch(() => { window.open(`/pos/receipt/${saleId}`, '_blank'); })
            .finally(() => setPreviewLoading(false));
    };

    const { data: editData, setData: setEditData, put, processing: processingEdit, errors: editErrors } = useForm({
        dealer_price: '',
        wholesale_cost: '',
        retail_price: '',
        condition: 'Brand New',
        storage_capacity: '',
        color: '',
        imei_number: '',
        expected_return_date: '',
        notes: ''
    });

    const { data, setData, post, processing, errors, reset } = useForm({
        payment_method: 'Cash',
        customer_name: '',
        customer_phone: '',
        notes: '',
        quantity: 1
    });

    const formatCurrency = (amount) => {
        const val = new Intl.NumberFormat('en-UG', {
            minimumFractionDigits: 0
        }).format(amount);
        return `UGX ${val}`;
    };

    const handleWhatsApp = (item) => {
        const itemName = item.type === 'serialized' ? `${item.device_imei?.product?.brand?.name || ''} ${item.device_imei?.product?.model_name}` : `${item.product?.brand?.name || ''} ${item.product?.model_name}`;
        const itemDetail = item.type === 'serialized' ? `IMEI: ${item.device_imei?.imei}` : `SKU: ${item.product?.sku || 'N/A'}`;
        const price = formatCurrency(item.dealer_price);
        
        const message = `Hello ${dealer.name}, this is a reminder that the item ${itemName} (${itemDetail}) is currently overdue. Kindly turn it in or pay the partner price of ${price}. Thank you!`;
        
        const phone = dealer.phone.replace(/[^0-9]/g, '');
        const formattedPhone = phone.startsWith('0') ? '256' + phone.substring(1) : phone;
        
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'Pending':
                return <Badge variant="warning">Pending</Badge>;
            case 'Sold':
                return <Badge variant="success">Sold</Badge>;
            case 'Returned':
                return <Badge variant="info">Returned</Badge>;
            default:
                return null;
        }
    };

    const getAvailableQuantity = (item) => {
        if (!item) return 0;
        return item.quantity - item.quantity_sold - item.quantity_returned;
    };

    const openActionModal = (item, type) => {
        setActionItem(item);
        setActionType(type);
        reset();
        setData('quantity', getAvailableQuantity(item));
    };

    const closeActionModal = () => {
        setActionItem(null);
        setActionType(null);
        reset();
    };

    const submitAction = (e) => {
        e.preventDefault();
        const routeName = actionType === 'sold' ? 'dealers.mark-sold' : 'dealers.mark-returned';
        
        post(route(routeName, actionItem.id), {
            onSuccess: () => {
                closeActionModal();
            }
        });
    };

    const openViewModal = (item, isEditMode = false) => {
        setViewItem(item);
        setIsEditing(isEditMode);
        setEditData({
            dealer_price: item.dealer_price || '',
            wholesale_cost: item.direction === 'inward' ? (item.wholesale_cost || item.dealer_price || '') : '',
            retail_price: item.direction === 'inward' ? (item.retail_price || item.device_imei?.selling_price || item.product?.selling_price || '') : '',
            condition: item.device_imei?.condition || 'Brand New',
            storage_capacity: item.device_imei?.storage_capacity || '',
            color: item.device_imei?.color || '',
            imei_number: item.device_imei?.imei || '',
            expected_return_date: item.expected_return_date ? item.expected_return_date.split('T')[0] : '',
            notes: item.notes || ''
        });
    };

    const closeViewModal = () => {
        setViewItem(null);
        setIsEditing(false);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        put(route('dealers.update-item', viewItem.id), {
            onSuccess: () => {
                closeViewModal();
            }
        });
    };

    const [settleItem, setSettleItem] = useState(null);
    const { data: settleData, setData: setSettleData, post: postSettle, processing: processingSettle, errors: settleErrors, reset: resetSettle } = useForm({
        payment_method: 'Cash',
        amount: '',
        notes: ''
    });

    const openSettleModal = (item) => {
        setSettleItem(item);
        setSettleData({
            payment_method: 'Cash',
            amount: item.wholesale_cost || item.dealer_price || '',
            notes: ''
        });
    };

    const closeSettleModal = () => {
        setSettleItem(null);
        resetSettle();
    };

    const submitSettle = (e) => {
        e.preventDefault();
        postSettle(route('dealers.settle', settleItem.id), {
            onSuccess: () => {
                closeSettleModal();
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Dealer: ${dealer.name}`} />

            <PageHeader 
                title={dealer.name}
                breadcrumbs={[
                    { label: 'Home', href: '/' }, 
                    { label: 'Dealer Management', href: route('dealers.dashboard') },
                    { label: 'Directory', href: route('dealers.index') },
                    { label: dealer.name }
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="glass" icon={FileText} onClick={() => setShowStatementModal(true)}>
                            Statement & Reconciliation
                        </Button>
                        <Button variant="success" icon={Download} onClick={() => setShowInwardModal(true)}>
                            Receive Item
                        </Button>
                        <Button variant="primary" icon={PackageOpen} onClick={() => router.visit(route('dealers.issue', { dealer_id: dealer.id }))}>
                            Issue Item
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400"/> {dealer.phone}</span>
                {dealer.contact_person && <span className="flex items-center gap-1.5"><Handshake size={14} className="text-slate-400"/> {dealer.contact_person}</span>}
                {dealer.address && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400"/> {dealer.address}</span>}
            </div>

            {/* Two-Way Financial & Inventory Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-l-4 border-l-amber-500">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Outward Consignment (Dealer Owes Us)</p>
                    <h3 className="text-2xl font-black text-amber-600">{formatCurrency(metrics.dealer_owes_us)}</h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                        {metrics.still_out} items currently out with {dealer.name}
                    </p>
                </Card>

                <Card className="border-l-4 border-l-rose-500">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Inward Consignment (We Owe Dealer)</p>
                    <h3 className="text-2xl font-black text-rose-600">{formatCurrency(metrics.we_owe_dealer)}</h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                        {metrics.inward_sold} items sold ({metrics.inward_pending} items in active shop stock)
                    </p>
                </Card>

                <Card className={`border-l-4 ${metrics.net_balance >= 0 ? 'border-l-emerald-500' : 'border-l-indigo-500'}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Settlement Balance</p>
                    <h3 className={`text-2xl font-black ${metrics.net_balance >= 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                        {formatCurrency(Math.abs(metrics.net_balance))}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                        {metrics.net_balance >= 0 ? `${dealer.name} owes shop net balance` : `Shop owes ${dealer.name} net balance`}
                    </p>
                </Card>
            </div>

            {/* Performance Analytics (Business Insights) */}
            <div className="space-y-6 mb-8">
                {/* Efficiency KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sell-Through Rate</p>
                            <h4 className="text-2xl font-black text-white mt-1">{analytics.sell_through_rate || 0}%</h4>
                            <div className="w-28 bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, analytics.sell_through_rate || 0)}%` }}></div>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Settlement Speed</p>
                            <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.avg_days_to_settle || 0} <span className="text-sm font-medium text-slate-500">Days</span></h4>
                            <p className="text-[11px] text-slate-400 mt-1">From issue to sale/return</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Clock size={20} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">On-Time Settlement</p>
                            <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.on_time_rate || 100}%</h4>
                            <p className="text-[11px] text-slate-500 mt-1">{analytics.overdue_count || 0} items overdue</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settled Revenue</p>
                            <h4 className="text-xl font-black text-slate-900 mt-1">{formatCurrency(metrics.sales_value)}</h4>
                            <p className="text-[11px] text-emerald-600 font-bold mt-1">From {metrics.items_sold} sold items</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Award size={20} />
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 6-Month Sales & Issue Trend Chart */}
                    <Card className="lg:col-span-2 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart2 size={18} className="text-indigo-600" />
                                    6-Month Sales & Stock Trend
                                </h3>
                                <p className="text-xs text-slate-500">Issued value vs settled sales revenue over time</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Issued</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Sold</span>
                            </div>
                        </div>

                        <div className="h-64 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `UGX ${(val/1000).toFixed(0)}k`} />
                                    <Tooltip 
                                        formatter={(val) => [formatCurrency(val), '']}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="issued_value" name="Issued" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIssued)" />
                                    <Area type="monotone" dataKey="sold_value" name="Sold" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSold)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Top Moving Device Models */}
                    <Card className="flex flex-col justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">Top Performing Models</h3>
                            <p className="text-xs text-slate-500 mb-4">Fastest moving devices with this partner</p>
                            
                            <div className="space-y-3">
                                {topProducts.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-6 text-center">No product data recorded yet.</p>
                                ) : (
                                    topProducts.map((prod, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                            <div className="truncate pr-2">
                                                <div className="text-xs font-bold text-slate-800 truncate">{prod.model}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    Issued: {prod.issued} | <span className="text-emerald-600 font-semibold">Sold: {prod.sold}</span> | Rtd: {prod.returned}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs font-black text-slate-900">{formatCurrency(prod.revenue)}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* History Table */}
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">Dealer Item Consignment History</h3>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setDirectionTab('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${directionTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            All ({dealer.dealer_items.length})
                        </button>
                        <button 
                            onClick={() => setDirectionTab('outward')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${directionTab === 'outward' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Issued Outward ({dealer.dealer_items.filter(i => (i.direction || 'outward') === 'outward').length})
                        </button>
                        <button 
                            onClick={() => setDirectionTab('inward')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${directionTab === 'inward' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Received Inward ({dealer.dealer_items.filter(i => i.direction === 'inward').length})
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Direction / Item</th>
                                <th className="px-6 py-4 font-semibold">Qty / Status</th>
                                <th className="px-6 py-4 font-semibold">Timeline</th>
                                <th className="px-6 py-4 font-semibold">Pricing Structure</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dealer.dealer_items.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        No items have been issued to this dealer yet.
                                    </td>
                                </tr>
                             ) : (
                                dealer.dealer_items
                                    .filter(item => directionTab === 'all' || (item.direction || 'outward') === directionTab)
                                    .map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="mb-1">
                                                {item.direction === 'inward' ? (
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                        Received Inward
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                        Issued Outward
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-bold text-slate-900">
                                                {item.type === 'serialized' ? `${item.device_imei?.product?.brand?.name || ''} ${item.device_imei?.product?.model_name}` : `${item.product?.brand?.name || ''} ${item.product?.model_name}`}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {item.type === 'serialized' ? `IMEI: ${item.device_imei?.imei || item.device_imei?.imei_number}` : `SKU: ${item.product?.sku || 'N/A'}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="mb-2">
                                                <StatusBadge status={item.status} />
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium">
                                                Qty: {item.quantity} | Sold: {item.quantity_sold} | Rtd: {item.quantity_returned}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="text-slate-600 font-medium">Recorded: {dayjs(item.issued_at).format('DD MMM YYYY')}</div>
                                            {item.status === 'Pending' && item.expected_return_date && (
                                                <div className={`font-medium mt-1 flex items-center gap-1.5 ${dayjs(item.expected_return_date).isBefore(dayjs().startOf('day')) ? 'text-rose-600' : 'text-amber-600'}`}>
                                                    Due: {dayjs(item.expected_return_date).format('DD MMM YYYY')}
                                                    {dayjs(item.expected_return_date).isBefore(dayjs().startOf('day')) && (
                                                        <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider leading-none">Overdue</span>
                                                    )}
                                                </div>
                                            )}
                                            {item.sold_at && (
                                                <div className="text-emerald-600 font-medium mt-1">Sold: {dayjs(item.sold_at).format('DD MMM YYYY')}</div>
                                            )}
                                            {item.returned_at && (
                                                <div className="text-blue-600 font-medium mt-1">Returned: {dayjs(item.returned_at).format('DD MMM YYYY')}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.direction === 'inward' ? (
                                                <div>
                                                    {item.settlement_status === 'Settled' ? (
                                                        <>
                                                            <div className="font-bold text-emerald-600" title="Settlement Payout Completed">
                                                                Paid: {formatCurrency(item.settlement_amount || item.wholesale_cost || item.dealer_price)}
                                                            </div>
                                                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wide inline-block mt-1">
                                                                Settled ({item.settlement_method || 'Paid'})
                                                            </div>
                                                        </>
                                                    ) : item.status === 'Sold' ? (
                                                        <>
                                                            <div className="font-bold text-rose-600" title="Wholesale Cost Owed to Dealer">
                                                                Owe: {formatCurrency(item.wholesale_cost || item.dealer_price)}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">
                                                                POS Retail: {formatCurrency(item.retail_price || item.device_imei?.selling_price)}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="font-bold text-slate-900 dark:text-white" title="Consignment Wholesale Cost">
                                                                Cost: {formatCurrency(item.wholesale_cost || item.dealer_price)}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">
                                                                POS Retail: {formatCurrency(item.retail_price || item.device_imei?.selling_price)}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white" title="Dealer Price Owed to Us">
                                                        Dealer: {formatCurrency(item.dealer_price)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">
                                                        Shop Retail: {formatCurrency(item.retail_price)}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => openViewModal(item, false)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {item.status === 'Pending' && (
                                                    <button 
                                                        onClick={() => openViewModal(item, true)}
                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit Item / Pricing Details"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {item.direction === 'inward' && item.status === 'Sold' && (
                                                    <>
                                                        {item.settlement_status === 'Settled' ? (
                                                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1">
                                                                <CheckCircle size={13} /> Settled
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => openSettleModal(item)}
                                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                                                                title="Pay Sourcing Dealer for this sold consignment phone"
                                                            >
                                                                <DollarSign size={14} /> Pay Dealer
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {item.status === 'Pending' && getAvailableQuantity(item) > 0 && (
                                                    <>
                                                        {item.direction !== 'inward' && (
                                                            <button 
                                                                onClick={() => openActionModal(item, 'sold')}
                                                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                            >
                                                                <CheckCircle size={14} /> Sold
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => openActionModal(item, 'returned')}
                                                            className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                            title={item.direction === 'inward' ? 'Return device to sourcing dealer and remove from shop stock' : 'Restock item into shop inventory'}
                                                        >
                                                            <RotateCcw size={14} /> {item.direction === 'inward' ? 'Return to Dealer' : 'Restock'}
                                                        </button>
                                                    </>
                                                )}
                                                {item.status === 'Sold' && item.sale_id && (
                                                    <button 
                                                        onClick={() => openReceiptPreview(item.sale_id)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center"
                                                        title="View Receipt"
                                                    >
                                                        {previewLoading ? <span className="text-xs">...</span> : <Printer size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Action Modal */}
            <Modal show={actionItem !== null} onClose={closeActionModal} maxWidth="md">
                {actionItem && (
                    <form onSubmit={submitAction} className="p-6">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                {actionType === 'sold' ? <><CheckCircle className="text-emerald-500"/> Mark Item as Sold</> : <><RotateCcw className="text-blue-500"/> Return Item to Stock</>}
                            </h2>
                            <button type="button" onClick={closeActionModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                            <p className="text-sm font-bold text-slate-900">
                                {actionItem.type === 'serialized' ? `${actionItem.device_imei?.product?.model_name}` : `${actionItem.product?.model_name}`}
                            </p>
                            <p className="text-xs text-slate-500">
                                {actionItem.type === 'serialized' ? `IMEI: ${actionItem.device_imei?.imei}` : `SKU: ${actionItem.product?.sku || 'N/A'}`}
                            </p>
                            
                            {actionType === 'sold' && (
                                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-sm text-slate-600 font-medium">Sale Amount:</span>
                                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(actionItem.dealer_price * data.quantity)}</span>
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-75 disabled:bg-slate-100"
                                value={data.quantity}
                                onChange={e => setData('quantity', e.target.value)}
                                required
                                min="1"
                                max={getAvailableQuantity(actionItem)}
                                disabled={actionItem.type === 'serialized'}
                            />
                            {errors.quantity && <p className="text-rose-500 text-xs mt-1">{errors.quantity}</p>}
                            <p className="text-xs text-slate-500 mt-1">Available to resolve: {getAvailableQuantity(actionItem)}</p>
                        </div>

                        {actionType === 'sold' ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200 flex items-start gap-2 mb-4">
                                    <DollarSign size={18} className="shrink-0 mt-0.5" />
                                    <p>This action will record a sale of <strong>{formatCurrency(actionItem.dealer_price * data.quantity)}</strong> to your current Cash Drawer.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                                    <select
                                        className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.payment_method}
                                        onChange={e => setData('payment_method', e.target.value)}
                                        required
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="MTN MoMo">MTN MoMo</option>
                                        <option value="Airtel Money">Airtel Money</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name (Optional)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="Walk-in Customer"
                                            value={data.customer_name}
                                            onChange={e => setData('customer_name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Customer Phone (Optional)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="07..."
                                            value={data.customer_phone}
                                            onChange={e => setData('customer_phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">The receipt will be issued to this customer. If left blank, it defaults to the Dealer.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Return Notes (Optional)</label>
                                    <textarea
                                        className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                        rows="3"
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        placeholder="Reason for return, condition of item..."
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button variant="secondary" onClick={closeActionModal}>Cancel</Button>
                            <Button variant={actionType === 'sold' ? 'primary' : 'secondary'} type="submit" disabled={processing} icon={actionType === 'sold' ? CheckCircle : RotateCcw}>
                                {actionType === 'sold' ? 'Confirm Sale' : 'Confirm Return'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* View/Edit Modal */}
            <Modal show={viewItem !== null} onClose={closeViewModal} maxWidth="lg">
                {viewItem && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {isEditing ? <><Edit2 className="text-amber-500" size={20} /> Edit Consignment Details</> : 'Deal Details'}
                            </h2>
                            <button type="button" onClick={closeViewModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1.5 ${
                                        viewItem.direction === 'inward' 
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' 
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                    }`}>
                                        {viewItem.direction === 'inward' ? 'Received Inward' : 'Issued Outward'}
                                    </span>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {viewItem.type === 'serialized' 
                                            ? `${viewItem.device_imei?.product?.brand?.name || ''} ${viewItem.device_imei?.product?.model_name || viewItem.product?.model_name || 'Device'}` 
                                            : `${viewItem.product?.brand?.name || ''} ${viewItem.product?.model_name || 'Item'}`}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {viewItem.type === 'serialized' ? `IMEI: ${viewItem.device_imei?.imei || 'N/A'}` : `SKU: ${viewItem.product?.sku || 'N/A'}`}
                                    </p>
                                </div>
                                <StatusBadge status={viewItem.status} />
                            </div>
                        </div>

                        {!isEditing ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-500 uppercase">Quantity</span>
                                        <span className="text-sm text-slate-900 dark:text-white font-bold">{viewItem.quantity}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-500 uppercase">Sold</span>
                                        <span className="text-sm text-emerald-600 font-bold">{viewItem.quantity_sold}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-500 uppercase">Returned</span>
                                        <span className="text-sm text-blue-600 font-bold">{viewItem.quantity_returned}</span>
                                    </div>
                                </div>

                                {viewItem.direction === 'inward' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                            <div>
                                                <span className="block text-xs font-bold text-slate-500 uppercase">Owed to Dealer (Wholesale)</span>
                                                <span className="text-sm text-rose-600 font-bold">{formatCurrency(viewItem.wholesale_cost || viewItem.dealer_price)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-slate-500 uppercase">Target POS Retail Price</span>
                                                <span className="text-sm text-emerald-600 font-bold">{formatCurrency(viewItem.retail_price || viewItem.device_imei?.selling_price)}</span>
                                            </div>
                                        </div>

                                        {viewItem.type === 'serialized' && (
                                            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="block text-xs font-bold text-slate-500 uppercase">Condition</span>
                                                    <span className="text-sm text-slate-900 dark:text-white font-medium">{viewItem.device_imei?.condition || 'Brand New'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-bold text-slate-500 uppercase">Storage</span>
                                                    <span className="text-sm text-slate-900 dark:text-white font-medium">{viewItem.device_imei?.storage_capacity || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-bold text-slate-500 uppercase">Color</span>
                                                    <span className="text-sm text-slate-900 dark:text-white font-medium">{viewItem.device_imei?.color || 'N/A'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                            <div>
                                                <span className="block text-xs font-bold text-slate-500 uppercase">Agreed Dealer Price</span>
                                                <span className="text-sm text-slate-900 dark:text-white font-bold">{formatCurrency(viewItem.dealer_price)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-slate-500 uppercase">Expected Return Date</span>
                                                <span className="text-sm text-slate-900 dark:text-white">{viewItem.expected_return_date ? dayjs(viewItem.expected_return_date).format('DD MMM YYYY') : 'Not Set'}</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase">Notes</span>
                                    <span className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">{viewItem.notes || 'None'}</span>
                                </div>

                                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <Button variant="secondary" onClick={closeViewModal}>Close</Button>
                                    {viewItem.status === 'Pending' && (
                                        <Button variant="primary" icon={Edit2} onClick={() => setIsEditing(true)}>Edit Details</Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={submitEdit} className="space-y-4">
                                {viewItem.direction === 'inward' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Wholesale Cost (Owed to Dealer) *</label>
                                                <input
                                                    type="number"
                                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-rose-600 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                                                    value={editData.wholesale_cost}
                                                    onChange={e => setEditData('wholesale_cost', e.target.value)}
                                                    required
                                                    min="0"
                                                />
                                                {editErrors.wholesale_cost && <p className="text-rose-500 text-xs mt-1">{editErrors.wholesale_cost}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Target Retail Price (POS) *</label>
                                                <input
                                                    type="number"
                                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-emerald-600 font-bold focus:border-indigo-500 focus:ring-indigo-500"
                                                    value={editData.retail_price}
                                                    onChange={e => setEditData('retail_price', e.target.value)}
                                                    required
                                                    min="0"
                                                />
                                                {editErrors.retail_price && <p className="text-rose-500 text-xs mt-1">{editErrors.retail_price}</p>}
                                            </div>
                                        </div>

                                        {viewItem.type === 'serialized' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">IMEI / Serial Number *</label>
                                                    <input
                                                        type="text"
                                                        className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 font-mono focus:border-indigo-500 focus:ring-indigo-500"
                                                        value={editData.imei_number}
                                                        onChange={e => setEditData('imei_number', e.target.value)}
                                                        required
                                                    />
                                                    {editErrors.imei_number && <p className="text-rose-500 text-xs mt-1">{editErrors.imei_number}</p>}
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Condition</label>
                                                        <select
                                                            className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                            value={editData.condition}
                                                            onChange={e => setEditData('condition', e.target.value)}
                                                        >
                                                            <option value="Brand New">Brand New</option>
                                                            <option value="Refurbished">Refurbished</option>
                                                            <option value="Used Grade A">Used Grade A</option>
                                                            <option value="Used Grade B">Used Grade B</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Storage</label>
                                                        <input
                                                            type="text"
                                                            className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                            placeholder="e.g. 256GB"
                                                            value={editData.storage_capacity}
                                                            onChange={e => setEditData('storage_capacity', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Color</label>
                                                        <input
                                                            type="text"
                                                            className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                            placeholder="e.g. Gold"
                                                            value={editData.color}
                                                            onChange={e => setEditData('color', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Agreed Dealer Price *</label>
                                            <input
                                                type="number"
                                                className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 focus:ring-indigo-500"
                                                value={editData.dealer_price}
                                                onChange={e => setEditData('dealer_price', e.target.value)}
                                                required
                                                min="0"
                                            />
                                            {editErrors.dealer_price && <p className="text-rose-500 text-xs mt-1">{editErrors.dealer_price}</p>}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Expected Return Date</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 focus:ring-indigo-500"
                                                value={editData.expected_return_date}
                                                onChange={e => setEditData('expected_return_date', e.target.value)}
                                            />
                                            {editErrors.expected_return_date && <p className="text-rose-500 text-xs mt-1">{editErrors.expected_return_date}</p>}
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Notes</label>
                                    <textarea
                                        className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 focus:ring-indigo-500"
                                        rows="3"
                                        placeholder="Add notes..."
                                        value={editData.notes}
                                        onChange={e => setEditData('notes', e.target.value)}
                                    ></textarea>
                                </div>

                                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button variant="primary" type="submit" disabled={processingEdit}>Save Changes</Button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </Modal>

            {/* Dealer Settlement / Payout Modal */}
            <Modal show={settleItem !== null} onClose={closeSettleModal} maxWidth="md">
                {settleItem && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="text-emerald-600" size={22} />
                                Pay Dealer Consignment Payout
                            </h2>
                            <button type="button" onClick={closeSettleModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Breakdown Box */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-5 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Sourcing Dealer:</span>
                                <span className="font-bold text-slate-900 dark:text-white">{dealer.name} ({dealer.phone})</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Consigned Item:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {settleItem.type === 'serialized' ? `${settleItem.device_imei?.product?.model_name || 'Phone'}` : `${settleItem.product?.model_name || 'Item'}`}
                                </span>
                            </div>
                            {settleItem.type === 'serialized' && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">IMEI:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{settleItem.device_imei?.imei}</span>
                                </div>
                            )}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between items-center text-xs">
                                <span className="text-slate-500">Customer Sold For:</span>
                                <span className="font-semibold text-emerald-600">{formatCurrency(settleItem.retail_price || settleItem.device_imei?.selling_price)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-rose-600">Amount Owed to Dealer:</span>
                                <span className="text-rose-600">{formatCurrency(settleItem.wholesale_cost || settleItem.dealer_price)}</span>
                            </div>
                            {settleItem.retail_price && settleItem.wholesale_cost && (
                                <div className="flex justify-between items-center text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                    <span>Your Shop Net Margin:</span>
                                    <span>+{formatCurrency(Number(settleItem.retail_price) - Number(settleItem.wholesale_cost))}</span>
                                </div>
                            )}
                        </div>

                        <form onSubmit={submitSettle} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Payout Payment Method *
                                </label>
                                <select
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-emerald-500 focus:ring-emerald-500 font-semibold"
                                    value={settleData.payment_method}
                                    onChange={e => setSettleData('payment_method', e.target.value)}
                                    required
                                >
                                    <option value="Cash">Cash (Deduct from Active Till Shift)</option>
                                    <option value="MTN MoMo">MTN Mobile Money</option>
                                    <option value="Airtel Money">Airtel Money</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Payout Amount (UGX) *
                                </label>
                                <input
                                    type="number"
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-lg font-bold text-rose-600 focus:border-emerald-500 focus:ring-emerald-500"
                                    value={settleData.amount}
                                    onChange={e => setSettleData('amount', e.target.value)}
                                    required
                                    min="1"
                                />
                                {settleErrors.amount && <p className="text-rose-500 text-xs mt-1">{settleErrors.amount}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Reference / Payout Notes
                                </label>
                                <textarea
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    rows="2"
                                    placeholder="e.g. Paid to Dealer via MTN MoMo Txn #1234567..."
                                    value={settleData.notes}
                                    onChange={e => setSettleData('notes', e.target.value)}
                                ></textarea>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" onClick={closeSettleModal}>Cancel</Button>
                                <Button variant="success" type="submit" disabled={processingSettle} icon={CheckCircle}>
                                    Confirm Payout & Settle
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            {/* Receipt Preview Modal — identical to Receipts/Index.jsx */}
            {previewSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200" style={{ backgroundColor: '#FFFFFF', color: '#0F172A', borderColor: '#E2E8F0' }}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50" style={{ backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }}>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2" style={{ color: '#0F172A' }}>
                                <Receipt size={18} className="text-slate-500" style={{ color: '#64748B' }} />
                                Receipt #{previewSale.id} Preview
                            </h3>
                            <button onClick={() => setPreviewSale(null)} className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold" style={{ color: '#94A3B8' }}>
                                &times;
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto font-sans flex justify-center" style={{ backgroundColor: '#F1F5F9' }}>
                            <div 
                                className="rounded-xl shadow-xl p-6 w-full max-w-[340px] font-sans relative overflow-hidden transition-all duration-300"
                                style={{ backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0' }}
                            >
                                {/* Header */}
                                <div className="flex flex-col items-center text-center mb-4">
                                    {settings?.store_logo ? (
                                        <img src={settings.store_logo} alt="Store Logo" className="max-w-[140px] max-h-[70px] object-contain mb-2" />
                                    ) : (
                                        <div className="w-10 h-10 border border-slate-900 flex items-center justify-center mb-2 rounded-lg">
                                            <Store size={20} style={{ color: '#0F172A' }} />
                                        </div>
                                    )}
                                    <h1 className="font-extrabold text-base leading-tight uppercase tracking-wider mb-1" style={{ color: '#0F172A' }}>
                                        {settings?.shop_name || 'SmartPOS Kampala'}
                                    </h1>
                                    <div className="text-xs leading-tight font-medium" style={{ color: '#475569' }}>
                                        <p>{settings?.shop_address || '123 Kampala Road, Kampala'}</p>
                                        <p>Tel: {settings?.shop_phone || '+256 700 000 000'}</p>
                                    </div>
                                </div>

                                {previewSale.payment_status === 'Refunded' && (
                                    <div className="bg-slate-950 text-white text-center py-1.5 mb-4 font-black text-xs uppercase tracking-widest rounded-lg">
                                        *** REFUNDED ***
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="text-xs mb-3 leading-tight font-mono space-y-1" style={{ color: '#334155' }}>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Receipt #:</span>
                                        <span className="font-bold" style={{ color: '#0F172A' }}>{previewSale.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Date:</span>
                                        <span style={{ color: '#0F172A' }}>{new Date(previewSale.sale_date || previewSale.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Cashier:</span>
                                        <span style={{ color: '#0F172A' }}>{previewSale.user?.name || 'System'}</span>
                                    </div>
                                    {previewSale.customer ? (
                                        <>
                                            <div className="flex justify-between mt-1 pt-1 border-t border-slate-200">
                                                <span className="font-bold">Customer:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{previewSale.customer.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold">Phone:</span>
                                                <span style={{ color: '#0F172A' }}>{previewSale.customer.phone}</span>
                                            </div>
                                        </>
                                    ) : previewSale.dealer_item && previewSale.dealer_item.length > 0 && previewSale.dealer_item[0]?.dealer ? (
                                        <>
                                            <div className="flex justify-between mt-1 pt-1 border-t border-slate-200">
                                                <span className="font-bold">Partner/Dealer:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{previewSale.dealer_item[0].dealer.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold">Phone:</span>
                                                <span style={{ color: '#0F172A' }}>{previewSale.dealer_item[0].dealer.phone}</span>
                                            </div>
                                        </>
                                    ) : null}
                                </div>

                                <div className="border-t border-dashed border-slate-300 mb-3"></div>

                                {/* Items */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-[11px] font-semibold uppercase border-b border-dashed border-slate-300 pb-1 mb-2" style={{ color: '#64748B' }}>
                                        <span>Item Description</span>
                                        <span>Amount</span>
                                    </div>
                                    <div className="space-y-3">
                                        {previewSale.repair ? (
                                            <div className="text-xs leading-tight">
                                                <div className="flex justify-between font-bold mb-0.5" style={{ color: '#0F172A' }}>
                                                    <span className="pr-2 text-wrap text-[13px]">Repair: {previewSale.repair.device_model}</span>
                                                    <span className="whitespace-nowrap tabular-nums">{Number(previewSale.repair.estimated_cost).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs" style={{ color: '#475569' }}>
                                                    <div className="font-mono">
                                                        <div>Ticket #: {previewSale.repair.repair_code}</div>
                                                        {previewSale.repair.imei_serial && <div>IMEI/SN: {previewSale.repair.imei_serial}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : previewSale.sale_items?.map((item, idx) => (
                                            <div key={idx} className="text-xs leading-tight">
                                                <div className="flex justify-between font-bold mb-0.5" style={{ color: '#0F172A' }}>
                                                    <span className="pr-2 text-wrap text-[13px]">
                                                        {item.device_imei?.product ? (
                                                            `${item.device_imei.product.brand?.name || ''} ${item.device_imei.product.model_name}`
                                                        ) : item.product ? (
                                                            `${item.product.brand?.name || ''} ${item.product.model_name}`
                                                        ) : 'Unknown Item'}
                                                    </span>
                                                    <span className="whitespace-nowrap tabular-nums">{Number(item.price * (item.quantity || 1)).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs" style={{ color: '#475569' }}>
                                                    <div className="font-mono">
                                                        {item.device_imei ? (
                                                            <>
                                                                <div>IMEI: {item.device_imei.imei}</div>
                                                                {item.warranty_months > 0 && <div>WTY: {item.warranty_months} Months</div>}
                                                                {item.notes && <div className="mt-1 font-bold italic underline whitespace-pre-wrap">{item.notes}</div>}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div>Qty: {item.quantity} @ {Number(item.price).toLocaleString()}</div>
                                                                {item.notes && <div className="mt-1 font-bold italic underline whitespace-pre-wrap">{item.notes}</div>}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-slate-300 mb-3"></div>

                                {/* Totals */}
                                <div className="text-xs space-y-1.5 mb-3" style={{ color: '#334155' }}>
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(previewSale.total_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Discount</span>
                                        <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(previewSale.discount).toLocaleString()}</span>
                                    </div>
                                    {Number(previewSale.trade_in_value) > 0 && (
                                        <div className="flex justify-between">
                                            <span>Trade-In ({previewSale.trade_in_device})</span>
                                            <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>-{settings?.currency_symbol || 'UGX'} {Number(previewSale.trade_in_value).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-900" style={{ color: '#0F172A' }}>
                                        <span className="font-extrabold text-sm uppercase">Total</span>
                                        <span className="font-black text-base tabular-nums leading-none">
                                            <span className="text-xs mr-1">{settings?.currency_symbol || 'UGX'}</span>{Number(previewSale.final_amount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-slate-300 mb-3"></div>

                                {/* Payment Info */}
                                <div className="text-xs font-mono mb-4 leading-tight space-y-1" style={{ color: '#334155' }}>
                                    <div className="flex justify-between">
                                        <span>Payment Method:</span>
                                        <span className="font-bold" style={{ color: '#0F172A' }}>{previewSale.payment_method}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Payment Status:</span>
                                        <span className="font-bold uppercase" style={{ color: '#0F172A' }}>{previewSale.payment_status}</span>
                                    </div>
                                    {previewSale.payment_method === 'Cash' && previewSale.tendered_amount > 0 && (
                                        <>
                                            <div className="border-t border-dashed border-slate-300 my-1.5 pt-1.5"></div>
                                            <div className="flex justify-between">
                                                <span>Tendered Amount:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(previewSale.tendered_amount).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Change Due:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Math.max(0, Number(previewSale.tendered_amount) - Number(previewSale.final_amount)).toLocaleString()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Terms & Footer */}
                                <div className="text-center text-xs leading-tight">
                                    <p className="font-extrabold mb-3 uppercase tracking-wide" style={{ color: '#0F172A' }}>
                                        {settings?.receipt_footer || 'Thank you for shopping!'}
                                    </p>
                                    {settings?.terms_conditions?.length > 0 && (
                                        <div className="mb-4 rounded-xl p-3 text-left border" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                                            <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: '#475569' }}>Terms &amp; Conditions</div>
                                            <ol className="list-decimal pl-4 space-y-0.5 text-[11px] font-medium" style={{ color: '#334155' }}>
                                                {settings.terms_conditions.map((term, index) => (
                                                    <li key={index}>{term}</li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                    <p className="font-mono text-[11px] mt-2 font-semibold" style={{ color: '#64748B' }}>Powered by SmartPOS</p>
                                </div>

                                <div className="flex justify-center pt-3">
                                    <Barcode value={`SALE-${previewSale.id}`} width={1.2} height={40} fontSize={10} displayValue={true} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end" style={{ backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }}>
                            <Button variant="secondary" onClick={() => setPreviewSale(null)}>Close</Button>
                            <a
                                href={`/pos/receipt/${previewSale.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="saas-btn saas-btn-primary flex items-center gap-2"
                            >
                                <Printer size={16} /> Print
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Statement & Reconciliation Options Modal */}
            <Modal show={showStatementModal} onClose={() => setShowStatementModal(false)} maxWidth="md">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dealer Statement & Reconciliation</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Generate a formal printable PDF statement for {dealer.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowStatementModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Statement Type / Item Filter</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatementFilter('all')}
                                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${statementFilter === 'all' ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="font-bold text-sm">Full Activity</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">All issued, sold & returned items</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatementFilter('pending')}
                                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${statementFilter === 'pending' ? 'border-amber-500 dark:border-amber-500 bg-amber-50/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="font-bold text-sm">Outstanding Only</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Items currently out ({metrics.still_out})</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatementFilter('sold')}
                                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${statementFilter === 'sold' ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="font-bold text-sm">Sold Items</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Settled dealer sales only</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatementFilter('returned')}
                                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${statementFilter === 'returned' ? 'border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="font-bold text-sm">Returned Items</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Restocked items history</div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Date Range (Optional)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Start Date</span>
                                    <input 
                                        type="date"
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        value={statementStartDate}
                                        onChange={e => setStatementStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">End Date</span>
                                    <input 
                                        type="date"
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        value={statementEndDate}
                                        onChange={e => setStatementEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="secondary" onClick={() => setShowStatementModal(false)}>Close</Button>
                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                onClick={() => handleGenerateStatement('stream')}
                                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap border border-slate-200 dark:border-slate-700"
                            >
                                <Printer size={15} /> Print Preview
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleGenerateStatement('download')}
                                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-indigo-200 dark:shadow-none"
                            >
                                <Download size={15} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Receive Inward Item Modal */}
            <Modal show={showInwardModal} onClose={() => setShowInwardModal(false)} maxWidth="2xl">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Download className="text-emerald-600 dark:text-emerald-400" size={20} /> Receive Stock from Dealer (Inward Intake)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Source a device from {dealer.name} into your active shop inventory to sell on their behalf.
                            </p>
                        </div>
                        <button onClick={() => setShowInwardModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleInwardSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="saas-label">Device Type</label>
                                <select 
                                    className="saas-input" 
                                    value={inwardData.type} 
                                    onChange={(e) => setInwardData('type', e.target.value)}
                                >
                                    <option value="serialized">Serialized (Phone / Tablet / Laptop with IMEI)</option>
                                    <option value="bulk">Bulk Accessory / Non-serialized</option>
                                </select>
                            </div>

                            <div>
                                <label className="saas-label">Brand</label>
                                <select 
                                    className="saas-input" 
                                    value={inwardData.brand_id} 
                                    onChange={(e) => setInwardData('brand_id', e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Brand --</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="saas-label">Category</label>
                                <select 
                                    className="saas-input" 
                                    value={inwardData.category_id} 
                                    onChange={(e) => setInwardData('category_id', e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="saas-label">Model Name</label>
                                <input 
                                    type="text" 
                                    className="saas-input" 
                                    placeholder="e.g. iPhone 14 Pro Max 256GB" 
                                    value={inwardData.model_name}
                                    onChange={(e) => setInwardData('model_name', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {inwardData.type === 'serialized' ? (
                            <>
                                <div>
                                    <label className="saas-label">IMEI / Serial Number</label>
                                    <input 
                                        type="text" 
                                        className="saas-input font-mono" 
                                        placeholder="e.g. 354891029384210" 
                                        value={inwardData.imei_number}
                                        onChange={(e) => setInwardData('imei_number', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="saas-label">Condition</label>
                                        <select 
                                            className="saas-input"
                                            value={inwardData.condition}
                                            onChange={(e) => setInwardData('condition', e.target.value)}
                                        >
                                            <option value="Brand New">Brand New</option>
                                            <option value="Refurbished">Refurbished</option>
                                            <option value="Used Grade A">Used Grade A</option>
                                            <option value="Used Grade B">Used Grade B</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="saas-label">Storage</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            placeholder="e.g. 128GB, 256GB" 
                                            value={inwardData.storage_capacity}
                                            onChange={(e) => setInwardData('storage_capacity', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="saas-label">Color</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            placeholder="e.g. Black, Gold, Silver" 
                                            value={inwardData.color}
                                            onChange={(e) => setInwardData('color', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="saas-label">Quantity Received</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    className="saas-input" 
                                    value={inwardData.quantity}
                                    onChange={(e) => setInwardData('quantity', e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="saas-label">Dealer Wholesale Cost (UGX)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="saas-input font-bold text-rose-600 dark:text-rose-400" 
                                    placeholder="Price owed to dealer upon sale" 
                                    value={inwardData.wholesale_cost}
                                    onChange={(e) => setInwardData('wholesale_cost', e.target.value)}
                                    required
                                />
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Amount owed to {dealer.name} once sold</span>
                            </div>

                            <div>
                                <label className="saas-label">Target Retail Price (UGX)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="saas-input font-bold text-emerald-600 dark:text-emerald-400" 
                                    placeholder="Selling price at shop POS" 
                                    value={inwardData.retail_price}
                                    onChange={(e) => setInwardData('retail_price', e.target.value)}
                                    required
                                />
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">What your cashier sells it for at POS</span>
                            </div>
                        </div>

                        <div>
                            <label className="saas-label">Notes (Optional)</label>
                            <textarea 
                                className="saas-input" 
                                rows="2"
                                placeholder="Condition details, color, warranty terms..."
                                value={inwardData.notes}
                                onChange={(e) => setInwardData('notes', e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button type="button" variant="secondary" onClick={() => setShowInwardModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" isLoading={processingInward} icon={Download}>
                                Receive into Shop Stock
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
            
        </AuthenticatedLayout>
    );
}
