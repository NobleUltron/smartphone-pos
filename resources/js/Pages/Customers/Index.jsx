import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Users, Pencil, Trash2, Search, Plus, UserSquare, Phone, Mail, History, Receipt, X, DollarSign, TrendingUp, FileText, Printer, AlertTriangle } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import Modal from '@/Components/Modal';

export default function CustomersIndex({ auth, customers = {}, summary, filters = {} }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [typeFilter, setTypeFilter] = useState(filters?.type || 'all');
    const [sortBy, setSortBy] = useState(filters?.sort || 'newest');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            const params = {};
            if (search) params.search = search;
            if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
            if (sortBy && sortBy !== 'newest') params.sort = sortBy;

            router.get(route('customers.index'), params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [search, typeFilter, sortBy]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [deletingCustomer, setDeletingCustomer] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({ 
        id: null, 
        name: '', 
        company_name: '',
        phone: '', 
        email: '', 
        tin_number: '',
        credit_limit: '',
        payment_terms_days: 30,
        address: '' 
    });
    const [loading, setLoading] = useState(false);
    
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Customer Statement Modal State
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [statementCustomer, setStatementCustomer] = useState(null);
    const [statementFilter, setStatementFilter] = useState('all');
    const [statementStartDate, setStatementStartDate] = useState('');
    const [statementEndDate, setStatementEndDate] = useState('');

    const openStatementModal = (customer) => {
        setStatementCustomer(customer);
        setStatementFilter('all');
        setStatementStartDate('');
        setStatementEndDate('');
        setShowStatementModal(true);
    };

    const handleGenerateStatement = (mode = 'download') => {
        if (!statementCustomer) return;
        let url = route('customers.statement', statementCustomer.id) + `?status=${statementFilter}&mode=${mode}`;
        if (statementStartDate) url += `&start_date=${statementStartDate}`;
        if (statementEndDate) url += `&end_date=${statementEndDate}`;
        window.open(url, '_blank');
        setShowStatementModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return toast.error("Name and phone are required");

        setLoading(true);
        try {
            if (isEditing) {
                await axios.put(`/api/customers/${formData.id}`, formData);
                toast.success("Customer updated successfully");
            } else {
                await axios.post('/api/customers', formData);
                toast.success("Customer added successfully");
            }
            setShowEditModal(false);
            router.reload({ preserveScroll: true });
        } catch (error) {
            const firstErr = error.response?.data?.errors ? Object.values(error.response.data.errors)[0]?.[0] : null;
            toast.error(firstErr || error.response?.data?.message || "Error saving customer");
        }
        setLoading(false);
    };

    const handleEdit = (customer) => {
        setFormData({
            id: customer.id,
            name: customer.name || '',
            company_name: customer.company_name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            tin_number: customer.tin_number || '',
            credit_limit: customer.credit_limit || '',
            payment_terms_days: customer.payment_terms_days ?? 30,
            address: customer.address || ''
        });
        setIsEditing(true);
        setShowEditModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingCustomer) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/customers/${deletingCustomer.id}`);
            toast.success("Customer deleted successfully");
            setDeletingCustomer(null);
            router.reload({ preserveScroll: true });
        } catch (error) {
            toast.error(error.response?.data?.error || "Error deleting customer");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewHistory = async (customer) => {
        setSelectedCustomer(customer);
        setShowHistoryModal(true);
        setLoadingHistory(true);
        
        try {
            const response = await axios.get(`/api/customers/${customer.id}/history`);
            setCustomerHistory(response.data.history);
        } catch (error) {
            toast.error("Failed to load customer history");
        }
        setLoadingHistory(false);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Customer Management" />
            
            <PageHeader 
                title="Customers"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Customers' }]}
                actions={
                    <Button 
                        variant="primary" 
                        icon={Plus} 
                        onClick={() => {
                            setIsEditing(false);
                            setFormData({ 
                                id: null, 
                                name: '', 
                                company_name: '',
                                phone: '', 
                                email: '', 
                                tin_number: '',
                                credit_limit: '',
                                payment_terms_days: 30,
                                address: '' 
                            });
                            setShowEditModal(true);
                        }}
                    >
                        Add Customer
                    </Button>
                }
            />

            <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card
                            className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all"
                            style={{ animationDelay: '0.0s' }}
                            onClick={() => setTypeFilter('all')}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Customers</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.total_customers || 0}</h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="primary">{summary.corporate_customers || 0} Corporate</Badge>
                                <span>Registered Clients</span>
                            </div>
                        </Card>

                        <Card
                            className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-emerald-400/50 transition-all"
                            style={{ animationDelay: '0.1s' }}
                            onClick={() => setSortBy('top_spenders')}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Lifetime Value</p>
                                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('en-US').format(summary.total_ltv || 0)} <span className="text-sm font-normal text-slate-500">UGX</span>
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="success">Registered Sales</Badge>
                                <span>Click to rank top buyers</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Average Spend</p>
                                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('en-US').format(Math.round(summary.average_spend || 0))} <span className="text-sm font-normal text-slate-500">UGX</span>
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Badge variant="danger">Per Customer</Badge>
                                <span>Average LTV</span>
                            </div>
                        </Card>
                    </div>
                )}

                <Card noPadding className="animate-slide-up relative overflow-hidden" style={{ animationDelay: '0.3s' }}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                className="saas-input !pl-10 text-sm"
                                placeholder="Search customers by name, phone, email, or company..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Type Tabs */}
                            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'corporate', label: 'Corporate' },
                                    { key: 'individual', label: 'Individual' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setTypeFilter(tab.key)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            typeFilter === tab.key
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="saas-input !py-1.5 !text-xs !w-auto font-semibold"
                            >
                                <option value="newest">Newest First</option>
                                <option value="top_spenders">Top Spenders</option>
                                <option value="most_orders">Most Orders</option>
                            </select>

                            {(search || typeFilter !== 'all' || sortBy !== 'newest') && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); setTypeFilter('all'); setSortBy('newest'); }}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800">
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">Customer</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">Contact</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-center">Activity</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-right">Total Spent</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {customers.data?.map(customer => (
                                    <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&color=4F46E5&background=EEF2FF&rounded=true`} 
                                                    alt={customer.name} 
                                                    className="w-10 h-10 rounded-full shadow-sm shrink-0" 
                                                />
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                                        <span>{customer.name}</span>
                                                        {customer.company_name && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                {customer.company_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        Joined {new Date(customer.created_at).toLocaleDateString()}
                                                        {customer.tin_number && ` • TIN: ${customer.tin_number}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 gap-2">
                                                    <Phone size={14} className="text-slate-400 shrink-0" />
                                                    {customer.phone}
                                                </div>
                                                {customer.email && (
                                                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 gap-2">
                                                        <Mail size={14} className="text-slate-400 shrink-0" />
                                                        {customer.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <Badge variant={customer.sales_count > 0 ? "primary" : "neutral"}>
                                                    {customer.sales_count || 0} POS Order{customer.sales_count === 1 ? '' : 's'}
                                                </Badge>
                                                {customer.invoices_count > 0 && (
                                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                        {customer.invoices_count} Invoice{customer.invoices_count === 1 ? '' : 's'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                            {Number(customer.sales_sum_final_amount || 0).toLocaleString()} UGX
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button 
                                                    variant="primary"
                                                    onClick={() => handleViewHistory(customer)}
                                                    className="!px-3 !py-1.5 text-xs"
                                                >
                                                    <History size={14} /> History
                                                </Button>
                                                <Button 
                                                    variant="secondary"
                                                    onClick={() => openStatementModal(customer)}
                                                    className="!px-3 !py-1.5 text-xs"
                                                >
                                                    <FileText size={14} /> Statement
                                                </Button>
                                                <Button 
                                                    variant="secondary"
                                                    onClick={() => handleEdit(customer)}
                                                    className="!px-3 !py-1.5 text-xs"
                                                >
                                                    <Pencil size={14} /> Edit
                                                </Button>
                                                <Button 
                                                    variant="danger"
                                                    onClick={() => setDeletingCustomer(customer)}
                                                    className="!px-3 !py-1.5 text-xs"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!customers.data || customers.data.length === 0) && (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-500 dark:text-slate-400">
                                            <UserSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                            <p>No customers found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {customers.data?.map(customer => (
                            <div key={customer.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{customer.name}</p>
                                        {customer.company_name && (
                                            <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mt-0.5">
                                                {customer.company_name}
                                            </span>
                                        )}
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{customer.phone}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                                            {Number(customer.sales_sum_final_amount || 0).toLocaleString()} UGX
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {customer.sales_count || 0} orders{customer.invoices_count > 0 ? ` • ${customer.invoices_count} inv` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    <button type="button" onClick={() => handleViewHistory(customer)} className="py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1">
                                        <History size={13} /> History
                                    </button>
                                    <button type="button" onClick={() => openStatementModal(customer)} className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1">
                                        <FileText size={13} /> PDF
                                    </button>
                                    <button type="button" onClick={() => handleEdit(customer)} className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1">
                                        <Pencil size={13} /> Edit
                                    </button>
                                    <button type="button" onClick={() => setDeletingCustomer(customer)} className="py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!customers.data || customers.data.length === 0) && (
                            <div className="py-10 text-center text-sm text-slate-400">No customers found.</div>
                        )}
                    </div>

                    {/* Pagination Component */}
                    {customers.links && customers.links.length > 3 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Showing {customers.from || 0}–{customers.to || 0} of {customers.total || 0}
                            </span>
                            <nav className="inline-flex flex-wrap bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {customers.links.map((link, k) => (
                                    <Link 
                                        key={k}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
                                        className={`px-3.5 py-2 text-xs font-semibold border-r border-slate-200 dark:border-slate-700 last:border-0 ${
                                            link.active ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        } ${link.url === null ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </Card>
            </div>

            {/* Edit/Add Customer Modal */}
            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="md">
                <div className="p-6 dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <UserSquare size={20} />
                            </div>
                            {isEditing ? 'Edit Customer' : 'Add Customer'}
                        </h2>
                        <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Person Name *</label>
                            <input
                                type="text"
                                className="saas-input w-full"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Organization (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. MTN Uganda, Bank of Africa, SafeBoda"
                                className="saas-input w-full"
                                value={formData.company_name}
                                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                                <input
                                    type="text"
                                    className="saas-input w-full"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">TIN Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="URA 10-digit TIN"
                                    className="saas-input w-full"
                                    value={formData.tin_number}
                                    onChange={(e) => setFormData({...formData, tin_number: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address (Optional)</label>
                            <input
                                type="email"
                                className="saas-input w-full"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Credit Limit (UGX)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 5000000"
                                    className="saas-input w-full"
                                    value={formData.credit_limit}
                                    onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Credit Terms</label>
                                <select
                                    className="saas-input w-full"
                                    value={formData.payment_terms_days}
                                    onChange={(e) => setFormData({...formData, payment_terms_days: e.target.value})}
                                >
                                    <option value="0">Immediate / Cash</option>
                                    <option value="15">Net 15 Days</option>
                                    <option value="30">Net 30 Days</option>
                                    <option value="60">Net 60 Days</option>
                                    <option value="90">Net 90 Days</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Address (Optional)</label>
                            <textarea
                                className="saas-input w-full min-h-[80px]"
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                            <Button type="button" variant="neutral" onClick={() => setShowEditModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Customer'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* View History Modal */}
            <Modal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} maxWidth="5xl">
                <div className="flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                    
                    {/* Fixed Header */}
                    <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 relative overflow-hidden">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                <History size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Customer History</h2>
                                <p className="text-sm font-medium text-slate-400 mt-0.5">Purchases and interactions timeline</p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setShowHistoryModal(false)}
                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 relative z-10"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Modal Split View */}
                    <div className="flex-1 flex flex-col md:flex-row overflow-y-auto no-scrollbar bg-slate-50/30 dark:bg-slate-950/60">
                        
                        {/* Left Column: Read-Only Intake Details */}
                        <div className="w-full md:w-1/3 p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 space-y-8 overflow-y-auto no-scrollbar relative">
                            
                            {/* Customer Info */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Customer Profile</h3>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-center transition-all duration-300">
                                    {selectedCustomer && (
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl"></div>
                                            <img 
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCustomer.name)}&color=FFFFFF&background=6366F1&rounded=true&size=100`} 
                                                alt={selectedCustomer.name} 
                                                className="w-24 h-24 rounded-3xl shadow-lg shrink-0 object-cover relative z-10 border-2 border-white dark:border-slate-800" 
                                            />
                                        </div>
                                    )}
                                    <div className="w-full">
                                        <p className="font-black text-slate-900 dark:text-white text-xl">{selectedCustomer?.name}</p>
                                        <div className="flex flex-col gap-2 mt-4">
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80">
                                                <Phone size={16} className="text-indigo-400" /> {selectedCustomer?.phone || 'N/A'}
                                            </div>
                                            {selectedCustomer?.email && (
                                                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80">
                                                    <Mail size={16} className="text-indigo-400" /> {selectedCustomer?.email}
                                                </div>
                                            )}
                                            {Number(selectedCustomer?.credit_limit) > 0 && (
                                                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                                    Credit Limit: UGX {Number(selectedCustomer.credit_limit).toLocaleString()}
                                                    {selectedCustomer?.payment_terms_days > 0 ? ` • Net ${selectedCustomer.payment_terms_days}d` : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Lifetime Value */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lifetime Value</h3>
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 flex flex-col justify-center items-center text-white relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                                    <div className="absolute top-0 right-0 p-4 opacity-20">
                                        <Receipt size={64} />
                                    </div>
                                    <div className="relative z-10 text-center">
                                        <div className="text-4xl font-black">{Number(selectedCustomer?.sales_sum_final_amount || 0).toLocaleString()} <span className="text-xl font-bold text-emerald-100">UGX</span></div>
                                        <p className="text-sm font-medium text-emerald-100 mt-2 uppercase tracking-wide">Total Spent</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: History List */}
                        <div className="w-full md:w-2/3 p-8 space-y-6 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/40 no-scrollbar">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Receipt size={20} className="text-indigo-500" />
                                Purchase History
                            </h3>
                            {loadingHistory ? (
                                <div className="text-center py-16 text-slate-500 flex flex-col items-center">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-indigo-500/20"></div>
                                    <span className="text-sm font-semibold animate-pulse">Loading history...</span>
                                </div>
                            ) : customerHistory.length === 0 ? (
                                <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <Receipt size={32} className="text-slate-400" />
                                    </div>
                                    <p className="text-base font-medium">No purchase history found for this customer.</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {customerHistory.map(sale => (
                                        <div key={sale.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
                                            {/* Subtle gradient line on hover */}
                                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            
                                            <div className="flex items-start justify-between mb-4 pl-2">
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-3 text-base">
                                                        Receipt {sale.receipt_number}
                                                        <Badge variant={sale.payment_status === 'Paid' ? 'success' : sale.payment_status === 'Refunded' ? 'danger' : 'warning'}>
                                                            {sale.payment_status || 'Completed'}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><History size={14} className="text-slate-400" /> {sale.sale_date}</span>
                                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                                        <span>Handled by <span className="font-semibold text-slate-700 dark:text-slate-300">{sale.cashier}</span></span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-slate-900 dark:text-white">{Number(sale.final_amount).toLocaleString()} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">UGX</span></div>
                                                    <div className="flex items-center justify-end gap-2 mt-1">
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50">{sale.payment_method}</span>
                                                        <a
                                                            href={`/pos/receipt/${sale.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                                                            title="Print Receipt"
                                                        >
                                                            <Printer size={12} /> Receipt
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 ml-2 border border-slate-100/80 dark:border-slate-800">
                                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Items Purchased</div>
                                                <div className="space-y-2.5">
                                                    {sale.items.map(item => (
                                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/50 min-w-[2rem] text-center">{item.quantity}x</span>
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.product_name}</span>
                                                            </div>
                                                            <div className="font-bold text-slate-700 dark:text-white">
                                                                {Number(item.subtotal).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
            {/* Customer Statement Options Modal */}
            <Modal show={showStatementModal} onClose={() => setShowStatementModal(false)} maxWidth="md">
                {statementCustomer && (
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer Statement of Account</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Generate printable PDF statement for {statementCustomer.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowStatementModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Statement Filter</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStatementFilter('all')}
                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${statementFilter === 'all' ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'}`}
                                    >
                                        <div className="font-bold">All Purchases</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Full history</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatementFilter('unpaid')}
                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${statementFilter === 'unpaid' ? 'border-amber-500 dark:border-amber-500 bg-amber-50/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'}`}
                                    >
                                        <div className="font-bold">Unpaid / Layaways</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Active credit</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatementFilter('paid')}
                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${statementFilter === 'paid' ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'}`}
                                    >
                                        <div className="font-bold">Fully Paid</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Cleared sales</div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Date Range (Optional)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Start Date</span>
                                        <input 
                                            type="date"
                                            className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                            value={statementStartDate}
                                            onChange={e => setStatementStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">End Date</span>
                                        <input 
                                            type="date"
                                            className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                            value={statementEndDate}
                                            onChange={e => setStatementEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="secondary" onClick={() => setShowStatementModal(false)}>Close</Button>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => handleGenerateStatement('stream')}
                                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap border border-slate-200 dark:border-slate-700"
                                >
                                    <Printer size={15} /> Print Preview
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleGenerateStatement('download')}
                                    className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-indigo-200 dark:shadow-none"
                                >
                                    <FileText size={15} /> Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Customer Confirmation Modal */}
            <Modal show={!!deletingCustomer} onClose={() => setDeletingCustomer(null)} maxWidth="sm">
                {deletingCustomer && (
                    <div className="p-6 text-center space-y-4 dark:bg-slate-900">
                        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Customer?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Permanently delete <strong className="text-slate-900 dark:text-white">{deletingCustomer.name}</strong>?
                                Customers with linked sales, invoices, or quotations cannot be deleted.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeletingCustomer(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={15} />
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
