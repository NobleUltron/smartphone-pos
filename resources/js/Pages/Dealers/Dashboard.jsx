import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Handshake, Plus, PackageOpen, ArrowUpRight, RotateCcw, AlertCircle, Trophy, TrendingUp, BarChart2, Download, X, BookOpen, Trash2, ChevronDown, ChevronUp, Users, ListFilter, Smartphone, Layers } from 'lucide-react';
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
import VoidConsignmentModal from './Partials/VoidConsignmentModal';

dayjs.extend(relativeTime);

export default function Dashboard({ metrics, pendingItems = [], recentSold = [], recentReturned = [], topDealers = [], networkTrends = [], dealers = [], categories = [], brands = [], products = [] }) {
    const { auth, permissions } = usePage().props;
    const userRole = auth?.user?.role || 'cashier';
    const isCashier = userRole === 'cashier';
    const isDealerIntakeLocked = isCashier && permissions?.allow_cashier_dealer_intake === false;

    const [showInwardModal, setShowInwardModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [voidItem, setVoidItem] = useState(null);
    const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
    const [collapsedDealers, setCollapsedDealers] = useState({});

    const toggleDealerCollapse = (dealerId) => {
        setCollapsedDealers(prev => ({
            ...prev,
            [dealerId]: !prev[dealerId]
        }));
    };

    const groupedByDealer = useMemo(() => {
        const groups = {};
        pendingItems.forEach(item => {
            const dId = item.dealer?.id || 'unknown';
            if (!groups[dId]) {
                groups[dId] = {
                    dealer: item.dealer,
                    items: [],
                    totalValue: 0,
                    totalUnits: 0
                };
            }
            groups[dId].items.push(item);
            const effectiveQty = item.type === 'serialized' ? 1 : Math.max(1, (item.quantity - item.quantity_sold - item.quantity_returned));
            groups[dId].totalUnits += effectiveQty;
            groups[dId].totalValue += (Number(item.dealer_price) || 0) * (item.type === 'serialized' ? 1 : effectiveQty);
        });
        return Object.values(groups);
    }, [pendingItems]);
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Items Currently Out</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Active consignments held across {groupedByDealer.length} partner shops ({pendingItems.length} total items out)
                        </p>
                    </div>

                    {pendingItems.length > 0 && (
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewMode('grouped')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    viewMode === 'grouped'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Users size={14} /> Grouped by Dealer
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('flat')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    viewMode === 'flat'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <ListFilter size={14} /> Itemized List
                            </button>
                        </div>
                    )}
                </div>
                
                {pendingItems.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <PackageOpen className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No items currently out with dealers.</p>
                    </div>
                ) : viewMode === 'grouped' ? (
                    /* Grouped by Dealer Accordion View (Clean & No Duplicate Dealer Rows) */
                    <div className="space-y-4">
                        {groupedByDealer.map((group) => {
                            const isCollapsed = !!collapsedDealers[group.dealer?.id];
                            return (
                                <div
                                    key={group.dealer?.id || Math.random()}
                                    className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm transition-all"
                                >
                                    {/* Dealer Group Summary Header */}
                                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                                                {group.dealer?.name ? group.dealer.name.charAt(0).toUpperCase() : 'D'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={route('dealers.show', group.dealer?.id)}
                                                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                    >
                                                        {group.dealer?.name}
                                                    </Link>
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                                        {group.items.length} {group.items.length === 1 ? 'item' : 'items'} ({group.totalUnits} {group.totalUnits === 1 ? 'unit' : 'units'})
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {group.dealer?.phone || 'No phone'} {group.dealer?.address ? `• ${group.dealer.address}` : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
                                            <div className="text-right">
                                                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Consignment Total</div>
                                                <div className="text-base font-black text-slate-900 dark:text-white">
                                                    {formatCurrency(group.totalValue)}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                                                <Link
                                                    href={route('dealers.show', group.dealer?.id)}
                                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 px-3 py-1.5 rounded-xl transition-all shadow-sm"
                                                >
                                                    Manage Dealer
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDealerCollapse(group.dealer?.id)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title={isCollapsed ? 'Expand items' : 'Collapse items'}
                                                >
                                                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items List Inside Accordion */}
                                    {!isCollapsed && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-[11px] text-slate-400 uppercase bg-slate-50/40 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                                    <tr>
                                                        <th className="px-6 py-3 font-semibold">Item & Identity</th>
                                                        <th className="px-6 py-3 font-semibold">Taken Date</th>
                                                        <th className="px-6 py-3 font-semibold">Due Status</th>
                                                        <th className="px-6 py-3 font-semibold">Agreed Price</th>
                                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {group.items.map((item) => (
                                                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                            <td className="px-6 py-3.5">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={`p-1.5 rounded-lg ${item.type === 'serialized' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'}`}>
                                                                        {item.type === 'serialized' ? <Smartphone size={14} /> : <Layers size={14} />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                                            {item.type === 'serialized' ? `${item.device_imei?.product?.brand?.name || ''} ${item.device_imei?.product?.model_name}` : `${item.product?.brand?.name || ''} ${item.product?.model_name}`}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                                            {item.type === 'serialized' ? `IMEI: ${item.device_imei?.imei}` : `SKU: ${item.product?.sku || 'N/A'} • Qty Out: ${item.quantity - item.quantity_sold - item.quantity_returned}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                                                                {dayjs(item.issued_at).format('DD MMM YYYY')}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap text-xs">
                                                                <DueDateBadge date={item.expected_return_date} />
                                                            </td>
                                                            <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                                {formatCurrency(item.dealer_price)}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setVoidItem(item)}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                                                                    title="Void / Delete Transaction (Rollback Stock)"
                                                                >
                                                                    <Trash2 size={15} />
                                                                    <span className="hidden sm:inline">Void</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Flat Itemized Table */
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
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={route('dealers.show', item.dealer.id)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Manage
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setVoidItem(item)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                                                    title="Void / Delete Transaction (Rollback Stock)"
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

            {/* Void Consignment Modal */}
            <VoidConsignmentModal
                isOpen={!!voidItem}
                onClose={() => setVoidItem(null)}
                item={voidItem}
            />

        </AuthenticatedLayout>
    );
}
