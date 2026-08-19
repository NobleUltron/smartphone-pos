import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import { 
    Clock, CheckCircle2, FileText, Smartphone, DollarSign, 
    Calendar, X, CreditCard, User, Phone, Package, ArrowRight,
    Sparkles, ShieldCheck, History, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LayawaysIndex({ auth, layaways, summary }) {
    const [selectedSale, setSelectedSale] = useState(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        amount_paid: '',
        payment_method: 'Cash',
    });

    const submitPayment = (e) => {
        e.preventDefault();
        post(route('layaways.payments.store', selectedSale.id), {
            onSuccess: () => {
                toast.success('Payment recorded successfully!');
                reset();
                setSelectedSale(null);
            },
            onError: (err) => {
                toast.error(err.error || 'Failed to record payment');
            }
        });
    };

    const getPaidAmount = (sale) => {
        return sale.layaway_payments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
    };

    const getBalance = (sale) => {
        return Number(sale.final_amount) - getPaidAmount(sale);
    };

    const selectedBalance = selectedSale ? getBalance(selectedSale) : 0;
    const selectedPaid = selectedSale ? getPaidAmount(selectedSale) : 0;
    const paymentNumber = Number(data.amount_paid) || 0;
    const newBalanceAfterPayment = Math.max(0, selectedBalance - paymentNumber);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Layaways & Installments" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                
                {/* Header */}
                <PageHeader 
                    title="Layaways & Installments"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
                        { label: 'Sales Receipts', href: route('receipts.index') },
                        { label: 'Layaways' }
                    ]}
                />

                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Layaways</p>
                                    <h3 className="text-3xl font-black text-slate-900">{summary.active_layaways || 0}</h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Badge variant="warning">In Progress</Badge>
                                <span>Sales</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Value</p>
                                    <h3 className="text-3xl font-black text-slate-900">
                                        {new Intl.NumberFormat('en-US').format(summary.total_value || 0)}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Badge variant="primary">Locked</Badge>
                                <span>Revenue</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Collected</p>
                                    <h3 className="text-3xl font-black text-slate-900">
                                        {new Intl.NumberFormat('en-US').format(summary.total_collected || 0)}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Wallet size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Badge variant="success">Paid</Badge>
                                <span>Cash</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Outstanding</p>
                                    <h3 className="text-3xl font-black text-slate-900">
                                        {new Intl.NumberFormat('en-US').format(summary.outstanding_balance || 0)}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <CreditCard size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Badge variant="danger">Balance</Badge>
                                <span>Remaining</span>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Layaways Table Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold">
                                <Clock size={18} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Active Customer Layaways</h3>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                            {layaways.length} Active Records
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-3.5">Invoice & Date</th>
                                    <th className="px-6 py-3.5">Customer Contact</th>
                                    <th className="px-6 py-3.5 text-right">Total Sale</th>
                                    <th className="px-6 py-3.5 text-right">Amount Paid</th>
                                    <th className="px-6 py-3.5 text-right">Balance Remaining</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {layaways.map(sale => {
                                    const paid = getPaidAmount(sale);
                                    const balance = getBalance(sale);
                                    return (
                                        <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-slate-900 font-mono text-sm">
                                                    INV-{sale.id.toString().padStart(5, '0')}
                                                </div>
                                                <div className="text-slate-500 text-xs flex items-center gap-1.5 mt-0.5 font-medium">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    {new Date(sale.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    <User size={14} className="text-slate-400" />
                                                    {sale.customer?.name || 'Walk-in Customer'}
                                                </div>
                                                {sale.customer?.phone && (
                                                    <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5 pl-5 font-mono">
                                                        {sale.customer.phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    UGX {Number(sale.final_amount).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-emerald-600 text-sm">
                                                    UGX {paid.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                                    UGX {balance.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedSale(sale)}
                                                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto shadow-sm transition-all"
                                                >
                                                    <CreditCard size={14} />
                                                    Manage Payments
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {layaways.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="font-bold text-slate-700 text-base">No active layaways found</p>
                                            <p className="text-xs text-slate-400 mt-1">All customer layaways and installments have been settled.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Manage Payments Modal */}
            <Modal show={selectedSale !== null} onClose={() => setSelectedSale(null)} maxWidth="5xl">
                {selectedSale && (
                    <div className="flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                        
                        {/* Fixed Dark Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                                            INV-{selectedSale.id.toString().padStart(5, '0')}
                                        </h2>
                                        <Badge variant={selectedBalance === 0 ? 'success' : 'warning'}>
                                            {selectedBalance === 0 ? 'FULLY PAID' : 'PARTIAL LAYAWAY'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Customer: <span className="text-white font-bold">{selectedSale.customer?.name || 'Walk-in'}</span>
                                        {selectedSale.customer?.phone && ` (${selectedSale.customer.phone})`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a 
                                    href={route('pos.receipt', selectedSale.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                                >
                                    <FileText size={14} /> Print Receipt
                                </a>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedSale(null)}
                                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Split View */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto">
                            
                            {/* Left Column: Layaway Summary & Payment History */}
                            <div className="w-full md:w-1/2 p-6 bg-slate-50/70 dark:bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 space-y-6 overflow-y-auto">
                                
                                {/* Financial KPI Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Sale</p>
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                                            UGX {Number(selectedSale.final_amount).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Paid</p>
                                        <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                                            UGX {selectedPaid.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
                                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Balance Due</p>
                                        <p className="text-sm font-extrabold text-amber-800 dark:text-amber-300 mt-1">
                                            UGX {selectedBalance.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Layaway Itemized Products */}
                                {selectedSale.sale_items?.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Purchased Items</h4>
                                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                                            {selectedSale.sale_items.map((item, idx) => {
                                                const brandName = item.product?.brand?.name || item.device_imei?.product?.brand?.name || '';
                                                const rawName = item.product?.name || item.product?.model_name || item.device_imei?.product?.name || item.device_imei?.product?.model_name || `Item #${item.id}`;
                                                const itemName = brandName && !rawName.startsWith(brandName) ? `${brandName} ${rawName}` : rawName;
                                                const itemPrice = Number(item.price ?? item.unit_price ?? 0);
                                                
                                                return (
                                                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                            <Package size={16} className="text-slate-400 shrink-0" />
                                                            <div className="truncate">
                                                                <p className="font-bold text-slate-900 dark:text-white truncate">{itemName}</p>
                                                                {item.device_imei?.imei && (
                                                                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">IMEI: {item.device_imei.imei}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                                                            UGX {itemPrice.toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Payment History Timeline */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                        <span>Payment History Log</span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{selectedSale.layaway_payments?.length || 0} Payments</span>
                                    </h4>

                                    {selectedSale.layaway_payments?.length > 0 ? (
                                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                            {selectedSale.layaway_payments.map((payment) => (
                                                <div key={payment.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">
                                                            <DollarSign size={14} />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-900 dark:text-white">{payment.payment_method}</span>
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                                                {new Date(payment.payment_date).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                                        +UGX {Number(payment.amount_paid).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                            No installment payments recorded yet.
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Right Column: Record New Installment Form */}
                            <div className="w-full md:w-1/2 p-6 space-y-6 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col justify-between">
                                
                                <form onSubmit={submitPayment} className="space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <CreditCard className="text-emerald-500 dark:text-emerald-400" size={18} />
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Record New Installment</h3>
                                    </div>

                                    {/* Amount Paid Field */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Amount Paid (UGX) *</label>
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Max: UGX {selectedBalance.toLocaleString()}</span>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">UGX</span>
                                            <input 
                                                type="number" 
                                                className="w-full pl-12 pr-3.5 py-3 text-base font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm"
                                                placeholder="Enter amount"
                                                value={data.amount_paid}
                                                onChange={e => setData('amount_paid', e.target.value)}
                                                required
                                                min="1"
                                                max={selectedBalance}
                                            />
                                        </div>
                                        {errors.amount_paid && <p className="text-xs text-red-500 dark:text-red-400">{errors.amount_paid}</p>}

                                        {/* Quick Amount Presets */}
                                        {selectedBalance > 0 && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setData('amount_paid', String(Math.round(selectedBalance / 2)))}
                                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                                                >
                                                    Pay 50% (UGX {Math.round(selectedBalance / 2).toLocaleString()})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setData('amount_paid', String(selectedBalance))}
                                                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-800 transition-colors"
                                                >
                                                    Pay Full Balance
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Method Select */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Payment Method *</label>
                                        <select 
                                            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold shadow-sm"
                                            value={data.payment_method}
                                            onChange={e => setData('payment_method', e.target.value)}
                                            required
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="MTN MoMo">MTN Mobile Money</option>
                                            <option value="Airtel Money">Airtel Money</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>

                                    {/* Live Balance Preview Banner */}
                                    <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs font-medium">
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Current Balance:</span>
                                            <span className="font-bold text-slate-900 dark:text-white">UGX {selectedBalance.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                                            <span>Installment Payment:</span>
                                            <span>-UGX {paymentNumber.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white">
                                            <span>Remaining Balance After Payment:</span>
                                            <span className={newBalanceAfterPayment === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                                                {newBalanceAfterPayment === 0 ? 'Paid in Full ✓' : `UGX ${newBalanceAfterPayment.toLocaleString()}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <Button type="button" variant="secondary" onClick={() => setSelectedSale(null)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" variant="primary" disabled={processing} className="flex items-center gap-2">
                                            <CreditCard size={16} />
                                            {processing ? 'Processing...' : 'Record Payment'}
                                        </Button>
                                    </div>
                                </form>

                            </div>

                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
