import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import { Plus, Building2, Phone, Mail, MapPin, Search, Trash2, Package, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuppliersIndex({ auth, suppliers, filters = {}, summary }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
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
            router.get('/suppliers', params, { preserveState: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const submitAdd = (e) => {
        e.preventDefault();
        form.post('/api/suppliers', {
            onSuccess: () => {
                setIsAddModalOpen(false);
                form.reset();
                toast.success('Supplier added successfully');
            }
        });
    };

    const handleDelete = (supplier) => {
        if (Number(supplier.balance) > 0) {
            toast.error("Cannot delete a supplier with an outstanding balance.");
            return;
        }
        if (confirm(`Are you sure you want to delete ${supplier.name}?`)) {
            router.delete(`/api/suppliers/${supplier.id}`, {
                onSuccess: () => toast.success('Supplier deleted'),
                onError: (err) => toast.error(err.error || 'Failed to delete supplier')
            });
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Suppliers" />
            
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <PageHeader 
                    title="Suppliers" 
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Suppliers' }]}
                    actions={
                        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                            <Plus size={16} className="mr-2" /> Add Supplier
                        </Button>
                    }
                />

                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-2">
                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Suppliers</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.total_suppliers || 0}</h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Building2 size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Badge variant="primary">Active</Badge>
                                <span>Vendors</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Orders</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.pending_orders || 0}</h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Package size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Badge variant="warning">Processing</Badge>
                                <span>Purchase Orders</span>
                            </div>
                        </Card>

                        <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Spend</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                                        {Number(summary.total_spend || 0).toLocaleString()} <span className="text-sm font-bold text-slate-500">UGX</span>
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Badge variant="success">Historical</Badge>
                                <span>Purchases</span>
                            </div>
                        </Card>
                    </div>
                )}

                <Card noPadding className="overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative max-w-xs w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                className="saas-input w-full pl-9 py-2 text-sm"
                                placeholder="Search suppliers by name, phone, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Showing {suppliers.data.length} of {suppliers.total || suppliers.data.length} vendors
                        </div>
                    </div>

                    {suppliers.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Company</th>
                                        <th className="px-6 py-4 font-semibold">Contact Person</th>
                                        <th className="px-6 py-4 font-semibold">Contact Details</th>
                                        <th className="px-6 py-4 font-semibold text-right">Outstanding Balance</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {suppliers.data.map(supplier => (
                                        <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                                        {supplier.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{supplier.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-600 dark:text-slate-300 font-medium">{supplier.contact_name || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1 text-xs text-slate-500">
                                                    {supplier.phone && <div className="flex items-center gap-2"><Phone size={13}/> {supplier.phone}</div>}
                                                    {supplier.email && <div className="flex items-center gap-2"><Mail size={13}/> {supplier.email}</div>}
                                                    {supplier.address && <div className="flex items-center gap-2"><MapPin size={13}/> {supplier.address}</div>}
                                                    {!supplier.phone && !supplier.email && !supplier.address && <span>-</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold">
                                                {Number(supplier.balance) > 0 ? (
                                                    <span className="text-rose-600">
                                                        {Number(supplier.balance).toLocaleString()} UGX
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 text-xs">
                                                        Settled ✓
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link 
                                                        href={route('suppliers.show', supplier.id)}
                                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        View Details
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleDelete(supplier)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                    ) : (
                        <div className="p-12 text-center text-slate-500">
                            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-900 mb-1">No suppliers found</p>
                            <p className="mb-4">Add your first supplier or search with another keyword.</p>
                            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                                Add Supplier
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                    <Building2 size={20} className="text-indigo-500" /> Add New Supplier
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Register a wholesale vendor or equipment supplier.</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={submitAdd} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
                                <input type="text" required className="saas-input w-full" value={form.data.name} onChange={e => form.setData('name', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person</label>
                                <input type="text" className="saas-input w-full" value={form.data.contact_name} onChange={e => form.setData('contact_name', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                                    <input type="text" className="saas-input w-full" value={form.data.phone} onChange={e => form.setData('phone', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                    <input type="email" className="saas-input w-full" value={form.data.email} onChange={e => form.setData('email', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                                <textarea className="saas-input w-full" rows="2" value={form.data.address} onChange={e => form.setData('address', e.target.value)}></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                <Button variant="primary" type="submit" disabled={form.processing} icon={Plus}>Save Supplier</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
