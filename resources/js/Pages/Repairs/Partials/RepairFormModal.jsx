import React, { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import Button from '@/Components/SaaS/Button';
import AiRepairEstimator from '@/Components/SaaS/AiRepairEstimator';
import { 
    Wrench, Phone, User, Smartphone, Hash, Lock, 
    AlignLeft, Plus, Trash2, Package, X, Calendar, ClipboardCheck, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RepairFormModal({ isOpen, onClose, products, customers = [], technicians = [] }) {
    const { auth } = usePage().props;
    const [showAiEstimator, setShowAiEstimator] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        device_model: '',
        imei_serial: '',
        device_passcode: '',
        issue_description: '',
        estimated_cost: '',
        deposit: '0',
        parts: [],
        pre_repair_checklist: {
            power: true,
            display: true,
            touch: true,
            audio: true,
            cameras: true,
            charging_port: true
        },
        expected_completion_date: '',
        technician_id: '',
    });

    const [selectedProduct, setSelectedProduct] = useState('');
    const [partQuantity, setPartQuantity] = useState(1);

    const handleAddPart = () => {
        if (!selectedProduct) return;
        const product = products.find(p => p.id === parseInt(selectedProduct));
        if (!product) return;

        const newPart = {
            product_id: product.id,
            name: product.name,
            price: product.price,
            quantity: Number(partQuantity) || 1
        };

        const newParts = [...data.parts, newPart];
        
        // Auto-increment estimated cost
        const currentCost = Number(data.estimated_cost) || 0;
        const additionalCost = Number(product.price) * (Number(partQuantity) || 1);
        
        setData(data => ({
            ...data,
            parts: newParts,
            estimated_cost: String(currentCost + additionalCost)
        }));

        setSelectedProduct('');
        setPartQuantity(1);
    };

    const handleRemovePart = (index) => {
        const partToRemove = data.parts[index];
        const newParts = data.parts.filter((_, i) => i !== index);
        
        // Auto-decrement estimated cost
        const currentCost = Number(data.estimated_cost) || 0;
        const subtractedCost = Number(partToRemove.price) * Number(partToRemove.quantity);
        
        setData(data => ({
            ...data,
            parts: newParts,
            estimated_cost: String(Math.max(0, currentCost - subtractedCost))
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('repairs.store'), {
            onSuccess: () => {
                reset();
                onClose();
                toast.success('Repair ticket created successfully!');
            },
            onError: () => {
                toast.error('Please check the form for errors.');
            }
        });
    };

    const totalEstimate = Number(data.estimated_cost) || 0;
    const depositPaid = Number(data.deposit) || 0;
    const balanceDue = Math.max(0, totalEstimate - depositPaid);

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl">
            <div className="flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                
                {/* Fixed Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                            <Wrench size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-white tracking-tight">New Repair Ticket</h2>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">INTAKE</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Register customer device intake, assign repair parts, and set cost estimate.</p>
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

                {/* Form Split View */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row overflow-y-auto">
                    
                    {/* Left Column: Customer & Device Intake */}
                    <div className="w-full md:w-1/2 p-6 bg-slate-50/70 dark:bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 space-y-6 overflow-y-auto">
                        
                        {/* Customer Details */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Contact</h3>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Select Customer (Optional)</label>
                                    <select 
                                        className="w-full text-sm py-2.5 font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500 rounded-lg shadow-sm"
                                        value={data.customer_id}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            setData('customer_id', id);
                                            if (id) {
                                                const customer = customers.find(c => c.id == id);
                                                if (customer) {
                                                    setData(prev => ({ ...prev, customer_id: id, customer_name: customer.name, customer_phone: customer.phone }));
                                                }
                                            } else {
                                                setData(prev => ({ ...prev, customer_id: '', customer_name: '', customer_phone: '' }));
                                            }
                                        }}
                                    >
                                        <option value="">-- Create New Customer --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Customer Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
                                        <TextInput
                                            type="text"
                                            value={data.customer_name}
                                            onChange={(e) => setData('customer_name', e.target.value)}
                                            className={`w-full pl-10 text-sm py-2.5 font-medium ${data.customer_id ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'}`}
                                            placeholder="e.g. John Doe"
                                            required
                                            disabled={!!data.customer_id}
                                        />
                                    </div>
                                    {errors.customer_name && <p className="text-xs text-red-500 mt-1">{errors.customer_name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Phone Number *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
                                        <TextInput
                                            type="text"
                                            value={data.customer_phone}
                                            onChange={(e) => setData('customer_phone', e.target.value)}
                                            className={`w-full pl-10 text-sm py-2.5 font-medium ${data.customer_id ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'}`}
                                            placeholder="e.g. 0770000000"
                                            required
                                            disabled={!!data.customer_id}
                                        />
                                    </div>
                                    {errors.customer_phone && <p className="text-xs text-red-500 mt-1">{errors.customer_phone}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Device Details */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Specs</h3>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Device Model *</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
                                        <TextInput
                                            type="text"
                                            value={data.device_model}
                                            onChange={(e) => setData('device_model', e.target.value)}
                                            className="w-full pl-10 text-sm py-2.5 font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                                            placeholder="e.g. iPhone 13 Pro"
                                            required
                                        />
                                    </div>
                                    {errors.device_model && <p className="text-xs text-red-500 mt-1">{errors.device_model}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">IMEI / Serial</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
                                            <TextInput
                                                type="text"
                                                value={data.imei_serial}
                                                onChange={(e) => setData('imei_serial', e.target.value)}
                                                className="w-full pl-9 text-xs py-2 font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                                                placeholder="358..."
                                            />
                                        </div>
                                        {errors.imei_serial && <p className="text-xs text-red-500 mt-1">{errors.imei_serial}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Passcode</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
                                            <TextInput
                                                type="text"
                                                value={data.device_passcode}
                                                onChange={(e) => setData('device_passcode', e.target.value)}
                                                className="w-full pl-9 text-xs py-2 font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                                                placeholder="123456"
                                            />
                                        </div>
                                        {errors.device_passcode && <p className="text-xs text-red-500 mt-1">{errors.device_passcode}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Issue Description */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issue Description</h3>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" size={16} />
                                    <textarea
                                        value={data.issue_description}
                                        onChange={(e) => setData('issue_description', e.target.value)}
                                        className="w-full pl-9 text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm min-h-[95px] resize-y placeholder-slate-400 dark:placeholder-slate-500"
                                        placeholder="Screen cracked, needs replacement. Battery draining fast..."
                                        required
                                    />
                                </div>
                                {errors.issue_description && <p className="text-xs text-red-500 mt-1">{errors.issue_description}</p>}
                                
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <ClipboardCheck size={14} className="text-slate-400 dark:text-slate-500" /> Pre-Repair Checklist
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300">
                                        {['power', 'display', 'touch', 'audio', 'cameras', 'charging_port'].map(key => (
                                            <label key={key} className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.pre_repair_checklist[key]}
                                                    onChange={(e) => setData('pre_repair_checklist', { ...data.pre_repair_checklist, [key]: e.target.checked })}
                                                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-500 focus:ring-rose-500"
                                                />
                                                <span className="capitalize">{key.replace('_', ' ')} Working</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400 dark:text-slate-500" /> Expected Completion Date
                                    </label>
                                    <TextInput
                                        type="datetime-local"
                                        value={data.expected_completion_date}
                                        onChange={(e) => setData('expected_completion_date', e.target.value)}
                                        className="w-full text-sm py-2 font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Parts Assignment & Financials */}
                    <div className="w-full md:w-1/2 p-6 space-y-6 overflow-y-auto bg-white dark:bg-slate-900 flex flex-col justify-between">
                        
                        <div className="space-y-6">
                            {/* Parts Integration Card */}
                            <div className="space-y-3.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                        <Package size={17} className="text-emerald-500 dark:text-emerald-400" />
                                        Parts Required
                                    </h3>
                                    {data.parts.length > 0 && (
                                        <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                                            {data.parts.length} {data.parts.length === 1 ? 'Part' : 'Parts'} Attached
                                        </span>
                                    )}
                                </div>

                                {/* Attached Parts List */}
                                {data.parts.length > 0 ? (
                                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                        {data.parts.map((part, index) => (
                                            <div key={index} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl text-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="flex-1 min-w-0 pr-3">
                                                    <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{part.name}</p>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                                        Qty: <span className="font-semibold text-slate-800 dark:text-slate-200">{part.quantity}</span> &times; UGX {Number(part.price).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                        UGX {(part.price * part.quantity).toLocaleString()}
                                                    </span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemovePart(index)}
                                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded-lg transition-colors"
                                                        title="Remove Part"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-2">No repair parts attached yet.</p>
                                )}

                                {errors.parts && (
                                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-medium">
                                        {errors.parts}
                                    </div>
                                )}

                                {/* Add Part Selector */}
                                <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex gap-2 items-center">
                                    <select
                                        value={selectedProduct}
                                        onChange={(e) => setSelectedProduct(e.target.value)}
                                        className="flex-1 min-w-0 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 focus:ring-rose-500 rounded-lg text-sm shadow-sm py-2 truncate"
                                    >
                                        <option value="">Select inventory part...</option>
                                        {products && products.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (Stock: {product.stock}) - UGX {Number(product.price).toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        value={partQuantity}
                                        onChange={(e) => setPartQuantity(e.target.value)}
                                        className="w-16 shrink-0 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 focus:ring-rose-500 rounded-lg text-center font-bold shadow-sm py-2 px-1"
                                        title="Quantity"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleAddPart} 
                                        disabled={!selectedProduct}
                                        className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-40 text-white px-3.5 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm transition-all shrink-0"
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Financial & Assignment Details */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <User size={14} className="text-orange-500" /> Assign Technician
                                    </label>
                                    <select
                                        value={data.technician_id}
                                        onChange={e => setData('technician_id', e.target.value)}
                                        className="saas-input w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                                    >
                                        <option value="">-- Unassigned --</option>
                                        {technicians.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    {errors.technician_id && <p className="text-xs text-red-500 mt-1">{errors.technician_id}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Est. Cost (UGX) *</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowAiEstimator(true)}
                                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                                            >
                                                <Sparkles size={11} className="text-indigo-500" /> AI Estimate
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">UGX</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={data.estimated_cost}
                                                onChange={(e) => setData('estimated_cost', e.target.value)}
                                                className="w-full pl-12 pr-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm"
                                                placeholder="0"
                                                required
                                            />
                                        </div>
                                        {errors.estimated_cost && <p className="text-xs text-red-500 mt-1">{errors.estimated_cost}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Deposit Paid (UGX) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">UGX</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={data.deposit}
                                                onChange={(e) => setData('deposit', e.target.value)}
                                                className={`w-full pl-12 pr-3 py-2.5 text-sm font-bold border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500 rounded-xl shadow-sm ${auth.user.role === 'technician' ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'}`}
                                                placeholder="0"
                                                required
                                                disabled={auth.user.role === 'technician'}
                                            />
                                        </div>
                                        {auth.user.role === 'technician' && (
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Deposits must be collected by a cashier.</p>
                                        )}
                                        {errors.deposit && <p className="text-xs text-red-500 mt-1">{errors.deposit}</p>}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border flex justify-between items-center ${balanceDue > 0 ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300'}`}>
                                    <span className="text-sm font-bold">Estimated Balance Due:</span>
                                    <span className="text-lg font-extrabold">
                                        UGX {balanceDue.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Action Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                            <Button type="button" variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={processing} className="flex items-center gap-2">
                                <Wrench size={16} />
                                Create Repair Ticket
                            </Button>
                        </div>

                    </div>
                </form>
            </div>

            <AiRepairEstimator
                show={showAiEstimator}
                onClose={() => setShowAiEstimator(false)}
                brand={data.device_model}
                modelName={data.device_model}
                problemDescription={data.issue_description}
                products={products}
                onApplyEstimate={(cost, notes) => {
                    setData(prev => ({
                        ...prev,
                        estimated_cost: cost,
                        issue_description: prev.issue_description ? `${prev.issue_description}\n${notes}` : notes
                    }));
                }}
            />
        </Modal>
    );
}
