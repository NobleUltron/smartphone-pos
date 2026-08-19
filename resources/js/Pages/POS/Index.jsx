import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ScanLine, CreditCard, Sparkles, Trash2, ShoppingCart, Smartphone, Search, Package, RefreshCw, Plus, X } from 'lucide-react';
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

    const [imei, setImei] = useState('');
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [tenderedAmount, setTenderedAmount] = useState('');
    const [discount, setDiscount] = useState(0);
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [inventorySearchQuery, setInventorySearchQuery] = useState('');
    const [inventoryResults, setInventoryResults] = useState([]);
    const [isSearchingInventory, setIsSearchingInventory] = useState(false);
    const [selectedProductForImei, setSelectedProductForImei] = useState(null);

    const [showTradeInModal, setShowTradeInModal] = useState(false);
    const [tradeIn, setTradeIn] = useState(null); // { brand, model_name, imei, condition, storage_capacity, color, value, selling_price }
    const [tradeInForm, setTradeInForm] = useState({ 
        brand: '', 
        model_name: '', 
        imei: '', 
        condition: 'Used Grade A',
        storage_capacity: '',
        color: '',
        value: '',
        selling_price: ''
    });

    const handleScan = async (e) => {
        e.preventDefault();
        if (!imei) return;

        try {
            const res = await axios.post('/api/pos/validate-imei', { imei });
            const { type, item } = res.data;
            
            addToCart(type, item);
            setImei('');
        } catch (error) {
            toast.error(error.response?.data?.error || "Device not found");
        }
    };

    const addToCart = (type, item) => {
        if (type === 'serialized') {
            if (cart.find(c => c.imei === item.imei)) {
                toast.error("Device already in cart");
                return;
            }
            setCart([...cart, { 
                type: 'serialized',
                id: item.id,
                imei: item.imei, 
                name: `${item.product?.brand?.name || item.product?.brand || ''} ${item.product?.model_name || ''} - ${item.storage_capacity || 'N/A'}`.trim(), 
                price: item.selling_price,
                quantity: 1
            }]);
        } else {
            const existing = cart.find(c => c.id === item.id && c.type === 'bulk');
            if (existing) {
                if (existing.quantity >= item.quantity) {
                    toast.error(`Only ${item.quantity} available in stock`);
                    return;
                }
                setCart(cart.map(c => (c.id === item.id && c.type === 'bulk') ? { ...c, quantity: c.quantity + 1 } : c));
            } else {
                setCart([...cart, {
                    type: 'bulk',
                    id: item.id,
                    imei: item.sku || `BULK-${item.id}`,
                    name: `${item.brand?.name || ''} ${item.model_name}`.trim(),
                    price: item.selling_price,
                    quantity: 1
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
        if (showInventoryModal) {
            searchInventory(inventorySearchQuery);
        }
    }, [showInventoryModal, inventorySearchQuery]);

    const handleUpdateQuantity = (imei, newQuantity) => {
        const qty = parseInt(newQuantity);
        if (isNaN(qty) || qty < 1) return;
        setCart(cart.map(c => c.imei === imei && c.type === 'bulk' ? { ...c, quantity: qty } : c));
    };

    const handleUpdatePrice = (imei, newPrice) => {
        if (isPriceEditLocked) return;
        const val = parseFloat(newPrice);
        if (isNaN(val) || val < 0) return;
        setCart(cart.map(c => c.imei === imei ? { ...c, price: val } : c));
    };

    const handleAddTradeIn = (e) => {
        e.preventDefault();
        if (!tradeInForm.brand || !tradeInForm.model_name || !tradeInForm.value) return toast.error("Please fill in brand, model and value");
        setTradeIn({
            brand: tradeInForm.brand,
            model_name: tradeInForm.model_name,
            imei: tradeInForm.imei,
            condition: tradeInForm.condition,
            storage_capacity: tradeInForm.storage_capacity,
            color: tradeInForm.color,
            value: parseFloat(tradeInForm.value),
            selling_price: tradeInForm.selling_price
        });
        setShowTradeInModal(false);
        setTradeInForm({ brand: '', model_name: '', imei: '', condition: 'Used Grade A', storage_capacity: '', color: '', value: '', selling_price: '' });
        toast.success("Trade-in applied!");
    };

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0);
    const tradeInDiscount = tradeIn ? tradeIn.value : 0;
    const finalAmount = total - discount - tradeInDiscount;

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");

        if (paymentMethod === 'Cash') {
            if (!tenderedAmount || Number(tenderedAmount) < finalAmount) {
                return toast.error("Please enter a valid Tendered Amount that covers the total cost.");
            }
        }
        
        // Open window synchronously before async operation to avoid popup blockers
        const receiptWindow = window.open('about:blank', '_blank');
        
        try {
            const res = await axios.post('/api/pos/checkout', {
                items: cart,
                customer_id: customerId,
                customer_name: customerId ? '' : customerName,
                customer_phone: customerId ? '' : customerPhone,
                payment_method: paymentMethod,
                amount_paid: amountPaid || 0,
                tendered_amount: tenderedAmount || null,
                discount: discount,
                trade_in: tradeIn
            });
            setCart([]);
            setDiscount(0);
            setTradeIn(null);
            setAmountPaid('');
            setCustomerId('');
            setCustomerName('');
            setCustomerPhone('');
            
            if (receiptWindow) {
                receiptWindow.location.href = `/pos/receipt/${res.data.sale_id}`;
            }
        } catch (error) {
            if (receiptWindow) receiptWindow.close();
            const errorMsg = error.response?.data?.message || "Checkout failed";
            toast.error(errorMsg);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="POS Checkout" />
            
            {!hasActiveDrawer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingCart size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Shift is Closed</h2>
                        <p className="text-slate-500 text-sm mb-6">
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
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingCart size={20} className="text-rose-500" /> Cart Items
                            </h3>
                            {cart.length > 0 && (
                                <Badge variant="info">{cart.length} item{cart.length > 1 ? 's' : ''}</Badge>
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
                                        <th>Price (UGX)</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item) => (
                                        <tr key={item.imei}>
                                            <td className="font-bold text-slate-900">{item.name}</td>
                                            <td className="font-mono text-slate-500 text-sm">{item.imei}</td>
                                            <td>
                                                {item.type === 'bulk' ? (
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        value={item.quantity} 
                                                        onChange={(e) => handleUpdateQuantity(item.imei, e.target.value)}
                                                        className="w-16 saas-input !py-1 !px-2 text-center"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-slate-900">{item.quantity}</span>
                                                )}
                                            </td>
                                            <td>
                                                {isPriceEditLocked ? (
                                                    <span className="font-bold text-slate-900 flex items-center gap-1">
                                                        {(Number(item.price) * (item.quantity || 1)).toLocaleString()}
                                                        <span className="text-[10px] text-rose-500 font-bold" title="Price overwrite disabled by Admin">🔒</span>
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            className="w-28 saas-input !py-1 !px-2 text-right font-bold text-slate-900"
                                                            value={item.price} 
                                                            onChange={(e) => handleUpdatePrice(item.imei, e.target.value)}
                                                            title="Click to edit unit selling price"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
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
                        <div className="sm:hidden divide-y divide-slate-100">
                            {cart.map((item) => (
                                <div key={item.imei} className="p-3 flex items-center justify-between gap-3 bg-white">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                                        <p className="font-mono text-slate-500 text-xs truncate">{item.imei}</p>
                                        <p className="text-xs font-bold text-rose-600 mt-1">
                                            {(Number(item.price) * (item.quantity || 1)).toLocaleString()} UGX
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.type === 'bulk' && (
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={item.quantity} 
                                                onChange={(e) => handleUpdateQuantity(item.imei, e.target.value)}
                                                className="w-14 saas-input !py-1 !px-2 text-center text-xs font-bold"
                                            />
                                        )}
                                        <button 
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
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
                                <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
                                    <Smartphone size={32} />
                                </div>
                                <p className="font-medium text-slate-500 text-sm">Cart is empty. Scan an item to begin.</p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Order Summary */}
                <div className="lg:col-span-1" id="order-summary-card">
                    <Card className="sticky top-24 animate-slide-up flex flex-col" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <CreditCard size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Order Summary</h3>
                        </div>
                        
                        <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span className="font-bold text-slate-900">{total.toLocaleString()} UGX</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 flex items-center gap-1">
                                    Discount
                                    {isDiscountLocked && <span className="text-[10px] text-rose-500 font-bold">🔒 Admin Only</span>}
                                </span>
                                <input 
                                    type="number" 
                                    className={`saas-input !w-28 !py-1.5 text-right !text-sm ${isDiscountLocked ? 'bg-slate-100 opacity-60 cursor-not-allowed border-rose-200' : ''}`}
                                    value={isDiscountLocked ? 0 : discount} 
                                    onChange={(e) => !isDiscountLocked && setDiscount(e.target.value)} 
                                    disabled={isDiscountLocked}
                                    title={isDiscountLocked ? "Cashiers are not authorized to issue custom discounts." : ""}
                                />
                            </div>
                            {tradeIn && (
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                                    <div className="flex flex-col">
                                        <span className="text-emerald-600 font-bold">Trade-in Credit</span>
                                        <span className="text-xs text-slate-400">{tradeIn.brand} {tradeIn.model_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600">-{(tradeIn.value).toLocaleString()} UGX</span>
                                        <button onClick={() => setTradeIn(null)} className="text-slate-300 hover:text-rose-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-between items-end mb-6 px-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Amount</span>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-slate-900">{finalAmount.toLocaleString()}</span>
                                <span className="text-sm text-slate-500 ml-1">UGX</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="saas-label">Select Customer</label>
                                <select 
                                    className="saas-input pl-4 font-semibold text-slate-700" 
                                    value={customerId} 
                                    onChange={(e) => setCustomerId(e.target.value)}
                                >
                                    <option value="">Walk-in / New Customer</option>
                                    {customers.map(c => (
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
                                <div className="animate-fade-in border-t border-slate-100 pt-4 mt-4">
                                    <label className="saas-label text-indigo-600">Tendered Amount (Cash Given)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                                            UGX
                                        </div>
                                        <input 
                                            type="number" 
                                            className="saas-input border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/20" 
                                            style={{ paddingLeft: '3.5rem' }}
                                            placeholder="Enter cash handed to you" 
                                            value={tenderedAmount} 
                                            onChange={(e) => setTenderedAmount(e.target.value)} 
                                        />
                                    </div>
                                    {tenderedAmount > 0 && tenderedAmount >= finalAmount && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            Change Due: <strong className="text-emerald-600 font-bold text-base">{(tenderedAmount - finalAmount).toLocaleString()} UGX</strong>
                                        </p>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'Layaway' && (
                                <div className="animate-fade-in border-t border-slate-100 pt-4 mt-4">
                                    <label className="saas-label text-indigo-600">Initial Deposit (Amount Paid)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                                            UGX
                                        </div>
                                        <input 
                                            type="number" 
                                            className="saas-input border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/20" 
                                            style={{ paddingLeft: '3.5rem' }}
                                            placeholder="Enter amount paid today" 
                                            value={amountPaid} 
                                            onChange={(e) => setAmountPaid(e.target.value)} 
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Remaining balance: <strong className="text-slate-900">{Math.max(0, finalAmount - (amountPaid || 0)).toLocaleString()} UGX</strong>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100">
                            <Button variant="primary" className="w-full !py-3 !text-base" onClick={handleCheckout} icon={Sparkles}>
                                Complete Sale
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Browse Inventory Modal */}
            <Modal show={showInventoryModal} onClose={() => { setShowInventoryModal(false); setSelectedProductForImei(null); setInventorySearchQuery(''); }} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="text-indigo-500" /> Browse Inventory
                        </h2>
                        <button onClick={() => { setShowInventoryModal(false); setSelectedProductForImei(null); setInventorySearchQuery(''); }} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    {!selectedProductForImei ? (
                        <>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="saas-input !pl-10"
                                    placeholder="Search products by brand, model, or SKU..."
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
                                    inventoryResults.map(product => (
                                        <div key={`prod-${product.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                                            <div>
                                                <div className="font-bold text-slate-900">{product.brand?.name} {product.model_name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {product.type === 'bulk' ? `Stock: ${product.quantity} | SKU: ${product.sku || 'N/A'}` : `Available Devices: ${product.device_imeis?.length || 0}`}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="font-bold text-indigo-600">{Number(product.selling_price).toLocaleString()} UGX</div>
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
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            <button onClick={() => setSelectedProductForImei(null)} className="text-indigo-600 text-sm font-semibold mb-4 hover:underline">
                                ← Back to Products
                            </button>
                            <h3 className="font-bold text-slate-900 mb-2">Select a Device: {selectedProductForImei.brand?.name} {selectedProductForImei.model_name}</h3>
                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {selectedProductForImei.device_imeis?.map(device => (
                                    <div key={device.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                                        <div>
                                            <div className="font-bold text-slate-900 font-mono text-sm">{device.imei}</div>
                                            <div className="text-xs text-slate-500">
                                                {device.storage_capacity} • {device.color} • {device.condition}
                                            </div>
                                        </div>
                                        <Button variant="primary" icon={Plus} className="!py-1.5 !px-3.5 !text-xs font-bold" onClick={() => {
                                            addToCart('serialized', { ...device, product: selectedProductForImei });
                                            setShowInventoryModal(false);
                                            setSelectedProductForImei(null);
                                        }}>
                                            Add
                                        </Button>
                                    </div>
                                ))}
                                {!selectedProductForImei.device_imeis?.length && (
                                    <div className="text-center py-4 text-slate-400 text-sm">No specific devices found in stock.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Trade-In Modal */}
            <Modal show={showTradeInModal} onClose={() => setShowTradeInModal(false)} maxWidth="lg">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <RefreshCw className="text-emerald-600" size={20} /> Trade-In Device (Swap & Valuation)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Valuate customer device to give immediate store credit towards their purchase.
                            </p>
                        </div>
                        <button onClick={() => setShowTradeInModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleAddTradeIn} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    placeholder="e.g. iPhone XS, S21" 
                                    value={tradeInForm.model_name}
                                    onChange={e => setTradeInForm({...tradeInForm, model_name: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="saas-label">IMEI / Serial (Optional)</label>
                            <input 
                                type="text" 
                                className="saas-input" 
                                placeholder="Enter IMEI (or leave blank to auto-generate)" 
                                value={tradeInForm.imei}
                                onChange={e => setTradeInForm({...tradeInForm, imei: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="saas-label">Condition *</label>
                                <select 
                                    className="saas-input" 
                                    value={tradeInForm.condition}
                                    onChange={e => setTradeInForm({...tradeInForm, condition: e.target.value})}
                                >
                                    <option value="Used Grade A">Used Grade A</option>
                                    <option value="Used Grade B">Used Grade B</option>
                                    <option value="Refurbished">Refurbished</option>
                                    <option value="Brand New">Brand New</option>
                                </select>
                            </div>
                            <div>
                                <label className="saas-label">Storage Capacity</label>
                                <input 
                                    type="text" 
                                    className="saas-input" 
                                    placeholder="e.g. 256GB, 64GB" 
                                    value={tradeInForm.storage_capacity}
                                    onChange={e => setTradeInForm({...tradeInForm, storage_capacity: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="saas-label">Color</label>
                                <input 
                                    type="text" 
                                    className="saas-input" 
                                    placeholder="e.g. Space Gray, Silver" 
                                    value={tradeInForm.color}
                                    onChange={e => setTradeInForm({...tradeInForm, color: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="saas-label">Appraised Credit Value (UGX) *</label>
                                <input 
                                    type="number" 
                                    className="saas-input font-bold text-emerald-600" 
                                    placeholder="0" 
                                    value={tradeInForm.value}
                                    onChange={e => setTradeInForm({...tradeInForm, value: e.target.value})}
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Deducted from customer total (Cost Price).</p>
                            </div>
                            <div>
                                <label className="saas-label">Target Selling Price (UGX)</label>
                                <input 
                                    type="number" 
                                    className="saas-input font-bold text-indigo-600" 
                                    placeholder="e.g. Resale Price" 
                                    value={tradeInForm.selling_price}
                                    onChange={e => setTradeInForm({...tradeInForm, selling_price: e.target.value})}
                                />
                                <p className="text-xs text-slate-500 mt-1">Expected resale price in shop inventory.</p>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <Button variant="secondary" type="button" onClick={() => setShowTradeInModal(false)}>Cancel</Button>
                            <Button variant="emerald" icon={RefreshCw} type="submit">Apply Trade-In Credit</Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Mobile Floating Checkout Dock */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 p-3 bg-slate-900/95 backdrop-blur-xl border-t border-rose-500/30 flex items-center justify-between text-white shadow-2xl">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total ({cart.length} item{cart.length > 1 ? 's' : ''})</p>
                        <p className="text-lg font-extrabold text-white">{finalAmount.toLocaleString()} <span className="text-xs text-rose-400 font-normal">UGX</span></p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (paymentMethod === 'Cash' && (!tenderedAmount || Number(tenderedAmount) < finalAmount)) {
                                const summaryEl = document.getElementById('order-summary-card');
                                if (summaryEl) summaryEl.scrollIntoView({ behavior: 'smooth' });
                                toast.error("Please enter a valid Tendered Amount to complete checkout.");
                                return;
                            }
                            handleCheckout();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/30 active:scale-95 transition-transform"
                    >
                        <CreditCard size={16} />
                        Pay & Checkout
                    </button>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
