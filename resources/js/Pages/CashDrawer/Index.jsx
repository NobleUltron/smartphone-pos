import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { 
    Wallet, Banknote, Calculator, Receipt, ArrowRight, 
    XCircle, Clock, Plus, ShieldCheck, History as HistoryIcon,
    DollarSign, TrendingUp, AlertTriangle, CheckCircle2, FileDown,
    CreditCard, Smartphone, Building2
} from 'lucide-react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import toast from 'react-hot-toast';

export default function Index({ auth, activeDrawer }) {
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Form for opening a shift
    const openForm = useForm({
        starting_cash: ''
    });

    // Form for logging expenses
    const expenseForm = useForm({
        amount: '',
        category: 'Shop Supplies',
        description: ''
    });

    // Form for closing shift
    const closeForm = useForm({
        actual_cash: ''
    });

    const handleOpenShift = (e) => {
        e.preventDefault();
        openForm.post('/cash-drawer/open', {
            onSuccess: () => {
                toast.success('Shift opened successfully!');
                openForm.reset();
            },
            onError: (err) => toast.error(err.starting_cash || 'Failed to open shift.')
        });
    };

    const handleLogExpense = (e) => {
        e.preventDefault();
        expenseForm.post('/expenses', {
            onSuccess: () => {
                toast.success('Expense logged successfully!');
                expenseForm.reset('amount', 'description');
            },
            onError: (err) => toast.error(err.amount || 'Failed to log expense.')
        });
    };

    const handleCloseShift = (e) => {
        e.preventDefault();
        setShowConfirmClose(true);
    };

    const executeCloseShift = () => {
        closeForm.post('/cash-drawer/close', {
            onSuccess: () => {
                toast.success('Shift closed successfully!');
                closeForm.reset();
                setShowConfirmClose(false);
            },
            onError: (err) => {
                toast.error(err.actual_cash || 'Failed to close shift.');
                setShowConfirmClose(false);
            }
        });
    };

    // Calculate live totals for active shift
    const startingCash = Number(activeDrawer?.starting_cash || 0);
    const cashSales = Number(activeDrawer?.cash_sales || 0);
    
    // Sum only operating expenses for the 'Shift Expenses' tile
    const operatingExpenses = Number(activeDrawer?.expenses?.filter(e => e.category !== 'Refund' && e.category !== 'Cash In').reduce((a, b) => a + Number(b.amount), 0) || 0);
    const totalExpenses = Number(activeDrawer?.expenses?.filter(e => e.category !== 'Cash In').reduce((a, b) => a + Number(b.amount), 0) || 0);
    const cashIns = Number(activeDrawer?.expenses?.filter(e => e.category === 'Cash In').reduce((a, b) => a + Number(b.amount), 0) || 0);
    
    // Handle 0 correctly for calculated_expected
    const expectedCash = activeDrawer?.calculated_expected !== undefined && activeDrawer?.calculated_expected !== null
        ? Number(activeDrawer.calculated_expected) 
        : (startingCash + cashSales + cashIns - operatingExpenses);
        
    const countedCash = Number(closeForm.data.actual_cash || 0);
    const variance = closeForm.data.actual_cash ? (countedCash - expectedCash) : 0;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Shift Management" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                
                {/* Header */}
                <PageHeader 
                    title="Shift Management" 
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
                        { label: 'Shift Management' }
                    ]}
                    actions={
                        <Link 
                            href={route('cash-drawer.history')} 
                            className="saas-btn saas-btn-glass"
                        >
                            <HistoryIcon size={16} />
                            <span>Shift History</span>
                        </Link>
                    }
                />

                {!activeDrawer ? (
                    /* Shift Start Card (No active shift) */
                    <div className="max-w-md mx-auto my-12">
                        <Card className="p-8 text-center border-slate-200/80 shadow-xl space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
                                <Wallet size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Start New Sales Shift</h2>
                                <p className="text-xs text-slate-500 mt-1">Enter your opening cash drawer balance to activate POS checkout and track cash flow.</p>
                            </div>
                            
                            <form onSubmit={handleOpenShift} className="space-y-4 text-left">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Starting Cash Balance (UGX) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            required
                                            placeholder="e.g. 50000"
                                            className="w-full pl-12 pr-4 py-3 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm transition-all"
                                            value={openForm.data.starting_cash}
                                            onChange={e => openForm.setData('starting_cash', e.target.value)}
                                        />
                                    </div>
                                    {openForm.errors.starting_cash && <p className="text-xs text-rose-500 mt-1">{openForm.errors.starting_cash}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={openForm.processing}
                                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
                                >
                                    <Wallet size={18} />
                                    {openForm.processing ? 'Opening Shift...' : 'Open Shift'}
                                </button>
                            </form>
                        </Card>
                    </div>
                ) : (
                    /* Live Active Shift Dashboard */
                    <div className="space-y-8">
                        
                        {/* Active Shift Status Bar */}
                        {/* Active Shift Status Bar */}
                        <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Shift Active</h2>
                                        <Badge variant="success">LIVE SHIFT</Badge>
                                    </div>
                                    <p className="text-xs text-slate-500">Opened by <span className="font-semibold text-slate-700 dark:text-slate-200">{auth.user.name}</span> at {new Date(activeDrawer.opened_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 font-mono">
                                    Drawer ID: #{activeDrawer.id}
                                </div>
                                <a
                                    href={`/cash-drawer/${activeDrawer.id}/report`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                    title="Download End-of-Day Shift Report (PDF)"
                                >
                                    <FileDown size={14} />
                                    Download PDF Report
                                </a>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const el = document.getElementById('close-shift-section');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                >
                                    <XCircle size={14} />
                                    End & Close Shift
                                </button>
                            </div>
                        </Card>

                        {/* Stale Shift Reminder Alert */}
                        {activeDrawer.is_stale && (
                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle size={22} className="text-amber-600 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold">Shift has been open for {activeDrawer.hours_open || 24}+ hours</h4>
                                        <p className="text-xs opacity-90 mt-0.5">Shifts are designed to be reconciled at the end of each business day to keep accounting, cash counts, and daily profit/loss audits distinct.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const el = document.getElementById('close-shift-section');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm"
                                >
                                    Reconcile Actual Cash Now
                                </button>
                            </div>
                        )}

                        {/* 4 Metric Overview Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            
                            {/* Card 1: Total Shift Revenue (All Channels) */}
                            <Card className="relative overflow-hidden group border-emerald-200/60 dark:border-emerald-800/40">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Total Shift Revenue</h6>
                                        <div className="flex items-baseline gap-1">
                                            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                {Number(activeDrawer?.total_shift_sales || 0).toLocaleString()}
                                            </h3>
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">UGX</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                                        <TrendingUp size={20} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <Badge variant="success">Gross Sales</Badge> 
                                    <span>{activeDrawer?.total_sales_count || 0} completed sale{activeDrawer?.total_sales_count === 1 ? '' : 's'}</span>
                                </div>
                            </Card>

                            {/* Card 2: Opening Cash Float */}
                            <Card className="relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Opening Cash Float</h6>
                                        <div className="flex items-baseline gap-1">
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{startingCash.toLocaleString()}</h3>
                                            <span className="text-xs text-slate-500 font-medium">UGX</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md group-hover:scale-105 transition-transform">
                                        <Wallet size={20} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                    <Badge variant="default">Drawer Float</Badge> 
                                    {cashIns > 0 ? `+${cashIns.toLocaleString()} top-up added` : 'Initial Balance'}
                                </div>
                            </Card>

                            {/* Card 3: Till Cash Outflows */}
                            <Card className="relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Till Cash Outflows</h6>
                                        <div className="flex items-baseline gap-1">
                                            <h3 className="text-2xl font-bold text-rose-600">{operatingExpenses > 0 ? `-${operatingExpenses.toLocaleString()}` : '0'}</h3>
                                            <span className="text-xs text-rose-600 font-medium">UGX</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                                        <Receipt size={20} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                    <Badge variant="danger">Register Outflow</Badge> Expenses & Payouts
                                </div>
                            </Card>

                            {/* Card 4: Expected Cash in Till */}
                            <Card className="relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Expected Cash in Till</h6>
                                        <div className="flex items-baseline gap-1">
                                            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{expectedCash.toLocaleString()}</h3>
                                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">UGX</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                        <Calculator size={20} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                    <Badge variant="primary">Physical Target</Badge> Cash to Reconcile
                                </div>
                            </Card>

                        </div>

                        {/* Shift Revenue by Payment Channel Card */}
                        <Card className="p-5 border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <CreditCard size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Shift Sales By Payment Channel</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Breakdown of where collected shift revenue is stored (Physical Till vs Digital Float)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 font-medium">Combined Total:</span>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                        UGX {Number(activeDrawer?.total_shift_sales || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 transition-all hover:shadow-sm">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Physical Cash</span>
                                        <Banknote size={16} className="text-emerald-600" />
                                    </div>
                                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 block">
                                        UGX {cashSales.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-0.5 block">
                                        Counted in Till Target
                                    </span>
                                </div>

                                <div className="bg-rose-50/60 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200/70 dark:border-rose-800/60 transition-all hover:shadow-sm">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Airtel Money</span>
                                        <Smartphone size={16} className="text-rose-600" />
                                    </div>
                                    <span className="text-lg font-black text-rose-700 dark:text-rose-300 block">
                                        UGX {Number(activeDrawer?.airtel_sales || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-0.5 block">
                                        Treasury Digital Float
                                    </span>
                                </div>

                                <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/70 dark:border-amber-800/60 transition-all hover:shadow-sm">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">MTN MoMo</span>
                                        <Smartphone size={16} className="text-amber-600" />
                                    </div>
                                    <span className="text-lg font-black text-amber-700 dark:text-amber-300 block">
                                        UGX {Number(activeDrawer?.momo_sales || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium mt-0.5 block">
                                        Treasury Digital Float
                                    </span>
                                </div>

                                <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-800/60 transition-all hover:shadow-sm">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Bank / Card</span>
                                        <Building2 size={16} className="text-indigo-600" />
                                    </div>
                                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 block">
                                        UGX {Number(activeDrawer?.bank_sales || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 font-medium mt-0.5 block">
                                        Direct Bank Settlement
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Main Grid: Expenses Table & Actions Column */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Left Column: Logged Expenses Table */}
                            <Card noPadding className="lg:col-span-7 flex flex-col justify-between overflow-hidden">
                                <div>
                                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                                                <Receipt size={18} />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Shift Expenses Log</h3>
                                        </div>
                                        {activeDrawer.expenses?.length > 0 && (
                                            <span className="text-xs font-bold bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-200">
                                                {activeDrawer.expenses.length} Logged
                                            </span>
                                        )}
                                    </div>

                                    {activeDrawer.expenses?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                        <th className="px-5 py-3">Category</th>
                                                        <th className="px-5 py-3">Description</th>
                                                        <th className="px-5 py-3 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {activeDrawer.expenses.map((expense) => (
                                                        <tr key={expense.id} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                                                                <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs border ${
                                                                    expense.category === 'Cash In' 
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                                                }`}>
                                                                    {expense.category}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-slate-600 text-xs">
                                                                {expense.description || <span className="text-slate-400 italic">No description</span>}
                                                            </td>
                                                            <td className={`px-5 py-3.5 text-right font-bold text-sm ${expense.category === 'Cash In' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {expense.category === 'Cash In' ? '+' : '-'} UGX {Number(expense.amount).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 px-4 text-slate-400">
                                            <Receipt size={40} className="mx-auto mb-2 text-slate-300" />
                                            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No expenses logged yet</p>
                                            <p className="text-xs text-slate-400 mt-1">Use the Log Expense form on the right to add shop expenses.</p>
                                        </div>
                                    )}
                                </div>

                                {activeDrawer.expenses?.length > 0 && (
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm font-bold text-slate-700">
                                        <span>Total Shift Outflow:</span>
                                        <span className="text-rose-600 font-extrabold text-base">UGX {totalExpenses.toLocaleString()}</span>
                                    </div>
                                )}
                            </Card>

                            {/* Right Column: Actions (Log Expense & Close Shift) */}
                            <div className="lg:col-span-5 space-y-6">
                                
                                {/* Log Expense Form Card */}
                                <Card className="space-y-4">
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                                            <Plus size={18} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">Log Cash Transaction</h3>
                                    </div>
                                    
                                    <form onSubmit={handleLogExpense} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Transaction Type / Category *</label>
                                            <select 
                                                className="w-full bg-white border border-slate-300 focus:border-rose-500 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold shadow-sm"
                                                value={expenseForm.data.category}
                                                onChange={e => expenseForm.setData('category', e.target.value)}
                                            >
                                                <optgroup label="Additions">
                                                    <option value="Cash In">Cash In (Float Addition)</option>
                                                </optgroup>
                                                <optgroup label="Expenses / Outflows">
                                                    <option value="Shop Supplies">Shop Supplies</option>
                                                    <option value="Meals / Food">Meals / Food</option>
                                                    <option value="Transport">Transport</option>
                                                    <option value="Utilities">Utilities</option>
                                                    <option value="Other">Other Expense</option>
                                                </optgroup>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (UGX) *</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    required
                                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border border-slate-300 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm"
                                                    value={expenseForm.data.amount}
                                                    onChange={e => expenseForm.setData('amount', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                                            <input 
                                                type="text"
                                                className="w-full bg-white border border-slate-300 focus:border-rose-500 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-sm font-medium shadow-sm"
                                                value={expenseForm.data.description}
                                                onChange={e => expenseForm.setData('description', e.target.value)}
                                                placeholder="e.g. Lunch or cleaning supplies"
                                            />
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={expenseForm.processing}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                                        >
                                            <Receipt size={16} />
                                            {expenseForm.processing ? 'Saving...' : (expenseForm.data.category === 'Cash In' ? 'Save Cash In' : 'Save Expense')}
                                        </button>
                                    </form>
                                </Card>

                                {/* Close Shift Form Card */}
                                <Card id="close-shift-section" className="border-rose-200/80 dark:border-rose-900/40 space-y-4 scroll-mt-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                                                <XCircle size={18} />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">End & Close Shift</h3>
                                        </div>
                                        <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">Final Audit</span>
                                    </div>

                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Count physical cash in your drawer and enter it below to reconcile and close this shift.
                                    </p>

                                    <form onSubmit={handleCloseShift} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Actual Cash Counted (UGX) *</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    required 
                                                    placeholder="0"
                                                    className="w-full pl-12 pr-3.5 py-2.5 text-center text-base font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm"
                                                    value={closeForm.data.actual_cash}
                                                    onChange={e => closeForm.setData('actual_cash', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {closeForm.data.actual_cash !== '' && (
                                            <div className={`p-3 rounded-xl border flex justify-between items-center text-xs font-bold ${
                                                variance === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' :
                                                variance < 0 ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300' :
                                                'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                                            }`}>
                                                <span>Reconciliation Variance:</span>
                                                <span className="font-extrabold text-sm">
                                                    {variance === 0 ? 'Perfect Match ✓' : `${variance > 0 ? '+' : ''}${variance.toLocaleString()} UGX`}
                                                </span>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Closing Notes (Optional)</label>
                                            <textarea 
                                                rows="2" 
                                                className="w-full px-3.5 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-rose-500 focus:ring-rose-500 shadow-sm" 
                                                placeholder="e.g. 5,000 UGX shortage due to loose coin rounding..."
                                                value={closeForm.data.notes}
                                                onChange={e => closeForm.setData('notes', e.target.value)}
                                            ></textarea>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={closeForm.processing}
                                            className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <XCircle size={16} />
                                            {closeForm.processing ? 'Closing Shift...' : 'Confirm & Close Shift'}
                                        </button>
                                    </form>
                                </Card>

                            </div>
                        </div>

                    </div>
                )}
            </div>

            <Modal show={showConfirmClose} onClose={() => setShowConfirmClose(false)} maxWidth="sm">
                <div className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Close Shift?</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Are you sure you want to close this shift? Make sure you have correctly counted your physical cash. This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setShowConfirmClose(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            disabled={closeForm.processing}
                            onClick={executeCloseShift}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            {closeForm.processing ? 'Closing...' : 'Yes, Close Shift'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
