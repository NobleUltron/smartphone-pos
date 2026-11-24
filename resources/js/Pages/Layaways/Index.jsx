import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import {
    Clock, CheckCircle2, FileText, DollarSign,
    Calendar, X, CreditCard, User, Package,
    Wallet, Search, AlertTriangle, Wrench, MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { buildLayawayReminderMessage, openWhatsApp } from '@/Utils/whatsapp';

export default function LayawaysIndex({ auth, layaways, summary, filters = {}, hasActiveDrawer = true }) {
    const { store_settings: storeSettings } = usePage().props;
    const [selectedSale, setSelectedSale] = useState(null);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'active');
    const isInitialRender = useRef(true);

    const rows = Array.isArray(layaways) ? layaways : (layaways?.data || []);
    const paginationLinks = !Array.isArray(layaways) ? (layaways?.links || []) : [];
    const totalRecords = !Array.isArray(layaways) ? (layaways?.total ?? rows.length) : rows.length;

    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        amount_paid: '',
        payment_method: 'Cash',
    });

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            router.get(route('layaways.index'), {
                status: statusFilter,
                search: searchQuery || undefined,
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter]);

    const openSaleModal = (sale) => {
        reset();
        clearErrors();
        setSelectedSale(sale);
    };

    const closeSaleModal = () => {
        setSelectedSale(null);
        reset();
        clearErrors();
    };

    const submitPayment = (e) => {
        e.preventDefault();
        if (!selectedSale) return;
        post(route('layaways.payments.store', selectedSale.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Payment recorded successfully!');
                closeSaleModal();
            },
            onError: (err) => {
                toast.error(err.error || err.amount_paid || err.payment_method || 'Failed to record payment');
            }
        });
    };

    const getPaidAmount = (sale) => {
        return sale.layaway_payments?.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0) || 0;
    };

    const getBalance = (sale) => {
        return Math.max(0, Number(sale.final_amount || 0) - getPaidAmount(sale));
    };

    const getProgressPercent = (sale) => {
        const total = Number(sale.final_amount || 0);
        if (total <= 0) return 100;
        return Math.min(100, Math.round((getPaidAmount(sale) / total) * 100));
    };

    const selectedBalance = selectedSale ? getBalance(selectedSale) : 0;
    const selectedPaid = selectedSale ? getPaidAmount(selectedSale) : 0;
    const isSelectedSettled = selectedSale ? (selectedSale.payment_status === 'Paid' || selectedBalance <= 0) : false;
    const paymentNumber = Number(data.amount_paid) || 0;
    const newBalanceAfterPayment = Math.max(0, selectedBalance - paymentNumber);
    const cashShiftBlocked = data.payment_method === 'Cash' && !hasActiveDrawer;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Layaways & Installments" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="Layaways & Installments"
                    breadcrumbs={[
                        { label: 'Home', href: '/' },
                        { label: 'Sales Receipts', href: route('receipts.index') },
                        { label: 'Layaways' }
                    ]}
                />

                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <Card
                            className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all"
                            style={{ animationDelay: '0.0s' }}
                            onClick={() => setStatusFilter('active')}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Active Layaways</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.active_layaways || 0}</h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="warning">In Progress</Badge>
                                <span>{summary.completed_layaways || 0} Completed</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.08s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Value</p>
                                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('en-US').format(summary.total_value || 0)}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="primary">Active</Badge>
                                <span>UGX Portfolio</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.16s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Collected</p>
                                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('en-US').format(summary.total_collected || 0)}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Wallet size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="success">Paid</Badge>
                                <span>Installments</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.24s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Outstanding</p>
                                    <h3 className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                                        {new Intl.NumberFormat('en-US').format(summary.outstanding_balance || 0)}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                    <CreditCard size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="danger">Balance</Badge>
                                <span>Remaining</span>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Layaways Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                                <Clock size={18} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Layaways</h3>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full shadow-sm">
                                {totalRecords} Record{totalRecords === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Status Tabs */}
                            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                                {[
                                    { key: 'active', label: `Active (${summary?.active_layaways || 0})` },
                                    { key: 'completed', label: `Completed (${summary?.completed_layaways || 0})` },
                                    { key: 'all', label: 'All' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            statusFilter === tab.key
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Search Input */}
                            <div className="relative min-w-[220px]">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search invoice, customer, IMEI..."
                                    className="saas-input !pl-9 !py-1.5 !text-xs w-full"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-3.5">Invoice & Date</th>
                                    <th className="px-6 py-3.5">Customer Contact</th>
                                    <th className="px-6 py-3.5 text-right">Total Sale</th>
                                    <th className="px-6 py-3.5 text-right">Paid & Progress</th>
                                    <th className="px-6 py-3.5 text-right">Balance</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rows.map(sale => {
                                    const paid = getPaidAmount(sale);
                                    const balance = getBalance(sale);
                                    const pct = getProgressPercent(sale);
                                    const isPaid = sale.payment_status === 'Paid' || balance <= 0;
                                    return (
                                        <tr key={sale.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                                                        INV-{sale.id.toString().padStart(5, '0')}
                                                    </span>
                                                    {sale.repair_id && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                                            <Wrench size={10} /> Repair
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-0.5 font-medium">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    {new Date(sale.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <User size={14} className="text-slate-400" />
                                                    {sale.customer?.name || 'Walk-in Customer'}
                                                </div>
                                                {sale.customer?.phone && (
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 mt-0.5 pl-5 font-mono">
                                                        {sale.customer.phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                    UGX {Number(sale.final_amount).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                        UGX {paid.toLocaleString()}
                                                    </span>
                                                    <div className="flex items-center gap-2 w-28">
                                                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-7 text-right">{pct}%</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isPaid ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        <CheckCircle2 size={13} /> Paid in Full
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                        UGX {balance.toLocaleString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!isPaid && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openWhatsApp(sale.customer?.phone || '', buildLayawayReminderMessage(sale, storeSettings))}
                                                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                                            title="Send WhatsApp balance reminder"
                                                        >
                                                            <MessageCircle size={14} />
                                                            Remind
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openSaleModal(sale)}
                                                        className="px-3.5 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                                    >
                                                        <CreditCard size={14} />
                                                        {isPaid ? 'View History' : 'Manage Payments'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                            <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="font-bold text-slate-700 dark:text-slate-300 text-base">
                                                {searchQuery ? 'No matching layaways found' : 'No layaways found'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {searchQuery
                                                    ? 'Try clearing your search or switching tabs.'
                                                    : statusFilter === 'active'
                                                        ? 'All customer layaways and installments have been settled.'
                                                        : 'No records available in this view.'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.map(sale => {
                            const paid = getPaidAmount(sale);
                            const balance = getBalance(sale);
                            const pct = getProgressPercent(sale);
                            const isPaid = sale.payment_status === 'Paid' || balance <= 0;
                            return (
                                <div key={sale.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold font-mono text-sm text-slate-900 dark:text-white">
                                                    INV-{sale.id.toString().padStart(5, '0')}
                                                </span>
                                                {sale.repair_id && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                                        <Wrench size={10} /> Repair
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                                {sale.customer?.name || 'Walk-in Customer'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                {sale.customer?.phone || new Date(sale.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {isPaid ? (
                                            <span className="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                Paid
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                Due: UGX {balance.toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Paid: UGX {paid.toLocaleString()}</span>
                                            <span className="text-slate-500 dark:text-slate-400 font-semibold">Total: UGX {Number(sale.final_amount).toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => openSaleModal(sale)}
                                        className="w-full py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                                    >
                                        <CreditCard size={14} />
                                        {isPaid ? 'View Payment History' : 'Manage Payments'}
                                    </button>
                                </div>
                            );
                        })}

                        {rows.length === 0 && (
                            <div className="p-10 text-center text-slate-400">
                                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No layaways found</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {paginationLinks.length > 3 && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/30">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Showing <strong className="text-slate-700 dark:text-slate-200">{layaways.from || 0}</strong>–<strong className="text-slate-700 dark:text-slate-200">{layaways.to || 0}</strong> of <strong className="text-slate-700 dark:text-slate-200">{layaways.total || 0}</strong>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {paginationLinks.map((link, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url, { preserveScroll: true, preserveState: true })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                            link.active
                                                ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                                                : link.url
                                                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Manage Payments Modal */}
            <Modal show={selectedSale !== null} onClose={closeSaleModal} maxWidth="5xl">
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
                                        <Badge variant={isSelectedSettled ? 'success' : 'warning'}>
                                            {isSelectedSettled ? 'FULLY PAID' : 'PARTIAL LAYAWAY'}
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
                                    onClick={closeSaleModal}
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
                                                const qty = Number(item.quantity || 1);
                                                const unitPrice = Number(item.price ?? item.unit_price ?? 0);
                                                const lineTotal = unitPrice * qty;

                                                return (
                                                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                            <Package size={16} className="text-slate-400 shrink-0" />
                                                            <div className="truncate">
                                                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                                                    {itemName}
                                                                    {qty > 1 && (
                                                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                                                            ×{qty}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                {item.device_imei?.imei && (
                                                                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">IMEI: {item.device_imei.imei}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                                                            UGX {lineTotal.toLocaleString()}
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

                            {/* Right Column: Record New Installment Form OR Paid-in-Full Summary */}
                            <div className="w-full md:w-1/2 p-6 space-y-6 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col justify-between">
                                {isSelectedSettled ? (
                                    <div className="my-auto py-8 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                            <CheckCircle2 size={36} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Layaway Paid in Full</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                All installments for this sale have been collected and settled.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center gap-3 pt-2">
                                            <a
                                                href={route('pos.receipt', selectedSale.id)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
                                            >
                                                <FileText size={15} /> Print Final Receipt
                                            </a>
                                            <Button type="button" variant="secondary" onClick={closeSaleModal}>
                                                Close
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={submitPayment} className="space-y-5">
                                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                            <CreditCard className="text-emerald-500 dark:text-emerald-400" size={18} />
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record New Installment</h3>
                                        </div>

                                        {cashShiftBlocked && (
                                            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                                                <div className="space-y-1">
                                                    <p className="font-bold">Cash drawer shift is closed.</p>
                                                    <p>
                                                        Open your shift before collecting Cash, or choose MoMo / Bank Transfer.{' '}
                                                        <Link href={route('cash-drawer.index')} className="underline font-bold">Open Shift →</Link>
                                                    </p>
                                                </div>
                                            </div>
                                        )}

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
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
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
                                            <Button type="button" variant="secondary" onClick={closeSaleModal}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" variant="primary" disabled={processing || cashShiftBlocked} className="flex items-center gap-2">
                                                <CreditCard size={16} />
                                                {processing ? 'Processing...' : 'Record Payment'}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
