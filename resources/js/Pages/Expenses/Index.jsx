import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import {
    Receipt, Plus, Pencil, Trash2, Download, Search, Filter,
    TrendingDown, DollarSign, Calendar, Tag, X,
    AlertTriangle, ShoppingBag, Lock, Wallet
} from 'lucide-react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';
import Modal from '@/Components/Modal';
import toast from 'react-hot-toast';

const PROTECTED_CATEGORIES = ['Dealer Settlement', 'Supplier Payment', 'Refund', 'Refund (Past Shift)'];
const EDITABLE_OUTFLOW_CATEGORIES = ['Shop Supplies', 'Meals / Food', 'Transport', 'Utilities', 'Other'];

const categoryColor = (cat) => {
    if (cat === 'Cash In') return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (cat?.includes('Refund')) return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    if (cat === 'Dealer Settlement' || cat === 'Supplier Payment') return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};

export default function Index({ auth, expenses, summary, filters, cashiers, categories, is_admin_or_manager, accounts = [] }) {
    const [showAddModal, setShowAddModal]       = useState(false);
    const [showEditModal, setShowEditModal]     = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selected, setSelected]               = useState(null);

    // Identify counter till (Main Cash Register) vs funding accounts (Shop Safe, Bank, MTN, Airtel)
    const tillAccount = accounts.find(a => a.name === 'Main Cash Register')
                     || accounts.find(a => (a.provider === 'Cash' || a.type === 'cash') && !a.name.toLowerCase().includes('safe'));
    const fundingAccounts = accounts.filter(a => a.id !== tillAccount?.id && Number(a.current_balance) > 0);

    // Search / filter state
    const [search, setSearch]         = useState(filters?.search || '');
    const [category, setCategory]     = useState(filters?.category || 'all');
    const [cashierId, setCashierId]   = useState(filters?.cashier_id || 'all');
    const [dateFrom, setDateFrom]     = useState(filters?.date_from || '');
    const [dateTo, setDateTo]         = useState(filters?.date_to || '');
    const [dateFilter, setDateFilter] = useState(filters?.date_filter || '');

    // Add form
    const addForm = useForm({ amount: '', category: 'Shop Supplies', description: '', source_account_id: '', payment_account_id: tillAccount?.id || '' });
    // Edit form
    const editForm = useForm({ amount: '', category: '', description: '' });

    // Auto-apply: debounce search, immediate for all other filters
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) { isFirstRun.current = false; return; }
        const isSearchChange = search !== (filters?.search || '');
        const delay = isSearchChange ? 350 : 0;
        const timer = setTimeout(() => {
            router.get(route('expenses.index'), {
                search: search || undefined,
                category: category !== 'all' ? category : undefined,
                cashier_id: cashierId !== 'all' ? cashierId : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                date_filter: dateFilter || undefined,
            }, { preserveState: true, preserveScroll: true, replace: true });
        }, delay);
        return () => clearTimeout(timer);
    }, [search, category, cashierId, dateFrom, dateTo, dateFilter]);

    const clearFilters = () => {
        setSearch(''); setCategory('all'); setCashierId('all');
        setDateFrom(''); setDateTo(''); setDateFilter('');
    };

    const isProtected = (exp) => PROTECTED_CATEGORIES.includes(exp?.category);

    const isToday = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    };

    const canEditExpense = (exp) => is_admin_or_manager && !isProtected(exp);

    const canDeleteExpense = (exp) => {
        if (isProtected(exp)) return false;
        if (is_admin_or_manager) return true;
        return Number(exp.user_id) === Number(auth?.user?.id) && isToday(exp.expense_date) && exp.category !== 'Cash In';
    };

    const handleAdd = (e) => {
        e.preventDefault();
        addForm.post('/expenses', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(addForm.data.category === 'Cash In' ? 'Cash In float added successfully!' : 'Expense logged!');
                setShowAddModal(false);
                addForm.reset();
            },
            onError: (err) => toast.error(Object.values(err)[0] || 'Failed to log expense.')
        });
    };

    const openEdit = (expense) => {
        editForm.clearErrors();
        setSelected(expense);
        editForm.setData({ amount: expense.amount, category: expense.category, description: expense.description || '' });
        setShowEditModal(true);
    };

    const handleEdit = (e) => {
        e.preventDefault();
        if (!selected) return;
        editForm.put(`/api/expenses/${selected.id}`, {
            preserveScroll: true,
            onSuccess: () => { toast.success('Expense updated!'); setShowEditModal(false); },
            onError: (err) => toast.error(Object.values(err)[0] || 'Failed to update.')
        });
    };

    const openDelete = (expense) => { setSelected(expense); setShowDeleteModal(true); };

    const handleDelete = () => {
        if (!selected) return;
        router.delete(`/api/expenses/${selected.id}`, {
            preserveScroll: true,
            onSuccess: () => { toast.success('Expense deleted.'); setShowDeleteModal(false); },
            onError: (err) => toast.error(Object.values(err)[0] || 'Could not delete this expense.')
        });
    };

    const hasFilters = search || category !== 'all' || cashierId !== 'all' || dateFrom || dateTo || dateFilter;
    const fmt = (n) => Number(n || 0).toLocaleString();

    const exportParams = new URLSearchParams();
    if (search) exportParams.set('search', search);
    if (category && category !== 'all') exportParams.set('category', category);
    if (cashierId && cashierId !== 'all') exportParams.set('cashier_id', cashierId);
    if (dateFilter) exportParams.set('date_filter', dateFilter);
    if (dateFrom) exportParams.set('date_from', dateFrom);
    if (dateTo) exportParams.set('date_to', dateTo);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Expense Management" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="Expense Management"
                    breadcrumbs={[
                        { label: 'Home', href: '/' },
                        { label: 'Expenses' }
                    ]}
                    actions={
                        <div className="flex items-center gap-2.5">
                            {is_admin_or_manager && (
                                <a
                                    href={`/api/expenses/export?${exportParams.toString()}`}
                                    className="saas-btn saas-btn-success"
                                >
                                    <Download size={16} />
                                    Export Excel
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => { addForm.clearErrors(); setShowAddModal(true); }}
                                className="saas-btn saas-btn-primary"
                            >
                                <Plus size={16} />
                                Log Expense
                            </button>
                        </div>
                    }
                />

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Card
                        className={`relative overflow-hidden group cursor-pointer transition-all ${dateFilter === 'today' ? 'ring-2 ring-rose-500' : 'hover:ring-2 hover:ring-rose-400/50'}`}
                        onClick={() => { setDateFilter(dateFilter === 'today' ? '' : 'today'); setDateFrom(''); setDateTo(''); }}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider mb-1">Today's Expenses</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">{fmt(summary.today_total)}</h3>
                                    <span className="text-xs text-rose-500 font-medium">UGX</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md group-hover:scale-105 transition-transform">
                                <TrendingDown size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Outflows logged today</div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider mb-1">Operating Expenses</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{fmt(summary.operating)}</h3>
                                    <span className="text-xs text-orange-500 font-medium">UGX</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md group-hover:scale-105 transition-transform">
                                <ShoppingBag size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Excludes refunds & settlements</div>
                    </Card>

                    <Card
                        className={`relative overflow-hidden group cursor-pointer transition-all ${category === 'Refund' ? 'ring-2 ring-red-500' : 'hover:ring-2 hover:ring-red-400/50'}`}
                        onClick={() => setCategory(category === 'Refund' ? 'all' : 'Refund')}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider mb-1">Refunds Paid</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{fmt(summary.refunds)}</h3>
                                    <span className="text-xs text-red-500 font-medium">UGX</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-md group-hover:scale-105 transition-transform">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customer refunds in view</div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider mb-1">Top Category (Month)</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">{summary.top_category || '—'}</h3>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md group-hover:scale-105 transition-transform">
                                <Tag size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {summary.top_category ? `UGX ${fmt(summary.top_category_amt)} spent` : 'No data this month'}
                        </div>
                    </Card>
                </div>

                {/* Standalone Filter Card */}
                <Card>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                            {/* Search */}
                            <div className="relative sm:col-span-2 lg:col-span-4">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search description or category..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="saas-input !pl-10 w-full"
                                />
                            </div>

                            {/* Category */}
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className={`saas-input ${is_admin_or_manager ? 'lg:col-span-3' : 'lg:col-span-4'}`}
                            >
                                <option value="all">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            {/* Cashier (admin only) */}
                            {is_admin_or_manager && (
                                <select
                                    value={cashierId}
                                    onChange={e => setCashierId(e.target.value)}
                                    className="saas-input lg:col-span-2"
                                >
                                    <option value="all">All Staff</option>
                                    {cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            )}

                            {/* Date shortcut */}
                            <select
                                value={dateFilter}
                                onChange={e => { setDateFilter(e.target.value); setDateFrom(''); setDateTo(''); }}
                                className={`saas-input ${is_admin_or_manager ? 'lg:col-span-3' : 'lg:col-span-4'}`}
                            >
                                <option value="">All Dates</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="this_week">This Week</option>
                                <option value="this_month">This Month</option>
                            </select>
                        </div>

                        {/* Custom Date Range & Active Filter Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Custom Range:</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => { setDateFrom(e.target.value); setDateFilter(''); }}
                                    title="From date"
                                    className="saas-input !py-2 !px-3 !text-xs !w-40"
                                />
                                <span className="text-xs text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => { setDateTo(e.target.value); setDateFilter(''); }}
                                    title="To date"
                                    className="saas-input !py-2 !px-3 !text-xs !w-40"
                                />
                            </div>

                            {hasFilters && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {expenses.total} matching entr{expenses.total === 1 ? 'y' : 'ies'}
                                    </span>
                                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                                        <X size={13} className="mr-1" /> Clear Filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Desktop Expenses Table */}
                <div className="hidden md:block">
                    <DataTable
                        headers={[
                            'Date',
                            'Staff',
                            'Account / Drawer',
                            'Category',
                            'Description',
                            { label: 'Amount', className: 'text-right' },
                            { label: 'Actions', className: 'text-center' },
                        ]}
                        isEmpty={!expenses.data || expenses.data.length === 0}
                        emptyState={
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                                <Receipt size={44} className="mb-3 text-slate-300 dark:text-slate-600" />
                                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No expenses found</p>
                                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or log a new expense.</p>
                            </div>
                        }
                    >
                        {expenses.data.map((expense) => (
                            <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={13} className="text-slate-400 shrink-0" />
                                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                            {new Date(expense.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{expense.user?.name || '—'}</span>
                                </td>
                                <td>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {expense.payment_account?.name && (
                                            <Badge variant="neutral">
                                                <Wallet size={11} className="mr-1 inline text-slate-400" />
                                                {expense.payment_account.name}
                                            </Badge>
                                        )}
                                        {expense.cash_drawer_id && (
                                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                #{expense.cash_drawer_id}
                                            </span>
                                        )}
                                        {!expense.payment_account?.name && !expense.cash_drawer_id && (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${categoryColor(expense.category)}`}>
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] truncate" title={expense.description || ''}>
                                    {expense.description || <span className="italic text-slate-400">No description</span>}
                                </td>
                                <td className="text-right">
                                    <span className={`font-extrabold text-sm font-mono ${expense.category === 'Cash In' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {expense.category === 'Cash In' ? '+' : '–'}UGX {fmt(expense.amount)}
                                    </span>
                                </td>
                                <td className="text-center">
                                    {isProtected(expense) ? (
                                        <Badge variant="neutral" title="Managed from its source module (Dealers, Suppliers, or Receipts)">
                                            <Lock size={10} className="mr-1 inline" /> System
                                        </Badge>
                                    ) : (
                                        <div className="flex items-center justify-center gap-1.5">
                                            {canEditExpense(expense) && (
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(expense)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                            )}
                                            {canDeleteExpense(expense) && (
                                                <button
                                                    type="button"
                                                    onClick={() => openDelete(expense)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                </div>

                {/* Mobile Cards View */}
                <Card noPadding className="md:hidden overflow-hidden">
                    {expenses.data.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {expenses.data.map((expense) => (
                                <div key={expense.id} className="p-4 space-y-2 bg-white dark:bg-slate-900">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${categoryColor(expense.category)}`}>
                                                {expense.category}
                                            </span>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                                {expense.description || <span className="italic text-slate-400">No description</span>}
                                            </p>
                                        </div>
                                        <span className={`font-extrabold text-sm font-mono shrink-0 ${expense.category === 'Cash In' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {expense.category === 'Cash In' ? '+' : '–'}UGX {fmt(expense.amount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                        <span>
                                            {new Date(expense.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {expense.user?.name || '—'}
                                            {expense.payment_account?.name ? ` • ${expense.payment_account.name}` : ''}
                                        </span>
                                        {isProtected(expense) ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                <Lock size={10} /> System
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                {canEditExpense(expense) && (
                                                    <button type="button" onClick={() => openEdit(expense)} className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                                                        <Pencil size={13} />
                                                    </button>
                                                )}
                                                {canDeleteExpense(expense) && (
                                                    <button type="button" onClick={() => openDelete(expense)} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300">
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                            <Receipt size={40} className="mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No expenses found</p>
                        </div>
                    )}
                </Card>

                {/* Pagination */}
                <Pagination data={expenses} className="mt-2" />
            </div>

            {/* ── Add Expense Modal ──────────────────────────── */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm">
                <div className="p-6 space-y-5 dark:bg-slate-900">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log New Expense</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Record a cash outflow or float addition</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Category *</label>
                            <select
                                value={addForm.data.category}
                                onChange={e => {
                                    const cat = e.target.value;
                                    addForm.setData(data => ({
                                        ...data,
                                        category: cat,
                                        source_account_id: cat === 'Cash In' && !data.source_account_id
                                            ? (fundingAccounts[0]?.id ? String(fundingAccounts[0].id) : 'external')
                                            : data.source_account_id
                                    }));
                                }}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-400 focus:ring-rose-400"
                            >
                                <optgroup label="Additions">
                                    <option value="Cash In">Cash In (Float Addition)</option>
                                </optgroup>
                                <optgroup label="Expenses / Outflows">
                                    {EDITABLE_OUTFLOW_CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                            </select>
                            {addForm.errors.category && <p className="text-xs text-rose-500">{addForm.errors.category}</p>}
                        </div>

                        {/* Float Source Selector when Cash In is chosen */}
                        {addForm.data.category === 'Cash In' && (
                            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                                    <span>Float Source (Where is money from?) *</span>
                                </label>
                                <select
                                    className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                                    value={addForm.data.source_account_id}
                                    onChange={e => addForm.setData('source_account_id', e.target.value)}
                                    required
                                >
                                    {fundingAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} (Balance: UGX {Number(acc.current_balance).toLocaleString()})
                                        </option>
                                    ))}
                                    <option value="external">External / Owner Cash (Direct Injection)</option>
                                </select>
                                {addForm.errors.source_account_id && (
                                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1">{addForm.errors.source_account_id}</p>
                                )}
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                    {addForm.data.source_account_id === 'external'
                                        ? 'Direct addition to Cash without deducting any account.'
                                        : `Transfers UGX ${Number(addForm.data.amount || 0).toLocaleString()} from ${accounts.find(a => String(a.id) === String(addForm.data.source_account_id))?.name || 'account'} to Main Cash Register.`}
                                </p>
                            </div>
                        )}

                        {/* Paid From Account Selector for Regular Expenses */}
                        {addForm.data.category !== 'Cash In' && accounts.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Paid From Account *</label>
                                <select
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-400 focus:ring-rose-400"
                                    value={addForm.data.payment_account_id || (tillAccount?.id || '')}
                                    onChange={e => addForm.setData('payment_account_id', e.target.value)}
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} ({acc.provider || acc.type}) — Bal: UGX {Number(acc.current_balance || 0).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                                {addForm.errors.payment_account_id && <p className="text-xs text-rose-500 font-bold">{addForm.errors.payment_account_id}</p>}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Amount (UGX) *</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    required
                                    value={addForm.data.amount}
                                    onChange={e => addForm.setData('amount', e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:border-rose-400 focus:ring-rose-400 shadow-sm"
                                />
                            </div>
                            {addForm.errors.amount && <p className="text-xs text-rose-500">{addForm.errors.amount}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={addForm.data.description}
                                onChange={e => addForm.setData('description', e.target.value)}
                                placeholder="e.g. Lunch for staff, cleaning supplies..."
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-400 focus:ring-rose-400"
                            />
                        </div>

                        {addForm.errors.drawer && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                {addForm.errors.drawer}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={addForm.processing}
                                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                <Plus size={15} />
                                {addForm.processing ? 'Logging...' : 'Log Expense'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* ── Edit Expense Modal ─────────────────────────── */}
            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm">
                <div className="p-6 space-y-5 dark:bg-slate-900">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Pencil size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Expense</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Modify this entry and sync account balance</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Category *</label>
                            <select
                                value={editForm.data.category}
                                onChange={e => editForm.setData('category', e.target.value)}
                                disabled={selected?.category === 'Cash In'}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-400 focus:ring-rose-400 disabled:opacity-60"
                            >
                                {selected?.category === 'Cash In' ? (
                                    <option value="Cash In">Cash In</option>
                                ) : (
                                    EDITABLE_OUTFLOW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                                )}
                            </select>
                            {editForm.errors.category && <p className="text-xs text-rose-500">{editForm.errors.category}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Amount (UGX) *</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={editForm.data.amount}
                                    onChange={e => editForm.setData('amount', e.target.value)}
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:border-rose-400 focus:ring-rose-400 shadow-sm"
                                />
                            </div>
                            {editForm.errors.amount && <p className="text-xs text-rose-500">{editForm.errors.amount}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Description</label>
                            <input
                                type="text"
                                value={editForm.data.description}
                                onChange={e => editForm.setData('description', e.target.value)}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-400 focus:ring-rose-400"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowEditModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={editForm.processing}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                <Pencil size={15} />
                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* ── Delete Confirm Modal ───────────────────────── */}
            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth="sm">
                <div className="p-6 text-center space-y-4 dark:bg-slate-900">
                    <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Expense?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            This will permanently remove the expense of{' '}
                            <strong className="text-slate-900 dark:text-white">UGX {fmt(selected?.amount)}</strong> ({selected?.category}) and reverse its account balance impact.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowDeleteModal(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Cancel
                        </button>
                        <button type="button" onClick={handleDelete}
                            className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2">
                            <Trash2 size={15} />
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
