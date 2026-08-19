import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import {
    Receipt, Plus, Pencil, Trash2, Download, Search, Filter,
    TrendingDown, DollarSign, Calendar, Tag, ChevronDown, X,
    AlertTriangle, ShoppingBag, ArrowUpCircle
} from 'lucide-react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import toast from 'react-hot-toast';

const CATEGORIES = [
    'Cash In', 'Shop Supplies', 'Meals / Food', 'Transport',
    'Utilities', 'Refund', 'Refund (Past Shift)', 'Other'
];

const categoryColor = (cat) => {
    if (cat === 'Cash In') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (cat?.includes('Refund')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

export default function Index({ auth, expenses, summary, filters, cashiers, categories, is_admin_or_manager }) {
    const [showAddModal, setShowAddModal]     = useState(false);
    const [showEditModal, setShowEditModal]   = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selected, setSelected]             = useState(null);

    // Search / filter state
    const [search, setSearch]       = useState(filters?.search || '');
    const [category, setCategory]   = useState(filters?.category || 'all');
    const [cashierId, setCashierId] = useState(filters?.cashier_id || 'all');
    const [dateFrom, setDateFrom]   = useState(filters?.date_from || '');
    const [dateTo, setDateTo]       = useState(filters?.date_to || '');
    const [dateFilter, setDateFilter] = useState(filters?.date_filter || '');

    // Add form
    const addForm = useForm({ amount: '', category: 'Shop Supplies', description: '' });
    // Edit form
    const editForm = useForm({ amount: '', category: '', description: '' });

    // Auto-apply: debounce search, immediate for all other filters
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) { isFirstRun.current = false; return; }
        const isSearchChange = search !== (filters?.search || '');
        const delay = isSearchChange ? 400 : 0;
        const timer = setTimeout(() => {
            router.get(route('expenses.index'), {
                search, category, cashier_id: cashierId,
                date_from: dateFrom, date_to: dateTo, date_filter: dateFilter
            }, { preserveState: true, preserveScroll: true, replace: true });
        }, delay);
        return () => clearTimeout(timer);
    }, [search, category, cashierId, dateFrom, dateTo, dateFilter]);

    const clearFilters = () => {
        setSearch(''); setCategory('all'); setCashierId('all');
        setDateFrom(''); setDateTo(''); setDateFilter('');
    };

    const handleAdd = (e) => {
        e.preventDefault();
        addForm.post('/expenses', {
            onSuccess: () => { toast.success('Expense logged!'); setShowAddModal(false); addForm.reset(); },
            onError: (err) => toast.error(Object.values(err)[0] || 'Failed to log expense.')
        });
    };

    const openEdit = (expense) => {
        setSelected(expense);
        editForm.setData({ amount: expense.amount, category: expense.category, description: expense.description || '' });
        setShowEditModal(true);
    };

    const handleEdit = (e) => {
        e.preventDefault();
        editForm.put(`/api/expenses/${selected.id}`, {
            onSuccess: () => { toast.success('Expense updated!'); setShowEditModal(false); },
            onError: (err) => toast.error(Object.values(err)[0] || 'Failed to update.')
        });
    };

    const openDelete = (expense) => { setSelected(expense); setShowDeleteModal(true); };

    const handleDelete = () => {
        router.delete(`/api/expenses/${selected.id}`, {
            onSuccess: () => { toast.success('Expense deleted.'); setShowDeleteModal(false); },
            onError: () => toast.error('Could not delete this expense.')
        });
    };

    const hasFilters = search || category !== 'all' || cashierId !== 'all' || dateFrom || dateTo || dateFilter;

    const fmt = (n) => Number(n || 0).toLocaleString();

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Expense Management" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Header */}
                <PageHeader
                    title="Expense Management"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
                        { label: 'Expenses' }
                    ]}
                    actions={
                        <div className="flex items-center gap-2.5">
                            {is_admin_or_manager && (
                                <a
                                    href={`/api/expenses/export?${new URLSearchParams({ category, cashier_id: cashierId, date_from: dateFrom, date_to: dateTo }).toString()}`}
                                    className="saas-btn saas-btn-success"
                                >
                                    <Download size={16} />
                                    Export Excel
                                </a>
                            )}
                            <button
                                onClick={() => setShowAddModal(true)}
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
                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Today's Expenses</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-rose-600">{fmt(summary.today_total)}</h3>
                                    <span className="text-xs text-rose-500 font-medium">UGX</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md group-hover:scale-105 transition-transform">
                                <TrendingDown size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Outflows logged today</div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Operating Expenses</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-orange-600">{fmt(summary.operating)}</h3>
                                    <span className="text-xs text-orange-500 font-medium">UGX</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md group-hover:scale-105 transition-transform">
                                <ShoppingBag size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">In current filter view</div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Refunds Paid</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-red-600">{fmt(summary.refunds)}</h3>
                                    <span className="text-xs text-red-500 font-medium">UGX</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-md group-hover:scale-105 transition-transform">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Customer refunds in view</div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Top Category (Month)</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-lg font-bold text-indigo-600 truncate max-w-[140px]">{summary.top_category || '—'}</h3>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md group-hover:scale-105 transition-transform">
                                <Tag size={20} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            {summary.top_category ? `UGX ${fmt(summary.top_category_amt)} spent` : 'No data this month'}
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-slate-500" />
                            <span className="text-sm font-bold text-slate-700">Filters</span>
                            {hasFilters && (
                                <span className="text-xs bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full">Active</span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Search */}
                        <div className="relative lg:col-span-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search description..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-rose-400 focus:ring-rose-400 bg-slate-50"
                            />
                        </div>

                        {/* Category */}
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:border-rose-400 focus:ring-rose-400 font-medium"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        {/* Cashier (admin only) */}
                        {is_admin_or_manager && (
                            <select
                                value={cashierId}
                                onChange={e => setCashierId(e.target.value)}
                                className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:border-rose-400 focus:ring-rose-400 font-medium"
                            >
                                <option value="all">All Staff</option>
                                {cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}

                        {/* Date shortcut */}
                        <select
                            value={dateFilter}
                            onChange={e => { setDateFilter(e.target.value); setDateFrom(''); setDateTo(''); }}
                            className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:border-rose-400 focus:ring-rose-400 font-medium"
                        >
                            <option value="">All Dates</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                        </select>

                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <X size={14} />
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Expenses Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                                <Receipt size={18} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Expense Log</h3>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                            {expenses.total} Entries
                        </span>
                    </div>

                    {expenses.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <th className="px-5 py-3.5">Date</th>
                                        <th className="px-5 py-3.5">Cashier</th>
                                        <th className="px-5 py-3.5">Drawer</th>
                                        <th className="px-5 py-3.5">Category</th>
                                        <th className="px-5 py-3.5">Description</th>
                                        <th className="px-5 py-3.5 text-right">Amount</th>
                                        <th className="px-5 py-3.5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {expenses.data.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={13} className="text-slate-400 shrink-0" />
                                                    <span className="text-xs text-slate-600 font-medium">
                                                        {new Date(expense.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="font-semibold text-slate-800 text-xs">{expense.user?.name || '—'}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {expense.cash_drawer_id ? (
                                                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">#{expense.cash_drawer_id}</span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md border ${categoryColor(expense.category)}`}>
                                                    {expense.category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[200px] truncate">
                                                {expense.description || <span className="italic text-slate-300">No description</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`font-extrabold text-sm font-mono ${expense.category === 'Cash In' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {expense.category === 'Cash In' ? '+' : '–'}UGX {fmt(expense.amount)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {is_admin_or_manager && (
                                                        <button
                                                            onClick={() => openEdit(expense)}
                                                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openDelete(expense)}
                                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <Receipt size={48} className="mb-3 text-slate-300" />
                            <p className="text-base font-semibold text-slate-700">No expenses found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or log a new expense.</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {expenses.links && expenses.links.length > 3 && (
                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Showing {expenses.from}–{expenses.to} of {expenses.total}
                            </span>
                            <div className="flex items-center gap-1.5">
                                {expenses.links.map((link, k) => (
                                    <Link
                                        key={k}
                                        href={link.url || '#'}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                            link.active
                                                ? 'bg-rose-500 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
                                        } ${!link.url && 'opacity-40 cursor-not-allowed'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add Expense Modal ──────────────────────────── */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm">
                <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Log New Expense</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Record a cash outflow for today's shift</p>
                        </div>
                        <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category *</label>
                            <select
                                value={addForm.data.category}
                                onChange={e => addForm.setData('category', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-slate-50 focus:border-rose-400 focus:ring-rose-400"
                            >
                                <optgroup label="Additions">
                                    <option value="Cash In">Cash In (Float Addition)</option>
                                </optgroup>
                                <optgroup label="Expenses / Outflows">
                                    {CATEGORIES.filter(c => c !== 'Cash In' && !c.includes('Refund')).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                            </select>
                            {addForm.errors.category && <p className="text-xs text-rose-500">{addForm.errors.category}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (UGX) *</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    required
                                    value={addForm.data.amount}
                                    onChange={e => addForm.setData('amount', e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl bg-slate-50 focus:border-rose-400 focus:ring-rose-400 shadow-sm"
                                />
                            </div>
                            {addForm.errors.amount && <p className="text-xs text-rose-500">{addForm.errors.amount}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={addForm.data.description}
                                onChange={e => addForm.setData('description', e.target.value)}
                                placeholder="e.g. Lunch for staff, cleaning supplies..."
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:border-rose-400 focus:ring-rose-400"
                            />
                        </div>

                        {addForm.errors.drawer && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                {addForm.errors.drawer}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
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
                <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Edit Expense</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Modify this expense entry</p>
                        </div>
                        <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category *</label>
                            <select
                                value={editForm.data.category}
                                onChange={e => editForm.setData('category', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-slate-50 focus:border-rose-400 focus:ring-rose-400"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                                    value={editForm.data.amount}
                                    onChange={e => editForm.setData('amount', e.target.value)}
                                    className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl bg-slate-50 focus:border-rose-400 focus:ring-rose-400 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description</label>
                            <input
                                type="text"
                                value={editForm.data.description}
                                onChange={e => editForm.setData('description', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:border-rose-400 focus:ring-rose-400"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowEditModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
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
                <div className="p-6 text-center space-y-4">
                    <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Delete Expense?</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            This will permanently remove the expense of{' '}
                            <strong>UGX {fmt(selected?.amount)}</strong> ({selected?.category}).
                            This cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowDeleteModal(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleDelete}
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
