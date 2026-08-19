import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import { Package, Building2, Phone, Mail, MapPin, Receipt, DollarSign, Calendar, Info, X, Trash2, AlertTriangle, Plus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/Components/Modal';

export default function SuppliersShow({ auth, supplier }) {
    const { data, setData, put, processing } = useForm({
        name: supplier.name,
        contact_name: supplier.contact_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [paymentModalPurchase, setPaymentModalPurchase] = useState(null);

    const paymentForm = useForm({
        amount: '',
        payment_method: 'Cash',
        notes: ''
    });

    const openPaymentModal = (purchase) => {
        const remaining = Number(purchase.total_amount) - Number(purchase.paid_amount);
        setPaymentModalPurchase(purchase);
        paymentForm.setData({
            amount: remaining > 0 ? remaining : '',
            payment_method: 'Cash',
            notes: ''
        });
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        if (!paymentModalPurchase) return;
        paymentForm.post(`/api/purchases/${paymentModalPurchase.id}/payments`, {
            onSuccess: () => {
                setPaymentModalPurchase(null);
                toast.success('Supplier payment recorded successfully');
            },
            onError: (errs) => {
                const message = errs?.amount || errs?.payment_method || errs?.error || Object.values(errs || {})[0] || 'Failed to record payment';
                toast.error(message, { duration: 6000 });
            }
        });
    };

    const handleDeletePurchase = () => {
        if (!purchaseToDelete) return;
        setIsDeleting(true);
        router.delete(`/api/purchases/${purchaseToDelete.id}`, {
            onSuccess: () => {
                setPurchaseToDelete(null);
                toast.success('Purchase deleted successfully');
            },
            onError: (errors) => {
                if (errors.error) toast.error(errors.error);
                else toast.error('Failed to delete purchase');
            },
            onFinish: () => setIsDeleting(false)
        });
    };

    const handleReceivePurchase = (purchaseId) => {
        router.post(`/api/purchases/${purchaseId}/receive`, {}, {
            onSuccess: () => toast.success('Purchase received and inventory updated'),
            onError: (errs) => toast.error(errs.error || 'Failed to receive purchase')
        });
    };

    const submitEdit = (e) => {
        e.preventDefault();
        put(`/api/suppliers/${supplier.id}`, {
            onSuccess: () => {
                setIsEditing(false);
                toast.success('Supplier details updated');
            }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Supplier: ${supplier.name}`} />
            
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <PageHeader 
                    title={supplier.name} 
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Suppliers', href: route('suppliers.index') }, { label: supplier.name }]}
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <Button variant="glass" icon={ArrowLeft} onClick={() => router.visit(route('suppliers.index'))}>
                                Back to Directory
                            </Button>
                            <Button variant="primary" icon={Plus} onClick={() => router.visit(route('purchases.create', { supplier_id: supplier.id }))}>
                                Log Purchase
                            </Button>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Stats & Info */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Outstanding Balance Widget */}
                        <div className={`rounded-3xl p-6 border ${Number(supplier.balance) > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <h3 className={`font-bold flex items-center gap-2 mb-2 ${Number(supplier.balance) > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
                                <DollarSign size={20} />
                                Outstanding Balance
                            </h3>
                            <div className={`text-4xl font-black ${Number(supplier.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {Number(supplier.balance).toLocaleString()} <span className="text-lg">UGX</span>
                            </div>
                            {Number(supplier.balance) > 0 && (
                                <div className="mt-3 pt-3 border-t border-rose-200/60">
                                    <p className="text-xs text-rose-700 font-medium flex items-start gap-1.5 mb-3">
                                        <Info size={14} className="mt-0.5 shrink-0" />
                                        This is the total unpaid balance across wholesale shipments.
                                    </p>
                                    {supplier.purchases && supplier.purchases.find(p => p.payment_status !== 'Paid') && (
                                        <Button 
                                            variant="primary" 
                                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 text-sm flex items-center justify-center gap-2"
                                            onClick={() => {
                                                const unpaidP = supplier.purchases.find(p => p.payment_status !== 'Paid');
                                                if (unpaidP) openPaymentModal(unpaidP);
                                            }}
                                        >
                                            <DollarSign size={16} /> Pay Outstanding Balance
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Supplier Info Form */}
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg text-slate-900">Supplier Details</h3>
                                <button 
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    {isEditing ? 'Cancel' : 'Edit'}
                                </button>
                            </div>

                            {isEditing ? (
                                <form onSubmit={submitEdit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Company Name</label>
                                        <input type="text" className="saas-input w-full text-sm py-1.5" value={data.name} onChange={e => setData('name', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Person</label>
                                        <input type="text" className="saas-input w-full text-sm py-1.5" value={data.contact_name} onChange={e => setData('contact_name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                                        <input type="text" className="saas-input w-full text-sm py-1.5" value={data.phone} onChange={e => setData('phone', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                                        <input type="email" className="saas-input w-full text-sm py-1.5" value={data.email} onChange={e => setData('email', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Address</label>
                                        <textarea className="saas-input w-full text-sm py-1.5" rows="2" value={data.address} onChange={e => setData('address', e.target.value)}></textarea>
                                    </div>
                                    <Button variant="primary" type="submit" disabled={processing} className="w-full">
                                        Save Changes
                                    </Button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 text-slate-600">
                                        <Building2 size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company</div>
                                            <div className="font-medium text-slate-900">{supplier.name}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-600">
                                        <Phone size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</div>
                                            <div className="font-medium">{supplier.phone || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-600">
                                        <Mail size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</div>
                                            <div className="font-medium">{supplier.email || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-600">
                                        <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</div>
                                            <div className="font-medium">{supplier.address || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Purchases */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Purchase History</h2>
                            <Link 
                                href={`/purchases/create?supplier_id=${supplier.id}`}
                                className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                            >
                                <Package size={16} /> Log New Purchase
                            </Link>
                        </div>

                        {supplier.purchases && supplier.purchases.length > 0 ? (
                            <Card noPadding className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold">Purchase Info</th>
                                                <th className="px-6 py-4 font-semibold">Amount</th>
                                                <th className="px-6 py-4 font-semibold">Status</th>
                                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {supplier.purchases.map(purchase => (
                                                <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                                            Purchase #{purchase.id}
                                                        </div>
                                                        <div className="text-slate-500 text-xs mt-1 flex items-center gap-3">
                                                            <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(purchase.purchase_date).toLocaleDateString()}</span>
                                                            {purchase.reference_no && <span className="flex items-center gap-1"><Receipt size={12}/> {purchase.reference_no}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900">{Number(purchase.total_amount).toLocaleString()} UGX</div>
                                                        <div className="text-xs text-slate-500 mt-1">Paid: {Number(purchase.paid_amount).toLocaleString()}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-2 items-start">
                                                            <Badge variant={purchase.status === 'Received' ? 'success' : 'warning'}>
                                                                {purchase.status}
                                                            </Badge>
                                                            <Badge variant={
                                                                purchase.payment_status === 'Paid' ? 'success' : 
                                                                purchase.payment_status === 'Partial' ? 'warning' : 'danger'
                                                            }>
                                                                {purchase.payment_status}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {purchase.payment_status !== 'Paid' && (
                                                                <button 
                                                                    onClick={() => openPaymentModal(purchase)}
                                                                    className="text-xs font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                                >
                                                                    <DollarSign size={14} /> Pay Balance
                                                                </button>
                                                            )}
                                                            {purchase.status === 'Pending' && (
                                                                <button 
                                                                    onClick={() => handleReceivePurchase(purchase.id)}
                                                                    className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200"
                                                                >
                                                                    Mark Received
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => setSelectedPurchase(purchase)}
                                                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-2 py-1.5"
                                                            >
                                                                Details
                                                            </button>
                                                            <button 
                                                                onClick={() => setPurchaseToDelete(purchase)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Purchase"
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
                            </Card>
                        ) : (
                            <Card className="text-center py-12">
                                <Package size={48} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-900 mb-1">No Purchases Yet</h3>
                                <p className="text-slate-500 mb-6">You haven't logged any wholesale shipments from this supplier.</p>
                                <Link 
                                    href={route('purchases.create')}
                                    className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold px-6 py-2.5 rounded-xl transition-colors"
                                >
                                    Log First Purchase
                                </Link>
                            </Card>
                        )}
                    </div>

                </div>
            </div>

            {/* Purchase Details Modal */}
            <Modal show={selectedPurchase !== null} onClose={() => setSelectedPurchase(null)} maxWidth="2xl">
                {selectedPurchase && (
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Purchase #{selectedPurchase.id} Details</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-4">
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(selectedPurchase.purchase_date).toLocaleDateString()}</span>
                                    {selectedPurchase.reference_no && <span className="flex items-center gap-1"><Receipt size={14}/> {selectedPurchase.reference_no}</span>}
                                </p>
                            </div>
                            <button onClick={() => setSelectedPurchase(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Amount</div>
                                <div className="font-bold text-slate-900 dark:text-white text-lg">{Number(selectedPurchase.total_amount).toLocaleString()} UGX</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Amount Paid</div>
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{Number(selectedPurchase.paid_amount).toLocaleString()} UGX</div>
                            </div>
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-sm uppercase tracking-wider">Items in Purchase</h3>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Product</th>
                                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-center">Qty</th>
                                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Unit Cost</th>
                                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {selectedPurchase.items?.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {item.product ? `${item.product.brand?.name ? item.product.brand.name + ' ' : ''}${item.product.model_name}` : 'Unknown Product'}
                                                </div>
                                                {item.imeis && item.imeis.length > 0 && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] truncate" title={item.imeis.join(', ')}>
                                                        IMEIs: {item.imeis.join(', ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{Number(item.unit_cost).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{Number(item.total_cost).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {(!selectedPurchase.items || selectedPurchase.items.length === 0) && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                                                No items found for this purchase.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={purchaseToDelete !== null} onClose={() => !isDeleting && setPurchaseToDelete(null)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Delete Purchase #{purchaseToDelete?.id}?</h3>
                            <p className="text-sm text-slate-500 mt-1">This action cannot be undone.</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-2 mb-6">
                        <p><strong>What happens when you delete this:</strong></p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>All associated items (phones, accessories) will be removed from your inventory.</li>
                            <li>Your outstanding balance with <strong>{supplier.name}</strong> will be reduced by {purchaseToDelete ? Number(purchaseToDelete.total_amount - purchaseToDelete.paid_amount).toLocaleString() : 0} UGX.</li>
                        </ul>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button 
                            type="button" 
                            onClick={() => setPurchaseToDelete(null)}
                            disabled={isDeleting}
                            className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            onClick={handleDeletePurchase}
                            disabled={isDeleting}
                            className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete Purchase'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Record Payment Modal */}
            {paymentModalPurchase && (
                <Modal show={true} onClose={() => setPaymentModalPurchase(null)} maxWidth="md">
                    <div className="p-6 bg-white rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                    <DollarSign size={20} className="text-emerald-600" />
                                    Record Supplier Payment
                                </h3>
                                <p className="text-xs text-slate-500">Purchase #{paymentModalPurchase.id} • {supplier.name}</p>
                            </div>
                            <button onClick={() => setPaymentModalPurchase(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit}>
                            {Object.keys(paymentForm.errors).length > 0 && (
                                <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-xs mb-4 border border-rose-200 flex items-start gap-2 font-medium">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                                    <div>
                                        {Object.values(paymentForm.errors).map((err, i) => (
                                            <div key={i}>{err}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Purchase Cost:</span>
                                    <span className="font-bold text-slate-900">{Number(paymentModalPurchase.total_amount).toLocaleString()} UGX</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Amount Paid So Far:</span>
                                    <span className="font-semibold text-emerald-600">{Number(paymentModalPurchase.paid_amount).toLocaleString()} UGX</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold">
                                    <span className="text-slate-900">Remaining Balance:</span>
                                    <span className="text-rose-600">
                                        {Number(paymentModalPurchase.total_amount - paymentModalPurchase.paid_amount).toLocaleString()} UGX
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Amount (UGX)</label>
                                    <input 
                                        type="number" 
                                        className="saas-input w-full text-lg font-bold text-slate-900"
                                        min="1"
                                        max={paymentModalPurchase.total_amount - paymentModalPurchase.paid_amount}
                                        value={paymentForm.data.amount}
                                        onChange={e => paymentForm.setData('amount', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Method</label>
                                    <select 
                                        className="saas-input w-full"
                                        value={paymentForm.data.payment_method}
                                        onChange={e => paymentForm.setData('payment_method', e.target.value)}
                                    >
                                        <option value="Cash">Cash (Deducted from Cash Drawer)</option>
                                        <option value="Mobile Money">Mobile Money</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Notes / Reference (Optional)</label>
                                    <input 
                                        type="text"
                                        className="saas-input w-full text-sm"
                                        placeholder="e.g. Paid via MTN MoMo / Cheque #1029"
                                        value={paymentForm.data.notes}
                                        onChange={e => paymentForm.setData('notes', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button variant="danger" type="button" onClick={() => setPaymentModalPurchase(null)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" isLoading={paymentForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                    Submit Payment
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}
        </AuthenticatedLayout>
    );
}
