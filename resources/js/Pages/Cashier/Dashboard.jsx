import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ShoppingCart, Receipt, ShieldCheck, DollarSign, CreditCard, Smartphone, CheckCircle2, Clock, Eye, Printer, User, ArrowRight, Wallet, LayoutDashboard, BarChart3, Sparkles, Wrench, UserPlus, Store } from 'lucide-react';
import Barcode from 'react-barcode';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import PageHeader from '@/Components/SaaS/PageHeader';
import Button from '@/Components/SaaS/Button';

export default function CashierDashboard({ auth, cashier, metrics = {}, recentSales = [], settings = {} }) {
    const [selectedSale, setSelectedSale] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showShiftReportModal, setShowShiftReportModal] = useState(false);

    const openPreview = (sale) => {
        setSelectedSale(sale);
        setShowPreviewModal(true);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Cashier Portal" />
            
            {/* Welcome Header */}
            <div className="mb-8 p-6 lg:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden animate-slide-up border border-slate-700/50">
                {/* Background Glow Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-32 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mb-16 pointer-events-none"></div>
                
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none text-indigo-300">
                    <Sparkles size={160} strokeWidth={1} />
                </div>
                
                <div className="flex items-center gap-5 z-10">
                    <div className="relative">
                        <img 
                            src={auth.user?.profile_photo_url} 
                            alt={auth.user?.name} 
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border-2 border-white/20 shadow-xl object-cover ring-4 ring-indigo-500/30"
                        />
                        <div className="absolute bottom-0 right-0 bg-emerald-500 w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 border-slate-900 shadow-sm flex items-center justify-center">
                            <span className="absolute w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl lg:text-3xl tracking-tight mb-1.5">
                            <span className="text-slate-400 font-medium">Welcome back,</span> <span className="font-black text-white">{cashier?.name || 'Cashier'}</span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md shadow-sm flex items-center gap-1.5">
                                <User size={12} /> {cashier?.role || 'Cashier'}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Active Shift
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 z-10 mt-4 md:mt-0">
                    <button 
                        onClick={() => setShowShiftReportModal(true)} 
                        className="w-full sm:w-auto px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    >
                        <Printer size={18} />
                        <span>Print Summary</span>
                    </button>
                    <Link 
                        href="/pos" 
                        className="group w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 focus:ring-2 focus:ring-white/50 outline-none"
                    >
                        <ShoppingCart size={18} className="transition-transform group-hover:scale-110" /> 
                        <span>Launch POS</span> 
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>

            {/* Personal Till KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Today's Total Sales</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.today_sales_total || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
                            <ShoppingCart size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="primary" className="!rounded-md">{metrics?.today_sales_count || 0}</Badge>
                        <span>Checkouts Completed</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cash in Till / Drawer</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.cash_collected || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">Physical Cash Collected</p>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Money</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.momo_collected || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Smartphone size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">MoMo / Airtel Transfers</p>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.4s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bank / Card</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.other_collected || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <CreditCard size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.5s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Repairs</p>
                            <h3 className="text-3xl font-black text-slate-900">{metrics?.active_repairs_count || 0} <span className="text-lg text-slate-500 font-normal">Tickets</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <Wrench size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">Store Pending / In Progress</p>
                </Card>
            </div>

            {/* Quick Action Launcher Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                <Link href="/pos" className="block text-left">
                    <Card className="h-full hover:shadow-lg transition-shadow border border-transparent hover:border-slate-200 cursor-pointer flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <ShoppingCart size={28} />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">New POS Checkout</h4>
                        <p className="text-sm text-slate-500 hidden sm:block">Scan device IMEIs and complete customer checkout.</p>
                    </Card>
                </Link>
                <Link href="/receipts" className="block text-left">
                    <Card className="h-full hover:shadow-lg transition-shadow border border-transparent hover:border-slate-200 cursor-pointer flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <Receipt size={28} />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">My Issued Receipts</h4>
                        <p className="text-sm text-slate-500 hidden sm:block">View sales history, re-print thermal receipts or process refunds.</p>
                    </Card>
                </Link>
                <Link href="/repairs" className="block text-left">
                    <Card className="h-full hover:shadow-lg transition-shadow border border-transparent hover:border-slate-200 cursor-pointer flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
                            <Wrench size={28} />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">New Repair Ticket</h4>
                        <p className="text-sm text-slate-500 hidden sm:block">Intake a customer device and log repair issues.</p>
                    </Card>
                </Link>
                <Link href="/layaways" className="block text-left">
                    <Card className="h-full hover:shadow-lg transition-shadow border border-transparent hover:border-slate-200 cursor-pointer flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <Clock size={28} />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Start Layaway</h4>
                        <p className="text-sm text-slate-500 hidden sm:block">Create partial payment installment plans.</p>
                    </Card>
                </Link>
                <Link href="/customers" className="block text-left">
                    <Card className="h-full hover:shadow-lg transition-shadow border border-transparent hover:border-slate-200 cursor-pointer flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
                            <UserPlus size={28} />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Manage Customers</h4>
                        <p className="text-sm text-slate-500 hidden sm:block">Register new clients or view purchase history.</p>
                    </Card>
                </Link>
                <Link href="/warranties" className="block text-left">
                    <Card className="h-full hover:shadow-lg transition-shadow border border-transparent hover:border-slate-200 cursor-pointer flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck size={28} />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Warranty & Returns</h4>
                        <p className="text-sm text-slate-500 hidden sm:block">Lookup warranty status, log repairs, swaps, or returns.</p>
                    </Card>
                </Link>
            </div>

            {/* Today's Cashier Sales Table */}
            <div className="animate-slide-up" style={{ animationDelay: '0.6s' }}>
                <Card noPadding className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                <Clock size={20} />
                            </div>
                            Today's Completed Checkouts
                        </h3>
                        <Link href="/receipts" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            View All <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="saas-table w-full whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th>Receipt #</th>
                                    <th>Time</th>
                                    <th>Customer</th>
                                    <th>Devices Sold</th>
                                    <th>Payment</th>
                                    <th className="text-right">Amount</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales?.length > 0 ? recentSales.map(sale => (
                                    <tr key={sale.id}>
                                        <td className="font-bold font-mono text-slate-900">#{sale.id}</td>
                                        <td>
                                            <Badge variant="neutral">
                                                {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Badge>
                                        </td>
                                        <td>
                                            {sale.customer ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                        {sale.customer.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{sale.customer.name}</div>
                                                        <div className="text-xs text-slate-500">{sale.customer.phone}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="text-slate-500 font-medium">Walk-in Customer</span>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="space-y-1">
                                                {sale.repair ? (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Wrench size={14} className="text-slate-400" />
                                                        <span className="font-medium text-slate-700 max-w-[200px] truncate">
                                                            Repair: {sale.repair.device_model}
                                                        </span>
                                                    </div>
                                                ) : sale.sale_items?.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm">
                                                        <Smartphone size={14} className="text-slate-400" />
                                                        <span className="font-medium text-slate-700 max-w-[200px] truncate">
                                                            {item.device_imei?.product ? (
                                                                `${item.device_imei.product.brand?.name || item.device_imei.product.brand} ${item.device_imei.product.model_name}`
                                                            ) : item.product ? (
                                                                `${item.quantity}x ${item.product.brand?.name || item.product.brand} ${item.product.model_name}`
                                                            ) : 'Unknown'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge variant={sale.payment_method === 'Cash' ? 'success' : sale.payment_method.includes('Mobile') ? 'warning' : 'info'}>
                                                {sale.payment_method}
                                            </Badge>
                                        </td>
                                        <td className="text-right font-black text-slate-900">
                                            {Number(sale.final_amount).toLocaleString()} <span className="text-xs text-slate-500 font-normal">UGX</span>
                                        </td>
                                        <td className="text-center">
                                            {sale.payment_status === 'Refunded' ? (
                                                <Badge variant="danger">Refunded</Badge>
                                            ) : sale.payment_status === 'Partial' ? (
                                                <Badge variant="warning">Partial</Badge>
                                            ) : (
                                                <Badge variant="success">Paid</Badge>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
                                                    title="Quick Receipt Preview"
                                                    onClick={() => openPreview(sale)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <a 
                                                    href={`/pos/receipt/${sale.id}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors"
                                                    title="Thermal Print Receipt"
                                                >
                                                    <Printer size={16} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <ShoppingCart size={48} className="mb-4 opacity-20" />
                                                <h6 className="font-bold text-slate-600 mb-1">No checkouts completed yet today</h6>
                                                <p className="text-sm mb-4">Click "Launch POS Checkout" to start selling.</p>
                                                <Link href="/pos" className="btn btn-primary px-6 py-2 rounded-xl">
                                                    Launch POS
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Quick Receipt Preview Modal */}
            {showPreviewModal && selectedSale && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
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
                                        <span style={{ color: '#0F172A' }}>{selectedSale.user?.name || cashier?.name || 'System'}</span>
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
                                className="saas-btn saas-btn-primary flex items-center gap-2"
                            >
                                <Printer size={16} />
                                Print
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Summary Report Modal */}
            {showShiftReportModal && (
                <>
                    <style>
                        {`
                            @media print {
                                body * { visibility: hidden; }
                                .thermal-report, .thermal-report * { visibility: visible; }
                                .thermal-report {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100%;
                                    max-width: 300px;
                                    margin: 0;
                                    padding: 0;
                                    font-family: 'Courier New', Courier, monospace;
                                    color: #000 !important;
                                    background: #fff !important;
                                    font-size: 12px;
                                }
                                .ui-modal-print { display: none !important; }
                            }
                        `}
                    </style>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in ui-modal-print">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Printer size={20} className="text-slate-400" /> Shift Till Summary Report
                                </h3>
                                <button onClick={() => setShowShiftReportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    &times;
                                </button>
                            </div>
                            <div className="p-8 overflow-y-auto bg-slate-50">
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center mb-6">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Sparkles size={28} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900 mb-1">SmartPOS Kampala</h4>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Cash Till Shift Report</p>
                                    <Badge variant="success" className="mx-auto">
                                        Active Shift • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Badge>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Cashier on Duty</p>
                                            <h6 className="font-bold text-slate-900">{cashier?.name}</h6>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 mb-0.5">Checkouts</p>
                                        <h6 className="font-bold text-slate-900 text-xl">{metrics?.today_sales_count || 0}</h6>
                                    </div>
                                </div>

                                <h6 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2">Revenue Breakdown</h6>
                                
                                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm mb-6">
                                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center">
                                                <DollarSign size={16} />
                                            </div>
                                            <span className="font-semibold text-slate-700">Physical Cash</span>
                                        </div>
                                        <span className="font-black text-slate-900">{Number(metrics?.cash_collected || 0).toLocaleString()} UGX</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded flex items-center justify-center">
                                                <Smartphone size={16} />
                                            </div>
                                            <span className="font-semibold text-slate-700">Mobile Money</span>
                                        </div>
                                        <span className="font-black text-slate-900">{Number(metrics?.momo_collected || 0).toLocaleString()} UGX</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                                                <CreditCard size={16} />
                                            </div>
                                            <span className="font-semibold text-slate-700">Bank / Card</span>
                                        </div>
                                        <span className="font-black text-slate-900">{Number(metrics?.other_collected || 0).toLocaleString()} UGX</span>
                                    </div>
                                    <div className="flex justify-between items-center p-5 bg-indigo-50/50">
                                        <span className="font-bold text-indigo-900">Gross Shift Sales</span>
                                        <span className="font-black text-indigo-700 text-xl">{Number(metrics?.today_sales_total || 0).toLocaleString()} UGX</span>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl flex gap-3">
                                    <ShieldCheck size={24} className="text-amber-500 shrink-0" />
                                    <p className="text-amber-900 text-sm mb-0">
                                        Please reconcile your physical cash drawer with the <strong className="font-bold">Physical Cash</strong> total above before closing your shift.
                                    </p>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                                <Button variant="secondary" onClick={() => setShowShiftReportModal(false)}>Close</Button>
                                <Button variant="primary" onClick={() => window.print()} icon={Printer}>
                                    Print Report
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Thermal Report (Hidden in UI, Visible in Print) */}
                    <div className="hidden thermal-report p-4 print:block">
                        <div className="text-center mb-4">
                            <h2 className="text-lg font-bold uppercase mb-1">SmartPOS Kampala</h2>
                            <p className="mb-2">CASH TILL SHIFT REPORT</p>
                            <p className="border-b border-dashed border-black pb-2 mb-2">
                                Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                            </p>
                        </div>
                        
                        <div className="mb-4">
                            <div className="flex justify-between mb-1">
                                <span>Cashier:</span>
                                <span className="font-bold">{cashier?.name}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Checkouts:</span>
                                <span className="font-bold">{metrics?.today_sales_count || 0}</span>
                            </div>
                        </div>
                        
                        <div className="border-t border-b border-dashed border-black py-2 mb-4">
                            <h3 className="font-bold text-center mb-2">REVENUE BREAKDOWN</h3>
                            <div className="flex justify-between mb-1">
                                <span>Physical Cash:</span>
                                <span>{Number(metrics?.cash_collected || 0).toLocaleString()} UGX</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Mobile Money:</span>
                                <span>{Number(metrics?.momo_collected || 0).toLocaleString()} UGX</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Bank / Card:</span>
                                <span>{Number(metrics?.other_collected || 0).toLocaleString()} UGX</span>
                            </div>
                            <div className="flex justify-between mt-2 pt-2 border-t border-black font-bold text-sm">
                                <span>GROSS SALES:</span>
                                <span>{Number(metrics?.today_sales_total || 0).toLocaleString()} UGX</span>
                            </div>
                        </div>
                        
                        <div className="mt-10 pt-4 border-t border-solid border-black text-center">
                            <p className="mb-6">Cashier Signature</p>
                            <p>*** End of Report ***</p>
                        </div>
                    </div>
                </>
            )}
        </AuthenticatedLayout>
    );
}
