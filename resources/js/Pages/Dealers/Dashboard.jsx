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
import ReceiveStockModal from './Partials/ReceiveStockModal';
import IssueStockModal from './Partials/IssueStockModal';

dayjs.extend(relativeTime);

export default function Dashboard({ metrics, pendingItems, recentSold, recentReturned, topDealers = [], networkTrends = [], dealers = [], categories = [], brands = [], products = [] }) {
    const { auth, permissions } = usePage().props;
    const userRole = auth?.user?.role || 'cashier';
    const isCashier = userRole === 'cashier';
    const isDealerIntakeLocked = isCashier && permissions?.allow_cashier_dealer_intake === false;

    const [showInwardModal, setShowInwardModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
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
                        <Button variant="primary" icon={Plus} onClick={() => setShowIssueModal(true)}>
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
            <ReceiveStockModal
                isOpen={showInwardModal}
                onClose={() => setShowInwardModal(false)}
                dealers={dealers}
                categories={categories}
                brands={brands}
                products={products}
            />

            {/* Issue Outward Item Modal */}
            <IssueStockModal
                isOpen={showIssueModal}
                onClose={() => setShowIssueModal(false)}
                dealers={dealers}
            />

        </AuthenticatedLayout>
    );
}
