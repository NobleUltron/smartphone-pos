import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import { Package, Building2, Phone, Mail, MapPin, Receipt, DollarSign, Calendar, Info, X, Trash2, AlertTriangle, Plus, ArrowLeft, Ban, Undo2, Wallet, CreditCard, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/Components/Modal';

export default function SuppliersShow({ auth, supplier, paymentAccounts = [] }) {
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
    const [cancelModalPurchase, setCancelModalPurchase] = useState(null);
    const [showCreditRefundModal, setShowCreditRefundModal] = useState(false);

    const defaultAccountId = paymentAccounts[0]?.id || '';
    const defaultAccountName = paymentAccounts[0]?.name || 'Cash';

    const paymentForm = useForm({
        amount: '',
        credit_amount: '',
        payment_account_id: defaultAccountId,
        payment_method: defaultAccountName,
        notes: ''
    });

    const creditRefundForm = useForm({
        amount: '',
        payment_account_id: defaultAccountId,
        notes: ''
    });

    const openCreditRefundModal = () => {
        creditRefundForm.clearErrors();
        creditRefundForm.setData({
            amount: Number(supplier.credit_balance || 0),
            payment_account_id: defaultAccountId,
            notes: ''
        });
        setShowCreditRefundModal(true);
    };

    const handleCreditRefundSubmit = (e) => {
        e.preventDefault();
        creditRefundForm.post(`/api/suppliers/${supplier.id}/refund-credit`, {
            onSuccess: () => {
                setShowCreditRefundModal(false);
                toast.success('Supplier credit refund recorded into wallet');
            },
            onError: (errs) => {
                const message = errs?.amount || errs?.payment_account_id || errs?.error || Object.values(errs || {})[0] || 'Failed to record credit refund';
                toast.error(message, { duration: 6000 });
            }
        });
    };

    const cancelForm = useForm({
        resolution: 'refund',
        payment_account_id: defaultAccountId,
        reason: '',
        notes: ''
    });

    const openCancelModal = (purchase) => {
        const paid = Number(purchase.paid_amount || 0);
        setCancelModalPurchase(purchase);
        cancelForm.clearErrors();
        cancelForm.setData({
            resolution: paid > 0 ? 'refund' : 'none',
            payment_account_id: defaultAccountId,
            reason: '',
            notes: ''
        });
    };

    const handleCancelSubmit = (e) => {
        e.preventDefault();
        if (!cancelModalPurchase) return;
        cancelForm.post(`/api/purchases/${cancelModalPurchase.id}/cancel`, {
            onSuccess: () => {
                setCancelModalPurchase(null);
                toast.success('Purchase order cancelled');
            },
            onError: (errs) => {
                const message = errs?.error || errs?.reason || errs?.payment_account_id || Object.values(errs || {})[0] || 'Failed to cancel purchase';
                toast.error(message, { duration: 6000 });
            }
        });
    };

    const openPaymentModal = (purchase) => {
        const remaining = Math.max(0, Number(purchase.total_amount) - Number(purchase.paid_amount));
        const availCredit = Math.max(0, Number(supplier.credit_balance || 0));
        const autoCredit = availCredit > 0 ? Math.min(availCredit, remaining) : 0;
        const autoWallet = Math.max(0, remaining - autoCredit);

        setPaymentModalPurchase(purchase);
        paymentForm.clearErrors();
        paymentForm.setData({
            amount: autoWallet,
            credit_amount: autoCredit,
            payment_account_id: defaultAccountId,
            payment_method: defaultAccountName,
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
                const message = errs?.amount || errs?.credit_amount || errs?.payment_method || errs?.error || Object.values(errs || {})[0] || 'Failed to record payment';
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
                                    {supplier.purchases && supplier.purchases.find(p => p.status !== 'Cancelled' && p.payment_status !== 'Paid') && (
                                        <Button 
                                            variant="primary" 
                                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 text-sm flex items-center justify-center gap-2"
                                            onClick={() => {
                                                const unpaidP = supplier.purchases.find(p => p.status !== 'Cancelled' && p.payment_status !== 'Paid');
                                                if (unpaidP) openPaymentModal(unpaidP);
                                            }}
                                        >
                                            <DollarSign size={16} /> Pay Outstanding Balance
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Available Supplier Credit Widget */}
                        {Number(supplier.credit_balance || 0) > 0 && (
                            <div className="rounded-3xl p-6 border bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/60">
                                <h3 className="font-bold flex items-center gap-2 mb-2 text-teal-900 dark:text-teal-300">
                                    <CreditCard size={20} />
                                    Available Supplier Credit
                                </h3>
                                <div className="text-3xl font-black text-teal-600 dark:text-teal-400">
                                    {Number(supplier.credit_balance).toLocaleString()} <span className="text-base">UGX</span>
                                </div>
                                <p className="text-xs text-teal-700 dark:text-teal-400/90 font-medium mt-2 mb-4">
                                    Credit owed to your shop from returned devices or cancelled prepaid orders. You can apply it when paying a balance, on a new purchase, or receive it back in cash/MoMo/bank.
                                </p>
                                <Button
                                    variant="primary"
                                    className="w-full !bg-teal-600 hover:!bg-teal-700 text-white font-bold py-2 text-sm flex items-center justify-center gap-2"
                                    onClick={openCreditRefundModal}
                                >
                                    <Wallet size={16} /> Receive Refund from Credit
                                </Button>
                            </div>
                        )}

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
                                                            <Badge variant={
                                                                purchase.status === 'Received' ? 'success' :
                                                                purchase.status === 'Cancelled' ? 'danger' : 'warning'
                                                            }>
                                                                {purchase.status}
                                                            </Badge>
                                                            <Badge variant={
                                                                purchase.payment_status === 'Paid' ? 'success' : 
                                                                purchase.payment_status === 'Partial' ? 'warning' :
                                                                (purchase.payment_status === 'Refunded' || purchase.payment_status === 'Credited') ? 'info' : 'danger'
                                                            }>
                                                                {purchase.payment_status}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                                            {purchase.status !== 'Cancelled' && purchase.payment_status !== 'Paid' && (
                                                                <button 
                                                                    onClick={() => openPaymentModal(purchase)}
                                                                    className="text-xs font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                                >
                                                                    <DollarSign size={14} /> Pay Balance
                                                                </button>
                                                            )}
                                                            {purchase.status === 'Pending' && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleReceivePurchase(purchase.id)}
                                                                        className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200"
                                                                    >
                                                                        Mark Received
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => openCancelModal(purchase)}
                                                                        className="text-xs font-bold text-rose-700 hover:text-rose-800 transition-colors bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1"
                                                                    >
                                                                        <Ban size={13} /> Cancel Order
                                                                    </button>
                                                                </>
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

                        {/* Returns, RMAs & Cancelled Orders History */}
                        <div className="pt-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Undo2 size={20} className="text-rose-500" />
                                    Returns, RMAs & Cancelled Orders
                                </h2>
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                    {supplier.supplier_returns?.length || 0} records
                                </span>
                            </div>

                            {supplier.supplier_returns && supplier.supplier_returns.length > 0 ? (
                                <Card noPadding className="overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                                                <tr>
                                                    <th className="px-5 py-3.5 font-semibold">Date & Type</th>
                                                    <th className="px-5 py-3.5 font-semibold">Item / Purchase</th>
                                                    <th className="px-5 py-3.5 font-semibold">Resolution</th>
                                                    <th className="px-5 py-3.5 font-semibold text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {supplier.supplier_returns.map(ret => {
                                                    const resolutionLabel = {
                                                        refund: 'Refund to Wallet',
                                                        supplier_credit: 'Supplier Credit',
                                                        replacement: 'Replacement Swap',
                                                        supplier_repair: 'Supplier Repair',
                                                        forfeited: 'Forfeited Deposit',
                                                        applied_to_purchase: 'Applied to Purchase',
                                                        none: 'No Payment',
                                                    }[ret.resolution] || ret.resolution;

                                                    const typeLabel = {
                                                        purchase_cancellation: 'Cancelled Order',
                                                        device_return: 'Device Return',
                                                        credit_applied: 'Credit Used',
                                                        credit_refund: 'Credit Refund',
                                                    }[ret.return_type] || 'Supplier Return';

                                                    return (
                                                        <tr key={ret.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                                            <td className="px-5 py-3.5">
                                                                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                                    {typeLabel}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                                    {new Date(ret.created_at).toLocaleDateString()}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                {ret.purchase_id ? (
                                                                    <div className="font-semibold text-slate-900 dark:text-white text-xs">
                                                                        Purchase #{ret.purchase_id}
                                                                    </div>
                                                                ) : ret.device_imei ? (
                                                                    <div>
                                                                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                                                                            {ret.device_imei.product?.brand?.name ? `${ret.device_imei.product.brand.name} ` : ''}
                                                                            {ret.device_imei.product?.model_name || 'Device'}
                                                                        </div>
                                                                        <div className="text-[11px] font-mono text-slate-500">
                                                                            IMEI: {ret.device_imei.imei}
                                                                            {ret.replacement_imei && (
                                                                                <span className="text-emerald-600 dark:text-emerald-400"> → {ret.replacement_imei.imei}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">—</span>
                                                                )}
                                                                {ret.reason && (
                                                                    <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate" title={ret.reason}>
                                                                        {ret.reason}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    <Badge variant={
                                                                        ret.resolution === 'refund' || ret.resolution === 'replacement' ? 'success' :
                                                                        ret.resolution === 'supplier_credit' ? 'info' :
                                                                        ret.resolution === 'forfeited' ? 'danger' : 'warning'
                                                                    }>
                                                                        {resolutionLabel}
                                                                    </Badge>
                                                                    <span className="text-[11px] text-slate-500">
                                                                        {ret.payment_account ? `Wallet: ${ret.payment_account.name}` : ret.status}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white text-xs">
                                                                {Number(ret.amount || 0) > 0 ? `${Number(ret.amount).toLocaleString()} UGX` : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            ) : (
                                <Card className="text-center py-8">
                                    <p className="text-sm text-slate-500">No supplier returns, RMAs, or cancelled orders recorded yet.</p>
                                </Card>
                            )}
                        </div>
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

            {/* Cancel Pending Purchase Order Modal */}
            {cancelModalPurchase && (
                <Modal show={true} onClose={() => !cancelForm.processing && setCancelModalPurchase(null)} maxWidth="lg">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <Ban size={20} className="text-rose-600" />
                                    Cancel Pending Purchase #{cancelModalPurchase.id}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {supplier.name} • Order Total: {Number(cancelModalPurchase.total_amount).toLocaleString()} UGX
                                </p>
                            </div>
                            <button onClick={() => setCancelModalPurchase(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCancelSubmit} className="space-y-4">
                            {Object.keys(cancelForm.errors).length > 0 && (
                                <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-xs border border-rose-200 flex items-start gap-2 font-medium">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                                    <div>
                                        {Object.values(cancelForm.errors).map((err, i) => (
                                            <div key={i}>{err}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Number(cancelModalPurchase.paid_amount || 0) <= 0 ? (
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                    <div className="font-bold text-slate-800 dark:text-white">No payment recorded on this order (0 UGX paid)</div>
                                    <p>Cancelling will mark this order as <strong>Cancelled</strong>, void any <em>In Transit</em> IMEIs, and remove the unpaid payable from your supplier balance with zero cash movement.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300">Amount Already Paid to Supplier:</span>
                                        <span className="text-base font-black text-amber-700 dark:text-amber-400">
                                            UGX {Number(cancelModalPurchase.paid_amount).toLocaleString()}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                            How is the paid amount settled? *
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            {[
                                                { id: 'refund', label: 'Refund to Wallet', desc: 'Supplier returned cash/MoMo/bank', icon: Wallet },
                                                { id: 'supplier_credit', label: 'Supplier Credit', desc: 'Keep as credit for next order', icon: CreditCard },
                                                { id: 'forfeited', label: 'Forfeited / Loss', desc: 'Non-refundable deposit write-off', icon: AlertTriangle },
                                            ].map(opt => {
                                                const Icon = opt.icon;
                                                const active = cancelForm.data.resolution === opt.id;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={opt.id}
                                                        onClick={() => cancelForm.setData('resolution', opt.id)}
                                                        className={`text-left p-3 rounded-xl border transition-all ${
                                                            active
                                                                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                        }`}
                                                    >
                                                        <Icon size={16} className={active ? 'text-indigo-600 dark:text-indigo-400 mb-1.5' : 'text-slate-400 mb-1.5'} />
                                                        <div className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</div>
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{opt.desc}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {cancelForm.data.resolution === 'refund' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Refund Received Into Wallet *
                                            </label>
                                            <select
                                                className="saas-input w-full font-medium"
                                                value={cancelForm.data.payment_account_id}
                                                onChange={e => cancelForm.setData('payment_account_id', e.target.value)}
                                                required
                                            >
                                                <option value="">-- Select Business Wallet --</option>
                                                {paymentAccounts.map(account => (
                                                    <option key={account.id} value={account.id}>
                                                        {account.name} ({account.provider || account.type}) — Bal: UGX {Number(account.current_balance || 0).toLocaleString()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Reason for Cancellation *
                                </label>
                                <input
                                    type="text"
                                    className="saas-input w-full text-sm"
                                    placeholder="e.g. Supplier out of stock / failed to deliver on time"
                                    value={cancelForm.data.reason}
                                    onChange={e => cancelForm.setData('reason', e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Additional Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    className="saas-input w-full text-sm"
                                    placeholder="e.g. Refund MoMo ref #88291"
                                    value={cancelForm.data.notes}
                                    onChange={e => cancelForm.setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" type="button" onClick={() => setCancelModalPurchase(null)}>
                                    Keep Order
                                </Button>
                                <Button variant="primary" type="submit" isLoading={cancelForm.processing} className="bg-rose-600 hover:bg-rose-700">
                                    Confirm Cancellation
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}

            {/* Receive Refund from Supplier Credit Modal */}
            {showCreditRefundModal && (
                <Modal show={true} onClose={() => !creditRefundForm.processing && setShowCreditRefundModal(false)} maxWidth="md">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <Wallet size={20} className="text-teal-600" />
                                    Receive Refund from Credit
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{supplier.name}</p>
                            </div>
                            <button onClick={() => setShowCreditRefundModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreditRefundSubmit} className="space-y-4">
                            {Object.keys(creditRefundForm.errors).length > 0 && (
                                <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-xs border border-rose-200 flex items-start gap-2 font-medium">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                                    <div>
                                        {Object.values(creditRefundForm.errors).map((err, i) => (
                                            <div key={i}>{err}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between">
                                <span className="text-xs font-bold text-teal-900 dark:text-teal-300">Available Supplier Credit:</span>
                                <span className="text-base font-black text-teal-700 dark:text-teal-400">
                                    UGX {Number(supplier.credit_balance || 0).toLocaleString()}
                                </span>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Refund Amount Received (UGX) *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => creditRefundForm.setData('amount', Number(supplier.credit_balance || 0))}
                                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
                                    >
                                        Full Credit
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max={Number(supplier.credit_balance || 0)}
                                    className="saas-input w-full text-lg font-bold text-slate-900 dark:text-white"
                                    value={creditRefundForm.data.amount}
                                    onChange={e => creditRefundForm.setData('amount', e.target.value)}
                                    required
                                />
                                {Number(creditRefundForm.data.amount || 0) > 0 && Number(creditRefundForm.data.amount || 0) < Number(supplier.credit_balance || 0) && (
                                    <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-1 font-medium">
                                        Remaining credit after partial refund: <strong>UGX {(Number(supplier.credit_balance || 0) - Number(creditRefundForm.data.amount || 0)).toLocaleString()}</strong>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Deposit Into Business Wallet *
                                </label>
                                <select
                                    className="saas-input w-full font-medium"
                                    value={creditRefundForm.data.payment_account_id}
                                    onChange={e => creditRefundForm.setData('payment_account_id', e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose Business Wallet --</option>
                                    {paymentAccounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.name} ({account.provider || account.type}) — Bal: UGX {Number(account.current_balance || 0).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Notes / Reference (Optional)
                                </label>
                                <input
                                    type="text"
                                    className="saas-input w-full text-sm"
                                    placeholder="e.g. Refunded via MTN MoMo ref #44821"
                                    value={creditRefundForm.data.notes}
                                    onChange={e => creditRefundForm.setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" type="button" onClick={() => setShowCreditRefundModal(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" isLoading={creditRefundForm.processing} className="!bg-teal-600 hover:!bg-teal-700">
                                    Confirm Refund
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}

            {/* Record Payment Modal */}
            {paymentModalPurchase && (() => {
                const remaining = Math.max(0, Number(paymentModalPurchase.total_amount) - Number(paymentModalPurchase.paid_amount));
                const availCredit = Math.max(0, Number(supplier.credit_balance || 0));
                const maxCreditApplicable = Math.min(availCredit, remaining);
                const creditNum = Math.max(0, Number(paymentForm.data.credit_amount || 0));
                const walletNum = Math.max(0, Number(paymentForm.data.amount || 0));
                const totalApplied = creditNum + walletNum;
                const newRemaining = Math.max(0, remaining - totalApplied);

                return (
                <Modal show={true} onClose={() => setPaymentModalPurchase(null)} maxWidth="md">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
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
                            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-4 mb-5 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Purchase Cost:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{Number(paymentModalPurchase.total_amount).toLocaleString()} UGX</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Amount Paid So Far:</span>
                                    <span className="font-semibold text-emerald-600">{Number(paymentModalPurchase.paid_amount).toLocaleString()} UGX</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-base font-extrabold">
                                    <span className="text-slate-900 dark:text-white">Remaining Balance:</span>
                                    <span className="text-rose-600">
                                        {remaining.toLocaleString()} UGX
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-5">
                                {availCredit > 0 && (
                                    <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                                                <CreditCard size={14} className="text-teal-600" />
                                                Apply Supplier Credit (Avail: {availCredit.toLocaleString()} UGX)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => paymentForm.setData(prev => ({
                                                        ...prev,
                                                        credit_amount: maxCreditApplicable,
                                                        amount: Math.max(0, remaining - maxCreditApplicable),
                                                    }))}
                                                    className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline"
                                                >
                                                    Use Max
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => paymentForm.setData(prev => ({
                                                        ...prev,
                                                        credit_amount: 0,
                                                    }))}
                                                    className="text-[11px] font-semibold text-slate-500 hover:underline"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            max={maxCreditApplicable}
                                            className="saas-input w-full text-base font-bold text-teal-900 dark:text-white"
                                            placeholder="0"
                                            value={paymentForm.data.credit_amount}
                                            onChange={e => paymentForm.setData('credit_amount', e.target.value)}
                                        />
                                        <p className="text-[11px] text-teal-700 dark:text-teal-400">
                                            Use all or part of your credit. Set Wallet Payment below to <strong>0</strong> to pay with credit only and leave the rest for later.
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {availCredit > 0 ? 'Additional Payment From Wallet (UGX)' : 'Payment Amount (UGX)'}
                                        </label>
                                        {availCredit > 0 && creditNum < remaining && (
                                            <button
                                                type="button"
                                                onClick={() => paymentForm.setData('amount', Math.max(0, remaining - creditNum))}
                                                className="text-[11px] font-bold text-emerald-600 hover:underline"
                                            >
                                                Pay Rest ({Math.max(0, remaining - creditNum).toLocaleString()})
                                            </button>
                                        )}
                                    </div>
                                    <input 
                                        type="number" 
                                        className="saas-input w-full text-lg font-bold text-slate-900 dark:text-white"
                                        min="0"
                                        max={Math.max(0, remaining - creditNum)}
                                        value={paymentForm.data.amount}
                                        onChange={e => paymentForm.setData('amount', e.target.value)}
                                    />
                                </div>

                                {walletNum > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Pay From Account / Float *
                                        </label>
                                        {paymentAccounts && paymentAccounts.length > 0 ? (
                                            <>
                                                <select 
                                                    className="saas-input w-full font-medium"
                                                    value={paymentForm.data.payment_account_id}
                                                    onChange={e => {
                                                        const accId = e.target.value;
                                                        const selectedAcc = paymentAccounts.find(a => String(a.id) === String(accId));
                                                        paymentForm.setData(prev => ({
                                                            ...prev,
                                                            payment_account_id: accId,
                                                            payment_method: selectedAcc ? selectedAcc.name : 'Cash'
                                                        }));
                                                    }}
                                                >
                                                    {paymentAccounts.map(account => (
                                                        <option key={account.id} value={account.id}>
                                                            {account.name} ({account.provider || account.type}) — Bal: UGX {Number(account.current_balance || 0).toLocaleString()}
                                                        </option>
                                                    ))}
                                                </select>
                                                {paymentAccounts.find(a => String(a.id) === String(paymentForm.data.payment_account_id)) && (
                                                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                                        Available funds in selected account: <span className="font-bold text-emerald-700">UGX {Number(paymentAccounts.find(a => String(a.id) === String(paymentForm.data.payment_account_id)).current_balance || 0).toLocaleString()}</span>
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <select 
                                                className="saas-input w-full"
                                                value={paymentForm.data.payment_method}
                                                onChange={e => paymentForm.setData('payment_method', e.target.value)}
                                            >
                                                <option value="Cash">Cash (Cash Register / Drawer)</option>
                                                <option value="Mobile Money">Mobile Money</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                            </select>
                                        )}
                                    </div>
                                )}

                                {totalApplied > 0 && (
                                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
                                        <div className="flex justify-between font-bold text-emerald-900 dark:text-emerald-300">
                                            <span>Total Applied Now:</span>
                                            <span>UGX {totalApplied.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>New Remaining Balance:</span>
                                            <span className="font-bold">{newRemaining === 0 ? 'UGX 0 (Paid in Full)' : `UGX ${newRemaining.toLocaleString()}`}</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Reference (Optional)</label>
                                    <input 
                                        type="text"
                                        className="saas-input w-full text-sm"
                                        placeholder="e.g. Paid via MTN MoMo / Cheque #1029"
                                        value={paymentForm.data.notes}
                                        onChange={e => paymentForm.setData('notes', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" type="button" onClick={() => setPaymentModalPurchase(null)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" isLoading={paymentForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                    Submit Payment
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
                );
            })()}
        </AuthenticatedLayout>
    );
}
