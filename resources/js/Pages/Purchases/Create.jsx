import React, { useState, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import SearchableSelect from '@/Components/SaaS/SearchableSelect';
import { Package, Plus, Trash2, Save, X, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchasesCreate({ auth, suppliers, products }) {
    const { data, setData, post, processing, errors } = useForm({
        supplier_id: '',
        reference_no: '',
        total_amount: '',
        paid_amount: '',
        status: 'Received',
        purchase_date: new Date().toISOString().split('T')[0],
        items: [] // { product_id, quantity, unit_cost, imeis: [] }
    });

    const [imeiInputs, setImeiInputs] = useState({});

    const calculateTotal = () => {
        return data.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;
        
        setData(prevData => ({
            ...prevData,
            items: newItems,
            total_amount: newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0)
        }));
    };

    const handleProductChange = (index, productId) => {
        const product = products.find(p => p.id === Number(productId));
        const newItems = [...data.items];
        newItems[index].product_id = productId;
        newItems[index].product_type = product ? product.type : '';
        newItems[index].quantity = product?.type === 'serialized' ? newItems[index].imeis.length : (newItems[index].quantity || 1);
        
        setData(prevData => ({
            ...prevData,
            items: newItems,
            total_amount: newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0)
        }));
    };

    const handleImeiKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = imeiInputs[index]?.trim();
            if (val) {
                const allScannedImeis = data.items.flatMap(item => item.imeis || []);
                if (allScannedImeis.includes(val)) {
                    toast.error(`IMEI '${val}' has already been scanned.`);
                    return;
                }

                const newItems = [...data.items];
                newItems[index].imeis.push(val);
                newItems[index].quantity = newItems[index].imeis.length;
                setData(prevData => ({
                    ...prevData,
                    items: newItems,
                    total_amount: newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0)
                }));
                setImeiInputs({ ...imeiInputs, [index]: '' });
            }
        }
    };

    const removeImei = (itemIndex, imeiIndex) => {
        const newItems = [...data.items];
        newItems[itemIndex].imeis.splice(imeiIndex, 1);
        newItems[itemIndex].quantity = newItems[itemIndex].imeis.length;
        setData(prevData => ({
            ...prevData,
            items: newItems,
            total_amount: newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0)
        }));
    };

    const addItem = () => {
        setData('items', [...data.items, { product_id: '', product_type: '', quantity: 1, unit_cost: '', imeis: [], condition: 'Brand New', color: '', storage_capacity: '', selling_price: '' }]);
    };

    const removeItem = (index) => {
        const newItems = data.items.filter((_, i) => i !== index);
        setData(prevData => ({
            ...prevData,
            items: newItems,
            total_amount: newItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0)
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        
        if (data.items.length === 0) {
            toast.error("Add at least one item to the purchase");
            return;
        }

        // Validation for serialized items having IMEIs
        for (const item of data.items) {
            if (item.product_type === 'serialized' && item.imeis.length === 0) {
                toast.error("Please scan at least one IMEI for serialized products.");
                return;
            }
        }

        if (Number(data.paid_amount) > Number(data.total_amount)) {
            toast.error(`Amount paid (${Number(data.paid_amount).toLocaleString()} UGX) cannot exceed total purchase cost (${Number(data.total_amount).toLocaleString()} UGX).`);
            return;
        }

        post('/api/purchases', {
            onSuccess: () => {
                toast.success('Purchase logged successfully');
                window.location.href = `/suppliers/${data.supplier_id}`;
            },
            onError: (errs) => {
                if (errs?.items) {
                    toast.error(errs.items, { duration: 5000 });
                } else {
                    toast.error('Failed to log purchase. Please check the fields.');
                }
            }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Log Purchase" />
            <PageHeader 
                title="Log Wholesale Purchase" 
                breadcrumbs={[
                    { label: 'Suppliers', href: route('suppliers.index') }, 
                    { label: 'Log Purchase' }
                ]}
            />

            <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <form onSubmit={submit} className="space-y-6">
                    {/* General Information */}
                    <Card>
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                            <Package className="text-indigo-500" /> Purchase Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Supplier *</label>
                                <select 
                                    className="saas-input w-full" 
                                    required
                                    value={data.supplier_id}
                                    onChange={e => setData('supplier_id', e.target.value)}
                                >
                                    <option value="" disabled>Select a supplier...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                {errors.supplier_id && <div className="text-rose-500 text-xs mt-1">{errors.supplier_id}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Reference / Invoice No</label>
                                <input 
                                    type="text" 
                                    className="saas-input w-full" 
                                    placeholder="e.g. INV-2023-001"
                                    value={data.reference_no}
                                    onChange={e => setData('reference_no', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Purchase Date *</label>
                                <input 
                                    type="date" 
                                    className="saas-input w-full" 
                                    required
                                    value={data.purchase_date}
                                    onChange={e => setData('purchase_date', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Status *</label>
                                <select 
                                    className="saas-input w-full" 
                                    required
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="Received">Received (Arrived at shop)</option>
                                    <option value="Pending">Pending (In transit)</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Items */}
                    <Card noPadding>
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-lg">Purchase Items</h3>
                                <p className="text-sm text-slate-500">Scan IMEIs for phones, or set quantities for bulk accessories.</p>
                            </div>
                            <Button type="button" variant="primary" onClick={addItem} size="sm">
                                <Plus size={14} className="mr-1"/> Add Product
                            </Button>
                        </div>
                        <div className="p-6">
                            {errors.items && (
                                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
                                    <AlertTriangle size={18} className="shrink-0 text-rose-500" />
                                    <span>{errors.items}</span>
                                </div>
                            )}
                            {data.items.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    Click "Add Product" to start logging items.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {data.items.map((item, index) => (
                                        <div key={index} className="p-5 border border-slate-200 rounded-xl bg-white group space-y-4">
                                            {/* Top Row: Product, IMEIs / Qty, Unit Cost, Total, Delete */}
                                            <div className="flex flex-wrap lg:flex-nowrap items-start gap-4">
                                                <div className="flex-1 min-w-[240px]">
                                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Product</label>
                                                    <SearchableSelect 
                                                        options={products.map(p => ({
                                                            value: p.id,
                                                            label: `${p.brand?.name} ${p.model_name} ${p.sku ? `(${p.sku})` : ''} - ${p.type}`
                                                        }))}
                                                        value={item.product_id}
                                                        onChange={value => handleProductChange(index, value)}
                                                        placeholder="Choose product..."
                                                        error={!!errors[`items.${index}.product_id`]}
                                                    />
                                                    {errors[`items.${index}.product_id`] && <div className="text-rose-500 text-xs mt-1">{errors[`items.${index}.product_id`]}</div>}
                                                </div>

                                                <div className="flex-1 min-w-[260px]">
                                                    {item.product_type === 'serialized' ? (
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Scan IMEIs ({item.quantity} scanned)</label>
                                                            <div className="relative">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                    <Search size={14} className="text-slate-400" />
                                                                </div>
                                                                <input 
                                                                    type="text" 
                                                                    className="saas-input w-full !pl-9" 
                                                                    placeholder="Scan/Type IMEI + Enter"
                                                                    value={imeiInputs[index] || ''}
                                                                    onChange={e => setImeiInputs({...imeiInputs, [index]: e.target.value})}
                                                                    onKeyDown={e => handleImeiKeyDown(e, index)}
                                                                />
                                                            </div>
                                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                                {item.imeis.map((imei, imeiIndex) => (
                                                                    <span key={imeiIndex} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                                                                        {imei}
                                                                        <button type="button" onClick={() => removeImei(index, imeiIndex)} className="hover:text-indigo-900 focus:outline-none">
                                                                            <X size={12} />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
                                                            <input 
                                                                type="number" 
                                                                required min="1"
                                                                className="saas-input w-full"
                                                                value={item.quantity}
                                                                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                                disabled={!item.product_type}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-36">
                                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Unit Cost (UGX)</label>
                                                    <input 
                                                        type="number" 
                                                        required min="0" step="any"
                                                        className="saas-input w-full"
                                                        value={item.unit_cost}
                                                        onChange={e => handleItemChange(index, 'unit_cost', e.target.value)}
                                                    />
                                                </div>

                                                <div className="w-44">
                                                    <label className="block text-xs font-semibold text-slate-500 mb-1 text-right">Total Line Cost</label>
                                                    <div className="saas-input bg-slate-50/80 border-slate-200 text-right font-bold text-slate-900 flex items-center justify-end truncate">
                                                        {((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0)).toLocaleString()} UGX
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-6">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeItem(index)}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Remove Item"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Bottom Row (Serialized Device Details): Full Width & Matching Style */}
                                            {item.product_type === 'serialized' && (
                                                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Condition</label>
                                                        <select 
                                                            className="saas-input w-full"
                                                            value={item.condition || 'Brand New'}
                                                            onChange={e => handleItemChange(index, 'condition', e.target.value)}
                                                        >
                                                            <option value="Brand New">Brand New</option>
                                                            <option value="Refurbished">Refurbished</option>
                                                            <option value="Used Grade A">Used Grade A</option>
                                                            <option value="Used Grade B">Used Grade B</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Storage Capacity</label>
                                                        <input 
                                                            type="text" 
                                                            className="saas-input w-full"
                                                            placeholder="e.g. 256GB"
                                                            value={item.storage_capacity || ''}
                                                            onChange={e => handleItemChange(index, 'storage_capacity', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Color</label>
                                                        <input 
                                                            type="text" 
                                                            className="saas-input w-full"
                                                            placeholder="e.g. Black"
                                                            value={item.color || ''}
                                                            onChange={e => handleItemChange(index, 'color', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Selling Price (UGX)</label>
                                                        <input 
                                                            type="number"
                                                            min="0" step="any"
                                                            className="saas-input w-full"
                                                            placeholder="Default Price"
                                                            value={item.selling_price || ''}
                                                            onChange={e => handleItemChange(index, 'selling_price', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-500">Grand Total:</span>
                                <span className="font-black text-2xl text-rose-600">
                                    {calculateTotal().toLocaleString()} <span className="text-sm text-rose-400 font-bold">UGX</span>
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Payment */}
                    <Card className="bg-emerald-50/50 border-emerald-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-emerald-900 mb-1">Payment Made</h3>
                                <p className="text-sm text-emerald-700">How much are you paying the supplier upfront for this shipment?</p>
                            </div>
                            <div className="w-64">
                                <input 
                                    type="number" 
                                    className="saas-input w-full text-right font-bold text-xl py-3 text-emerald-900 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="Amount in UGX"
                                    required
                                    min="0"
                                    max={data.total_amount || 9999999999}
                                    value={data.paid_amount}
                                    onChange={e => setData('paid_amount', e.target.value)}
                                />
                                {errors.paid_amount && <div className="text-rose-500 text-xs mt-1 text-right">{errors.paid_amount}</div>}
                                {data.total_amount > 0 && (
                                    <div className="text-[11px] text-slate-500 text-right mt-1 font-medium">
                                        Max payable: <strong className="text-emerald-700">{Number(data.total_amount).toLocaleString()} UGX</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href={route('suppliers.index')} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                            Cancel
                        </Link>
                        <Button variant="primary" type="submit" disabled={processing} className="px-8 py-3 text-lg">
                            <Save size={18} className="mr-2" /> Save & Update Inventory
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
