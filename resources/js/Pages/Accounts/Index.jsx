import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import toast from 'react-hot-toast';
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
    ChevronRight,
    TrendingUp,
    RefreshCw,
    ShieldCheck,
    Package,
    Users,
    User,
    Pencil,
    RotateCcw,
    X
} from 'lucide-react';
import dayjs from 'dayjs';

export default function AccountsIndex({ accounts = [], categories = [], metrics, transactions, filters = {} }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [selectedAccountForAudit, setSelectedAccountForAudit] = useState(null);
    const [showTxModal, setShowTxModal] = useState(false);
    const [txAccount, setTxAccount] = useState(null);
    const [walletTab, setWalletTab] = useState('all');

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
        is_personal: false,
    });

    // Form: Edit Account
    const editForm = useForm({
        name: '',
        provider: '',
        account_number: '',
        description: '',
        is_personal: false,
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

    // Form: Direct Deposit / Withdrawal
    const txForm = useForm({
        type: 'deposit',
        amount: '',
        description: '',
        reference: '',
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
            preserveScroll: true,
            replace: true
        });
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedAccountId('all');
        setSelectedType('all');
        setSelectedCategory('all');
        setDateFrom('');
        setDateTo('');
        router.get(route('accounts.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };

    const hasActiveFilters = Boolean(
        search ||
        selectedAccountId !== 'all' ||
        selectedType !== 'all' ||
        selectedCategory !== 'all' ||
        dateFrom ||
        dateTo
    );

    const handleCreateAccount = (e) => {
        e.preventDefault();
        createForm.post(route('accounts.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
            onError: (errs) => {
                toast.error(Object.values(errs)[0] || 'Failed to create account');
            }
        });
    };

    const openEditModal = (acc) => {
        setEditingAccount(acc);
        editForm.clearErrors();
        editForm.setData({
            name: acc.name || '',
            provider: acc.provider || '',
            account_number: acc.account_number || '',
            description: acc.description || '',
            is_personal: Boolean(acc.is_personal),
        });
        setShowEditModal(true);
    };

    const handleEditAccount = (e) => {
        e.preventDefault();
        if (!editingAccount) return;
        editForm.put(route('accounts.update', editingAccount.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowEditModal(false);
                setEditingAccount(null);
            },
            onError: (errs) => {
                toast.error(Object.values(errs)[0] || 'Failed to update account');
            }
        });
    };

    const handleTransfer = (e) => {
        e.preventDefault();
        transferForm.post(route('accounts.transfer'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowTransferModal(false);
                transferForm.reset();
            },
            onError: (errs) => {
                toast.error(errs.transfer || Object.values(errs)[0] || 'Transfer failed');
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

    // Live account from props so it updates instantly when refreshed
    const activeAuditAccount = accounts.find(a => a.id === selectedAccountForAudit?.id) || selectedAccountForAudit;

    const handleReconcile = (e) => {
        e.preventDefault();
        if (!selectedAccountForAudit || reconcileForm.processing) return;
        reconcileForm.post(route('accounts.reconcile', selectedAccountForAudit.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowReconcileModal(false);
                reconcileForm.reset();
                setSelectedAccountForAudit(null);
            },
            onError: (errs) => {
                toast.error(errs.actual_balance || Object.values(errs)[0] || 'Reconciliation failed');
            }
        });
    };

    const openTxModal = (account, defaultType = 'deposit') => {
        txForm.clearErrors();
        setTxAccount(account);
        txForm.setData({
            type: defaultType,
            amount: '',
            description: '',
            reference: '',
        });
        setShowTxModal(true);
    };

    const activeTxAccount = accounts.find(a => a.id === txAccount?.id) || txAccount;

    const handleRecordTx = (e) => {
        e.preventDefault();
        if (!txAccount || txForm.processing) return;
        txForm.post(route('accounts.transaction', txAccount.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowTxModal(false);
                txForm.reset();
                setTxAccount(null);
            },
            onError: (errs) => {
                toast.error(errs.amount || Object.values(errs)[0] || 'Transaction failed');
            }
        });
    };

    const getAccountIcon = (type, provider) => {
        if ((provider || '').toLowerCase().includes('safe')) return <ShieldCheck className="text-emerald-500" size={24} />;
        if (type === 'cash') return <Wallet className="text-emerald-500" size={24} />;
        if (type === 'mobile_money') {
            if ((provider || '').toLowerCase().includes('mtn')) return <Smartphone className="text-amber-500" size={24} />;
            return <Smartphone className="text-rose-500" size={24} />;
        }
        if (type === 'bank') return <Building2 className="text-indigo-500" size={24} />;
        return <Landmark className="text-purple-500" size={24} />;
    };

    const getAccountBadgeColor = (type, provider) => {
        if ((provider || '').toLowerCase().includes('safe')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold';
        if (type === 'cash') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        if (type === 'mobile_money') {
            if ((provider || '').toLowerCase().includes('mtn')) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
        }
        if (type === 'bank') return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    };

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncHistorical = () => {
        setIsSyncing(true);
        router.post(route('accounts.sync'), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('Historical data synchronized across all accounts'),
            onError: () => toast.error('Failed to sync historical data'),
            onFinish: () => setIsSyncing(false)
        });
    };

    const openTransferModal = () => {
        const defaultFrom = accounts[0]?.id || '';
        const defaultTo = accounts.find(a => String(a.id) !== String(defaultFrom))?.id || '';
        transferForm.clearErrors();
        transferForm.setData({
            from_account_id: transferForm.data.from_account_id || defaultFrom,
            to_account_id: (transferForm.data.to_account_id && String(transferForm.data.to_account_id) !== String(transferForm.data.from_account_id || defaultFrom))
                ? transferForm.data.to_account_id
                : defaultTo,
            amount: '',
            notes: '',
        });
        setShowTransferModal(true);
    };

    const filteredAccounts = accounts.filter(acc => {
        if (walletTab === 'business') return !acc.is_personal;
        if (walletTab === 'personal') return Boolean(acc.is_personal);
        return true;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Money & Treasury Management" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header & Navigation Tabs */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    {/* Top Row: Title + Action Buttons */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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

                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                                type="button"
                                onClick={handleSyncHistorical}
                                disabled={isSyncing}
                                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
                                title="Recalculate balances and sync past POS sales & expenses into accounts"
                            >
                                <RefreshCw size={15} className={isSyncing ? 'animate-spin text-indigo-600' : ''} />
                                {isSyncing ? 'Syncing...' : 'Sync Past Data'}
                            </button>
                            <button
                                type="button"
                                onClick={openTransferModal}
                                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
                            >
                                <ArrowRightLeft size={15} /> Inter-Account Transfer
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-500/20 whitespace-nowrap"
                            >
                                <Plus size={16} /> Add Payment Account
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Navigation Tabs */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-2">
                            <Wallet size={16} /> Business Wallets & Accounts
                        </span>
                        <Link
                            href={route('partners.index')}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                            <Users size={16} /> Partner & Family Capital ({metrics.partnersCount || 0})
                        </Link>
                    </div>
                </div>

                {/* HERO BANNER: Combined Owner Net Worth & Equity Breakdown */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none">
                        <Landmark size={180} />
                    </div>
                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-400" /> My Combined Net Worth
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                    Strictly Yours (Net of Partner Debt)
                                </span>
                            </div>
                            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                                UGX {Number(metrics.ownerNetWorth || 0).toLocaleString()}
                            </div>
                            <p className="text-[11px] text-indigo-200/80 font-medium">
                                Business Wallets + Stock + Personal Reserve &minus; Partner Owed
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 xl:max-w-3xl">
                            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                                <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                                    My Business Cash
                                </div>
                                <div className="text-base sm:text-lg font-black text-white mt-1">
                                    UGX {Number(metrics.ownerBusinessCash || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-indigo-300/90 mt-0.5">
                                    Wallets &minus; Partner Cash
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                                <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                                    My Money in Stock
                                </div>
                                <div className="text-base sm:text-lg font-black text-amber-300 mt-1">
                                    UGX {Number(metrics.ownerStockCost || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-indigo-300/90 mt-0.5">
                                    Stock &minus; Partner Stock
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-emerald-500/15 backdrop-blur-sm border border-emerald-400/25">
                                <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                                    My Business Equity
                                </div>
                                <div className="text-base sm:text-lg font-black text-emerald-300 mt-1">
                                    UGX {Number(metrics.ownerBusinessEquity || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-emerald-200/80 mt-0.5">
                                    Strictly yours in shop
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-purple-500/20 backdrop-blur-sm border border-purple-400/30">
                                <div className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">
                                    My Personal Money
                                </div>
                                <div className="text-base sm:text-lg font-black text-purple-200 mt-1">
                                    UGX {Number(metrics.personalReserveTotal || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-purple-200/80 mt-0.5">
                                    Personal bank reserve
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TIER 1: Macro Capital Pools (3 Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Gross Working Capital in Shop */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600"></div>
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                <span className="uppercase tracking-wider">Gross Shop Working Capital</span>
                                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.totalBusinessCapital || metrics.totalLiquidity || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                            <span title="Total liquid cash across shop wallets (includes partner cash)">
                                <strong className="text-slate-700 dark:text-slate-200">UGX {Number(metrics.totalLiquidity || 0).toLocaleString()}</strong> Liquid
                            </span>
                            <span>•</span>
                            <span title="Total active stock cost in shop (includes partner stock)">
                                <strong className="text-indigo-600 dark:text-indigo-400">UGX {Number(metrics.stockCost || 0).toLocaleString()}</strong> Stock
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Owner Personal Reserve */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                                <span className="uppercase tracking-wider">Owner Personal Reserve</span>
                                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                                    <User size={18} />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.personalReserveTotal || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                            <span>Private owner bank ({metrics.personalAccountsCount || 0} {metrics.personalAccountsCount === 1 ? 'account' : 'accounts'})</span>
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                                Separate
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Partner & Family Funds Owed */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                <span className="uppercase tracking-wider">Partner & Family Owed</span>
                                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                                    <Users size={18} />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.partnerPortfolioValue || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                            <span title="Partner cash held in shop wallets + partner stock on shelf">
                                Cash: <strong className="text-slate-700 dark:text-slate-200">{Number(metrics.partnerCashAvailable || 0).toLocaleString()}</strong> • Stock: <strong className="text-slate-700 dark:text-slate-200">{Number(metrics.partnerStockCost || 0).toLocaleString()}</strong>
                            </span>
                            <Link
                                href={route('partners.index')}
                                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold flex items-center gap-0.5 whitespace-nowrap ml-2"
                                title="Go to Partner & Family Capital"
                            >
                                Manage <ChevronRight size={13} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* TIER 2: Tactical Shop Asset Breakdown (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-wider">Cash on Hand</span>
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.cashOnHand || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            Physical cash in drawer & register
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-wider">Mobile Money Float</span>
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                                    <Smartphone size={18} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.mobileMoneyTotal || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            MTN MoMo & Airtel float SIMs
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-wider">Bank Deposits</span>
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                                    <Building2 size={18} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.bankTotal || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            Commercial bank accounts
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-wider">Stock on Hand (Cost)</span>
                                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                                    <Package size={18} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                UGX {Number(metrics.stockCost || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span>{metrics.stockCount || 0} in stock ({metrics.serializedCount || 0} dev, {metrics.bulkCount || 0} acc)</span>
                            <Link 
                                href={route('inventory.index')} 
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5"
                                title="Go to Inventory Management"
                            >
                                View <ChevronRight size={12} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* TIER 2.5: Receivables & Payables + Adjusted Net Worth Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Customer Receivables (Owed to You)
                            </div>
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                + UGX {Number(metrics.totalReceivables || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Layaways: {Number(metrics.layawayReceivables || 0).toLocaleString()} • Invoices: {Number(metrics.invoiceReceivables || 0).toLocaleString()}
                            </div>
                        </div>
                        <Link
                            href={route('layaways.index')}
                            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shrink-0"
                            title="View Layaways"
                        >
                            <ChevronRight size={18} />
                        </Link>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Trade Payables (Owed by Shop)
                            </div>
                            <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                                &minus; UGX {Number(metrics.totalPayables || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Suppliers: {Number(metrics.supplierPayables || 0).toLocaleString()} • Dealers: {Number(metrics.dealerPayables || 0).toLocaleString()}
                            </div>
                        </div>
                        <Link
                            href={route('suppliers.index')}
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shrink-0"
                            title="View Suppliers"
                        >
                            <ChevronRight size={18} />
                        </Link>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 shadow-sm flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                Full Adjusted Net Worth
                            </div>
                            <div className="text-lg font-black text-indigo-900 dark:text-white mt-1">
                                UGX {Number(metrics.adjustedNetWorth || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-indigo-600/80 dark:text-indigo-300/80 mt-0.5">
                                Net Worth + Receivables &minus; Trade Payables
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Cards Grid */}
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Wallet className="text-indigo-600" size={20} /> Payment Wallets & Accounts
                            </h2>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Open any account passbook, edit details, or reconcile physical balances
                            </span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                            {[
                                { key: 'all', label: `All (${accounts.length})` },
                                { key: 'business', label: `Business (${accounts.filter(a => !a.is_personal).length})` },
                                { key: 'personal', label: `Personal (${accounts.filter(a => a.is_personal).length})` },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setWalletTab(tab.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        walletTab === tab.key
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredAccounts.map(acc => (
                            <div 
                                key={acc.id}
                                className={`p-5 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                                    acc.is_personal 
                                        ? 'border-purple-300 dark:border-purple-800/80 ring-1 ring-purple-200/70 dark:ring-purple-900/30' 
                                        : 'border-slate-200/80 dark:border-slate-800'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                            {getAccountIcon(acc.type, acc.provider)}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {acc.is_personal && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black border uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700 flex items-center gap-1">
                                                    <User size={10} /> Personal
                                                </span>
                                            )}
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${getAccountBadgeColor(acc.type, acc.provider)}`}>
                                                {acc.provider || acc.type}
                                            </span>
                                        </div>
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
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Current Balance</span>
                                            {acc.is_personal && (
                                                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                                                    Owner Reserve
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                            UGX {Number(acc.current_balance || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            {acc.transactions_count || 0} recorded entries
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => openTxModal(acc, 'deposit')}
                                        className={`flex-1 py-2 text-center rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 border ${
                                            acc.is_personal
                                                ? 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        }`}
                                        title={acc.is_personal ? 'Record Personal Deposit or Withdrawal' : 'Record External Deposit or Withdrawal'}
                                    >
                                        <Plus size={13} /> Deposit / Withdraw
                                    </button>
                                    <Link
                                        href={route('accounts.show', acc.id)}
                                        className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700"
                                        title="View Full Passbook"
                                    >
                                        <FileText size={15} />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(acc)}
                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl transition-colors"
                                        title="Edit Account Details"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        type="button"
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
                    <div className="flex flex-col gap-4 mb-5">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="text-indigo-600" size={20} /> Unified Treasury Activity Ledger
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Live stream of all incoming sales, deposits, dealer payouts, expenses, and transfers
                                </p>
                            </div>

                            {/* Filtered Period Totals */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 mr-1.5">Inflows:</span>
                                    <strong className="text-emerald-700 dark:text-emerald-400">+UGX {Number(metrics.filteredInflows || 0).toLocaleString()}</strong>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800/50 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 mr-1.5">Outflows:</span>
                                    <strong className="text-rose-700 dark:text-rose-400">&minus;UGX {Number(metrics.filteredOutflows || 0).toLocaleString()}</strong>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 mr-1.5">Net:</span>
                                    <strong className={(Number(metrics.filteredInflows || 0) - Number(metrics.filteredOutflows || 0)) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                                        {((Number(metrics.filteredInflows || 0) - Number(metrics.filteredOutflows || 0)) >= 0 ? '+' : '')}
                                        UGX {(Number(metrics.filteredInflows || 0) - Number(metrics.filteredOutflows || 0)).toLocaleString()}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="relative flex-1 min-w-[200px] max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search description or ref..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleFilter()}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500"
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

                            <select
                                value={selectedCategory}
                                onChange={e => {
                                    setSelectedCategory(e.target.value);
                                    handleFilter({ category: e.target.value });
                                }}
                                className="text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 py-1.5"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => {
                                    setDateFrom(e.target.value);
                                    handleFilter({ date_from: e.target.value });
                                }}
                                className="text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 py-1.5"
                                title="From Date"
                            />

                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => {
                                    setDateTo(e.target.value);
                                    handleFilter({ date_to: e.target.value });
                                }}
                                className="text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 py-1.5"
                                title="To Date"
                            />

                            <button
                                type="button"
                                onClick={() => handleFilter()}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                            >
                                Apply
                            </button>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                                >
                                    <RotateCcw size={13} /> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
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
                                    const isPositiveAdjustment = trx.type === 'adjustment' && (
                                        (trx.category && trx.category.toLowerCase().includes('positive')) ||
                                        (trx.balance_after != null && trx.balance_before != null && Number(trx.balance_after) >= Number(trx.balance_before))
                                    );
                                    const isInflow = trx.type === 'inflow' || trx.type === 'transfer_in' || isPositiveAdjustment;
                                    const isOutflow = trx.type === 'outflow' || trx.type === 'transfer_out' || (trx.type === 'adjustment' && !isPositiveAdjustment);
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
                                                    isInflow 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : (isOutflow 
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
                                                {isOutflow ? `- UGX ${Number(trx.amount).toLocaleString()}` : '—'}
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

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {transactions.data.map(trx => {
                            const isPositiveAdjustment = trx.type === 'adjustment' && (
                                (trx.category && trx.category.toLowerCase().includes('positive')) ||
                                (trx.balance_after != null && trx.balance_before != null && Number(trx.balance_after) >= Number(trx.balance_before))
                            );
                            const isInflow = trx.type === 'inflow' || trx.type === 'transfer_in' || isPositiveAdjustment;
                            const isOutflow = trx.type === 'outflow' || trx.type === 'transfer_out' || (trx.type === 'adjustment' && !isPositiveAdjustment);
                            return (
                                <div key={trx.id} className="py-3.5 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white text-xs">{trx.account?.name}</div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {dayjs(trx.transaction_date).format('DD MMM YYYY, hh:mm A')}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                            isInflow
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : (isOutflow
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300')
                                        }`}>
                                            {trx.category}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-700 dark:text-slate-300">{trx.description}</div>
                                    <div className="flex items-center justify-between pt-1 text-xs">
                                        <span className={isInflow ? 'font-black text-emerald-600 dark:text-emerald-400' : 'font-black text-rose-600 dark:text-rose-400'}>
                                            {isInflow ? `+ UGX ${Number(trx.amount).toLocaleString()}` : `- UGX ${Number(trx.amount).toLocaleString()}`}
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Bal: <strong className="text-slate-900 dark:text-white">UGX {Number(trx.balance_after).toLocaleString()}</strong>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {transactions.data.length === 0 && (
                            <div className="text-center py-8 text-xs text-slate-400">
                                No transactions found matching the selected filters.
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Showing {transactions.from || 0} to {transactions.to || 0} of {transactions.total} transactions
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {transactions.links.map((link, idx) => (
                                    link.url ? (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveScroll
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                link.active
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        />
                                    ) : (
                                        <span
                                            key={idx}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 opacity-40 cursor-not-allowed"
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Payment Account Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Payment Account</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Register a new wallet, till register, or bank account</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleCreateAccount} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Account Name *
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                placeholder="e.g. Stanbic Corporate Bank, MTN Merchant SIM 2"
                                value={createForm.data.name}
                                onChange={e => createForm.setData('name', e.target.value)}
                                required
                            />
                            {createForm.errors.name && <p className="text-xs text-rose-500 font-bold">{createForm.errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Account Type *
                                </label>
                                <select
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                    value={createForm.data.type}
                                    onChange={e => createForm.setData('type', e.target.value)}
                                >
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="bank">Bank Account</option>
                                    <option value="cash">Cash Register / Safe</option>
                                    <option value="other">Other Wallet</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Provider
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                    placeholder="e.g. MTN, Airtel, Stanbic"
                                    value={createForm.data.provider}
                                    onChange={e => createForm.setData('provider', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Account Number / Phone / Till ID <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                placeholder="e.g. +256 788 123456 or 9040001234567"
                                value={createForm.data.account_number}
                                onChange={e => createForm.setData('account_number', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Opening Float Balance
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                    placeholder="0"
                                    value={createForm.data.opening_balance}
                                    onChange={e => createForm.setData('opening_balance', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                rows="2"
                                placeholder="Purpose of this account..."
                                value={createForm.data.description}
                                onChange={e => createForm.setData('description', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50">
                            <input
                                type="checkbox"
                                id="create_is_personal"
                                className="rounded border-purple-300 dark:border-purple-700 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                checked={createForm.data.is_personal}
                                onChange={e => createForm.setData('is_personal', e.target.checked)}
                            />
                            <label htmlFor="create_is_personal" className="text-xs font-bold text-purple-900 dark:text-purple-200 cursor-pointer">
                                Mark as Personal / Owner Account (Excluded from Business Working Capital)
                            </label>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createForm.processing}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                                {createForm.processing ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Edit Payment Account Modal */}
            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="md">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
                                <Pencil size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Payment Account</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Update wallet name, provider, or personal classification</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleEditAccount} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Account Name *
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                value={editForm.data.name}
                                onChange={e => editForm.setData('name', e.target.value)}
                                required
                            />
                            {editForm.errors.name && <p className="text-xs text-rose-500 font-bold">{editForm.errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Provider
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                    value={editForm.data.provider}
                                    onChange={e => editForm.setData('provider', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Account / Phone / Till
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3.5 py-2.5 text-sm font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                    value={editForm.data.account_number}
                                    onChange={e => editForm.setData('account_number', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Description / Notes
                            </label>
                            <textarea
                                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                rows="2"
                                value={editForm.data.description}
                                onChange={e => editForm.setData('description', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50">
                            <input
                                type="checkbox"
                                id="edit_is_personal"
                                className="rounded border-purple-300 dark:border-purple-700 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                checked={editForm.data.is_personal}
                                onChange={e => editForm.setData('is_personal', e.target.checked)}
                            />
                            <label htmlFor="edit_is_personal" className="text-xs font-bold text-purple-900 dark:text-purple-200 cursor-pointer">
                                Mark as Personal / Owner Account (Excluded from Business Working Capital)
                            </label>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editForm.processing}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Inter-Account Transfer Modal */}
            <Modal show={showTransferModal} onClose={() => setShowTransferModal(false)} maxWidth="md">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <ArrowRightLeft size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Inter-Account Float Transfer</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Rebalance float between cash registers, MoMo SIMs, and bank accounts</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTransferModal(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleTransfer} className="space-y-4">
                        {transferForm.errors.transfer && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                                {transferForm.errors.transfer}
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                From Source Account (Debit) *
                            </label>
                            <select
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                value={transferForm.data.from_account_id}
                                onChange={e => {
                                    const newFrom = e.target.value;
                                    const newTo = accounts.find(a => String(a.id) !== String(newFrom))?.id || '';
                                    transferForm.setData({ ...transferForm.data, from_account_id: newFrom, to_account_id: String(newTo) });
                                }}
                                required
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (Balance: UGX {Number(acc.current_balance).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                            {transferForm.errors.from_account_id && <p className="text-xs text-rose-500 font-bold">{transferForm.errors.from_account_id}</p>}
                        </div>

                        <div className="flex justify-center -my-1">
                            <button
                                type="button"
                                onClick={() => {
                                    const currentFrom = transferForm.data.from_account_id;
                                    const currentTo = transferForm.data.to_account_id;
                                    if (currentFrom && currentTo) {
                                        transferForm.setData({
                                            ...transferForm.data,
                                            from_account_id: currentTo,
                                            to_account_id: currentFrom,
                                        });
                                    }
                                }}
                                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                                title="Swap Source & Destination"
                            >
                                <ArrowRightLeft size={13} /> Swap Accounts
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                To Destination Account (Credit) *
                            </label>
                            <select
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
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
                            {transferForm.errors.to_account_id && <p className="text-xs text-rose-500 font-bold">{transferForm.errors.to_account_id}</p>}
                        </div>

                        {/* Smart Accounting Notice */}
                        {(() => {
                            const fromAcc = accounts.find(a => String(a.id) === String(transferForm.data.from_account_id));
                            const toAcc = accounts.find(a => String(a.id) === String(transferForm.data.to_account_id));
                            if (fromAcc?.is_personal && !toAcc?.is_personal) {
                                return (
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                                            <ArrowDownLeft size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold flex items-center gap-1.5">
                                                <span>Owner Capital Injection (Float Top-up)</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold uppercase">+Shop Capital</span>
                                            </div>
                                            <p className="text-[11px] mt-0.5 text-emerald-700 dark:text-emerald-400">
                                                Transferring from your private <strong>{fromAcc?.name}</strong> into shop account <strong>{toAcc?.name}</strong> will be logged as Owner Capital Injection and will increase Business Working Capital.
                                            </p>
                                        </div>
                                    </div>
                                );
                            }
                            if (!fromAcc?.is_personal && toAcc?.is_personal) {
                                return (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2.5">
                                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/60 rounded-lg text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
                                            <ArrowUpRight size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold flex items-center gap-1.5">
                                                <span>Owner Drawings (Personal Withdrawal)</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 font-bold uppercase">Personal Use</span>
                                            </div>
                                            <p className="text-[11px] mt-0.5 text-purple-700 dark:text-purple-400">
                                                Transferring from shop account <strong>{fromAcc?.name}</strong> to your private <strong>{toAcc?.name}</strong> is logged as Personal Drawings. It reduces shop liquid capital without counting as an operational store expense.
                                            </p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Transfer Amount *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-base font-black text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                                    placeholder="0"
                                    value={transferForm.data.amount}
                                    onChange={e => transferForm.setData('amount', e.target.value)}
                                    required
                                />
                            </div>
                            {transferForm.errors.amount && <p className="text-xs text-rose-500 font-bold">{transferForm.errors.amount}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Transfer Reference / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                placeholder="e.g. Deposited cash float into MoMo SIM"
                                value={transferForm.data.notes}
                                onChange={e => transferForm.setData('notes', e.target.value)}
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowTransferModal(false)}
                                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={transferForm.processing}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                                {transferForm.processing ? 'Transferring...' : 'Confirm Transfer'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Audit & Reconcile Modal */}
            <Modal show={showReconcileModal} onClose={() => setShowReconcileModal(false)} maxWidth="md">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
                                <Scale size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Reconcile & Audit Balance</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Auditing <strong className="text-slate-900 dark:text-white">{activeAuditAccount?.name}</strong>
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowReconcileModal(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleReconcile} className="space-y-4">
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Recorded System Balance:</span>
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    UGX {Number(activeAuditAccount?.current_balance || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Actual Physical / Phone SIM Balance *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-base font-black text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm transition-all"
                                    value={reconcileForm.data.actual_balance}
                                    onChange={e => reconcileForm.setData('actual_balance', e.target.value)}
                                    required
                                />
                            </div>
                            {reconcileForm.errors.actual_balance && <p className="text-xs text-rose-500 font-bold">{reconcileForm.errors.actual_balance}</p>}
                        </div>

                        {reconcileForm.data.actual_balance !== '' && (
                            <div className="text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400">Variance / Discrepancy:</span>
                                <span className={
                                    (Number(reconcileForm.data.actual_balance) - (activeAuditAccount?.current_balance || 0)) >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400 font-black'
                                        : 'text-rose-600 dark:text-rose-400 font-black'
                                }>
                                    {((Number(reconcileForm.data.actual_balance) - (activeAuditAccount?.current_balance || 0)) >= 0 ? '+' : '')}
                                    UGX {(Number(reconcileForm.data.actual_balance) - (activeAuditAccount?.current_balance || 0)).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Audit Explanation / Reason
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                                placeholder="e.g. End of month physical cash count variance"
                                value={reconcileForm.data.reason}
                                onChange={e => reconcileForm.setData('reason', e.target.value)}
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowReconcileModal(false)}
                                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={reconcileForm.processing}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {reconcileForm.processing && <RefreshCw size={14} className="animate-spin" />}
                                {reconcileForm.processing ? 'Saving...' : 'Save Reconciliation'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* ── DIRECT DEPOSIT / WITHDRAWAL MODAL ─────────────────────────── */}
            <Modal show={showTxModal} onClose={() => setShowTxModal(false)} maxWidth="md">
                {(() => {
                    const isDeposit = txForm.data.type === 'deposit';
                    const isPersonal = Boolean(activeTxAccount?.is_personal);
                    const currentBal = Number(activeTxAccount?.current_balance || 0);
                    const enteredAmt = Number(txForm.data.amount || 0);
                    const projectedBal = isDeposit ? currentBal + enteredAmt : currentBal - enteredAmt;
                    const insufficientBalance = !isDeposit && enteredAmt > currentBal;

                    return (
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                            <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        isDeposit
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {isDeposit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                                {isDeposit ? 'Deposit Money' : 'Withdraw Money'}
                                            </h3>
                                            {isPersonal && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                                                    <User size={10} /> Personal
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                            {activeTxAccount?.name}
                                            {activeTxAccount?.account_number ? ` • ${activeTxAccount.account_number}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowTxModal(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleRecordTx} className="space-y-4">
                                {/* Deposit / Withdraw Toggle */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => txForm.setData('type', 'deposit')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                            isDeposit
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <ArrowDownLeft size={14} /> Deposit (+ Add)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => txForm.setData('type', 'withdrawal')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                            !isDeposit
                                                ? 'bg-rose-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <ArrowUpRight size={14} /> Withdraw (− Take Out)
                                    </button>
                                </div>

                                {/* Contextual Accounting Note */}
                                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                                    isPersonal
                                        ? 'bg-purple-50/70 dark:bg-purple-500/10 border-purple-200/80 dark:border-purple-500/20 text-purple-800 dark:text-purple-200'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {isPersonal ? (
                                        <>
                                            <span className="font-bold">Personal Account:</span> Logs a{' '}
                                            <span className="font-bold">{isDeposit ? 'Personal Deposit' : 'Personal Withdrawal'}</span>{' '}
                                            on this account only. Does not touch business cash or affect shop sales/profit reports.
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-bold">Business Account:</span> Logs an external{' '}
                                            <span className="font-bold">{isDeposit ? 'Capital Injection' : 'Owner Withdrawal'}</span>{' '}
                                            without counting as a shop sale or operating expense.
                                        </>
                                    )}
                                </div>

                                {/* Amount */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Amount (UGX) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                        <input
                                            type="number"
                                            min="1"
                                            step="any"
                                            placeholder="0"
                                            className={`w-full pl-12 pr-3.5 py-2.5 text-base font-black text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 shadow-sm transition-all ${
                                                isDeposit
                                                    ? 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                                    : 'focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                            }`}
                                            value={txForm.data.amount}
                                            onChange={e => txForm.setData('amount', e.target.value)}
                                            required
                                        />
                                    </div>
                                    {txForm.errors.amount && (
                                        <p className="text-xs text-rose-500 font-bold">{txForm.errors.amount}</p>
                                    )}
                                </div>

                                {/* Live Balance Preview */}
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Current Balance:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            UGX {currentBal.toLocaleString()}
                                        </span>
                                    </div>
                                    {enteredAmt > 0 && (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-medium">
                                                    {isDeposit ? 'Adding:' : 'Withdrawing:'}
                                                </span>
                                                <span className={`font-bold ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {isDeposit ? '+' : '−'}UGX {enteredAmt.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">New Balance:</span>
                                                <span className={`font-black text-sm ${
                                                    insufficientBalance
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-slate-900 dark:text-white'
                                                }`}>
                                                    UGX {projectedBal.toLocaleString()}
                                                </span>
                                            </div>
                                            {insufficientBalance && (
                                                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 pt-1">
                                                    Insufficient balance for this withdrawal.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Reference */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Reference (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
                                        placeholder="e.g. Bank slip #, MoMo Tx ID"
                                        value={txForm.data.reference}
                                        onChange={e => txForm.setData('reference', e.target.value)}
                                    />
                                    {txForm.errors.reference && (
                                        <p className="text-xs text-rose-500 font-bold">{txForm.errors.reference}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Note / Description (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
                                        placeholder={
                                            isPersonal
                                                ? (isDeposit ? 'e.g. Personal savings top-up from salary/side income' : 'e.g. Personal family expense')
                                                : (isDeposit ? 'e.g. Owner capital top-up' : 'e.g. Owner personal draw')
                                        }
                                        value={txForm.data.description}
                                        onChange={e => txForm.setData('description', e.target.value)}
                                    />
                                    {txForm.errors.description && (
                                        <p className="text-xs text-rose-500 font-bold">{txForm.errors.description}</p>
                                    )}
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowTxModal(false)}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={txForm.processing || insufficientBalance || enteredAmt <= 0}
                                        className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${
                                            isDeposit
                                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                                                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                                        }`}
                                    >
                                        {txForm.processing && <RefreshCw size={14} className="animate-spin" />}
                                        {txForm.processing
                                            ? 'Recording...'
                                            : isDeposit
                                                ? 'Record Deposit'
                                                : 'Record Withdrawal'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    );
                })()}
            </Modal>
        </AuthenticatedLayout>
    );
}
