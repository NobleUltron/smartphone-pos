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
    Users, 
    Landmark, 
    Wallet, 
    Smartphone, 
    Building2, 
    Plus, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ArrowRightLeft, 
    TrendingUp, 
    Package, 
    DollarSign, 
    FileText, 
    Printer, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    ShieldCheck, 
    ChevronRight, 
    Phone, 
    Percent, 
    Tag, 
    X,
    Eye
} from 'lucide-react';
import dayjs from 'dayjs';

export default function PartnersIndex({ partners, metrics, paymentAccounts, unassignedDevices }) {
    const [selectedPartner, setSelectedPartner] = useState(partners[0] || null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [statementTab, setStatementTab] = useState('instock'); // 'instock' | 'sold' | 'ledger'

    // Form: Create Partner
    const createForm = useForm({
        name: '',
        phone: '',
        email: '',
        profit_share_percentage: '100',
        notes: '',
        initial_deposit: '',
        payment_account_id: paymentAccounts[0]?.id || '',
    });

    // Form: Deposit Capital
    const depositForm = useForm({
        partner_id: '',
        amount: '',
        payment_account_id: paymentAccounts[0]?.id || '',
        transaction_date: dayjs().format('YYYY-MM-DD'),
        reference: '',
        notes: '',
    });

    // Form: Payout
    const payoutForm = useForm({
        partner_id: '',
        amount: '',
        type: 'profit_payout', // 'payout' | 'profit_payout'
        payment_account_id: paymentAccounts[0]?.id || '',
        transaction_date: dayjs().format('YYYY-MM-DD'),
        reference: '',
        notes: '',
    });

    // Form: Assign Stock
    const assignForm = useForm({
        device_imei_ids: [],
    });

    const handleCreatePartner = (e) => {
        e.preventDefault();
        createForm.post(route('partners.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            }
        });
    };

    const handleDeposit = (e) => {
        e.preventDefault();
        depositForm.post(route('partners.add-capital', depositForm.data.partner_id), {
            onSuccess: () => {
                setShowDepositModal(false);
                depositForm.reset();
            }
        });
    };

    const handlePayout = (e) => {
        e.preventDefault();
        payoutForm.post(route('partners.payout', payoutForm.data.partner_id), {
            onSuccess: () => {
                setShowPayoutModal(false);
                payoutForm.reset();
            }
        });
    };

    const handleAssignStock = (e) => {
        e.preventDefault();
        if (!selectedPartner) return;
        assignForm.post(route('partners.assign-stock', selectedPartner.id), {
            onSuccess: () => {
                setShowAssignModal(false);
                assignForm.reset();
            }
        });
    };

    const handleUnassignDevice = (deviceId) => {
        if (!confirm('Unlink this phone from the partner capital pool?')) return;
        router.delete(route('partners.unassign-stock', deviceId), {
            preserveScroll: true,
        });
    };

    const openDepositFor = (partner) => {
        setSelectedPartner(partner);
        depositForm.setData({
            partner_id: partner.id,
            amount: '',
            payment_account_id: paymentAccounts[0]?.id || '',
            transaction_date: dayjs().format('YYYY-MM-DD'),
            reference: '',
            notes: '',
        });
        setShowDepositModal(true);
    };

    const openPayoutFor = (partner) => {
        setSelectedPartner(partner);
        payoutForm.setData({
            partner_id: partner.id,
            amount: '',
            type: 'profit_payout',
            payment_account_id: paymentAccounts[0]?.id || '',
            transaction_date: dayjs().format('YYYY-MM-DD'),
            reference: '',
            notes: '',
        });
        setShowPayoutModal(true);
    };

    const openAssignFor = (partner) => {
        setSelectedPartner(partner);
        assignForm.setData({ device_imei_ids: [] });
        setShowAssignModal(true);
    };

    const openStatementFor = (partner) => {
        setSelectedPartner(partner);
        setStatementTab('instock');
        setShowStatementModal(true);
    };

    // Live active partner object from props
    const activePartner = partners.find(p => p.id === selectedPartner?.id) || selectedPartner || partners[0];

    return (
        <AuthenticatedLayout>
            <Head title="Partner & Family Capital Management" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                
                {/* Header & Tabs */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl text-white shadow-md shadow-purple-500/20">
                                <Users size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Partner & Family Capital Pools
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Separate friend/family investment pools, track stock bought with their money, and automatically compute profits on sale.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-500/20"
                            >
                                <Plus size={16} /> New Partner Profile
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Link
                            href={route('accounts.index')}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                            <Wallet size={16} /> Business Wallets & Accounts
                        </Link>
                        <span className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-2">
                            <Users size={16} /> Partner & Family Capital ({metrics.partners_count})
                        </span>
                    </div>
                </div>

                {/* 4 Overview KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 text-white shadow-lg shadow-indigo-950/20 relative overflow-hidden flex flex-col justify-between">
                        <div>
                            <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                                <Landmark size={14} /> Total Partner Funds Managed
                            </div>
                            <div className="text-2xl font-black mt-2">
                                UGX {Number(metrics.total_invested || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-indigo-200/90 font-medium mt-3 pt-2 border-t border-indigo-800/60 flex items-center justify-between">
                            <span>Across {metrics.partners_count} partner pool(s)</span>
                            <span className="text-emerald-300 font-bold">Disbursed: UGX {Number(metrics.total_payouts || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-wider">Partner Stock on Shelf</span>
                                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                                    <Package size={18} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.total_stock_cost || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            Current active inventory purchased with partner capital
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-wider">Ready Cash Pool</span>
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.total_cash_available || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            Unspent cash + recovered sales ready for withdrawal
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-wider">Partner Profit Generated</span>
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                +UGX {Number(metrics.total_profit_earned || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            Accumulated partner share from all phone sales
                        </div>
                    </div>
                </div>

                {/* Partners List Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="text-indigo-600" size={20} /> Active Capital Pools & Investors
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Click any partner card to view their statement or perform actions
                        </span>
                    </div>

                    {partners.length === 0 ? (
                        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                                <Users size={24} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Partner Capital Pools Yet</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                Create your first profile for a friend or family member who provides capital to buy phones. You will be able to track their money, stock on shelf, and sale profits separately.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2"
                            >
                                <Plus size={16} /> Create First Partner Pool
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {partners.map(partner => (
                                <div
                                    key={partner.id}
                                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between space-y-4"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-100 dark:border-purple-900">
                                                    {partner.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {partner.name}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Phone size={11} /> {partner.phone || 'No phone'}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                {partner.profit_share_percentage}% Profit Share
                                            </span>
                                        </div>

                                        {/* Value Display */}
                                        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                Current Total Net Value
                                            </div>
                                            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                                                UGX {Number(partner.total_portfolio_value || 0).toLocaleString()}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                                                <div>
                                                    <span className="text-slate-400">Ready Cash:</span>
                                                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        UGX {Number(partner.cash_balance_available || 0).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Stock (Cost):</span>
                                                    <div className="font-bold text-purple-600 dark:text-purple-400">
                                                        UGX {Number(partner.in_stock_cost || 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sub-breakdown badges */}
                                        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[10px]">
                                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                                <div className="text-slate-400">In Stock</div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{partner.in_stock_count} phones</div>
                                            </div>
                                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                                <div className="text-slate-400">Sold</div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{partner.sold_count} phones</div>
                                            </div>
                                            <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                                                <div className="text-emerald-600">Profit</div>
                                                <div className="font-bold text-emerald-700 dark:text-emerald-400">+{Number(partner.partner_profit_earned || 0).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openDepositFor(partner)}
                                                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Plus size={14} /> Add Capital
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openPayoutFor(partner)}
                                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <ArrowUpRight size={14} /> Payout
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openStatementFor(partner)}
                                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Eye size={14} /> Statement
                                            </button>
                                            <a
                                                href={route('partners.pdf', partner.id)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                title="Download PDF statement to share via WhatsApp"
                                            >
                                                <Printer size={14} /> PDF
                                            </a>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openAssignFor(partner)}
                                            className="w-full py-1.5 text-center text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1"
                                        >
                                            <Tag size={12} /> Link Existing Stock from Shop
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* MODAL 1: Create Partner Profile */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <form onSubmit={handleCreatePartner} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="text-indigo-600" size={18} /> New Partner Capital Profile
                        </h3>
                        <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <InputLabel value="Partner / Family Member Name *" />
                        <TextInput
                            type="text"
                            required
                            className="w-full mt-1"
                            placeholder="e.g. David Byamukama (Brother), Sarah Investor"
                            value={createForm.data.name}
                            onChange={e => createForm.setData('name', e.target.value)}
                        />
                        <InputError message={createForm.errors.name} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <InputLabel value="Phone Number (WhatsApp)" />
                            <TextInput
                                type="text"
                                className="w-full mt-1"
                                placeholder="+256 700 000 000"
                                value={createForm.data.phone}
                                onChange={e => createForm.setData('phone', e.target.value)}
                            />
                        </div>
                        <div>
                            <InputLabel value="Profit Share (%)" />
                            <TextInput
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                className="w-full mt-1"
                                placeholder="100"
                                value={createForm.data.profit_share_percentage}
                                onChange={e => createForm.setData('profit_share_percentage', e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">100% = Partner gets all profit. 50% = 50/50 split.</p>
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Initial Capital Deposit (Optional UGX)" />
                        <TextInput
                            type="number"
                            min="0"
                            step="any"
                            className="w-full mt-1"
                            placeholder="e.g. 5000000"
                            value={createForm.data.initial_deposit}
                            onChange={e => createForm.setData('initial_deposit', e.target.value)}
                        />
                    </div>

                    {createForm.data.initial_deposit > 0 && (
                        <div>
                            <InputLabel value="Payment Wallet Receiving the Cash" />
                            <select
                                className="w-full mt-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                                value={createForm.data.payment_account_id}
                                onChange={e => createForm.setData('payment_account_id', e.target.value)}
                            >
                                {paymentAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (Balance: UGX {Number(acc.current_balance).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <InputLabel value="Notes / Terms (Optional)" />
                        <textarea
                            className="w-full mt-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            rows={2}
                            placeholder="e.g. 3-month capital pool for buying iPhones from Dubai"
                            value={createForm.data.notes}
                            onChange={e => createForm.setData('notes', e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <SecondaryButton onClick={() => setShowCreateModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createForm.processing}>Save Profile</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 2: Deposit Capital */}
            <Modal show={showDepositModal} onClose={() => setShowDepositModal(false)} maxWidth="md">
                <form onSubmit={handleDeposit} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Plus className="text-emerald-600" size={18} /> Record Capital Deposit
                        </h3>
                        <button type="button" onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <InputLabel value="Partner / Investor" />
                        <select
                            className="w-full mt-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            value={depositForm.data.partner_id}
                            onChange={e => depositForm.setData('partner_id', e.target.value)}
                        >
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <InputLabel value="Amount (UGX) *" />
                            <TextInput
                                type="number"
                                required
                                min="1000"
                                step="any"
                                className="w-full mt-1"
                                placeholder="e.g. 2000000"
                                value={depositForm.data.amount}
                                onChange={e => depositForm.setData('amount', e.target.value)}
                            />
                        </div>
                        <div>
                            <InputLabel value="Date *" />
                            <TextInput
                                type="date"
                                required
                                className="w-full mt-1"
                                value={depositForm.data.transaction_date}
                                onChange={e => depositForm.setData('transaction_date', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Receiving Payment Wallet (Shop Account)" />
                        <select
                            className="w-full mt-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            value={depositForm.data.payment_account_id}
                            onChange={e => depositForm.setData('payment_account_id', e.target.value)}
                        >
                            {paymentAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} (Current: UGX {Number(acc.current_balance).toLocaleString()})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-0.5">This will automatically credit this wallet's balance in Money & Accounts.</p>
                    </div>

                    <div>
                        <InputLabel value="Reference / Notes" />
                        <TextInput
                            type="text"
                            className="w-full mt-1"
                            placeholder="e.g. Cash handed over in shop, MTN MoMo transaction ID"
                            value={depositForm.data.notes}
                            onChange={e => depositForm.setData('notes', e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <SecondaryButton onClick={() => setShowDepositModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={depositForm.processing}>Record Deposit</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 3: Payout / Disburse */}
            <Modal show={showPayoutModal} onClose={() => setShowPayoutModal(false)} maxWidth="md">
                <form onSubmit={handlePayout} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <ArrowUpRight className="text-emerald-600" size={18} /> Payout to Partner
                        </h3>
                        <button type="button" onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <InputLabel value="Partner / Investor" />
                        <select
                            className="w-full mt-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            value={payoutForm.data.partner_id}
                            onChange={e => payoutForm.setData('partner_id', e.target.value)}
                        >
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Available Cash: UGX {Number(p.cash_balance_available).toLocaleString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <InputLabel value="Payout Type" />
                            <select
                                className="w-full mt-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                                value={payoutForm.data.type}
                                onChange={e => payoutForm.setData('type', e.target.value)}
                            >
                                <option value="profit_payout">Profit Payout</option>
                                <option value="payout">Principal Capital Return</option>
                            </select>
                        </div>
                        <div>
                            <InputLabel value="Amount (UGX) *" />
                            <TextInput
                                type="number"
                                required
                                min="1000"
                                step="any"
                                className="w-full mt-1"
                                placeholder="Amount to pay"
                                value={payoutForm.data.amount}
                                onChange={e => payoutForm.setData('amount', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Disburse From Wallet *" />
                        <select
                            className="w-full mt-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            value={payoutForm.data.payment_account_id}
                            onChange={e => payoutForm.setData('payment_account_id', e.target.value)}
                        >
                            {paymentAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} (Available: UGX {Number(acc.current_balance).toLocaleString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <InputLabel value="Notes" />
                        <TextInput
                            type="text"
                            className="w-full mt-1"
                            placeholder="e.g. Sent via Airtel Money float to partner"
                            value={payoutForm.data.notes}
                            onChange={e => payoutForm.setData('notes', e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <SecondaryButton onClick={() => setShowPayoutModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={payoutForm.processing}>Disburse Payout</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 4: Assign Existing In-Stock Phones */}
            <Modal show={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="lg">
                <form onSubmit={handleAssignStock} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Tag className="text-indigo-600" size={18} /> Link In-Stock Phones to {activePartner?.name}
                        </h3>
                        <button type="button" onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                    </div>

                    <p className="text-xs text-slate-500">
                        Select which existing phones in your shop inventory were funded by {activePartner?.name}'s capital. Their cost will be added to this partner's stock ledger.
                    </p>

                    {unassignedDevices.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                            No unassigned in-stock phones found. You can also assign partner funding directly when adding new stock in the Inventory screen.
                        </div>
                    ) : (
                        <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                            {unassignedDevices.map(device => {
                                const isChecked = assignForm.data.device_imei_ids.includes(device.id);
                                return (
                                    <label
                                        key={device.id}
                                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={isChecked}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        assignForm.setData('device_imei_ids', [...assignForm.data.device_imei_ids, device.id]);
                                                    } else {
                                                        assignForm.setData('device_imei_ids', assignForm.data.device_imei_ids.filter(id => id !== device.id));
                                                    }
                                                }}
                                            />
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{device.label}</span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-500">
                            {assignForm.data.device_imei_ids.length} phone(s) selected
                        </span>
                        <div className="flex items-center gap-2">
                            <SecondaryButton onClick={() => setShowAssignModal(false)}>Cancel</SecondaryButton>
                            <PrimaryButton disabled={assignForm.data.device_imei_ids.length === 0 || assignForm.processing}>
                                Link Selected Phones
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* MODAL 5: Partner Full Statement & Stock Inspection Drawer */}
            <Modal show={showStatementModal} onClose={() => setShowStatementModal(false)} maxWidth="2xl">
                {activePartner && (
                    <div className="p-6 space-y-5">
                        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="text-indigo-600" size={20} /> {activePartner.name} — Capital Statement
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Full audit of active phones on shelf, sales profit breakdown, and capital ledger.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={route('partners.pdf', activePartner.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <Printer size={14} /> Print PDF
                                </a>
                                <button type="button" onClick={() => setShowStatementModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Top 3 KPI Pills */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Capital Injected</span>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                    UGX {Number(activePartner.total_deposits || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                                <span className="text-[10px] text-purple-600 uppercase font-bold">Active Stock (Cost)</span>
                                <div className="text-base font-black text-purple-700 dark:text-purple-300 mt-0.5">
                                    UGX {Number(activePartner.in_stock_cost || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                                <span className="text-[10px] text-emerald-600 uppercase font-bold">Partner Profit Earned</span>
                                <div className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                                    +UGX {Number(activePartner.partner_profit_earned || 0).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Subtabs */}
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <button
                                type="button"
                                onClick={() => setStatementTab('instock')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statementTab === 'instock' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                            >
                                In-Stock Phones ({activePartner.in_stock_count})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatementTab('sold')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statementTab === 'sold' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                            >
                                Sold Phones & Profit ({activePartner.sold_count})
                            </button>
                        </div>

                        {/* TAB 1: In-Stock Phones */}
                        {statementTab === 'instock' && (
                            <div className="space-y-3">
                                {activePartner.in_stock_devices.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        No active phones on shelf right now. All items funded by {activePartner.name} are sold.
                                    </div>
                                ) : (
                                    <div className="max-h-72 overflow-y-auto space-y-2">
                                        {activePartner.in_stock_devices.map(device => (
                                            <div
                                                key={device.id}
                                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {device.model_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                        IMEI: {device.imei} • {device.storage_capacity || '-'} • {device.color || '-'}
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    <div>
                                                        <div className="font-black text-slate-900 dark:text-white">
                                                            UGX {Number(device.cost_price).toLocaleString()}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            Selling: UGX {Number(device.selling_price).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnassignDevice(device.id)}
                                                        className="text-rose-500 hover:text-rose-700 text-[10px] font-bold p-1"
                                                        title="Unlink phone from partner"
                                                    >
                                                        Unlink
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: Sold Phones & Profit */}
                        {statementTab === 'sold' && (
                            <div className="space-y-3">
                                {activePartner.sold_devices.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        No sold phones recorded for this partner yet.
                                    </div>
                                ) : (
                                    <div className="max-h-72 overflow-y-auto space-y-2">
                                        {activePartner.sold_devices.map(device => (
                                            <div
                                                key={device.id}
                                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {device.model_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                        IMEI: {device.imei} • Sold: {device.sold_at || '-'}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                                                        +UGX {Number(device.partner_profit).toLocaleString()} Profit
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Cost: {Number(device.cost_price).toLocaleString()} • Sold: {Number(device.sold_price).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                            <SecondaryButton onClick={() => setShowStatementModal(false)}>Close</SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>

        </AuthenticatedLayout>
    );
}

