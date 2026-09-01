import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { 
    Landmark, 
    Wallet, 
    Smartphone, 
    Building2, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ArrowRightLeft, 
    Plus, 
    Search, 
    FileText, 
    Scale, 
    CheckCircle2, 
    AlertCircle, 
    Filter, 
    ChevronRight,
    TrendingUp,
    Clock,
    DollarSign,
    RefreshCw
} from 'lucide-react';
import dayjs from 'dayjs';

export default function AccountsIndex({ accounts, metrics, transactions, filters }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [selectedAccountForAudit, setSelectedAccountForAudit] = useState(null);

    // Filters state
    const [search, setSearch] = useState(filters.search || '');
    const [selectedAccountId, setSelectedAccountId] = useState(filters.account_id || 'all');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // Form: Create Account
    const createForm = useForm({
        name: '',
        type: 'mobile_money',
        provider: 'MTN',
        account_number: '',
        opening_balance: '',
        description: '',
    });

    // Form: Transfer
    const transferForm = useForm({
        from_account_id: accounts[0]?.id || '',
        to_account_id: accounts[1]?.id || '',
        amount: '',
        notes: '',
    });

    // Form: Reconcile / Audit
    const reconcileForm = useForm({
        actual_balance: '',
        reason: '',
    });

    const handleFilter = (newFilters = {}) => {
        router.get(route('accounts.index'), {
            search,
            account_id: selectedAccountId,
            type: selectedType,
            category: selectedCategory,
            date_from: dateFrom,
            date_to: dateTo,
            ...newFilters
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleCreateAccount = (e) => {
        e.preventDefault();
        createForm.post(route('accounts.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            }
        });
    };

    const handleTransfer = (e) => {
        e.preventDefault();
        transferForm.post(route('accounts.transfer'), {
            onSuccess: () => {
                setShowTransferModal(false);
                transferForm.reset();
            }
        });
    };

    const openReconcile = (account) => {
        setSelectedAccountForAudit(account);
        reconcileForm.setData({
            actual_balance: account.current_balance,
            reason: '',
        });
        setShowReconcileModal(true);
    };

    const handleReconcile = (e) => {
        e.preventDefault();
        if (!selectedAccountForAudit) return;
        reconcileForm.post(route('accounts.reconcile', selectedAccountForAudit.id), {
            onSuccess: () => {
                setShowReconcileModal(false);
                reconcileForm.reset();
                setSelectedAccountForAudit(null);
            }
        });
    };

    const getAccountIcon = (type, provider) => {
        if (type === 'cash') return <Wallet className="text-emerald-500" size={24} />;
        if (type === 'mobile_money') {
            if ((provider || '').toLowerCase().includes('mtn')) return <Smartphone className="text-amber-500" size={24} />;
            return <Smartphone className="text-rose-500" size={24} />;
        }
        if (type === 'bank') return <Building2 className="text-indigo-500" size={24} />;
        return <Landmark className="text-purple-500" size={24} />;
    };

    const getAccountBadgeColor = (type, provider) => {
        if (type === 'cash') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        if (type === 'mobile_money') {
            if ((provider || '').toLowerCase().includes('mtn')) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
        }
        if (type === 'bank') return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Money & Treasury Management" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
                                <Landmark size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Money & Treasury Management
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Track cash drawers, MTN/Airtel mobile money floats, bank deposits, and inter-account transfers.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                        >
                            <ArrowRightLeft size={16} /> Inter-Account Transfer
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-500/20"
                        >
                            <Plus size={16} /> Add Payment Account
                        </button>
                    </div>
                </div>

                {/* 4-Card Liquidity Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-lg shadow-indigo-900/20 relative overflow-hidden">
                        <div className="absolute right-3 top-3 opacity-10">
                            <Landmark size={80} />
                        </div>
                        <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp size={14} /> Total Liquid Capital
                        </div>
                        <div className="text-2xl font-black mt-2">
                            UGX {Number(metrics.totalLiquidity || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-indigo-200/80 mt-1">
                            Across {accounts.length} active business accounts
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Cash on Hand</span>
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                <Wallet size={18} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                            UGX {Number(metrics.cashOnHand || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Physical cash in drawer & register
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Mobile Money Float</span>
                            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                                <Smartphone size={18} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                            UGX {Number(metrics.mobileMoneyTotal || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            MTN MoMo & Airtel float SIMs
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Bank Deposits</span>
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                                <Building2 size={18} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                            UGX {Number(metrics.bankTotal || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                            Commercial bank accounts
                        </div>
                    </div>
                </div>

                {/* Account Cards Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Wallet className="text-indigo-600" size={20} /> Payment Wallets & Accounts
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Click any account to open its full passbook & statement
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {accounts.map(acc => (
                            <div 
                                key={acc.id}
                                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                            {getAccountIcon(acc.type, acc.provider)}
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${getAccountBadgeColor(acc.type, acc.provider)}`}>
                                            {acc.provider || acc.type}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={acc.name}>
                                        {acc.name}
                                    </h3>
                                    {acc.account_number && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                            {acc.account_number}
                                        </p>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Current Balance</div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                            UGX {Number(acc.current_balance || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            {acc.transactions_count || 0} recorded entries
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                    <Link
                                        href={route('accounts.show', acc.id)}
                                        className="flex-1 py-2 text-center bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-200/60 dark:border-slate-700"
                                    >
                                        <FileText size={13} /> Passbook
                                    </Link>
                                    <button
                                        onClick={() => openReconcile(acc)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors"
                                        title="Audit & Reconcile Balance"
                                    >
                                        <Scale size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Unified Treasury Activity Feed */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="text-indigo-600" size={20} /> Unified Treasury Activity Ledger
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Live stream of all incoming sales, deposits, dealer payouts, expenses, and transfers
                            </p>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search description or ref..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleFilter()}
                                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500"
                                />
                            </div>

                            <select
                                value={selectedAccountId}
                                onChange={e => {
                                    setSelectedAccountId(e.target.value);
                                    handleFilter({ account_id: e.target.value });
                                }}
                                className="text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 py-1.5"
                            >
                                <option value="all">All Accounts</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedType}
                                onChange={e => {
                                    setSelectedType(e.target.value);
                                    handleFilter({ type: e.target.value });
                                }}
                                className="text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 py-1.5"
                            >
                                <option value="all">All Types</option>
                                <option value="inflow">Inflows (+)</option>
                                <option value="outflow">Outflows (&minus;)</option>
                                <option value="transfer_in">Transfers In</option>
                                <option value="transfer_out">Transfers Out</option>
                                <option value="adjustment">Adjustments</option>
                            </select>

                            <button
                                onClick={() => handleFilter()}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-50/50 dark:bg-slate-800/30">
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Account</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Description / Reference</th>
                                    <th className="py-3 px-4 text-right">Inflow (+)</th>
                                    <th className="py-3 px-4 text-right">Outflow (&minus;)</th>
                                    <th className="py-3 px-4 text-right">Balance After</th>
                                    <th className="py-3 px-4">User</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {transactions.data.map(trx => {
                                    const isInflow = trx.type === 'inflow' || trx.type === 'transfer_in';
                                    return (
                                        <tr key={trx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                                                {dayjs(trx.transaction_date).format('DD MMM YYYY, hh:mm A')}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {trx.account?.name}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                    trx.type === 'inflow' 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : (trx.type === 'outflow' 
                                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' 
                                                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300')
                                                }`}>
                                                    {trx.category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900 dark:text-white">
                                                    {trx.description}
                                                </div>
                                                {trx.transaction_reference && (
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                        Ref: {trx.transaction_reference}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                {isInflow ? `+ UGX ${Number(trx.amount).toLocaleString()}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black whitespace-nowrap text-rose-600 dark:text-rose-400">
                                                {!isInflow ? `- UGX ${Number(trx.amount).toLocaleString()}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold whitespace-nowrap text-slate-900 dark:text-white">
                                                UGX {Number(trx.balance_after).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                                                {trx.user?.name || 'System'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {transactions.data.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-10 text-slate-400">
                                            No transactions found matching the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-xs text-slate-500">
                                Showing {transactions.from || 0} to {transactions.to || 0} of {transactions.total} transactions
                            </div>
                            <div className="flex items-center gap-1">
                                {transactions.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Payment Account Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <form onSubmit={handleCreateAccount} className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Plus className="text-indigo-600" size={20} /> Add New Payment Account
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <InputLabel value="Account Name" />
                            <TextInput
                                className="w-full text-xs"
                                placeholder="e.g. Stanbic Corporate Bank, MTN Merchant SIM 2"
                                value={createForm.data.name}
                                onChange={e => createForm.setData('name', e.target.value)}
                                required
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <InputLabel value="Account Type" />
                                <select
                                    className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    value={createForm.data.type}
                                    onChange={e => createForm.setData('type', e.target.value)}
                                >
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="bank">Bank Account</option>
                                    <option value="cash">Cash Register / Safe</option>
                                    <option value="other">Other Wallet</option>
                                </select>
                            </div>

                            <div>
                                <InputLabel value="Provider / Institution" />
                                <TextInput
                                    className="w-full text-xs"
                                    placeholder="e.g. MTN, Airtel, Stanbic, Centenary"
                                    value={createForm.data.provider}
                                    onChange={e => createForm.setData('provider', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <InputLabel value="Account Number / Phone / Till ID (Optional)" />
                            <TextInput
                                className="w-full text-xs font-mono"
                                placeholder="e.g. +256 788 123456 or 9040001234567"
                                value={createForm.data.account_number}
                                onChange={e => createForm.setData('account_number', e.target.value)}
                            />
                        </div>

                        <div>
                            <InputLabel value="Opening Float Balance (UGX)" />
                            <TextInput
                                type="number"
                                className="w-full text-xs font-bold"
                                placeholder="0"
                                value={createForm.data.opening_balance}
                                onChange={e => createForm.setData('opening_balance', e.target.value)}
                            />
                        </div>

                        <div>
                            <InputLabel value="Description / Notes (Optional)" />
                            <textarea
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                rows="2"
                                placeholder="Purpose of this account..."
                                value={createForm.data.description}
                                onChange={e => createForm.setData('description', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <SecondaryButton type="button" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={createForm.processing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Create Account
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Inter-Account Transfer Modal */}
            <Modal show={showTransferModal} onClose={() => setShowTransferModal(false)} maxWidth="md">
                <form onSubmit={handleTransfer} className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="text-indigo-600" size={20} /> Inter-Account Float Transfer
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <InputLabel value="From Source Account (Debit)" />
                            <select
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={transferForm.data.from_account_id}
                                onChange={e => transferForm.setData('from_account_id', e.target.value)}
                                required
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (Balance: UGX {Number(acc.current_balance).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                            <InputError message={transferForm.errors.from_account_id} />
                        </div>

                        <div>
                            <InputLabel value="To Destination Account (Credit)" />
                            <select
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={transferForm.data.to_account_id}
                                onChange={e => transferForm.setData('to_account_id', e.target.value)}
                                required
                            >
                                {accounts.filter(a => a.id != transferForm.data.from_account_id).map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (Balance: UGX {Number(acc.current_balance).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                            <InputError message={transferForm.errors.to_account_id} />
                        </div>

                        <div>
                            <InputLabel value="Transfer Amount (UGX)" />
                            <TextInput
                                type="number"
                                className="w-full text-sm font-black text-indigo-600 dark:text-indigo-400"
                                placeholder="0"
                                value={transferForm.data.amount}
                                onChange={e => transferForm.setData('amount', e.target.value)}
                                required
                                min="1"
                            />
                            <InputError message={transferForm.errors.amount} />
                        </div>

                        <div>
                            <InputLabel value="Transfer Reference / Notes (Optional)" />
                            <TextInput
                                className="w-full text-xs"
                                placeholder="e.g. Deposited cash float into MoMo SIM"
                                value={transferForm.data.notes}
                                onChange={e => transferForm.setData('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <SecondaryButton type="button" onClick={() => setShowTransferModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={transferForm.processing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Confirm Transfer
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Audit & Reconcile Modal */}
            <Modal show={showReconcileModal} onClose={() => setShowReconcileModal(false)} maxWidth="md">
                <form onSubmit={handleReconcile} className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Scale className="text-amber-500" size={20} /> Reconcile & Audit Balance
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Reconciling <strong className="text-slate-900 dark:text-white">{selectedAccountForAudit?.name}</strong>
                    </p>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 text-xs space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Recorded System Balance:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                                UGX {Number(selectedAccountForAudit?.current_balance || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <InputLabel value="Actual Physical / Phone Balance (UGX)" />
                            <TextInput
                                type="number"
                                className="w-full text-sm font-black"
                                value={reconcileForm.data.actual_balance}
                                onChange={e => reconcileForm.setData('actual_balance', e.target.value)}
                                required
                            />
                            <InputError message={reconcileForm.errors.actual_balance} />
                        </div>

                        {reconcileForm.data.actual_balance !== '' && (
                            <div className="text-xs font-bold p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                <span>Variance / Discrepancy:</span>
                                <span className={
                                    (Number(reconcileForm.data.actual_balance) - (selectedAccountForAudit?.current_balance || 0)) >= 0
                                        ? 'text-emerald-600 font-black'
                                        : 'text-rose-600 font-black'
                                }>
                                    {((Number(reconcileForm.data.actual_balance) - (selectedAccountForAudit?.current_balance || 0)) >= 0 ? '+' : '')}
                                    UGX {(Number(reconcileForm.data.actual_balance) - (selectedAccountForAudit?.current_balance || 0)).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div>
                            <InputLabel value="Audit Explanation / Reason" />
                            <TextInput
                                className="w-full text-xs"
                                placeholder="e.g. End of month physical cash count variance"
                                value={reconcileForm.data.reason}
                                onChange={e => reconcileForm.setData('reason', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <SecondaryButton type="button" onClick={() => setShowReconcileModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={reconcileForm.processing} className="bg-amber-600 hover:bg-amber-700 text-white">
                            Save Reconciliation
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
