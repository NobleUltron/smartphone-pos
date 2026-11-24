import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ScanLine, CreditCard, Sparkles, Trash2, ShoppingCart, Smartphone, Search, Package, RefreshCw, Plus, X, AlertTriangle } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/SaaS/PageHeader';

export default function POSIndex({ auth, customers = [], hasActiveDrawer }) {
    const { permissions } = usePage().props;
    const userRole = auth?.user?.role || 'cashier';
    const isCashier = userRole === 'cashier';
    const isDiscountLocked = isCashier && permissions?.allow_cashier_discounts === false;
    const isPriceEditLocked = isCashier && permissions?.allow_cashier_price_overwrites === false;

    const scanInputRef = useRef(null);
    const [imei, setImei] = useState('');
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [depositPaymentMethod, setDepositPaymentMethod] = useState('Cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [tenderedAmount, setTenderedAmount] = useState('');
    const [discount, setDiscount] = useState(0);
    const [customerId, setCustomerId] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [inventorySearchQuery, setInventorySearchQuery] = useState('');
    const [inventoryResults, setInventoryResults] = useState([]);
    const [isSearchingInventory, setIsSearchingInventory] = useState(false);
    const [selectedProductForImei, setSelectedProductForImei] = useState(null);

    const defaultTradeInForm = {
        brand: '',
        model_name: '',
        imei: '',
        condition: 'Used Grade A',
        storage_capacity: '',
        color: '',
        value: '',
        selling_price: '',
        battery_health: '88',
        face_id_ok: true,
        true_tone_ok: true,
        icloud_removed: true,
        cameras_audio_ok: true,
        screen_grade: 'Flawless',
        body_grade: 'Clean',
        seller_id_type: 'National ID (NIN)',
        seller_id_number: '',
        seller_name: '',
        seller_phone: '',
        notes: '',
    };

    const [showTradeInModal, setShowTradeInModal] = useState(false);
    const [tradeIn, setTradeIn] = useState(null);
    const [tradeInForm, setTradeInForm] = useState(defaultTradeInForm);

    const filteredCustomers = useMemo(() => {
        const q = customerSearch.trim().toLowerCase();
        if (!q) return customers;
        return customers.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q)
        );
    }, [customers, customerSearch]);

    const handleScan = async (e) => {
        e.preventDefault();
        const trimmed = imei.trim();
        if (!trimmed) return;

        try {
            const res = await axios.post('/api/pos/validate-imei', { imei: trimmed });
            const { type, item } = res.data;
            
            addToCart(type, item);
            setImei('');
            scanInputRef.current?.focus();
        } catch (error) {
            toast.error(error.response?.data?.error || "Device not found");
        }
    };

    const addToCart = (type, item) => {
        if (type === 'serialized') {
            if (cart.find(c => c.type === 'serialized' && c.id === item.id)) {
                toast.error("Device already in cart");
                return;
            }
            setCart(prev => [...prev, { 
                type: 'serialized',
                id: item.id,
                imei: item.imei, 
                name: `${item.product?.brand?.name || item.product?.brand || ''} ${item.product?.model_name || ''} - ${item.storage_capacity || 'N/A'}`.trim(), 
                price: Number(item.selling_price || 0),
                quantity: 1
            }]);
        } else {
            const existing = cart.find(c => c.id === item.id && c.type === 'bulk');
            if (existing) {
                if (existing.quantity >= item.quantity) {
                    toast.error(`Only ${item.quantity} available in stock`);
                    return;
                }
                setCart(prev => prev.map(c => (c.id === item.id && c.type === 'bulk') ? { ...c, quantity: c.quantity + 1 } : c));
            } else {
                setCart(prev => [...prev, {
                    type: 'bulk',
                    id: item.id,
                    imei: item.sku || `BULK-${item.id}`,
                    name: `${item.brand?.name || ''} ${item.model_name}${item.storage_capacity ? ' - ' + item.storage_capacity : ''}`.trim(),
                    price: Number(item.selling_price || 0),
                    quantity: 1,
                    max_quantity: item.quantity
                }]);
            }
        }
        toast.success("Added to cart");
    };

    const searchInventory = async (query = '') => {
        setIsSearchingInventory(true);
        try {
            const res = await axios.get('/api/pos/inventory-search', { params: { q: query } });
            setInventoryResults(res.data);
        } catch (error) {
            console.error("Failed to search inventory", error);
        } finally {
            setIsSearchingInventory(false);
        }
    };

    useEffect(() => {
        if (!showInventoryModal) return;
        const timer = setTimeout(() => {
            searchInventory(inventorySearchQuery);
        }, 250);
        return () => clearTimeout(timer);
    }, [showInventoryModal, inventorySearchQuery]);

    const handleUpdateQuantity = (imei, newQuantity) => {
        const qty = parseInt(newQuantity, 10);
        if (isNaN(qty) || qty < 1) return;
        setCart(cart.map(c => {
            if (c.imei === imei && c.type === 'bulk') {
                const clamped = c.max_quantity ? Math.min(qty, c.max_quantity) : qty;
                if (c.max_quantity && qty > c.max_quantity) {
                    toast.error(`Only ${c.max_quantity} unit(s) available in stock`);
                }
                return { ...c, quantity: clamped };
            }
            return c;
        }));
    };

    const handleUpdatePrice = (imei, newPrice) => {
        if (isPriceEditLocked) return;
        const val = parseFloat(newPrice);
        if (isNaN(val) || val < 0) return;
        setCart(cart.map(c => c.imei === imei ? { ...c, price: val } : c));
    };

    const handleAddTradeIn = (e) => {
        e.preventDefault();
        const appraised = parseFloat(tradeInForm.value);
        if (!tradeInForm.brand || !tradeInForm.model_name || isNaN(appraised) || appraised <= 0) {
            return toast.error("Please fill in brand, model, and a valid appraised value");
        }
        if (!tradeInForm.icloud_removed) {
            return toast.error("Anti-Theft Check: Confirm Find My / iCloud / Google FRP is removed before accepting trade-in.");
        }
        setTradeIn({
            brand: tradeInForm.brand.trim(),
            model_name: tradeInForm.model_name.trim(),
            imei: tradeInForm.imei.trim(),
            condition: tradeInForm.condition,
            storage_capacity: tradeInForm.storage_capacity.trim(),
            color: tradeInForm.color.trim(),
            value: appraised,
            selling_price: tradeInForm.selling_price,
            inspection: {
                battery_health: tradeInForm.battery_health,
                face_id_ok: Boolean(tradeInForm.face_id_ok),
                true_tone_ok: Boolean(tradeInForm.true_tone_ok),
                icloud_removed: Boolean(tradeInForm.icloud_removed),
                cameras_audio_ok: Boolean(tradeInForm.cameras_audio_ok),
                screen_grade: tradeInForm.screen_grade,
                body_grade: tradeInForm.body_grade,
                seller_id_type: tradeInForm.seller_id_type,
                seller_id_number: tradeInForm.seller_id_number.trim(),
                seller_name: tradeInForm.seller_name.trim(),
                seller_phone: tradeInForm.seller_phone.trim(),
                notes: tradeInForm.notes.trim(),
            }
        });
        setShowTradeInModal(false);
        setTradeInForm(defaultTradeInForm);
        toast.success("Trade-in verified & applied! Device will auto-add to In Stock on checkout.");
    };

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
    const tradeInDiscount = tradeIn ? Number(tradeIn.value || 0) : 0;
    const numericDiscount = isDiscountLocked ? 0 : Math.max(0, Number(discount) || 0);
    const finalAmount = total - numericDiscount - tradeInDiscount;
    const numericTendered = Number(tenderedAmount || 0);

    const handleCheckout = async () => {
        if (isSubmitting) return;
        if (cart.length === 0) return toast.error("Cart is empty");
        if (finalAmount < 0) {
            return toast.error("Final amount cannot be negative. Please adjust discount or trade-in value.");
        }

        if (paymentMethod === 'Cash' && finalAmount > 0) {
            if (tenderedAmount === '' || numericTendered < finalAmount) {
                return toast.error("Please enter a valid Tendered Amount that covers the total cost.");
            }
        }

        if (paymentMethod === 'Layaway') {
            if (finalAmount <= 0) {
                return toast.error("Cannot use Layaway for a zero-balance transaction. Please select Cash.");
            }
            if (Number(amountPaid || 0) >= finalAmount) {
                return toast.error("Layaway deposit must be less than the final amount. Use a regular payment method for full payment.");
            }
        }
        
        // Open window synchronously before async operation to avoid popup blockers
        const receiptWindow = window.open('about:blank', '_blank');
        setIsSubmitting(true);
        
        try {
            const res = await axios.post('/api/pos/checkout', {
                items: cart,
                customer_id: customerId || null,
                customer_name: customerId ? '' : customerName,
                customer_phone: customerId ? '' : customerPhone,
                payment_method: paymentMethod,
                deposit_payment_method: paymentMethod === 'Layaway' ? depositPaymentMethod : null,
                amount_paid: amountPaid || 0,
                tendered_amount: paymentMethod === 'Cash' ? (finalAmount === 0 ? 0 : (tenderedAmount || null)) : null,
                discount: numericDiscount,
                trade_in: tradeIn
            });
            setCart([]);
            setDiscount(0);
            setTradeIn(null);
            setAmountPaid('');
            setTenderedAmount('');
            setDepositPaymentMethod('Cash');
            setCustomerId('');
            setCustomerSearch('');
            setCustomerName('');
            setCustomerPhone('');
            toast.success(`Sale #${res.data.sale_id} completed!`);
            scanInputRef.current?.focus();
            
            if (receiptWindow) {
                receiptWindow.location.href = `/pos/receipt/${res.data.sale_id}`;
            }
        } catch (error) {
            if (receiptWindow) receiptWindow.close();
            const errorMsg = error.response?.data?.error || error.response?.data?.message || "Checkout failed";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="POS Checkout" />
            
            {!hasActiveDrawer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingCart size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Shift is Closed</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            You must open your cash drawer shift before you can access the POS checkout system.
                        </p>
                        <Link 
                            href={route('cash-drawer.index')}
                            className="inline-flex items-center justify-center bg-rose-500 text-white rounded-xl px-6 py-3 font-semibold hover:bg-rose-600 active:scale-[0.98] transition-all"
                        >
                            Open Shift Now
                        </Link>
                    </div>
                </div>
            )}

            <PageHeader 
                title="Point of Sale"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'POS Checkout' }]}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="glass" icon={Search} onClick={() => setShowInventoryModal(true)}>
                            Browse Inventory
                        </Button>
                        <Button variant="glass" icon={RefreshCw} onClick={() => setShowTradeInModal(true)}>
                            Trade-In Swap
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Scanner + Cart */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* IMEI Scanner */}
                    <Card className="animate-slide-up">
                        <form onSubmit={handleScan} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                                    <ScanLine size={24} />
                                </div>
                                <input 
                                    ref={scanInputRef}
                                    type="text" 
                                    className="saas-input !text-base sm:!text-lg flex-1 min-w-0" 
                                    placeholder="Scan Barcode / IMEI" 
                                    value={imei}
                                    onChange={(e) => setImei(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-3 sm:flex items-center gap-2">
                                <Button variant="primary" icon={Plus} type="submit" className="!py-2.5 !px-3 sm:!px-6 text-xs sm:text-sm">
                                    Add
                                </Button>
                                <Button type="button" variant="light" icon={Search} className="!py-2.5 !px-3 text-xs sm:text-sm whitespace-nowrap" onClick={() => setShowInventoryModal(true)}>
                                    Browse
                                </Button>
                                <Button type="button" variant="emerald" icon={RefreshCw} className="!py-2.5 !px-3 text-xs sm:text-sm whitespace-nowrap" onClick={() => setShowTradeInModal(true)}>
                                    Trade-In
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Cart Table */}
                    <Card noPadding className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <ShoppingCart size={20} className="text-rose-500" /> Cart Items
                            </h3>
                            {cart.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="info">{cart.reduce((s, i) => s + (i.quantity || 1), 0)} unit{cart.reduce((s, i) => s + (i.quantity || 1), 0) > 1 ? 's' : ''}</Badge>
                                    <button
                                        type="button"
                                        onClick={() => { setCart([]); toast.success('Cart cleared'); }}
                                        className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                    >
                                        Clear Cart
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Desktop Table View */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="saas-table w-full">
                                <thead>
                                    <tr>
                                        <th>Device / Item</th>
                                        <th>IMEI / Barcode</th>
                                        <th>Qty</th>
                                        <th>Unit Price (UGX)</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item) => (
                                        <tr key={item.imei}>
                                            <td className="font-bold text-slate-900 dark:text-slate-100">{item.name}</td>
                                            <td className="font-mono text-slate-500 dark:text-slate-400 text-sm">{item.imei}</td>
                                            <td>
                                                {item.type === 'bulk' ? (
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        max={item.max_quantity || undefined}
                                                        value={item.quantity} 
                                                        onChange={(e) => handleUpdateQuantity(item.imei, e.target.value)}
                                                        className="w-16 saas-input !py-1 !px-2 text-center"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.quantity}</span>
                                                )}
                                            </td>
                                            <td>
                                                {isPriceEditLocked ? (
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                                            {Number(item.price).toLocaleString()}
                                                            <span className="text-[10px] text-rose-500 font-bold" title="Price overwrite disabled by Admin">🔒</span>
                                                        </span>
                                                        {(item.quantity || 1) > 1 && (
                                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                Subtotal: {(Number(item.price) * item.quantity).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            className="w-28 saas-input !py-1 !px-2 text-right font-bold text-slate-900 dark:text-slate-100"
                                                            value={item.price} 
                                                            onChange={(e) => handleUpdatePrice(item.imei, e.target.value)}
                                                            title="Click to edit unit selling price"
                                                        />
                                                        {(item.quantity || 1) > 1 && (
                                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                Line: {(Number(item.price) * item.quantity).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button 
                                                    type="button"
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" 
                                                    onClick={() => setCart(cart.filter(i => i.imei !== item.imei))}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cart View */}
                        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                            {cart.map((item) => (
                                <div key={item.imei} className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{item.name}</p>
                                        <p className="font-mono text-slate-500 dark:text-slate-400 text-xs truncate">{item.imei}</p>
                                        {isPriceEditLocked ? (
                                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">
                                                {(Number(item.price) * (item.quantity || 1)).toLocaleString()} UGX
                                            </p>
                                        ) : (
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.price}
                                                    onChange={(e) => handleUpdatePrice(item.imei, e.target.value)}
                                                    className="w-24 saas-input !py-1 !px-2 text-xs font-bold text-right"
                                                    title="Edit unit price"
                                                />
                                                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                                    {(item.quantity || 1) > 1 ? `= ${(Number(item.price) * item.quantity).toLocaleString()} UGX` : 'UGX'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.type === 'bulk' && (
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max={item.max_quantity || undefined}
                                                value={item.quantity} 
                                                onChange={(e) => handleUpdateQuantity(item.imei, e.target.value)}
                                                className="w-14 saas-input !py-1 !px-2 text-center text-xs font-bold"
                                            />
                                        )}
                                        <button 
                                            type="button"
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" 
                                            onClick={() => setCart(cart.filter(i => i.imei !== item.imei))}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {cart.length === 0 && (
                            <div className="py-12 text-center flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mb-4">
                                    <Smartphone size={32} />
                                </div>
                                <p className="font-medium text-slate-500 dark:text-slate-400 text-sm">Cart is empty. Scan an item to begin.</p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Order Summary */}
                <div className="lg:col-span-1" id="order-summary-card">
                    <Card className="sticky top-24 animate-slide-up flex flex-col" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <CreditCard size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Order Summary</h3>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-xl p-4 mb-6 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{total.toLocaleString()} UGX</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    Discount
                                    {isDiscountLocked && <span className="text-[10px] text-rose-500 font-bold">🔒 Admin Only</span>}
                                </span>
                                <input 
                                    type="number" 
                                    min="0"
                                    className={`saas-input !w-28 !py-1.5 text-right !text-sm ${isDiscountLocked ? 'bg-slate-100 dark:bg-slate-800 opacity-60 cursor-not-allowed border-rose-200 dark:border-rose-800' : ''}`}
                                    value={isDiscountLocked ? 0 : discount} 
                                    onChange={(e) => {
                                        if (isDiscountLocked) return;
                                        const val = e.target.value;
                                        setDiscount(val === '' ? '' : Math.max(0, Number(val)));
                                    }} 
                                    disabled={isDiscountLocked}
                                    title={isDiscountLocked ? "Cashiers are not authorized to issue custom discounts." : ""}
                                />
                            </div>
                            {tradeIn && (
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex flex-col">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Trade-in Credit</span>
                                        <span className="text-xs text-slate-400">{tradeIn.brand} {tradeIn.model_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">-{(tradeIn.value).toLocaleString()} UGX</span>
                                        <button type="button" onClick={() => setTradeIn(null)} className="text-slate-400 hover:text-rose-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {finalAmount < 0 && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                                <span>Discount and trade-in credit exceed the subtotal. Reduce the discount or trade-in value to proceed.</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-end mb-6 px-1">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Amount</span>
                            <div className="text-right">
                                <span className={`text-2xl font-bold ${finalAmount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {finalAmount.toLocaleString()}
                                </span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">UGX</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="saas-label !mb-0">Select Customer</label>
                                    {customerSearch && (
                                        <span className="text-[11px] text-slate-400">{filteredCustomers.length} match{filteredCustomers.length === 1 ? '' : 'es'}</span>
                                    )}
                                </div>
                                <div className="relative mb-2">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        className="saas-input !pl-8 !py-1.5 !text-xs"
                                        placeholder="Filter customers by name or phone..."
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="saas-input pl-4 font-semibold text-slate-700 dark:text-slate-200" 
                                    value={customerId} 
                                    onChange={(e) => setCustomerId(e.target.value)}
                                >
                                    <option value="">Walk-in / New Customer</option>
                                    {filteredCustomers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                    ))}
                                </select>
                            </div>

                            {!customerId && (
                                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                    <div>
                                        <label className="saas-label">Name <span className="text-slate-400 font-normal">(Optional)</span></label>
                                        <input 
                                            type="text"
                                            className="saas-input text-sm"
                                            placeholder="e.g. John Doe"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="saas-label">Phone <span className="text-slate-400 font-normal">(Optional)</span></label>
                                        <input 
                                            type="text"
                                            className="saas-input text-sm"
                                            placeholder="e.g. 0700000000"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="saas-label">Payment Method</label>
                                <select className="saas-input pl-4" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option>Cash</option>
                                    <option>MTN MoMo</option>
                                    <option>Airtel Money</option>
                                    <option>Bank Transfer</option>
                                    <option>Layaway</option>
                                </select>
                            </div>

                            {paymentMethod === 'Cash' && (
                                <div className="animate-fade-in border-t border-slate-100 dark:border-slate-700 pt-4 mt-4">
                                    <label className="saas-label text-indigo-600 dark:text-indigo-400">Tendered Amount (Cash Given)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                                            UGX
                                        </div>
                                        <input 
                                            type="number" 
                                            min="0"
                                            className="saas-input border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500/20" 
                                            style={{ paddingLeft: '3.5rem' }}
                                            placeholder={finalAmount === 0 ? "0 (Even Swap)" : "Enter cash handed to you"} 
                                            value={tenderedAmount} 
                                            onChange={(e) => setTenderedAmount(e.target.value)} 
                                        />
                                    </div>
                                    {finalAmount > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setTenderedAmount(String(finalAmount))}
                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                                            >
                                                Exact
                                            </button>
                                            {[10000, 50000, 100000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setTenderedAmount(String((Number(tenderedAmount) || 0) + amt))}
                                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    +{amt / 1000}k
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {numericTendered > 0 && numericTendered >= finalAmount && finalAmount >= 0 && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            Change Due: <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{(numericTendered - finalAmount).toLocaleString()} UGX</strong>
                                        </p>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'Layaway' && (
                                <div className="animate-fade-in border-t border-slate-100 dark:border-slate-700 pt-4 mt-4 space-y-3">
                                    <div>
                                        <label className="saas-label text-indigo-600 dark:text-indigo-400">Deposit Payment Method</label>
                                        <select
                                            className="saas-input pl-4"
                                            value={depositPaymentMethod}
                                            onChange={(e) => setDepositPaymentMethod(e.target.value)}
                                        >
                                            <option>Cash</option>
                                            <option>MTN MoMo</option>
                                            <option>Airtel Money</option>
                                            <option>Bank Transfer</option>
                                        </select>
                                    </div>
                                    <label className="saas-label text-indigo-600 dark:text-indigo-400">Initial Deposit (Amount Paid)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                                            UGX
                                        </div>
                                        <input 
                                            type="number" 
                                            min="0"
                                            className="saas-input border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500/20" 
                                            style={{ paddingLeft: '3.5rem' }}
                                            placeholder="Enter amount paid today" 
                                            value={amountPaid} 
                                            onChange={(e) => setAmountPaid(e.target.value)} 
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        Remaining balance: <strong className="text-slate-900 dark:text-slate-100">{Math.max(0, finalAmount - (Number(amountPaid) || 0)).toLocaleString()} UGX</strong>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                            <Button
                                variant="primary"
                                className="w-full !py-3 !text-base"
                                onClick={handleCheckout}
                                icon={Sparkles}
                                disabled={isSubmitting || cart.length === 0 || finalAmount < 0}
                            >
                                {isSubmitting ? 'Processing Sale...' : 'Complete Sale'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Browse Inventory Modal */}
            <Modal show={showInventoryModal} onClose={() => { setShowInventoryModal(false); setSelectedProductForImei(null); setInventorySearchQuery(''); }} maxWidth="2xl">
                <div className="p-6 dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Package className="text-indigo-500" /> Browse Inventory
                        </h2>
                        <button type="button" onClick={() => { setShowInventoryModal(false); setSelectedProductForImei(null); setInventorySearchQuery(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={20} />
                        </button>
                    </div>

                    {!selectedProductForImei ? (
                        <>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="saas-input !pl-10"
                                    placeholder="Search products by brand, model, IMEI, or SKU..."
                                    value={inventorySearchQuery}
                                    onChange={(e) => setInventorySearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {isSearchingInventory ? (
                                    <div className="text-center py-8 text-slate-400">Searching...</div>
                                ) : inventoryResults.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">No products found in stock.</div>
                                ) : (
                                    inventoryResults.map(product => {
                                        const bulkInCart = product.type === 'bulk' ? cart.find(c => c.type === 'bulk' && c.id === product.id) : null;
                                        return (
                                            <div key={`prod-${product.id}`} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-700">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center flex-wrap gap-2">
                                                        <span>{product.brand?.name} {product.model_name}</span>
                                                        {product.storage_capacity && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                                                {product.storage_capacity}
                                                            </span>
                                                        )}
                                                        {bulkInCart && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                                                In Cart ({bulkInCart.quantity}/{product.quantity})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {product.type === 'bulk' ? `Stock: ${product.quantity} | SKU: ${product.sku || 'N/A'}` : `Available Devices: ${product.device_imeis?.length || 0}`}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                                                        {Number(product.selling_price).toLocaleString()} UGX
                                                    </div>
                                                    {product.type === 'bulk' ? (
                                                        <Button variant="primary" icon={Plus} className="!py-1.5 !px-3.5 !text-xs font-bold" onClick={() => {
                                                            addToCart('bulk', product);
                                                            setShowInventoryModal(false);
                                                        }}>
                                                            Add
                                                        </Button>
                                                    ) : (
                                                        <Button variant="primary" className="!py-1.5 !px-3.5 !text-xs font-bold" onClick={() => setSelectedProductForImei(product)}>
                                                            Select Device
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            <button type="button" onClick={() => setSelectedProductForImei(null)} className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-4 hover:underline">
                                ← Back to Products
                            </button>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Select a Device: {selectedProductForImei.brand?.name} {selectedProductForImei.model_name}</h3>
                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {selectedProductForImei.device_imeis?.map(device => {
                                    const isAlreadyInCart = cart.some(c => c.type === 'serialized' && c.id === device.id);
                                    return (
                                        <div key={device.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-700">
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm flex items-center gap-2">
                                                    <span>{device.imei}</span>
                                                    {isAlreadyInCart && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                                            In Cart
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    {device.storage_capacity || 'N/A'} • {device.color || 'N/A'} • {device.condition || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                                                    {Number(device.selling_price || selectedProductForImei.selling_price || 0).toLocaleString()} UGX
                                                </span>
                                                <Button
                                                    variant="primary"
                                                    icon={Plus}
                                                    className="!py-1.5 !px-3.5 !text-xs font-bold"
                                                    disabled={isAlreadyInCart}
                                                    onClick={() => {
                                                        addToCart('serialized', { ...device, product: selectedProductForImei });
                                                        setShowInventoryModal(false);
                                                        setSelectedProductForImei(null);
                                                    }}
                                                >
                                                    {isAlreadyInCart ? 'Added' : 'Add'}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!selectedProductForImei.device_imeis?.length && (
                                    <div className="text-center py-4 text-slate-400 text-sm">No specific devices found in stock.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Guided Trade-In Intake & Anti-Theft Checklist Modal */}
            <Modal show={showTradeInModal} onClose={() => setShowTradeInModal(false)} maxWidth="2xl">
                {(() => {
                    const appraisedVal = Number(tradeInForm.value || 0);
                    const targetSellVal = Number(tradeInForm.selling_price || 0);
                    const estProfit = targetSellVal > 0 && appraisedVal > 0 ? targetSellVal - appraisedVal : 0;
                    const estMarginPct = targetSellVal > 0 && appraisedVal > 0 ? Math.round((estProfit / targetSellVal) * 100) : 0;
                    const batNum = Number(tradeInForm.battery_health || 0);

                    return (
                        <div className="p-6 dark:bg-slate-900 max-h-[88vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <RefreshCw className="text-emerald-600 dark:text-emerald-400" size={20} /> Guided Trade-In Intake &amp; Valuation
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Complete hardware &amp; anti-theft checks. Device automatically enters In-Stock inventory at its exact trade-in cost basis.
                                    </p>
                                </div>
                                <button type="button" onClick={() => setShowTradeInModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddTradeIn} className="space-y-5">
                                {/* 1. Device Identity */}
                                <div className="space-y-3">
                                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        1. Device Identity
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="saas-label">Brand *</label>
                                            <input 
                                                type="text" 
                                                className="saas-input" 
                                                placeholder="e.g. Apple, Samsung" 
                                                value={tradeInForm.brand}
                                                onChange={e => setTradeInForm({...tradeInForm, brand: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="saas-label">Model Name *</label>
                                            <input 
                                                type="text" 
                                                className="saas-input" 
                                                placeholder="e.g. iPhone 13 Pro" 
                                                value={tradeInForm.model_name}
                                                onChange={e => setTradeInForm({...tradeInForm, model_name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="saas-label">IMEI / Serial *</label>
                                            <input 
                                                type="text" 
                                                className="saas-input font-mono" 
                                                placeholder="15-digit IMEI" 
                                                value={tradeInForm.imei}
                                                onChange={e => setTradeInForm({...tradeInForm, imei: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="saas-label">Overall Grade *</label>
                                            <select 
                                                className="saas-input" 
                                                value={tradeInForm.condition}
                                                onChange={e => setTradeInForm({...tradeInForm, condition: e.target.value})}
                                            >
                                                <option value="Used Grade A">Used Grade A (Mint)</option>
                                                <option value="Used Grade B">Used Grade B (Good)</option>
                                                <option value="Used Grade C">Used Grade C (Fair)</option>
                                                <option value="Refurbished">Refurbished</option>
                                                <option value="Brand New">Brand New</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="saas-label">Storage Capacity</label>
                                            <input 
                                                type="text" 
                                                className="saas-input" 
                                                placeholder="e.g. 128GB, 256GB" 
                                                value={tradeInForm.storage_capacity}
                                                onChange={e => setTradeInForm({...tradeInForm, storage_capacity: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="saas-label">Color</label>
                                            <input 
                                                type="text" 
                                                className="saas-input" 
                                                placeholder="e.g. Graphite, White" 
                                                value={tradeInForm.color}
                                                onChange={e => setTradeInForm({...tradeInForm, color: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Hardware Inspection Checklist */}
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        2. Hardware Diagnostic Checklist
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="saas-label !mb-0">Battery Health</label>
                                                <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${
                                                    batNum >= 85
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                        : batNum >= 75
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                                }`}>
                                                    {tradeInForm.battery_health || 0}%
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    className="saas-input font-bold pr-8"
                                                    value={tradeInForm.battery_health}
                                                    onChange={e => setTradeInForm({...tradeInForm, battery_health: e.target.value})}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="saas-label">Screen Condition</label>
                                            <select
                                                className="saas-input"
                                                value={tradeInForm.screen_grade}
                                                onChange={e => setTradeInForm({...tradeInForm, screen_grade: e.target.value})}
                                            >
                                                <option value="Flawless">Flawless (No scratches)</option>
                                                <option value="Minor Scratches">Minor Scratches</option>
                                                <option value="Cracked / Damaged">Cracked / Needs Screen</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="saas-label">Body / Frame Grade</label>
                                            <select
                                                className="saas-input"
                                                value={tradeInForm.body_grade}
                                                onChange={e => setTradeInForm({...tradeInForm, body_grade: e.target.value})}
                                            >
                                                <option value="Clean">Clean / Like New</option>
                                                <option value="Light Wear">Light Wear</option>
                                                <option value="Dents / Scuffs">Dents / Heavy Scuffs</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {[
                                            { key: 'face_id_ok', label: 'FaceID / TouchID Working' },
                                            { key: 'true_tone_ok', label: 'TrueTone / Original Display' },
                                            { key: 'cameras_audio_ok', label: 'Cameras, Speakers & Mic OK' },
                                            { key: 'icloud_removed', label: 'Find My / iCloud / FRP Removed (Required)', critical: true },
                                        ].map((chk) => {
                                            const checked = Boolean(tradeInForm[chk.key]);
                                            return (
                                                <label
                                                    key={chk.key}
                                                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                                        checked
                                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                                                            : chk.critical
                                                                ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <span>{chk.label}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={e => setTradeInForm({ ...tradeInForm, [chk.key]: e.target.checked })}
                                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 3. Anti-Theft Ownership & ID Capture */}
                                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 space-y-3">
                                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                        3. Anti-Theft Seller ID &amp; Ownership Record
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="saas-label">ID Document Type</label>
                                            <select
                                                className="saas-input"
                                                value={tradeInForm.seller_id_type}
                                                onChange={e => setTradeInForm({...tradeInForm, seller_id_type: e.target.value})}
                                            >
                                                <option value="National ID (NIN)">National ID (NIN)</option>
                                                <option value="Passport">Passport</option>
                                                <option value="Driving Permit">Driving Permit</option>
                                                <option value="Other ID">Other Official ID</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="saas-label">ID / NIN Number (Recommended)</label>
                                            <input
                                                type="text"
                                                className="saas-input font-mono uppercase"
                                                placeholder="e.g. CM980123456789"
                                                value={tradeInForm.seller_id_number}
                                                onChange={e => setTradeInForm({...tradeInForm, seller_id_number: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="saas-label">Seller Full Name</label>
                                            <input
                                                type="text"
                                                className="saas-input"
                                                placeholder="As shown on ID"
                                                value={tradeInForm.seller_name}
                                                onChange={e => setTradeInForm({...tradeInForm, seller_name: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="saas-label">Seller Phone</label>
                                            <input
                                                type="text"
                                                className="saas-input"
                                                placeholder="e.g. 0772123456"
                                                value={tradeInForm.seller_phone}
                                                onChange={e => setTradeInForm({...tradeInForm, seller_phone: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Valuation & Resale Margin */}
                                <div className="space-y-3">
                                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        4. Valuation &amp; Resale Margin
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="saas-label">Appraised Trade-In Value (UGX) *</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                className="saas-input font-black text-emerald-600 dark:text-emerald-400" 
                                                placeholder="0" 
                                                value={tradeInForm.value}
                                                onChange={e => setTradeInForm({...tradeInForm, value: e.target.value})}
                                                required
                                            />
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Deducted from customer total &amp; saved as Inventory Cost Basis.</p>
                                        </div>
                                        <div>
                                            <label className="saas-label">Target Resale Price (UGX)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="saas-input font-black text-indigo-600 dark:text-indigo-400" 
                                                placeholder="Leave blank for +20% default" 
                                                value={tradeInForm.selling_price}
                                                onChange={e => setTradeInForm({...tradeInForm, selling_price: e.target.value})}
                                            />
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Selling price when listed in In-Stock inventory.</p>
                                        </div>
                                    </div>

                                    {appraisedVal > 0 && targetSellVal > 0 && (
                                        <div className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                                            estProfit >= 0
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                                        }`}>
                                            <span>Projected Resale Profit:</span>
                                            <span>
                                                {estProfit >= 0 ? '+' : ''}UGX {estProfit.toLocaleString()} ({estMarginPct}% margin)
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                                    <Button variant="secondary" type="button" onClick={() => setShowTradeInModal(false)}>Cancel</Button>
                                    <Button variant="emerald" icon={RefreshCw} type="submit">Apply Verified Trade-In</Button>
                                </div>
                            </form>
                        </div>
                    );
                })()}
            </Modal>

            {/* Mobile Floating Checkout Dock */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 p-3 bg-slate-900/95 backdrop-blur-xl border-t border-rose-500/30 flex items-center justify-between text-white shadow-2xl">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total ({cart.reduce((s, i) => s + (i.quantity || 1), 0)} unit{cart.reduce((s, i) => s + (i.quantity || 1), 0) > 1 ? 's' : ''})</p>
                        <p className={`text-lg font-extrabold ${finalAmount < 0 ? 'text-rose-400' : 'text-white'}`}>{finalAmount.toLocaleString()} <span className="text-xs text-rose-400 font-normal">UGX</span></p>
                    </div>
                    <button
                        type="button"
                        disabled={isSubmitting || finalAmount < 0}
                        onClick={() => {
                            if (paymentMethod === 'Cash' && finalAmount > 0 && (tenderedAmount === '' || numericTendered < finalAmount)) {
                                const summaryEl = document.getElementById('order-summary-card');
                                if (summaryEl) summaryEl.scrollIntoView({ behavior: 'smooth' });
                                toast.error("Please enter a valid Tendered Amount to complete checkout.");
                                return;
                            }
                            handleCheckout();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/30 active:scale-95 transition-transform"
                    >
                        <CreditCard size={16} />
                        {isSubmitting ? 'Processing...' : 'Pay & Checkout'}
                    </button>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
