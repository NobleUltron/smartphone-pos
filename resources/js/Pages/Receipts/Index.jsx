import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Receipt, Eye, Printer, Search, DollarSign, TrendingUp, Tag, Sparkles, FileSpreadsheet, Store } from 'lucide-react';
import Barcode from 'react-barcode';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import PageHeader from '@/Components/SaaS/PageHeader';

export default function ReceiptsIndex({ auth, sales, summary, filters, settings }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [paymentMethod, setPaymentMethod] = useState(filters?.payment_method || 'all');
    const [dateFilter, setDateFilter] = useState(filters?.date_filter || 'all');
    const [selectedSale, setSelectedSale] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedRefundSale, setSelectedRefundSale] = useState(null);
    const [showRefundModal, setShowRefundModal] = useState(false);

    const refundForm = useForm({
        restock_action: 'restock',
        notes: ''
    });

    const openRefundModal = (sale) => {
        setSelectedRefundSale(sale);
        refundForm.setData({
            restock_action: 'restock',
            notes: ''
        });
        setShowRefundModal(true);
    };

    const handleRefundSubmit = (e) => {
        e.preventDefault();
        refundForm.post(`/api/receipts/${selectedRefundSale.id}/refund`, {
            onSuccess: () => {
                setShowRefundModal(false);
                setSelectedRefundSale(null);
            }
        });
    };

    const [isInitialRender, setIsInitialRender] = useState(true);

    useEffect(() => {
        if (isInitialRender) {
            setIsInitialRender(false);
            return;
        }

        const timer = setTimeout(() => {
            const params = {};
            if (search) params.search = search;
            if (paymentMethod && paymentMethod !== 'all') params.payment_method = paymentMethod;
            if (dateFilter && dateFilter !== 'all') params.date_filter = dateFilter;

            router.get('/receipts', params, { preserveState: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, paymentMethod, dateFilter]);

    const handleResetFilters = () => {
        setSearch('');
        setPaymentMethod('all');
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
                    <a 
                        href="/api/export/sales"
                        className="saas-btn saas-btn-success"
                        title="Export Sales Records as Excel Spreadsheet"
                    >
                        <FileSpreadsheet size={16} /> Export Sales (Excel)
                    </a>
                }
            />

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Receipts Issued</p>
                            <h3 className="text-3xl font-black text-slate-900">{summary?.total_receipts || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Receipt size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="success">Processed</Badge>
                        <span>Sales</span>
                    </div>
                </Card>
                
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Revenue</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(summary?.total_revenue || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="success">Revenue</Badge>
                        <span>Realized</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Refunded / Scrapped</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(summary?.total_refunded || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <Tag size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="danger">Returns</Badge>
                        <span>{summary?.refunded_count || 0} Sales</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Sale Value</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(summary?.avg_sale_value || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="info">Average</Badge>
                        <span>Value</span>
                    </div>
                </Card>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <Card noPadding className="overflow-hidden">
                    {/* Search & Filter Bar */}
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Search size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    className="saas-input !pl-10" 
                                    placeholder="Search Receipt #, Customer, Phone..." 
                                    value={search} 
                                    onChange={(e) => setSearch(e.target.value)} 
                                />
                            </div>
                            <div className="w-full md:w-48">
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
                            <div className="w-full md:w-48">
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
                            {(search || paymentMethod !== 'all' || dateFilter !== 'all') && (
                                <Button variant="secondary" onClick={handleResetFilters}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Receipts Table */}
                    <div className="overflow-x-auto">
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
                                        <td className="font-mono font-bold text-slate-900">#{sale.id}</td>
                                        <td className="text-slate-500">
                                            {new Date(sale.sale_date || sale.created_at).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>
                                            {sale.customer ? (
                                                <div>
                                                    <div className="font-bold text-slate-900">{sale.customer.name}</div>
                                                    <div className="text-sm text-slate-500">{sale.customer.phone}</div>
                                                </div>
                                            ) : sale.dealer_item && sale.dealer_item.length > 0 && sale.dealer_item[0].dealer ? (
                                                <div>
                                                    <div className="font-bold text-slate-900">{sale.dealer_item[0].dealer.name} <span className="text-[10px] font-bold text-indigo-500 uppercase ml-1">Dealer</span></div>
                                                    <div className="text-sm text-slate-500">{sale.dealer_item[0].dealer.phone}</div>
                                                </div>
                                            ) : <span className="text-slate-500 italic">Walk-in</span>}
                                        </td>
                                        <td>
                                            <div className="text-sm max-w-xs truncate">
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
                                            <div className="flex items-center gap-2">
                                                <Badge variant="neutral">{sale.payment_method}</Badge>
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
                                                    <span className="font-bold text-slate-900">{Number(sale.final_amount).toLocaleString()} UGX</span>
                                                    {sale.payment_method === 'Layaway' && (
                                                        <span className="text-[11px] font-bold text-emerald-600">
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
                                        <td className="text-slate-500">
                                            <div className="flex items-center gap-2">
                                                {sale.user ? (
                                                    <div className="w-6 h-6 rounded-full border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0">
                                                        <img 
                                                            src={sale.user.profile_photo_url} 
                                                            alt={sale.user.name}
                                                            className="w-6 h-6 rounded-full object-cover shadow-sm border border-slate-200"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                        S
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium">{sale.user?.name || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                                    title="Preview"
                                                    onClick={() => openPreview(sale)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <a 
                                                    href={`/pos/receipt/${sale.id}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                                                    title="Thermal Print"
                                                >
                                                    <Printer size={16} />
                                                </a>
                                                {sale.payment_status !== 'Refunded' && (
                                                    <button 
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                                        <td colSpan="8" className="text-center py-12 text-slate-500">
                                            No receipts found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Component */}
                    {sales.links && sales.links.length > 3 && (
                        <div className="flex justify-center mt-6 p-6 border-t border-slate-100 bg-white">
                            <nav className="inline-flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                {sales.links.map((link, k) => (
                                    <Link 
                                        key={k}
                                        href={link.url || '#'}
                                        className={`px-4 py-2 text-sm font-medium border-r border-slate-100 last:border-0 ${
                                            link.active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-rose-100 bg-rose-50 flex items-center justify-between">
                            <h3 className="font-bold text-rose-700 flex items-center gap-2">
                                <DollarSign size={20} /> Process Refund #{selectedRefundSale.id}
                            </h3>
                            <button onClick={() => setShowRefundModal(false)} className="text-rose-400 hover:text-rose-600 transition-colors">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleRefundSubmit}>
                            <div className="p-6">
                                {refundForm.errors.drawer_validation && (
                                    <div className="bg-rose-50 text-rose-800 p-4 rounded-xl text-sm mb-6 border border-rose-100 flex items-start gap-2">
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
                                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm mb-6 border border-amber-100">
                                    <strong>Refund Amount:</strong> {Number(selectedRefundSale.final_amount).toLocaleString()} UGX<br/><br/>
                                    This will mark receipt <strong>#{selectedRefundSale.id}</strong> as Refunded and adjust Net Revenue metrics accordingly.
                                </div>

                                <div className="space-y-4">
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
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                                <Button variant="danger" type="button" onClick={() => setShowRefundModal(false)}>Cancel</Button>
                                <Button variant="danger" type="submit" isLoading={refundForm.processing}>
                                    Confirm Refund
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
