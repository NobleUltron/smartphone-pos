import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Handshake, Plus, PackageOpen, ArrowUpRight, RotateCcw, AlertCircle, Trophy, TrendingUp, BarChart2, Download, X, BookOpen } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import Modal from '@/Components/Modal';

dayjs.extend(relativeTime);

export default function Dashboard({ metrics, pendingItems, recentSold, recentReturned, topDealers = [], networkTrends = [], dealers = [], categories = [], brands = [] }) {
    const { auth, permissions } = usePage().props;
    const userRole = auth?.user?.role || 'cashier';
    const isCashier = userRole === 'cashier';
    const isDealerIntakeLocked = isCashier && permissions?.allow_cashier_dealer_intake === false;

    const [showInwardModal, setShowInwardModal] = useState(false);
    const { data: inwardData, setData: setInwardData, post: postInward, processing: processingInward, reset: resetInward } = useForm({
        dealer_id: '',
        type: 'serialized',
        product_id: '',
        category_id: '',
        brand_id: '',
        model_name: '',
        imei_number: '',
        condition: 'Brand New',
        storage_capacity: '',
        color: '',
        wholesale_cost: '',
        retail_price: '',
        quantity: 1,
        notes: ''
    });

    const handleInwardSubmit = (e) => {
        e.preventDefault();
        postInward(route('dealers.store-inward'), {
            onSuccess: () => {
                setShowInwardModal(false);
                resetInward();
            }
        });
    };
    const formatCurrency = (amount) => {
        const val = new Intl.NumberFormat('en-UG', {
            minimumFractionDigits: 0
        }).format(amount);
        return `UGX ${val}`;
    };

    const DueDateBadge = ({ date }) => {
        if (!date) return <span className="text-slate-400">—</span>;
        
        const due = dayjs(date);
        const today = dayjs().startOf('day');
        
        if (due.isBefore(today)) {
            return <Badge variant="danger">Overdue</Badge>;
        } else if (due.isSame(today)) {
            return <Badge variant="warning">Due Today</Badge>;
        } else {
            return <Badge variant="success">{due.fromNow()}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dealer Management" />

            <PageHeader 
                title="Dealer Management"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dealer Management' }]}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="glass" icon={BookOpen} onClick={() => router.visit(route('dealers.index'))}>
                            Directory
                        </Button>
                        <Button 
                            variant="success" 
                            icon={Download} 
                            onClick={() => !isDealerIntakeLocked && setShowInwardModal(true)}
                            disabled={isDealerIntakeLocked}
                            className={isDealerIntakeLocked ? 'opacity-50 cursor-not-allowed' : ''}
                            title={isDealerIntakeLocked ? "Inward dealer intake requires Admin authorization." : ""}
                        >
                            Receive Item {isDealerIntakeLocked && "🔒"}
                        </Button>
                        <Button variant="primary" icon={Plus} onClick={() => router.visit(route('dealers.issue'))}>
                            Issue Item
                        </Button>
                    </div>
                }
            />

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Items Out (Pending)</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.items_out}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                            <PackageOpen size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Value Out</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(metrics.pending_value)}</span>
                    </div>
                </Card>

                <Card className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Items Sold</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.items_sold}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                            <ArrowUpRight size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Sales Value</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(metrics.sold_value)}</span>
                    </div>
                </Card>

                <Card className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Items Returned</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.items_returned}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                            <RotateCcw size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Returned Value</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(metrics.returned_value)}</span>
                    </div>
                </Card>

                <Card className="flex flex-col justify-between border-l-4 border-l-rose-500">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Overdue Items</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.overdue_items}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium text-rose-600 font-bold">Action Required</span>
                    </div>
                </Card>
            </div>

            {/* Network Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Network Monthly Dealer Sales Trend */}
                <Card className="lg:col-span-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <TrendingUp size={18} className="text-emerald-600" />
                                Dealer Network Sales Volume (6 Months)
                            </h3>
                            <p className="text-xs text-slate-500">Monthly aggregate partner sales revenue across all dealers</p>
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            Partner Network Trend
                        </div>
                    </div>

                    <div className="h-60 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={networkTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="networkSold" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `UGX ${(val/1000).toFixed(0)}k`} />
                                <Tooltip 
                                    formatter={(val) => [formatCurrency(val), 'Dealer Sales']}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="sold_value" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#networkSold)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Top Partner Dealers Leaderboard */}
                <Card className="flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Trophy size={18} className="text-amber-500" />
                                Top Partner Dealers
                            </h3>
                            <span className="text-[11px] font-semibold text-slate-400">By Sales Value</span>
                        </div>

                        <div className="space-y-3">
                            {topDealers.length === 0 ? (
                                <p className="text-xs text-slate-400 py-8 text-center">No dealer sales recorded yet.</p>
                            ) : (
                                topDealers.map((dealer, idx) => (
                                    <div key={dealer.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-indigo-50/50 hover:border-indigo-100 transition-colors">
                                        <div className="flex items-center gap-3 truncate pr-2">
                                            <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                                idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                idx === 2 ? 'bg-amber-800/10 text-amber-800' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                #{idx + 1}
                                            </div>
                                            <div className="truncate">
                                                <Link href={route('dealers.show', dealer.id)} className="font-bold text-xs text-slate-900 hover:text-indigo-600 truncate block">
                                                    {dealer.name}
                                                </Link>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {dealer.items_out_count} items currently out
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xs font-black text-emerald-600">{formatCurrency(dealer.sales_value || 0)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Table: Items Currently Out */}
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Items Currently Out</h3>
                </div>
                
                {pendingItems.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
                        <PackageOpen className="mx-auto text-slate-300 mb-3" size={48} />
                        <p className="text-slate-500 font-medium">No items currently out with dealers.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Item & IMEI</th>
                                    <th className="px-6 py-4 font-semibold">Dealer</th>
                                    <th className="px-6 py-4 font-semibold">Taken</th>
                                    <th className="px-6 py-4 font-semibold">Due</th>
                                    <th className="px-6 py-4 font-semibold">Partner Price</th>
                                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">
                                                {item.type === 'serialized' ? `${item.device_imei?.product?.brand?.name || ''} ${item.device_imei?.product?.model_name}` : `${item.product?.brand?.name || ''} ${item.product?.model_name}`}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {item.type === 'serialized' ? `IMEI: ${item.device_imei?.imei}` : `SKU: ${item.product?.sku || 'N/A'} • Qty: ${item.quantity - item.quantity_sold - item.quantity_returned}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={route('dealers.show', item.dealer.id)} className="font-medium text-indigo-600 hover:underline">
                                                {item.dealer.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            {dayjs(item.issued_at).format('DD MMM YYYY')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            <DueDateBadge date={item.expected_return_date} />
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                                            {formatCurrency(item.dealer_price)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={route('dealers.show', item.dealer.id)}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Manage
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Receive Inward Item Modal */}
            <Modal show={showInwardModal} onClose={() => setShowInwardModal(false)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Download className="text-emerald-600" size={20} /> Receive Stock from Partner Dealer (Inward Intake)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Source a device from another shop/dealer into your active shop inventory to sell on their behalf.
                            </p>
                        </div>
                        <button onClick={() => setShowInwardModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleInwardSubmit} className="space-y-4">
                        <div>
                            <label className="saas-label">Select Partner Dealer (Source Shop)</label>
                            <select 
                                className="saas-input font-bold" 
                                value={inwardData.dealer_id} 
                                onChange={(e) => setInwardData('dealer_id', e.target.value)}
                                required
                            >
                                <option value="">-- Choose Partner Dealer --</option>
                                {dealers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="saas-label">Device Type</label>
                                <select 
                                    className="saas-input" 
                                    value={inwardData.type} 
                                    onChange={(e) => setInwardData('type', e.target.value)}
                                >
                                    <option value="serialized">Serialized (Phone / Tablet / Laptop with IMEI)</option>
                                    <option value="bulk">Bulk Accessory / Non-serialized</option>
                                </select>
                            </div>

                            <div>
                                <label className="saas-label">Brand</label>
                                <select 
                                    className="saas-input" 
                                    value={inwardData.brand_id} 
                                    onChange={(e) => setInwardData('brand_id', e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Brand --</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="saas-label">Category</label>
                                <select 
                                    className="saas-input" 
                                    value={inwardData.category_id} 
                                    onChange={(e) => setInwardData('category_id', e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="saas-label">Model Name</label>
                                <input 
                                    type="text" 
                                    className="saas-input" 
                                    placeholder="e.g. iPhone 14 Pro Max 256GB" 
                                    value={inwardData.model_name}
                                    onChange={(e) => setInwardData('model_name', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {inwardData.type === 'serialized' ? (
                            <>
                                <div>
                                    <label className="saas-label">IMEI / Serial Number</label>
                                    <input 
                                        type="text" 
                                        className="saas-input font-mono" 
                                        placeholder="e.g. 354891029384210" 
                                        value={inwardData.imei_number}
                                        onChange={(e) => setInwardData('imei_number', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="saas-label">Condition</label>
                                        <select 
                                            className="saas-input"
                                            value={inwardData.condition}
                                            onChange={(e) => setInwardData('condition', e.target.value)}
                                        >
                                            <option value="Brand New">Brand New</option>
                                            <option value="Refurbished">Refurbished</option>
                                            <option value="Used Grade A">Used Grade A</option>
                                            <option value="Used Grade B">Used Grade B</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="saas-label">Storage</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            placeholder="e.g. 128GB, 256GB" 
                                            value={inwardData.storage_capacity}
                                            onChange={(e) => setInwardData('storage_capacity', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="saas-label">Color</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            placeholder="e.g. Black, Gold, Silver" 
                                            value={inwardData.color}
                                            onChange={(e) => setInwardData('color', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="saas-label">Quantity Received</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    className="saas-input" 
                                    value={inwardData.quantity}
                                    onChange={(e) => setInwardData('quantity', e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="saas-label">Dealer Wholesale Cost (UGX)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="saas-input font-bold text-rose-600" 
                                    placeholder="Price owed to dealer upon sale" 
                                    value={inwardData.wholesale_cost}
                                    onChange={(e) => setInwardData('wholesale_cost', e.target.value)}
                                    required
                                />
                                <span className="text-[10px] text-slate-500 block mt-1">Amount owed to dealer once sold</span>
                            </div>

                            <div>
                                <label className="saas-label">Target Retail Price (UGX)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="saas-input font-bold text-emerald-600" 
                                    placeholder="Selling price at shop POS" 
                                    value={inwardData.retail_price}
                                    onChange={(e) => setInwardData('retail_price', e.target.value)}
                                    required
                                />
                                <span className="text-[10px] text-slate-500 block mt-1">What your cashier sells it for at POS</span>
                            </div>
                        </div>

                        <div>
                            <label className="saas-label">Notes (Optional)</label>
                            <textarea 
                                className="saas-input" 
                                rows="2"
                                placeholder="Condition details, color, warranty terms..."
                                value={inwardData.notes}
                                onChange={(e) => setInwardData('notes', e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="secondary" onClick={() => setShowInwardModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" isLoading={processingInward} icon={Download}>
                                Receive into Shop Stock
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

        </AuthenticatedLayout>
    );
}
