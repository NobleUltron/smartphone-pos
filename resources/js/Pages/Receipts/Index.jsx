import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Receipt, Eye, Printer, Search, DollarSign, TrendingUp, Tag, FileSpreadsheet, Store, X, MessageCircle, ArrowLeftRight } from 'lucide-react';
import { buildSaleReceiptMessage, openWhatsApp } from '@/Utils/whatsapp';
import Barcode from 'react-barcode';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import PageHeader from '@/Components/SaaS/PageHeader';

export default function ReceiptsIndex({ auth, sales, summary, filters, settings, inStockDevices = [] }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [paymentMethod, setPaymentMethod] = useState(filters?.payment_method || 'all');
    const [paymentStatus, setPaymentStatus] = useState(filters?.payment_status || 'all');
    const [dateFilter, setDateFilter] = useState(filters?.date_filter || 'all');
    const [selectedSale, setSelectedSale] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedRefundSale, setSelectedRefundSale] = useState(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [selectedExchangeSale, setSelectedExchangeSale] = useState(null);
    const [showExchangeModal, setShowExchangeModal] = useState(false);

    const refundForm = useForm({
        restock_action: 'restock',
        refund_method: 'Cash',
        notes: ''
    });

    const exchangeForm = useForm({
        sale_item_id: '',
        replacement_imei_id: '',
        replacement_price: '',
        return_action: 'restock',
        payment_method: 'Cash',
        notes: ''
    });

    const openExchangeModal = (sale) => {
        const serializedItems = (sale.sale_items || []).filter(i => i.device_imei_id);
        if (serializedItems.length === 0) {
            toast.error('This receipt has no serialized smartphones to exchange.');
            return;
        }
        exchangeForm.clearErrors();
        setSelectedExchangeSale(sale);
        const firstReplacement = inStockDevices[0] || null;
        exchangeForm.setData({
            sale_item_id: serializedItems[0].id,
            replacement_imei_id: firstReplacement ? firstReplacement.id : '',
            replacement_price: firstReplacement ? firstReplacement.selling_price : '',
            return_action: 'restock',
            payment_method: sale.payment_method && sale.payment_method !== 'Layaway' ? sale.payment_method : 'Cash',
            notes: ''
        });
        setShowExchangeModal(true);
    };

    const handleExchangeSubmit = (e) => {
        e.preventDefault();
        if (!selectedExchangeSale) return;
        exchangeForm.post(`/api/receipts/${selectedExchangeSale.id}/exchange`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowExchangeModal(false);
                setSelectedExchangeSale(null);
                exchangeForm.reset();
            },
            onError: (errs) => {
                toast.error(errs.exchange || errs.replacement_imei_id || Object.values(errs)[0] || 'Exchange failed');
            }
        });
    };

    const getRefundableAmount = (sale) => {
        if (!sale) return 0;
        if (sale.payment_status === 'Partial') {
            return sale.layaway_payments?.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0) || 0;
        }
        return Number(sale.final_amount || 0);
    };

    const openRefundModal = (sale) => {
        refundForm.clearErrors();
        setSelectedRefundSale(sale);
        refundForm.setData({
            restock_action: 'restock',
            refund_method: sale.payment_method && sale.payment_method !== 'Layaway' ? sale.payment_method : 'Cash',
            notes: ''
        });
        setShowRefundModal(true);
    };

    const handleRefundSubmit = (e) => {
        e.preventDefault();
        if (!selectedRefundSale) return;
        refundForm.post(`/api/receipts/${selectedRefundSale.id}/refund`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Receipt #${selectedRefundSale.id} refunded successfully.`);
                setShowRefundModal(false);
                setSelectedRefundSale(null);
            },
            onError: (err) => {
                toast.error(err.drawer_validation || err.refund_method || err.restock_action || 'Refund failed');
            }
        });
    };

    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            const params = {};
            if (search) params.search = search;
            if (paymentMethod && paymentMethod !== 'all') params.payment_method = paymentMethod;
            if (paymentStatus && paymentStatus !== 'all') params.payment_status = paymentStatus;
            if (dateFilter && dateFilter !== 'all') params.date_filter = dateFilter;

            router.get('/receipts', params, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, paymentMethod, paymentStatus, dateFilter]);

    const handleResetFilters = () => {
        setSearch('');
        setPaymentMethod('all');
        setPaymentStatus('all');
        setDateFilter('all');
    };

    const openPreview = (sale) => {
        setSelectedSale(sale);
        setShowPreviewModal(true);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Issued Receipts & Sales History" />
            
            <PageHeader 
                title="Issued Receipts"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Issued Receipts' }]}
                actions={
                    ['admin', 'manager'].includes((auth?.user?.role || '').toLowerCase()) ? (
                        <a 
                            href="/api/export/sales"
                            className="saas-btn saas-btn-success"
                            title="Export Sales Records as Excel Spreadsheet"
                        >
                            <FileSpreadsheet size={16} /> Export Sales (Excel)
                        </a>
                    ) : null
                }
            />

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card
                    className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-indigo-400/50 transition-all"
                    style={{ animationDelay: '0.0s' }}
                    onClick={() => setPaymentStatus('all')}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Receipts Issued</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary?.total_receipts || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Receipt size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="success">Processed</Badge>
                        <span>Sales</span>
                    </div>
                </Card>
                
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Net Revenue</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{Number(summary?.total_revenue || 0).toLocaleString()} <span className="text-base text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="success">Revenue</Badge>
                        <span>Realized</span>
                    </div>
                </Card>

                <Card
                    className={`animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer transition-all ${paymentStatus === 'Refunded' ? 'ring-2 ring-rose-500' : 'hover:ring-2 hover:ring-rose-400/50'}`}
                    style={{ animationDelay: '0.2s' }}
                    onClick={() => setPaymentStatus(paymentStatus === 'Refunded' ? 'all' : 'Refunded')}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Refunded / Scrapped</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{Number(summary?.total_refunded || 0).toLocaleString()} <span className="text-base text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <Tag size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="danger">Returns</Badge>
                        <span>{summary?.refunded_count || 0} Sales</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Avg Sale Value</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{Math.round(Number(summary?.avg_sale_value || 0)).toLocaleString()} <span className="text-base text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="info">Average</Badge>
                        <span>Value</span>
                    </div>
                </Card>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <Card noPadding className="overflow-hidden">
                    {/* Search & Filter Bar */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Search size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    className="saas-input !pl-10" 
                                    placeholder="Search Receipt #, IMEI, Customer, Dealer..." 
                                    value={search} 
                                    onChange={(e) => setSearch(e.target.value)} 
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:flex">
                                <div className="lg:w-40">
                                    <select 
                                        className="saas-input"
                                        value={paymentMethod} 
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    >
                                        <option value="all">All Payments</option>
                                        <option value="Cash">Cash</option>
                                        <option value="MTN MoMo">MTN MoMo</option>
                                        <option value="Airtel Money">Airtel Money</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Layaway">Layaway</option>
                                    </select>
                                </div>
                                <div className="lg:w-36">
                                    <select 
                                        className="saas-input"
                                        value={paymentStatus} 
                                        onChange={(e) => setPaymentStatus(e.target.value)}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Partial">Partial</option>
                                        <option value="Refunded">Refunded</option>
                                    </select>
                                </div>
                                <div className="lg:w-40">
                                    <select 
                                        className="saas-input"
                                        value={dateFilter} 
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    >
                                        <option value="all">All Dates</option>
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="this_week">This Week</option>
                                        <option value="this_month">This Month</option>
                                    </select>
                                </div>
                            </div>
                            {(search || paymentMethod !== 'all' || paymentStatus !== 'all' || dateFilter !== 'all') && (
                                <Button variant="secondary" onClick={handleResetFilters}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Desktop Receipts Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="saas-table w-full whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th>Receipt #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Payment</th>
                                    <th className="!text-right">Amount</th>
                                    <th>Cashier</th>
                                    <th className="!text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales?.data?.length > 0 ? sales.data.map(sale => (
                                    <tr key={sale.id}>
                                        <td className="font-mono font-bold text-slate-900 dark:text-white">#{sale.id}</td>
                                        <td className="text-slate-500 dark:text-slate-400">
                                            {new Date(sale.sale_date || sale.created_at).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>
                                            {sale.customer ? (
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{sale.customer.name}</div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">{sale.customer.phone}</div>
                                                </div>
                                            ) : sale.dealer_item && sale.dealer_item.length > 0 && sale.dealer_item[0].dealer ? (
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{sale.dealer_item[0].dealer.name} <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase ml-1">Dealer</span></div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">{sale.dealer_item[0].dealer.phone}</div>
                                                </div>
                                            ) : <span className="text-slate-500 dark:text-slate-400 italic">Walk-in</span>}
                                        </td>
                                        <td>
                                            <div className="text-sm max-w-xs truncate text-slate-700 dark:text-slate-300">
                                                {sale.repair ? (
                                                    <span className="block truncate">
                                                        • Repair: {sale.repair.device_model}
                                                    </span>
                                                ) : sale.sale_items?.length > 0 ? (
                                                    sale.sale_items.map((item, i) => (
                                                        item.device_imei?.product ? (
                                                            <span key={i} className="block truncate">
                                                                • {item.device_imei.product.brand?.name} {item.device_imei.product.model_name}
                                                            </span>
                                                        ) : item.product ? (
                                                            <span key={i} className="block truncate">
                                                                • {item.quantity}x {item.product.brand?.name} {item.product.model_name}
                                                            </span>
                                                        ) : null
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 italic">No Items</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="neutral">{sale.payment_method}</Badge>
                                                {sale.payment_status === 'Partial' && (
                                                    <Badge variant="warning">Partial</Badge>
                                                )}
                                                {sale.payment_status === 'Refunded' && (
                                                    <Badge variant="danger">Refunded</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            {sale.payment_status === 'Refunded' ? (
                                                <div>
                                                    <span className="text-slate-400 line-through mr-2">{Number(sale.final_amount).toLocaleString()} UGX</span>
                                                    <span className="text-xs font-bold text-rose-500">[REFUNDED]</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-slate-900 dark:text-white">{Number(sale.final_amount).toLocaleString()} UGX</span>
                                                    {(sale.payment_method === 'Layaway' || sale.payment_status === 'Partial') && (
                                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                            Paid: {Number(sale.layaway_payments?.reduce((s, p) => s + Number(p.amount_paid), 0) || 0).toLocaleString()} UGX
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {sale.discount > 0 && (
                                                <div className="text-xs text-slate-400">
                                                    Disc: {Number(sale.discount).toLocaleString()} UGX
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                {sale.user ? (
                                                    <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                                        <img 
                                                            src={sale.user.profile_photo_url} 
                                                            alt={sale.user.name}
                                                            className="w-6 h-6 rounded-full object-cover shadow-sm"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                        S
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium">{sale.user?.name || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    type="button"
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" 
                                                    title="Preview"
                                                    onClick={() => openPreview(sale)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <a 
                                                    href={`/pos/receipt/${sale.id}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-lg transition-colors"
                                                    title="Thermal Print"
                                                >
                                                    <Printer size={16} />
                                                </a>
                                                <button
                                                    type="button"
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                    title="Send Receipt via WhatsApp"
                                                    onClick={() => {
                                                        const phone = sale.customer?.phone || sale.dealer_item?.[0]?.dealer?.phone || '';
                                                        openWhatsApp(phone, buildSaleReceiptMessage(sale, settings));
                                                    }}
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                {sale.payment_status === 'Paid' && sale.sale_items?.some(i => i.device_imei_id) && auth?.permissions?.issue_refunds !== false && (
                                                    <button
                                                        type="button"
                                                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                                        title="Exchange / Swap Device"
                                                        onClick={() => openExchangeModal(sale)}
                                                    >
                                                        <ArrowLeftRight size={16} />
                                                    </button>
                                                )}
                                                {sale.payment_status !== 'Refunded' && auth?.permissions?.issue_refunds !== false && (
                                                    <button 
                                                        type="button"
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                        title="Refund"
                                                        onClick={() => openRefundModal(sale)}
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-12 text-slate-500 dark:text-slate-400">
                                            No receipts found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Receipts Card List */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {sales?.data?.length > 0 ? sales.data.map(sale => (
                            <div key={sale.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">#{sale.id}</span>
                                            <Badge variant="neutral">{sale.payment_method}</Badge>
                                            {sale.payment_status === 'Partial' && <Badge variant="warning">Partial</Badge>}
                                            {sale.payment_status === 'Refunded' && <Badge variant="danger">Refunded</Badge>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {new Date(sale.sale_date || sale.created_at).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {sale.payment_status === 'Refunded' ? (
                                            <span className="text-xs font-bold text-rose-500 line-through">{Number(sale.final_amount).toLocaleString()} UGX</span>
                                        ) : (
                                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">{Number(sale.final_amount).toLocaleString()} UGX</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-300">
                                    <span className="font-semibold">
                                        {sale.customer?.name || (sale.dealer_item?.[0]?.dealer?.name ? `${sale.dealer_item[0].dealer.name} (Dealer)` : 'Walk-in')}
                                    </span>
                                    {sale.user?.name && <span className="text-slate-400"> • Cashier: {sale.user.name}</span>}
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => openPreview(sale)}
                                        className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1"
                                    >
                                        <Eye size={14} /> Preview
                                    </button>
                                    <a
                                        href={`/pos/receipt/${sale.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1"
                                    >
                                        <Printer size={14} /> Print
                                    </a>
                                    {sale.payment_status !== 'Refunded' && (
                                        <button
                                            type="button"
                                            onClick={() => openRefundModal(sale)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1"
                                        >
                                            <DollarSign size={14} /> Refund
                                        </button>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                No receipts found matching your criteria.
                            </div>
                        )}
                    </div>
                    
                    {/* Pagination Component */}
                    {sales.links && sales.links.length > 3 && (
                        <div className="flex justify-center p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <nav className="inline-flex flex-wrap bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {sales.links.map((link, k) => (
                                    <Link 
                                        key={k}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
                                        className={`px-4 py-2 text-sm font-medium border-r border-slate-200 dark:border-slate-700 last:border-0 ${
                                            link.active ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        } ${link.url === null ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </Card>
            </div>

            {/* Receipt Preview Modal */}
            {showPreviewModal && selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200" style={{ backgroundColor: '#FFFFFF', color: '#0F172A', borderColor: '#E2E8F0' }}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50" style={{ backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }}>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2" style={{ color: '#0F172A' }}>
                                <Receipt size={18} className="text-slate-500" style={{ color: '#64748B' }} />
                                Receipt #{selectedSale.id} Preview
                            </h3>
                            <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold" style={{ color: '#94A3B8' }}>
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

                                {selectedSale.payment_status === 'Refunded' && (
                                    <div className="bg-slate-950 text-white text-center py-1.5 mb-4 font-black text-xs uppercase tracking-widest rounded-lg">
                                        *** REFUNDED ***
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="text-xs mb-3 leading-tight font-mono space-y-1" style={{ color: '#334155' }}>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Receipt #:</span>
                                        <span className="font-bold" style={{ color: '#0F172A' }}>{selectedSale.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Date:</span>
                                        <span style={{ color: '#0F172A' }}>{new Date(selectedSale.sale_date || selectedSale.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Cashier:</span>
                                        <span style={{ color: '#0F172A' }}>{selectedSale.user?.name || 'System'}</span>
                                    </div>
                                    {selectedSale.customer ? (
                                        <>
                                            <div className="flex justify-between mt-1 pt-1 border-t border-slate-200">
                                                <span className="font-bold">Customer:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{selectedSale.customer.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold">Phone:</span>
                                                <span style={{ color: '#0F172A' }}>{selectedSale.customer.phone}</span>
                                            </div>
                                        </>
                                    ) : selectedSale.dealer_item && selectedSale.dealer_item.length > 0 && selectedSale.dealer_item[0].dealer ? (
                                        <>
                                            <div className="flex justify-between mt-1 pt-1 border-t border-slate-200">
                                                <span className="font-bold">Partner/Dealer:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{selectedSale.dealer_item[0].dealer.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold">Phone:</span>
                                                <span style={{ color: '#0F172A' }}>{selectedSale.dealer_item[0].dealer.phone}</span>
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
                                        {selectedSale.repair ? (
                                            <div className="text-xs leading-tight">
                                                <div className="flex justify-between font-bold mb-0.5" style={{ color: '#0F172A' }}>
                                                    <span className="pr-2 text-wrap text-[13px]">
                                                        Repair: {selectedSale.repair.device_model}
                                                    </span>
                                                    <span className="whitespace-nowrap tabular-nums">
                                                        {Number(selectedSale.repair.estimated_cost).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs" style={{ color: '#475569' }}>
                                                    <div className="font-mono">
                                                        <div>Ticket #: {selectedSale.repair.repair_code}</div>
                                                        {selectedSale.repair.imei_serial && <div>IMEI/SN: {selectedSale.repair.imei_serial}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (selectedSale.sale_items || selectedSale.saleItems || []).map((item, idx) => {
                                            const prod = item.device_imei?.product || item.product;
                                            const brandObj = prod?.brand;
                                            const brandName = typeof brandObj === 'object' ? (brandObj?.name || '') : (typeof brandObj === 'string' ? brandObj : '');
                                            const modelName = prod?.model_name || '';
                                            const displayName = `${brandName} ${modelName}`.trim() || 'Unknown Item';

                                            return (
                                                <div key={idx} className="text-xs leading-tight">
                                                    <div className="flex justify-between font-bold mb-0.5" style={{ color: '#0F172A' }}>
                                                        <span className="pr-2 text-wrap text-[13px]">
                                                            {displayName}
                                                        </span>
                                                        <span className="whitespace-nowrap tabular-nums">
                                                            {Number(item.price * (item.quantity || 1)).toLocaleString()}
                                                        </span>
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
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-slate-300 mb-3"></div>

                                {/* Totals */}
                                <div className="text-xs space-y-1.5 mb-3" style={{ color: '#334155' }}>
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(selectedSale.total_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Discount</span>
                                        <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(selectedSale.discount).toLocaleString()}</span>
                                    </div>
                                    {Number(selectedSale.trade_in_value) > 0 && (
                                        <div className="flex justify-between">
                                            <span>Trade-In ({selectedSale.trade_in_device})</span>
                                            <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>-{settings?.currency_symbol || 'UGX'} {Number(selectedSale.trade_in_value).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-900" style={{ color: '#0F172A' }}>
                                        <span className="font-extrabold text-sm uppercase">Total</span>
                                        <span className="font-black text-base tabular-nums leading-none">
                                            <span className="text-xs mr-1">{settings?.currency_symbol || 'UGX'}</span>{Number(selectedSale.final_amount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-slate-300 mb-3"></div>

                                {/* Payment Info */}
                                <div className="text-xs font-mono mb-4 leading-tight space-y-1" style={{ color: '#334155' }}>
                                    <div className="flex justify-between">
                                        <span>Payment Method:</span>
                                        <span className="font-bold" style={{ color: '#0F172A' }}>{selectedSale.payment_method}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Payment Status:</span>
                                        <span className="font-bold uppercase" style={{ color: '#0F172A' }}>{selectedSale.payment_status}</span>
                                    </div>
                                    {selectedSale.payment_method === 'Cash' && selectedSale.tendered_amount > 0 && (
                                        <>
                                            <div className="border-t border-dashed border-slate-300 my-1.5"></div>
                                            <div className="flex justify-between">
                                                <span>Tendered Amount:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(selectedSale.tendered_amount).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Change Due:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Math.max(0, Number(selectedSale.tendered_amount) - Number(selectedSale.final_amount)).toLocaleString()}</span>
                                            </div>
                                        </>
                                    )}
                                    {selectedSale.payment_method === 'Layaway' && selectedSale.layaway_payments && (
                                        <>
                                            <div className="border-t border-dashed border-slate-300 my-1.5"></div>
                                            <div className="flex justify-between">
                                                <span>Total Paid:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(selectedSale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Balance Due:</span>
                                                <span className="font-bold" style={{ color: '#0F172A' }}>{settings?.currency_symbol || 'UGX'} {Number(selectedSale.final_amount - selectedSale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}</span>
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
                                    <Barcode value={`SALE-${selectedSale.id}`} width={1.2} height={40} fontSize={10} displayValue={true} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3" style={{ backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }}>
                            <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                                Close
                            </Button>
                            <a
                                href={`/pos/receipt/${selectedSale.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="saas-btn saas-btn-primary"
                            >
                                <Printer size={16} />
                                Print
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Direct Receipt Refund Modal */}
            {showRefundModal && selectedRefundSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-rose-100 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 flex items-center justify-between">
                            <h3 className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                <DollarSign size={20} /> Process Refund #{selectedRefundSale.id}
                            </h3>
                            <button type="button" onClick={() => setShowRefundModal(false)} className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleRefundSubmit}>
                            <div className="p-6">
                                {refundForm.errors.drawer_validation && (
                                    <div className="bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 p-4 rounded-xl text-sm mb-6 border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                            <path d="M12 9v4"/>
                                            <path d="M12 17h.01"/>
                                        </svg>
                                        <div>
                                            <strong>Validation Error:</strong><br/>
                                            {refundForm.errors.drawer_validation}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 p-4 rounded-xl text-sm mb-6 border border-amber-200 dark:border-amber-800">
                                    <strong>Refund Amount:</strong> {getRefundableAmount(selectedRefundSale).toLocaleString()} UGX
                                    {selectedRefundSale.payment_status === 'Partial' && (
                                        <span className="block text-xs mt-1 opacity-80">
                                            (Total installments collected on partial layaway)
                                        </span>
                                    )}
                                    <br/>
                                    This will mark receipt <strong>#{selectedRefundSale.id}</strong> as Refunded and adjust Net Revenue metrics accordingly.
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="saas-label">Refund Method</label>
                                        <select
                                            className="saas-input"
                                            value={refundForm.data.refund_method}
                                            onChange={(e) => refundForm.setData('refund_method', e.target.value)}
                                        >
                                            <option value="Cash">Cash (Active Shift Drawer)</option>
                                            <option value="MTN MoMo">MTN MoMo</option>
                                            <option value="Airtel Money">Airtel Money</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="saas-label">Inventory Action for Returned Items</label>
                                        <select 
                                            className="saas-input"
                                            value={refundForm.data.restock_action}
                                            onChange={(e) => refundForm.setData('restock_action', e.target.value)}
                                        >
                                            <option value="restock">Return Items to In-Stock (Resellable)</option>
                                            <option value="defective">Mark Items as Defective (Damaged/Scrap)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="saas-label">Reason for Refund</label>
                                        <textarea 
                                            className="saas-input" 
                                            rows="3" 
                                            placeholder="e.g. Customer returned working unit, changed mind..."
                                            value={refundForm.data.notes}
                                            onChange={(e) => refundForm.setData('notes', e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3 justify-end">
                                <Button variant="secondary" type="button" onClick={() => setShowRefundModal(false)}>Cancel</Button>
                                <Button variant="danger" type="submit" isLoading={refundForm.processing}>
                                    Confirm Refund
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* One-Step Device Exchange (Swap) Modal */}
            {showExchangeModal && selectedExchangeSale && (() => {
                const serializedItems = (selectedExchangeSale.sale_items || []).filter(i => i.device_imei_id);
                const selectedItem = serializedItems.find(i => Number(i.id) === Number(exchangeForm.data.sale_item_id)) || serializedItems[0];
                const origPrice = Number(selectedItem?.price || 0);
                const replPrice = Number(exchangeForm.data.replacement_price || 0);
                const priceDiff = replPrice - origPrice;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-purple-100 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/40 flex items-center justify-between">
                                <h3 className="font-bold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                                    <ArrowLeftRight size={18} /> Device Exchange — Receipt #{selectedExchangeSale.id}
                                </h3>
                                <button type="button" onClick={() => setShowExchangeModal(false)} className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleExchangeSubmit}>
                                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                                    {exchangeForm.errors.exchange && (
                                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
                                            {exchangeForm.errors.exchange}
                                        </div>
                                    )}

                                    <div>
                                        <label className="saas-label">Phone Being Returned</label>
                                        <select
                                            className="saas-input"
                                            value={exchangeForm.data.sale_item_id}
                                            onChange={(e) => exchangeForm.setData('sale_item_id', e.target.value)}
                                        >
                                            {serializedItems.map((it) => (
                                                <option key={it.id} value={it.id}>
                                                    {it.device_imei?.product?.brand?.name} {it.device_imei?.product?.model_name} (IMEI: {it.device_imei?.imei}) — UGX {Number(it.price).toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="saas-label">Returned Phone Condition</label>
                                        <select
                                            className="saas-input"
                                            value={exchangeForm.data.return_action}
                                            onChange={(e) => exchangeForm.setData('return_action', e.target.value)}
                                        >
                                            <option value="restock">Return to In-Stock (Resellable)</option>
                                            <option value="defective">Mark as Defective (Damaged / Needs Repair)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="saas-label">Replacement Phone (In Stock) *</label>
                                        {inStockDevices.length > 0 ? (
                                            <select
                                                className="saas-input"
                                                value={exchangeForm.data.replacement_imei_id}
                                                onChange={(e) => {
                                                    const chosen = inStockDevices.find(d => String(d.id) === String(e.target.value));
                                                    exchangeForm.setData({
                                                        ...exchangeForm.data,
                                                        replacement_imei_id: e.target.value,
                                                        replacement_price: chosen ? chosen.selling_price : exchangeForm.data.replacement_price,
                                                    });
                                                }}
                                                required
                                            >
                                                <option value="">Select replacement phone...</option>
                                                {inStockDevices.map((d) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.label} (UGX {Number(d.selling_price).toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
                                                No In-Stock serialized phones available for exchange.
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="saas-label">Replacement Price (UGX) *</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                required
                                                className="saas-input font-bold"
                                                value={exchangeForm.data.replacement_price}
                                                onChange={(e) => exchangeForm.setData('replacement_price', e.target.value)}
                                            />
                                        </div>

                                        {Math.abs(priceDiff) > 0 && (
                                            <div>
                                                <label className="saas-label">
                                                    {priceDiff > 0 ? 'Top-Up Payment Method' : 'Difference Refund Method'}
                                                </label>
                                                <select
                                                    className="saas-input"
                                                    value={exchangeForm.data.payment_method}
                                                    onChange={(e) => exchangeForm.setData('payment_method', e.target.value)}
                                                >
                                                    <option value="Cash">Cash (Active Shift Drawer)</option>
                                                    <option value="MTN MoMo">MTN MoMo</option>
                                                    <option value="Airtel Money">Airtel Money</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Live Price Difference Summary */}
                                    <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                                        priceDiff > 0
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                                            : priceDiff < 0
                                                ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                                    }`}>
                                        <div className="flex justify-between">
                                            <span>Returned Device Value:</span>
                                            <span className="font-bold">UGX {origPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Replacement Device Price:</span>
                                            <span className="font-bold">UGX {replPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-current/20 text-sm font-black">
                                            <span>
                                                {priceDiff > 0 ? 'Customer Pays Extra:' : priceDiff < 0 ? 'Shop Refunds Customer:' : 'Even Swap (No Cash Movement):'}
                                            </span>
                                            <span>
                                                {priceDiff > 0 ? '+' : priceDiff < 0 ? '−' : ''}UGX {Math.abs(priceDiff).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="saas-label">Exchange Notes / Reason</label>
                                        <textarea
                                            className="saas-input"
                                            rows="2"
                                            placeholder="e.g. Customer upgraded from 128GB to 256GB..."
                                            value={exchangeForm.data.notes}
                                            onChange={(e) => exchangeForm.setData('notes', e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3 justify-end">
                                    <Button variant="secondary" type="button" onClick={() => setShowExchangeModal(false)}>Cancel</Button>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        isLoading={exchangeForm.processing}
                                        disabled={!exchangeForm.data.replacement_imei_id || inStockDevices.length === 0}
                                    >
                                        Confirm Exchange
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </AuthenticatedLayout>
    );
}
