import React, { useState, useEffect } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Button from '@/Components/SaaS/Button';
import TextInput from '@/Components/TextInput';
import Badge from '@/Components/SaaS/Badge';
import { 
    Wrench, Phone, User, Smartphone, Hash, Lock, 
    FileText, Plus, Trash2, Package, Clock, CheckCircle2, 
    Truck, XCircle, X, Calendar, ClipboardCheck, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ViewRepairModal({ isOpen, onClose, repair, products, technicians = [] }) {
    if (!repair) return null;

    const { errors: pageErrors, auth } = usePage().props;
    const { data, setData, put, processing, errors } = useForm({
        status: repair.status,
        issue_description: repair.issue_description || '',
        technician_notes: repair.technician_notes || '',
        expected_completion_date: repair.expected_completion_date ? new Date(repair.expected_completion_date).toISOString().slice(0, 16) : '',
        estimated_cost: repair.estimated_cost,
        deposit: repair.deposit,
        payment_method: 'Cash',
        technician_id: repair.technician_id || '',
    });

    const formatWhatsAppNumber = (phone) => {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            return '256' + cleaned.substring(1);
        }
        if (cleaned.length === 9) {
            return '256' + cleaned;
        }
        return cleaned;
    };

    const getWhatsAppMessageText = (repair) => {
        const businessName = "SmartPOS Kampala";
        const balanceDue = Math.max(0, Number(repair.estimated_cost) - Number(repair.deposit));
        const cName = repair.customer?.name || repair.customer_name;

        if (repair.status === 'Pending') {
            return `Hello ${cName},

Thank you for choosing ${businessName}.

This is to confirm that we have successfully received your ${repair.device_model} for repair.

Ticket Number: ${repair.repair_code}
Current Status: 🟡 Pending

Our technical team will inspect your device shortly to properly diagnose the issue. We will keep you updated on the progress and notify you once the repair begins.

If you have any questions in the meantime, please feel free to reply to this message.

Thank you for trusting us with your device.`;
        }
        if (repair.status === 'In Progress') {
            return `Hello ${cName},

This is an update regarding your ${repair.device_model} repair at ${businessName}.

Ticket Number: ${repair.repair_code}
Current Status: 🔵 In Progress

Our technical team has officially begun working on your device. We are doing our absolute best to complete the repair efficiently while ensuring the highest quality of workmanship.

We will notify you immediately once the repair is successfully completed and ready for testing.

Thank you for your continued patience.`;
        }
        if (repair.status === 'Completed') {
            return `Hello ${cName},

Great news from ${businessName}! Your ${repair.device_model} has been successfully repaired and passed our quality checks.

Ticket Number: ${repair.repair_code}
Current Status: 🟢 Completed

Your device is now fully ready for collection at your earliest convenience.

Amount Due: UGX ${balanceDue.toLocaleString()}

Please remember to bring your repair ticket (or provide the ticket number) when you come to collect your device.

We look forward to seeing you soon!`;
        }
        if (repair.status === 'Delivered') {
            return `Hello ${cName},

Thank you for choosing ${businessName} for your device repair needs.

This message is to confirm that your ${repair.device_model} has been successfully collected.

Ticket Number: ${repair.repair_code}
Current Status: ✅ Delivered

We truly appreciate your business and trust in our services. If you experience any issues related to this repair or require any further assistance in the future, please do not hesitate to reach out.

Thank you once again, and we hope you have a great day!`;
        }
        if (repair.status === 'Cancelled') {
            return `Hello ${cName},

This is an update regarding your ${repair.device_model} repair at ${businessName}.

Ticket Number: ${repair.repair_code}
Current Status: ❌ Cancelled

Unfortunately, your repair request has been cancelled. This could be due to parts unavailability, specific repair constraints, or at your own request.

Your device is ready for collection at our store. If you made an initial deposit, our team will assist you with the refund process upon your arrival.

If you have any questions or need further clarification, please reply to this message.

Thank you.`;
        }

        return `Hello ${cName}, this is an update regarding your ${repair.device_model} repair (Ticket: ${repair.repair_code}). The current status is: ${repair.status}.`;
    };

    const [selectedProduct, setSelectedProduct] = useState('');
    const [partQuantity, setPartQuantity] = useState(1);
    const [isAddingPart, setIsAddingPart] = useState(false);
    
    const [showDeletePartModal, setShowDeletePartModal] = useState(false);
    const [partToDelete, setPartToDelete] = useState(null);

    // Sync form data if repair updates (e.g. after adding/removing a part)
    useEffect(() => {
        const totalPaid = repair.sale?.layaway_payments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
        const actualDeposit = Math.max(Number(repair.deposit) || 0, totalPaid);

        setData(data => ({
            ...data,
            estimated_cost: repair.estimated_cost,
            deposit: actualDeposit,
        }));
    }, [repair.estimated_cost, repair.deposit, repair.sale]);

    const handleAddPart = () => {
        if (!selectedProduct) return;
        setIsAddingPart(true);
        router.post(route('repairs.parts.store', repair.id), {
            product_id: selectedProduct,
            quantity: partQuantity,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedProduct('');
                setPartQuantity(1);
                toast.success('Part attached to repair');
            },
            onFinish: () => setIsAddingPart(false),
        });
    };

    const handleRemovePart = (partId) => {
        setPartToDelete(partId);
        setShowDeletePartModal(true);
    };

    const confirmRemovePart = () => {
        if (!partToDelete) return;
        router.delete(route('repairs.parts.destroy', [repair.id, partToDelete]), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowDeletePartModal(false);
                setPartToDelete(null);
                toast.success('Part removed');
            },
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('repairs.update', repair.id), {
            onSuccess: () => {
                onClose();
                toast.success('Repair ticket updated');
            },
        });
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Pending': return <Badge variant="warning" icon={Clock}>Pending</Badge>;
            case 'In Progress': return <Badge variant="primary" icon={Wrench}>In Progress</Badge>;
            case 'Completed': return <Badge variant="success" icon={CheckCircle2}>Completed</Badge>;
            case 'Delivered': return <Badge variant="default" icon={Truck}>Delivered</Badge>;
            case 'Cancelled': return <Badge variant="danger" icon={XCircle}>Cancelled</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const totalCost = Number(data.estimated_cost) || 0;
    const depositPaid = Number(data.deposit) || 0;
    const balanceDue = Math.max(0, totalCost - depositPaid);

    const isReadOnly = repair.status === 'Delivered' || repair.status === 'Cancelled';

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl">
            <div className="flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800">
                
                {/* Fixed Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Wrench size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-white font-mono tracking-tight">{repair.repair_code}</h2>
                                {getStatusBadge(repair.status)}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Received on {new Date(repair.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Split View */}
                <div className="flex-1 flex flex-col md:flex-row overflow-y-auto no-scrollbar">
                    
                    {/* Left Column: Details & Payment History */}
                    <div className="w-full md:w-1/2 p-6 bg-slate-50/70 dark:bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 space-y-6 overflow-y-auto no-scrollbar">
                        
                        {/* Customer Info */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Customer Contact</h3>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3.5">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-500 shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900 dark:text-white text-base truncate">{repair.customer?.name || repair.customer_name}</p>
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                            <Phone size={13} className="text-slate-400" /> {repair.customer?.phone || repair.customer_phone}
                                        </p>
                                    </div>
                                </div>
                                <a 
                                    href={`https://wa.me/${formatWhatsAppNumber(repair.customer?.phone || repair.customer_phone)}?text=${encodeURIComponent(getWhatsAppMessageText(repair))}`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded-lg transition-colors shrink-0"
                                    title="WhatsApp Customer"
                                >
                                    <MessageSquare size={20} />
                                </a>
                            </div>
                        </div>

                        {/* Device Info */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Device Specs</h3>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 text-sm">
                                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-base">
                                    <Smartphone size={18} className="text-indigo-500" />
                                    {repair.device_model}
                                </div>
                                {repair.imei_serial && (
                                    <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                        <Hash size={13} className="text-slate-400" /> {repair.imei_serial}
                                    </div>
                                )}
                                {repair.passcode && (
                                    <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                        <Lock size={13} className="text-slate-400" /> Passcode: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-900 dark:text-white">{repair.passcode}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Issue & Checklist */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Issue Description</h3>
                            <textarea
                                value={data.issue_description}
                                onChange={(e) => setData('issue_description', e.target.value)}
                                disabled={isReadOnly}
                                className={`w-full bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-y ${isReadOnly ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                placeholder="Describe the device issue..."
                            />
                            {errors.issue_description && <p className="text-xs text-red-500">{errors.issue_description}</p>}
                        </div>

                        {repair.pre_repair_checklist && Object.keys(repair.pre_repair_checklist).length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <ClipboardCheck size={14} />
                                    Pre-Repair Checklist
                                </h3>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                        {Object.entries(repair.pre_repair_checklist).map(([key, value]) => (
                                            <div key={key} className="flex items-center gap-2 text-sm">
                                                {value ? (
                                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                                ) : (
                                                    <XCircle size={16} className="text-rose-500 shrink-0" />
                                                )}
                                                <span className={`capitalize truncate ${value ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                                                    {key.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payment History Log */}
                        {repair.sale && repair.sale.layaway_payments && repair.sale.layaway_payments.length > 0 && (
                            <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment History Log</span>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{repair.sale.layaway_payments.length} Payments</span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto bg-white dark:bg-slate-900">
                                    {repair.sale.layaway_payments.map(payment => (
                                        <div key={payment.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    <span className="text-sm font-bold">$</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{payment.payment_method}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        {new Date(payment.payment_date).toLocaleString('en-GB', { 
                                                            month: 'short', day: 'numeric', year: 'numeric', 
                                                            hour: 'numeric', minute: '2-digit', hour12: true 
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                                                +UGX {Number(payment.amount_paid).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Update Status & Payment */}
                    <div className="w-full md:w-1/2 p-6 space-y-6 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900">
                        
                        {/* Parts Used Form */}
                        <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm border-slate-200 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Package size={14} className="text-emerald-500" />
                                Parts Attached
                            </h3>

                            {repair.parts && repair.parts.length > 0 ? (
                                <div className="space-y-2">
                                    {repair.parts.map((part) => (
                                        <div key={part.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                                            <div className="flex items-center gap-2 overflow-hidden pr-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                    {part.pivot.quantity}x {part.brand?.name} {part.model_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    UGX {(Number(part.pivot.price) * Number(part.pivot.quantity)).toLocaleString()}
                                                </span>
                                                {!isReadOnly && data.status !== 'Completed' && (
                                                    <button onClick={() => handleRemovePart(part.pivot.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Remove part">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-center text-slate-400 dark:text-slate-500 py-3 italic">No repair parts attached yet.</p>
                            )}

                            {!isReadOnly && data.status !== 'Completed' && (
                                <div className="flex gap-2 items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <select
                                        value={selectedProduct}
                                        onChange={(e) => setSelectedProduct(e.target.value)}
                                        className="flex-1 min-w-0 truncate border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-rose-500 focus:ring-rose-500 rounded-lg shadow-sm text-sm py-2"
                                    >
                                        <option value="">Select inventory part...</option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id} disabled={product.stock < 1}>
                                                {product.name} - UGX {Number(product.price).toLocaleString()} {product.stock < 1 ? '(Out of Stock)' : `(${product.stock} left)`}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        value={partQuantity}
                                        onChange={(e) => setPartQuantity(e.target.value)}
                                        className="w-16 shrink-0 border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-rose-500 focus:ring-rose-500 rounded-lg shadow-sm text-sm text-center py-2"
                                        title="Quantity"
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="shrink-0 py-2 h-auto"
                                        onClick={handleAddPart}
                                        disabled={!selectedProduct || isAddingPart}
                                    >
                                        <Plus size={16} /> Add
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Ticket Status & Notes Update Form */}
                        <form onSubmit={handleSubmit} className="space-y-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <User size={14} className="text-orange-500" /> Assigned Technician
                                </label>
                                <select
                                    value={data.technician_id}
                                    onChange={e => setData('technician_id', e.target.value)}
                                    disabled={isReadOnly}
                                    className={`saas-input w-full py-2.5 dark:bg-slate-800 dark:border-slate-700 dark:text-white ${isReadOnly ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                >
                                    <option value="">-- Unassigned --</option>
                                    {technicians.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                {errors.technician_id && <span className="text-red-500 text-xs font-medium">{errors.technician_id}</span>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ticket Status</label>
                                <select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    disabled={isReadOnly}
                                    className={`w-full border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm text-sm font-semibold py-2.5 ${isReadOnly ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                                {errors.status && <p className="text-xs text-red-500">{errors.status}</p>}
                            </div>

                            {data.status === 'Delivered' && repair.status !== 'Delivered' && balanceDue > 0 && (
                                <div className="space-y-1.5 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                    {auth.user.role?.toLowerCase() !== 'technician' ? (
                                        <>
                                            <label className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Final Payment Method (For UGX {balanceDue.toLocaleString()})</label>
                                            <select
                                                value={data.payment_method}
                                                onChange={(e) => setData('payment_method', e.target.value)}
                                                className="w-full border-emerald-300 dark:border-emerald-700 dark:bg-slate-800 dark:text-white focus:border-emerald-500 focus:ring-emerald-500 rounded-lg shadow-sm text-sm font-semibold py-2"
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="MTN MoMo">MTN MoMo</option>
                                                <option value="Airtel Money">Airtel Money</option>
                                                <option value="Layaway">Layaway</option>
                                            </select>
                                            {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method}</p>}
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                                                Marking this as Delivered will automatically collect the balance and complete the Sale.
                                            </p>
                                        </>
                                    ) : (
                                        <div className="p-2 text-sm text-amber-700 dark:text-amber-300 font-medium">
                                            Cannot mark as Delivered: Pending balance of UGX {balanceDue.toLocaleString()} must be collected by a cashier.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Technician Notes</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                                    <textarea
                                        value={data.technician_notes}
                                        onChange={(e) => setData('technician_notes', e.target.value)}
                                        disabled={isReadOnly}
                                        className={`w-full pl-9 text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm min-h-[95px] resize-y ${isReadOnly ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                        placeholder="Enter repair findings, diagnostic notes, or completion details..."
                                    />
                                </div>
                                {errors.technician_notes && <p className="text-xs text-red-500">{errors.technician_notes}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Final Cost (UGX)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.estimated_cost}
                                        onChange={(e) => setData('estimated_cost', e.target.value)}
                                        disabled={isReadOnly}
                                        className={`w-full pl-12 pr-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                    />
                                </div>
                                {errors.estimated_cost && <p className="text-xs text-red-500">{errors.estimated_cost}</p>}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={onClose}>
                                    {isReadOnly ? 'Close' : 'Cancel'}
                                </Button>
                                {!isReadOnly && (
                                    <Button 
                                        type="submit" 
                                        variant="primary" 
                                        disabled={processing || (data.status === 'Delivered' && balanceDue > 0 && auth.user.role?.toLowerCase() === 'technician')}
                                    >
                                        Save Ticket Changes
                                    </Button>
                                )}
                            </div>
                        </form>

                        {/* Record Additional Payment Block */}
                        {balanceDue > 0 && repair.status !== 'Delivered' && repair.status !== 'Cancelled' && (
                            auth.user.role?.toLowerCase() !== 'technician' ? (
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        router.post(route('repairs.payments.store', repair.id), {
                                            amount_paid: e.target.amount_paid.value,
                                            payment_method: e.target.payment_method.value,
                                        }, {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                e.target.reset();
                                                toast.success('Payment recorded successfully');
                                            }
                                        });
                                    }} 
                                    className="space-y-4"
                                >
                                    <div className="flex justify-between items-center bg-slate-900 text-white px-4 py-2 rounded-t-xl">
                                        <h3 className="text-sm font-bold flex items-center gap-2">
                                            Record Additional Payment
                                        </h3>
                                        <div className="text-sm">
                                            Balance: <span className="font-bold text-emerald-400">UGX {balanceDue.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-xl bg-slate-50 dark:bg-slate-800/60 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Amount Paid (UGX)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">UGX</span>
                                                <input 
                                                    type="number" 
                                                    name="amount_paid"
                                                    min="1"
                                                    max={balanceDue}
                                                    required
                                                    className="w-full pl-12 pr-3 py-2 text-sm font-bold text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm"
                                                    placeholder="Enter amount"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Payment Method</label>
                                            <select 
                                                name="payment_method"
                                                required
                                                className="w-full border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-rose-500 focus:ring-rose-500 rounded-xl px-3 py-2 text-sm font-semibold shadow-sm"
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="MTN MoMo">MTN MoMo</option>
                                                <option value="Airtel Money">Airtel Money</option>
                                            </select>
                                        </div>

                                        <Button type="submit" variant="primary" className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white">
                                            Record Payment
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-4 rounded-xl shadow-sm text-sm font-medium">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold">Pending Balance:</span>
                                        <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">UGX {balanceDue.toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                                        Payments must be collected and recorded by a cashier at the front desk.
                                    </p>
                                </div>
                            )
                        )}

                        {balanceDue === 0 && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex items-center justify-between shadow-sm">
                                <span className="text-sm font-bold">Balance Due:</span>
                                <span className="text-lg font-extrabold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                    Paid in Full
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {showDeletePartModal && (
                    <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                    <Trash2 size={24} className="text-rose-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Remove Repair Part</h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Are you sure you want to remove this part? It will be returned to inventory.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button variant="secondary" onClick={() => setShowDeletePartModal(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="primary" 
                                    className="!bg-rose-600 hover:!bg-rose-700 !border-rose-600"
                                    onClick={confirmRemovePart}
                                >
                                    Remove Part
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
