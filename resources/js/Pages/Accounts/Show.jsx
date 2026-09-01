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
    ArrowLeft, 
    ArrowRightLeft, 
    FileText, 
    Scale, 
    Edit2, 
    Search, 
    Printer, 
    Download, 
    TrendingUp, 
    TrendingDown,
    X,
    Calendar
} from 'lucide-react';
import dayjs from 'dayjs';

export default function AccountShow({ account, allAccounts, transactions, trends, filters }) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);

    // Statement filters
    const [statementStart, setStatementStart] = useState('');
    const [statementEnd, setStatementEnd] = useState('');

    // Table filters
    const [search, setSearch] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');

    // Forms
    const editForm = useForm({
        name: account.name,
        account_number: account.account_number || '',
        provider: account.provider || '',
        description: account.description || '',
        is_active: account.is_active,
    });

    const transferForm = useForm({
        from_account_id: account.id,
        to_account_id: allAccounts[0]?.id || '',
        amount: '',
        notes: '',
    });

    const reconcileForm = useForm({
        actual_balance: account.current_balance,
        reason: '',
    });

    const handleFilter = (newFilters = {}) => {
        router.get(route('accounts.show', account.id), {
            search,
            type: selectedType,
            category: selectedCategory,
            ...newFilters
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleEditAccount = (e) => {
        e.preventDefault();
        editForm.put(route('accounts.update', account.id), {
            onSuccess: () => setShowEditModal(false)
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

    const handleReconcile = (e) => {
        e.preventDefault();
        reconcileForm.post(route('accounts.reconcile', account.id), {
            onSuccess: () => {
                setShowReconcileModal(false);
                reconcileForm.reset();
            }
        });
    };

    const handleStatement = (mode = 'stream') => {
        let url = route('accounts.statement', account.id) + `?mode=${mode}`;
        if (statementStart) url += `&start_date=${statementStart}`;
        if (statementEnd) url += `&end_date=${statementEnd}`;
        window.open(url, '_blank');
        setShowStatementModal(false);
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

    return (
        <AuthenticatedLayout>
            <Head title={`Passbook - ${account.name}`} />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Link
                            href={route('accounts.index')}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                {getAccountIcon(account.type, account.provider)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {account.name}
                                    </h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
                                        {account.provider || account.type}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                    {account.account_number || 'Primary Shop Account'} {account.description && `• ${account.description}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setShowStatementModal(true)}
                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                            <FileText size={15} /> Statement PDF
                        </button>
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <ArrowRightLeft size={15} /> Transfer
                        </button>
                        <button
                            onClick={() => setShowReconcileModal(true)}
                            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <Scale size={15} /> Reconcile
                        </button>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            title="Edit Account Details"
                        >
                            <Edit2 size={16} />
                        </button>
                    </div>
                </div>

                {/* 3-Card Summary Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/20">
                        <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                            Real-Time Balance
                        </div>
                        <div className="text-3xl font-black mt-2">
                            UGX {Number(account.current_balance || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-200/80 mt-1">
                            Opening Float: UGX {Number(account.opening_balance || 0).toLocaleString()}
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Total Recorded Inflows</span>
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp size={18} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                            + UGX {Number(trends.reduce((sum, d) => sum + d.inflows, 0)).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            Last 30 days total credits
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">Total Recorded Outflows</span>
                            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                                <TrendingDown size={18} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                            - UGX {Number(trends.reduce((sum, d) => sum + d.outflows, 0)).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            Last 30 days total debits
                        </div>
                    </div>
                </div>

                {/* Account Passbook Ledger */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="text-indigo-600" size={20} /> Complete Account Passbook
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Chronological ledger of all credits, debits, and running balances
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search passbook..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleFilter()}
                                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500"
                                />
                            </div>

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
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Description / Reference</th>
                                    <th className="py-3 px-4 text-right">Credit (+)</th>
                                    <th className="py-3 px-4 text-right">Debit (&minus;)</th>
                                    <th className="py-3 px-4 text-right">Running Balance</th>
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
                                            <td className="py-3 px-4 text-right font-black whitespace-nowrap text-slate-900 dark:text-white">
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
                                        <td colSpan="7" className="text-center py-10 text-slate-400">
                                            No transactions recorded in this account passbook yet.
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
                                Showing {transactions.from || 0} to {transactions.to || 0} of {transactions.total} entries
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

            {/* Edit Account Modal */}
            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="md">
                <form onSubmit={handleEditAccount} className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Edit2 className="text-indigo-600" size={20} /> Edit Account Details
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <InputLabel value="Account Name" />
                            <TextInput
                                className="w-full text-xs"
                                value={editForm.data.name}
                                onChange={e => editForm.setData('name', e.target.value)}
                                required
                            />
                            <InputError message={editForm.errors.name} />
                        </div>

                        <div>
                            <InputLabel value="Provider / Institution" />
                            <TextInput
                                className="w-full text-xs"
                                value={editForm.data.provider}
                                onChange={e => editForm.setData('provider', e.target.value)}
                            />
                        </div>

                        <div>
                            <InputLabel value="Account Number / Phone / Till ID" />
                            <TextInput
                                className="w-full text-xs font-mono"
                                value={editForm.data.account_number}
                                onChange={e => editForm.setData('account_number', e.target.value)}
                            />
                        </div>

                        <div>
                            <InputLabel value="Description" />
                            <textarea
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                rows="2"
                                value={editForm.data.description}
                                onChange={e => editForm.setData('description', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <SecondaryButton type="button" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={editForm.processing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Save Changes
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Inter-Account Transfer Modal */}
            <Modal show={showTransferModal} onClose={() => setShowTransferModal(false)} maxWidth="md">
                <form onSubmit={handleTransfer} className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="text-indigo-600" size={20} /> Transfer from {account.name}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <InputLabel value="Destination Account (Credit)" />
                            <select
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={transferForm.data.to_account_id}
                                onChange={e => transferForm.setData('to_account_id', e.target.value)}
                                required
                            >
                                {allAccounts.map(acc => (
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
                            <InputLabel value="Transfer Notes (Optional)" />
                            <TextInput
                                className="w-full text-xs"
                                placeholder="e.g. Shift float deposit"
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
                        Reconciling <strong className="text-slate-900 dark:text-white">{account.name}</strong>
                    </p>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 text-xs space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Recorded System Balance:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                                UGX {Number(account.current_balance || 0).toLocaleString()}
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
                                    (Number(reconcileForm.data.actual_balance) - account.current_balance) >= 0
                                        ? 'text-emerald-600 font-black'
                                        : 'text-rose-600 font-black'
                                }>
                                    {((Number(reconcileForm.data.actual_balance) - account.current_balance) >= 0 ? '+' : '')}
                                    UGX {(Number(reconcileForm.data.actual_balance) - account.current_balance).toLocaleString()}
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

            {/* Statement Options Modal */}
            <Modal show={showStatementModal} onClose={() => setShowStatementModal(false)} maxWidth="sm">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="text-indigo-600" size={18} /> Export Account Statement
                        </h3>
                        <button onClick={() => setShowStatementModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date (Optional)</span>
                            <input 
                                type="date"
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={statementStart}
                                onChange={e => setStatementStart(e.target.value)}
                            />
                        </div>

                        <div>
                            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Date (Optional)</span>
                            <input 
                                type="date"
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={statementEnd}
                                onChange={e => setStatementEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <SecondaryButton onClick={() => setShowStatementModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleStatement('stream')}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                            >
                                <Printer size={14} /> Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatement('download')}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Download size={14} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
