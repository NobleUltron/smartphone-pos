import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import {
    Plus,
    Building2,
    Phone,
    Mail,
    MapPin,
    Search,
    Trash2,
    Package,
    DollarSign,
    Pencil,
    ShoppingBag,
    AlertCircle,
    Calendar,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuppliersIndex({ auth, suppliers, filters = {}, summary }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [balanceFilter, setBalanceFilter] = useState(filters.balance_filter || 'all');
    const [isInitialRender, setIsInitialRender] = useState(true);

    const form = useForm({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        if (isInitialRender) {
            setIsInitialRender(false);
            return;
        }
        const timer = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (balanceFilter && balanceFilter !== 'all') params.balance_filter = balanceFilter;
            router.get('/suppliers', params, { preserveState: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, balanceFilter]);

    const openAddModal = () => {
        setEditingSupplier(null);
        form.reset();
        form.clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);
        form.clearErrors();
        form.setData({
            name: supplier.name || '',
            contact_name: supplier.contact_name || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
        });
        setIsModalOpen(true);
    };

    const submitForm = (e) => {
        e.preventDefault();
        if (editingSupplier) {
            form.put(`/api/suppliers/${editingSupplier.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setEditingSupplier(null);
                    form.reset();
                    toast.success('Supplier updated successfully');
                },
                onError: (errs) => {
                    const firstErr = Object.values(errs)[0];
                    toast.error(firstErr || 'Please check the supplier details');
                }
            });
        } else {
            form.post('/api/suppliers', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    form.reset();
                    toast.success('Supplier added successfully');
                },
                onError: (errs) => {
                    const firstErr = Object.values(errs)[0];
                    toast.error(firstErr || 'Please check the supplier details');
                }
            });
        }
    };

    const handleDelete = (supplier) => {
        if (Number(supplier.balance) > 0) {
            toast.error("Cannot delete a supplier with an outstanding balance.");
            return;
        }
        if (Number(supplier.purchases_count) > 0) {
            toast.error("Cannot delete a supplier with recorded purchase orders.");
            return;
        }
        if (confirm(`Are you sure you want to delete ${supplier.name}?`)) {
            router.delete(`/api/suppliers/${supplier.id}`, {
                onSuccess: () => toast.success('Supplier deleted'),
                onError: (err) => toast.error(err.error || 'Failed to delete supplier')
            });
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Suppliers" />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Suppliers"
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Suppliers' }]}
                    actions={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <Link
                                href={route('purchases.create')}
                                className="saas-btn saas-btn-glass"
                            >
                                <ShoppingBag size={16} /> Log Purchase
                            </Link>
                            <Button variant="primary" onClick={openAddModal}>
                                <Plus size={16} className="mr-2" /> Add Supplier
                            </Button>
                        </div>
                    }
                />

                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 mt-2">
                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Suppliers</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.total_suppliers || 0}</h3>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Building2 size={22} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="primary">Active</Badge>
                                <span>Vendors</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.05s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pending Orders</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.pending_orders || 0}</h3>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Package size={22} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="warning">Processing</Badge>
                                <span>Purchase Orders</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Payable</p>
                                    <h3 className={`text-2xl font-black flex items-baseline gap-1 ${Number(summary.total_payable || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {Number(summary.total_payable || 0).toLocaleString()} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">UGX</span>
                                    </h3>
                                </div>
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${Number(summary.total_payable || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
                                    <AlertCircle size={22} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant={Number(summary.total_payable || 0) > 0 ? 'danger' : 'success'}>
                                    {Number(summary.total_payable || 0) > 0 ? 'Owed' : 'Cleared'}
                                </Badge>
                                <span>Supplier Debt</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.15s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Spend</p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                                        {Number(summary.total_spend || 0).toLocaleString()} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">UGX</span>
                                    </h3>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <DollarSign size={22} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="success">Historical</Badge>
                                <span>Purchases</span>
                            </div>
                        </Card>
                    </div>
                )}

                <Card noPadding className="overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                            <div className="saas-input-icon-wrapper max-w-sm w-full">
                                <Search className="saas-input-icon" size={16} />
                                <input
                                    type="text"
                                    className="saas-input !py-2 text-sm"
                                    placeholder="Search name, contact, phone, email, address..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 w-fit">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'owing', label: 'Owing Balance' },
                                    { key: 'settled', label: 'Settled' },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setBalanceFilter(tab.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                            balanceFilter === tab.key
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Showing {suppliers.data.length} of {suppliers.total || suppliers.data.length} vendors
                        </div>
                    </div>

                    {suppliers.data.length > 0 ? (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Company</th>
                                            <th className="px-6 py-4 font-semibold">Contact Person</th>
                                            <th className="px-6 py-4 font-semibold">Contact Details</th>
                                            <th className="px-6 py-4 font-semibold">Purchase Activity</th>
                                            <th className="px-6 py-4 font-semibold text-right">Outstanding Balance</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {suppliers.data.map(supplier => (
                                            <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                                                            {supplier.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <Link
                                                                href={route('suppliers.show', supplier.id)}
                                                                className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                            >
                                                                {supplier.name}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-600 dark:text-slate-300 font-medium">{supplier.contact_name || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {supplier.phone && <div className="flex items-center gap-2"><Phone size={13} className="shrink-0" /> {supplier.phone}</div>}
                                                        {supplier.email && <div className="flex items-center gap-2"><Mail size={13} className="shrink-0" /> {supplier.email}</div>}
                                                        {supplier.address && <div className="flex items-center gap-2"><MapPin size={13} className="shrink-0" /> {supplier.address}</div>}
                                                        {!supplier.phone && !supplier.email && !supplier.address && <span>-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1 text-xs">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200">
                                                            {supplier.purchases_count || 0} Order{Number(supplier.purchases_count) === 1 ? '' : 's'}
                                                            {Number(supplier.purchases_sum_total_amount || 0) > 0 && (
                                                                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                                                    {' '}• {Number(supplier.purchases_sum_total_amount).toLocaleString()} UGX
                                                                </span>
                                                            )}
                                                        </div>
                                                        {supplier.purchases_max_purchase_date ? (
                                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                                <Calendar size={12} /> Last: {formatDate(supplier.purchases_max_purchase_date)}
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-400 dark:text-slate-500 italic">No purchases yet</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold">
                                                    {Number(supplier.balance) > 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                                                            {Number(supplier.balance).toLocaleString()} UGX
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                                            Settled ✓
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link
                                                            href={route('purchases.create', { supplier_id: supplier.id })}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                                                            title="Log Purchase for Supplier"
                                                        >
                                                            <ShoppingBag size={16} />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(supplier)}
                                                            className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors"
                                                            title="Edit Supplier"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <Link
                                                            href={route('suppliers.show', supplier.id)}
                                                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors"
                                                        >
                                                            View Details
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(supplier)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                                            title="Delete Supplier"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {suppliers.data.map(supplier => (
                                    <div key={supplier.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                                                    {supplier.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{supplier.name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{supplier.contact_name || 'No contact person'}</div>
                                                </div>
                                            </div>
                                            {Number(supplier.balance) > 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                                                    {Number(supplier.balance).toLocaleString()} UGX
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                                    Settled ✓
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                            {supplier.phone && <div className="flex items-center gap-2"><Phone size={12} /> {supplier.phone}</div>}
                                            {supplier.address && <div className="flex items-center gap-2"><MapPin size={12} /> {supplier.address}</div>}
                                            <div className="text-slate-600 dark:text-slate-300 font-semibold pt-1">
                                                {supplier.purchases_count || 0} Order(s) • Spend: {Number(supplier.purchases_sum_total_amount || 0).toLocaleString()} UGX
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={route('purchases.create', { supplier_id: supplier.id })}
                                                    className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1"
                                                >
                                                    <ShoppingBag size={13} /> Purchase
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(supplier)}
                                                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                            <Link
                                                href={route('suppliers.show', supplier.id)}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {suppliers.links && suppliers.links.length > 3 && (
                                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Showing {suppliers.from || 0} to {suppliers.to || 0} of {suppliers.total || 0}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {suppliers.links.map((link, idx) => (
                                            <Link
                                                key={idx}
                                                href={link.url || '#'}
                                                preserveScroll
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${link.active ? 'bg-indigo-600 text-white' : link.url ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' : 'opacity-40 pointer-events-none text-slate-400'}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                            <Building2 size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">No suppliers found</p>
                            <p className="mb-4">Add your first supplier or adjust your search and filter.</p>
                            <Button variant="primary" onClick={openAddModal}>
                                Add Supplier
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <Building2 size={20} className="text-indigo-500" />
                                    {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {editingSupplier ? 'Update wholesale vendor details.' : 'Register a wholesale vendor or equipment supplier.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={submitForm} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="saas-input w-full"
                                    value={form.data.name}
                                    onChange={e => form.setData('name', e.target.value)}
                                />
                                {form.errors.name && <p className="text-xs text-rose-500 mt-1">{form.errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
                                <input
                                    type="text"
                                    className="saas-input w-full"
                                    value={form.data.contact_name}
                                    onChange={e => form.setData('contact_name', e.target.value)}
                                />
                                {form.errors.contact_name && <p className="text-xs text-rose-500 mt-1">{form.errors.contact_name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        className="saas-input w-full"
                                        value={form.data.phone}
                                        onChange={e => form.setData('phone', e.target.value)}
                                    />
                                    {form.errors.phone && <p className="text-xs text-rose-500 mt-1">{form.errors.phone}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="saas-input w-full"
                                        value={form.data.email}
                                        onChange={e => form.setData('email', e.target.value)}
                                    />
                                    {form.errors.email && <p className="text-xs text-rose-500 mt-1">{form.errors.email}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                                <textarea
                                    className="saas-input w-full"
                                    rows="2"
                                    value={form.data.address}
                                    onChange={e => form.setData('address', e.target.value)}
                                ></textarea>
                                {form.errors.address && <p className="text-xs text-rose-500 mt-1">{form.errors.address}</p>}
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button variant="primary" type="submit" disabled={form.processing} icon={editingSupplier ? Pencil : Plus}>
                                    {editingSupplier ? 'Save Changes' : 'Save Supplier'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
