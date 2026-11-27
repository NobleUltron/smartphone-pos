import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { 
    Handshake, Plus, PackageOpen, ArrowUpRight, ArrowDownLeft, RotateCcw, 
    AlertCircle, Trophy, TrendingUp, Download, X, BookOpen, Trash2, 
    ChevronDown, ChevronUp, Users, ListFilter, Smartphone, Layers, 
    DollarSign, CheckCircle, FileText, Search, Wallet, CreditCard, Eye 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';
import Modal from '@/Components/Modal';
import ReceiveStockModal from './Partials/ReceiveStockModal';
import IssueStockModal from './Partials/IssueStockModal';
import VoidConsignmentModal from './Partials/VoidConsignmentModal';

dayjs.extend(relativeTime);

export default function Dashboard({ 
    metrics = {}, 
    pendingItems = [], 
    inwardItems = [],
    recentSold = [], 
    recentReturned = [], 
    topDealers = [], 
    networkTrends = [], 
    dealers = [], 
    categories = [], 
    brands = [], 
    products = [],
    hasActiveDrawer = false,
    activeDrawerCash = 0,
    paymentAccounts = []
}) {
    const { auth, permissions } = usePage().props;
    const userRole = auth?.user?.role || 'cashier';
    const isCashier = userRole === 'cashier';
    const isDealerIntakeLocked = isCashier && permissions?.allow_cashier_dealer_intake === false;

    const [showInwardModal, setShowInwardModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [voidItem, setVoidItem] = useState(null);

    // Direction tab for main consignment operations: 'inward' | 'outward'
    const [activeDirectionTab, setActiveDirectionTab] = useState(
        metrics.unsettled_inward_count > 0 ? 'inward' : 'outward'
    );

    // Outward view mode: 'grouped' | 'flat' + search & overdue filter
    const [viewMode, setViewMode] = useState('grouped');
    const [collapsedDealers, setCollapsedDealers] = useState({});
    const [outwardSearch, setOutwardSearch] = useState('');
    const [outwardOverdueOnly, setOutwardOverdueOnly] = useState(false);

    // Inward filters & search
    const [inwardFilter, setInwardFilter] = useState('all'); // 'all' | 'owed' | 'in_stock' | 'settled'
    const [inwardSearch, setInwardSearch] = useState('');

    // Client-side pagination state for Inward & Outward tables
    const [inwardPage, setInwardPage] = useState(1);
    const [inwardPerPage, setInwardPerPage] = useState(10);
    const [outwardPage, setOutwardPage] = useState(1);
    const [outwardPerPage, setOutwardPerPage] = useState(10);

    useEffect(() => {
        setInwardPage(1);
    }, [inwardFilter, inwardSearch]);

    useEffect(() => {
        setOutwardPage(1);
    }, [outwardSearch, outwardOverdueOnly, viewMode]);

    // Settlement state
    const [settleItem, setSettleItem] = useState(null);
    const [settledSuccessItem, setSettledSuccessItem] = useState(null);
    const { 
        data: settleData, 
        setData: setSettleData, 
        post: postSettle, 
        processing: processingSettle, 
        errors: settleErrors, 
        reset: resetSettle 
    } = useForm({
        payment_method: 'Cash',
        amount: '',
        notes: ''
    });

    // Return stock modal state (for inward items returning to dealer)
    const [returnModalItem, setReturnModalItem] = useState(null);
    const { 
        data: returnData, 
        setData: setReturnData, 
        post: postReturn, 
        processing: processingReturn, 
        errors: returnErrors, 
        reset: resetReturn 
    } = useForm({
        quantity: 1,
        notes: ''
    });

    const toggleDealerCollapse = (dealerId) => {
        setCollapsedDealers(prev => ({
            ...prev,
            [dealerId]: !prev[dealerId]
        }));
    };

    const formatCurrency = (amount) => {
        const val = new Intl.NumberFormat('en-UG', {
            minimumFractionDigits: 0
        }).format(amount || 0);
        return `UGX ${val}`;
    };

    // Filtered outward pending items
    const filteredPendingItems = useMemo(() => {
        const today = dayjs().startOf('day');
        return pendingItems.filter(item => {
            if (outwardOverdueOnly) {
                if (!item.expected_return_date || !dayjs(item.expected_return_date).isBefore(today)) {
                    return false;
                }
            }
            if (outwardSearch.trim()) {
                const q = outwardSearch.toLowerCase();
                const dealerName = (item.dealer?.name || '').toLowerCase();
                const dealerPhone = (item.dealer?.phone || '').toLowerCase();
                const modelName = (item.device_imei?.product?.model_name || item.product?.model_name || '').toLowerCase();
                const brandName = (item.device_imei?.product?.brand?.name || item.product?.brand?.name || '').toLowerCase();
                const imei = (item.device_imei?.imei || '').toLowerCase();
                const sku = (item.product?.sku || '').toLowerCase();
                return dealerName.includes(q) || dealerPhone.includes(q) || modelName.includes(q) || brandName.includes(q) || imei.includes(q) || sku.includes(q);
            }
            return true;
        });
    }, [pendingItems, outwardSearch, outwardOverdueOnly]);

    // Group outward pending items by dealer
    const groupedByDealer = useMemo(() => {
        const groups = {};
        filteredPendingItems.forEach(item => {
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
    }, [filteredPendingItems]);

    // Computed inward items with financial math
    const computedInwardItems = useMemo(() => {
        return inwardItems.map(item => {
            const unitCost = Number(item.wholesale_cost || item.dealer_price || 0);
            const qtyTotal = Number(item.quantity || 1);
            const qtySold = Number(item.quantity_sold || (item.status === 'Sold' ? qtyTotal : 0));
            const qtyReturned = Number(item.quantity_returned || 0);
            const availableQty = Math.max(0, qtyTotal - qtySold - qtyReturned);
            const totalOwedForSold = unitCost * qtySold;
            const alreadyPaid = Number(item.settlement_amount || 0);
            const remainingOwed = Math.max(0, totalOwedForSold - alreadyPaid);
            const isSettled = qtySold > 0 && remainingOwed <= 0;

            return {
                ...item,
                unitCost,
                qtyTotal,
                qtySold,
                qtyReturned,
                availableQty,
                totalOwedForSold,
                alreadyPaid,
                remainingOwed,
                isSettled
            };
        });
    }, [inwardItems]);

    // Filtered inward items
    const filteredInwardItems = useMemo(() => {
        return computedInwardItems.filter(item => {
            // Tab filter
            if (inwardFilter === 'owed' && !(item.qtySold > 0 && item.remainingOwed > 0)) {
                return false;
            }
            if (inwardFilter === 'in_stock' && item.availableQty <= 0) {
                return false;
            }
            if (inwardFilter === 'settled' && !item.isSettled) {
                return false;
            }

            // Search filter
            if (inwardSearch.trim()) {
                const q = inwardSearch.toLowerCase();
                const dealerName = (item.dealer?.name || '').toLowerCase();
                const dealerPhone = (item.dealer?.phone || '').toLowerCase();
                const modelName = (item.device_imei?.product?.model_name || item.product?.model_name || '').toLowerCase();
                const brandName = (item.device_imei?.product?.brand?.name || item.product?.brand?.name || '').toLowerCase();
                const imei = (item.device_imei?.imei || '').toLowerCase();
                const sku = (item.product?.sku || '').toLowerCase();

                return dealerName.includes(q) || 
                       dealerPhone.includes(q) || 
                       modelName.includes(q) || 
                       brandName.includes(q) || 
                       imei.includes(q) || 
                       sku.includes(q);
            }

            return true;
        });
    }, [computedInwardItems, inwardFilter, inwardSearch]);

    const countAwaitingPayback = useMemo(() => {
        return computedInwardItems.filter(i => i.qtySold > 0 && i.remainingOwed > 0).length;
    }, [computedInwardItems]);

    const countInStock = useMemo(() => {
        return computedInwardItems.filter(i => i.availableQty > 0).length;
    }, [computedInwardItems]);

    const countSettled = useMemo(() => {
        return computedInwardItems.filter(i => i.isSettled).length;
    }, [computedInwardItems]);

    const paginatedInwardItems = useMemo(() => {
        const start = (inwardPage - 1) * inwardPerPage;
        return filteredInwardItems.slice(start, start + inwardPerPage);
    }, [filteredInwardItems, inwardPage, inwardPerPage]);

    const paginatedOutwardItems = useMemo(() => {
        const start = (outwardPage - 1) * outwardPerPage;
        return filteredPendingItems.slice(start, start + outwardPerPage);
    }, [filteredPendingItems, outwardPage, outwardPerPage]);

    const paginatedGroupedDealers = useMemo(() => {
        const start = (outwardPage - 1) * outwardPerPage;
        return groupedByDealer.slice(start, start + outwardPerPage);
    }, [groupedByDealer, outwardPage, outwardPerPage]);

    // Settle Modal Handlers
    const openSettleModal = (item) => {
        const remainingOwed = item.remainingOwed || Math.max(0, (item.unitCost * item.qtySold) - item.alreadyPaid);
        setSettleItem(item);
        setSettleData({
            payment_method: 'Cash',
            amount: remainingOwed || item.unitCost,
            notes: `Consignment payout for ${item.qtySold} unit(s) sold`
        });
    };

    const closeSettleModal = () => {
        setSettleItem(null);
        resetSettle();
    };

    const submitSettle = (e) => {
        e.preventDefault();
        const currentItem = settleItem;
        if (currentItem?.remainingOwed && Number(settleData.amount) > Number(currentItem.remainingOwed)) {
            toast.error(`Payout cannot exceed remaining balance owed (${formatCurrency(currentItem.remainingOwed)}).`);
            return;
        }
        postSettle(route('dealers.settle', settleItem.id), {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page?.props?.flash?.error) {
                    toast.error(page.props.flash.error);
                    return;
                }
                toast.success('Dealer payout recorded successfully');
                closeSettleModal();
                setSettledSuccessItem(currentItem);
            },
            onError: (errs) => {
                toast.error(Object.values(errs)[0] || 'Failed to process payout');
            }
        });
    };

    // Return Modal Handlers
    const openReturnModal = (item) => {
        setReturnModalItem(item);
        setReturnData({
            quantity: item.type === 'serialized' ? 1 : item.availableQty,
            notes: ''
        });
    };

    const closeReturnModal = () => {
        setReturnModalItem(null);
        resetReturn();
    };

    const submitReturn = (e) => {
        e.preventDefault();
        postReturn(route('dealers.mark-returned', returnModalItem.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Unsold stock returned to dealer');
                closeReturnModal();
            },
            onError: (errs) => {
                toast.error(Object.values(errs)[0] || 'Failed to return stock');
            }
        });
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
                            title={isDealerIntakeLocked ? "Inward dealer intake requires Admin authorization." : "Take / source stock from a partner dealer"}
                        >
                            Receive Item {isDealerIntakeLocked && "🔒"}
                        </Button>
                        <Button variant="primary" icon={Plus} onClick={() => setShowIssueModal(true)} title="Give / issue stock on consignment to a dealer">
                            Issue Item
                        </Button>
                    </div>
                }
            />

            {/* Two-Way Financial & Consignment Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* 1. Outward Stock Out */}
                <Card
                    className="flex flex-col justify-between cursor-pointer hover:border-amber-500/40 transition-all"
                    onClick={() => setActiveDirectionTab('outward')}
                    title="Click to view outward consignments"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Items Out (Consignments)</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.items_out || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                            <PackageOpen size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Outward Value</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(metrics.pending_value)}</span>
                    </div>
                </Card>

                {/* 2. Inward Stock Taken (In Store) */}
                <Card
                    className="flex flex-col justify-between border-l-4 border-l-indigo-500 cursor-pointer hover:border-indigo-500/60 transition-all"
                    onClick={() => {
                        setActiveDirectionTab('inward');
                        setInwardFilter('in_stock');
                    }}
                    title="Click to view inward items currently in shop"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Items Taken (In Shop)</p>
                            <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{metrics.inward_stock_units || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <ArrowDownLeft size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Sales Progress</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-300">
                            {metrics.inward_sold_units || 0} sold of {metrics.inward_total_units || 0} intake
                        </span>
                    </div>
                </Card>

                {/* 3. We Owe Dealers (Pending Payout) */}
                <Card 
                    className={`flex flex-col justify-between transition-all cursor-pointer ${
                        (metrics.we_owe_dealers || 0) > 0 
                            ? 'border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/50' 
                            : 'border-l-4 border-l-emerald-500'
                    }`}
                    onClick={() => {
                        setActiveDirectionTab('inward');
                        setInwardFilter('owed');
                    }}
                    title="Click to view all items awaiting dealer payment"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">We Owe Dealers</p>
                                {(metrics.unsettled_inward_count || 0) > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                        Action
                                    </span>
                                )}
                            </div>
                            <h3 className={`text-2xl font-black ${(metrics.we_owe_dealers || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                                {formatCurrency(metrics.we_owe_dealers || 0)}
                            </h3>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            (metrics.we_owe_dealers || 0) > 0 
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600' 
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                        }`}>
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Pending Payouts</span>
                        <span className={`font-bold ${(metrics.unsettled_inward_count || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {(metrics.unsettled_inward_count || 0) > 0 
                                ? `${metrics.unsettled_inward_count} item(s) to settle` 
                                : 'All sold items paid'}
                        </span>
                    </div>
                </Card>

                {/* 4. Network Performance & Overdue */}
                <Card className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Partner Network Sales</p>
                            <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(metrics.sold_value || 0)}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <ArrowUpRight size={24} />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">
                            {metrics.items_sold || 0} sold • {metrics.items_returned || 0} returned
                        </span>
                        {metrics.overdue_items > 0 ? (
                            <span className="font-bold text-rose-600 flex items-center gap-1">
                                <AlertCircle size={14} /> {metrics.overdue_items} overdue
                            </span>
                        ) : (
                            <span className="font-bold text-emerald-600">On Schedule</span>
                        )}
                    </div>
                </Card>
            </div>

            {/* Network Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Network Monthly Dealer Sales Trend */}
                <Card className="lg:col-span-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                                Dealer Network Sales Volume (6 Months)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Monthly aggregate partner sales revenue across all dealers</p>
                        </div>
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
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
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.25} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `UGX ${(val/1000).toFixed(0)}k`} />
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
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
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
                                    <div key={dealer.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                                        <div className="flex items-center gap-3 truncate pr-2">
                                            <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                                idx === 0 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                                                idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' :
                                                idx === 2 ? 'bg-amber-800/15 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                            }`}>
                                                #{idx + 1}
                                            </div>
                                            <div className="truncate">
                                                <Link href={route('dealers.show', dealer.id)} className="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
                                                    {dealer.name}
                                                </Link>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {dealer.items_out_count} items currently out
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(dealer.sales_value || 0)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Operations Hub: Two-Way Consignment Center */}
            <div className="space-y-6">
                {/* Primary Direction Selector (Taken from Dealers vs Given to Dealers) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveDirectionTab('inward')}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                                activeDirectionTab === 'inward'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <ArrowDownLeft size={16} />
                            <span>Items Taken from Dealers (Inward & Payouts)</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                activeDirectionTab === 'inward' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                                {inwardItems.length}
                            </span>
                            {countAwaitingPayback > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white animate-pulse">
                                    ⚡ {countAwaitingPayback} to pay
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveDirectionTab('outward')}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                                activeDirectionTab === 'outward'
                                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <PackageOpen size={16} />
                            <span>Items Given to Dealers (Outward Consignments)</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                activeDirectionTab === 'outward' ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                                {pendingItems.length}
                            </span>
                        </button>
                    </div>

                    {/* Quick Action in Context */}
                    <div className="shrink-0">
                        {activeDirectionTab === 'inward' ? (
                            <Button
                                variant="success"
                                size="sm"
                                icon={Download}
                                onClick={() => !isDealerIntakeLocked && setShowInwardModal(true)}
                                disabled={isDealerIntakeLocked}
                            >
                                Receive New Stock
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size="sm"
                                icon={Plus}
                                onClick={() => setShowIssueModal(true)}
                            >
                                Issue New Item
                            </Button>
                        )}
                    </div>
                </div>

                {/* TAB 1: INWARD SOURCED ITEMS (Taken from Dealer & Settlements) */}
                {activeDirectionTab === 'inward' && (
                    <div className="space-y-6">
                        {/* Standalone Search & Sub-Filter Card */}
                        <Card>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search Dealer, IMEI, SKU, or Model..."
                                        className="saas-input !pl-10 w-full"
                                        value={inwardSearch}
                                        onChange={(e) => setInwardSearch(e.target.value)}
                                    />
                                    {inwardSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setInwardSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setInwardFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                            inwardFilter === 'all'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        All ({inwardItems.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInwardFilter('owed')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                            inwardFilter === 'owed'
                                                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                        Awaiting Payback ({countAwaitingPayback})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInwardFilter('in_stock')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                            inwardFilter === 'in_stock'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        In Store ({countInStock})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInwardFilter('settled')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                            inwardFilter === 'settled'
                                                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Settled ({countSettled})
                                    </button>
                                </div>
                            </div>
                        </Card>

                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <DataTable
                                headers={[
                                    'Dealer / Partner',
                                    'Sourced Device / Item',
                                    'Store Status',
                                    'Cost & Balance Owed',
                                    { label: 'Settlement & Actions', className: 'text-right' },
                                ]}
                                isEmpty={filteredInwardItems.length === 0}
                                emptyState={
                                    <div className="py-12 text-center">
                                        <ArrowDownLeft className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={44} />
                                        <p className="text-slate-700 dark:text-slate-300 font-bold mb-1">No inward dealer items found</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                                            {inwardFilter === 'owed' 
                                                ? 'Great! There are no sold inward items awaiting settlement. All dealer payouts are up to date.'
                                                : 'Items sourced from dealers via the "Receive Item" intake will show up here.'}
                                        </p>
                                        <Button 
                                            variant="success" 
                                            size="sm" 
                                            icon={Download} 
                                            onClick={() => !isDealerIntakeLocked && setShowInwardModal(true)}
                                            disabled={isDealerIntakeLocked}
                                        >
                                            Receive Stock from Dealer
                                        </Button>
                                    </div>
                                }
                            >
                                {paginatedInwardItems.map((item) => {
                                    const isSerial = item.type === 'serialized';
                                    const brand = isSerial ? item.device_imei?.product?.brand?.name : item.product?.brand?.name;
                                    const model = isSerial ? item.device_imei?.product?.model_name : item.product?.model_name;
                                    const imei = isSerial ? item.device_imei?.imei : null;
                                    const sku = !isSerial ? item.product?.sku : null;

                                    const isAwaitingPay = item.qtySold > 0 && item.remainingOwed > 0;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            {/* Dealer */}
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {(item.dealer?.name || 'D').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <Link 
                                                            href={route('dealers.show', item.dealer_id)}
                                                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block"
                                                        >
                                                            {item.dealer?.name || 'Partner Dealer'}
                                                        </Link>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            {item.dealer?.phone || 'No phone'} • {dayjs(item.issued_at).format('DD MMM YYYY')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Item & Identity */}
                                            <td>
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-2 rounded-xl shrink-0 ${
                                                        isSerial 
                                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' 
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                    }`}>
                                                        {isSerial ? <Smartphone size={15} /> : <Layers size={15} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {brand} {model}
                                                        </div>
                                                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {isSerial ? `IMEI: ${imei || 'N/A'}` : `SKU: ${sku || 'N/A'}`}
                                                            {item.device_imei?.condition && (
                                                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                    {item.device_imei.condition}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Store Inventory Status */}
                                            <td>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant={item.availableQty > 0 ? 'success' : 'neutral'}>
                                                            {item.availableQty} in store
                                                        </Badge>
                                                        {item.qtySold > 0 && (
                                                            <Badge variant="primary">{item.qtySold} sold</Badge>
                                                        )}
                                                        {item.qtyReturned > 0 && (
                                                            <Badge variant="info">{item.qtyReturned} returned</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        Total Batch: {item.qtyTotal} {item.qtyTotal === 1 ? 'unit' : 'units'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Cost & Balance Owed */}
                                            <td>
                                                <div className="space-y-1">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        Unit Cost: <strong className="text-slate-900 dark:text-white">{formatCurrency(item.unitCost)}</strong>
                                                        {item.retail_price && (
                                                            <span className="ml-2 text-[11px] text-slate-400">Retail: {formatCurrency(item.retail_price)}</span>
                                                        )}
                                                    </div>
                                                    {isAwaitingPay ? (
                                                        <Badge variant="danger">
                                                            Owe: {formatCurrency(item.remainingOwed)}
                                                        </Badge>
                                                    ) : item.isSettled ? (
                                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle size={13} /> Fully Settled ({formatCurrency(item.alreadyPaid)})
                                                        </div>
                                                    ) : (
                                                        <div className="text-[11px] text-slate-400 italic">
                                                            Unsold (Owed when sold)
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isAwaitingPay && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openSettleModal(item)}
                                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-rose-500/20 inline-flex items-center gap-1 whitespace-nowrap"
                                                            title={`Pay ${item.dealer?.name} ${formatCurrency(item.remainingOwed)} for sold units`}
                                                        >
                                                            <DollarSign size={14} /> Pay Dealer
                                                        </button>
                                                    )}

                                                    {item.alreadyPaid > 0 && (
                                                        <a
                                                            href={`/dealers/items/${item.id}/voucher?mode=stream`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                                                            title="View / Print Consignment Payout Voucher PDF"
                                                        >
                                                            <FileText size={13} /> Voucher
                                                        </a>
                                                    )}

                                                    {item.availableQty > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openReturnModal(item)}
                                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                                                            title="Return unsold items back to dealer (removes from active shop stock)"
                                                        >
                                                            <RotateCcw size={13} /> Return
                                                        </button>
                                                    )}

                                                    {item.qtySold === 0 && item.status === 'Pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setVoidItem(item)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                            title="Void Intake (Rollback Inventory)"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}

                                                    <Link
                                                        href={route('dealers.show', item.dealer_id)}
                                                        className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg whitespace-nowrap transition-colors"
                                                    >
                                                        Manage
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </DataTable>
                        </div>

                        {/* Mobile Card List for Inward Consignments */}
                        <Card noPadding className="md:hidden overflow-hidden">
                            {filteredInwardItems.length === 0 ? (
                                <div className="p-10 text-center text-sm text-slate-400">No inward dealer items found.</div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedInwardItems.map((item) => {
                                        const isSerial = item.type === 'serialized';
                                        const brand = isSerial ? item.device_imei?.product?.brand?.name : item.product?.brand?.name;
                                        const model = isSerial ? item.device_imei?.product?.model_name : item.product?.model_name;
                                        const imei = isSerial ? item.device_imei?.imei : null;
                                        const sku = !isSerial ? item.product?.sku : null;
                                        const isAwaitingPay = item.qtySold > 0 && item.remainingOwed > 0;

                                        return (
                                            <div key={item.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white text-sm">{brand} {model}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.dealer?.name || 'Partner Dealer'} • {isSerial ? `IMEI: ${imei || 'N/A'}` : `SKU: ${sku || 'N/A'}`}</div>
                                                    </div>
                                                    {isAwaitingPay ? (
                                                        <Badge variant="danger">Owe {formatCurrency(item.remainingOwed)}</Badge>
                                                    ) : item.isSettled ? (
                                                        <Badge variant="success">Settled ✓</Badge>
                                                    ) : (
                                                        <Badge variant="neutral">{item.availableQty} in store</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                    <span>Cost: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.unitCost)}</strong></span>
                                                    <span>{item.qtySold} sold / {item.qtyTotal} total</span>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    {isAwaitingPay && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openSettleModal(item)}
                                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
                                                        >
                                                            <DollarSign size={13} /> Pay Dealer
                                                        </button>
                                                    )}
                                                    {item.availableQty > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openReturnModal(item)}
                                                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                                                        >
                                                            Return
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={route('dealers.show', item.dealer_id)}
                                                        className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                                                    >
                                                        Manage
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        {/* Inward Pagination */}
                        <Pagination
                            total={filteredInwardItems.length}
                            currentPage={inwardPage}
                            perPage={inwardPerPage}
                            onPageChange={setInwardPage}
                            onPerPageChange={setInwardPerPage}
                            className="mt-2"
                        />
                    </div>
                )}

                {/* TAB 2: OUTWARD ISSUED ITEMS (Given to Dealer) */}
                {activeDirectionTab === 'outward' && (
                    <div className="space-y-6">
                        {pendingItems.length > 0 && (
                            <Card>
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search Dealer, IMEI, SKU, or Model..."
                                            className="saas-input !pl-10 w-full"
                                            value={outwardSearch}
                                            onChange={(e) => setOutwardSearch(e.target.value)}
                                        />
                                        {outwardSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setOutwardSearch('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                            >
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setOutwardOverdueOnly(!outwardOverdueOnly)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                                outwardOverdueOnly
                                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            <AlertCircle size={13} /> Overdue Only ({metrics.overdue_items || 0})
                                        </button>

                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('grouped')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                                    viewMode === 'grouped'
                                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <Users size={14} /> Grouped
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('flat')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                                    viewMode === 'flat'
                                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <ListFilter size={14} /> Flat List
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                        
                        {filteredPendingItems.length === 0 ? (
                            <Card className="text-center py-12">
                                <PackageOpen className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
                                <p className="text-slate-700 dark:text-slate-300 font-bold mb-1">No items currently out with dealers</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                                    You can issue stock on consignment to partner shops using the "Issue Item" button.
                                </p>
                                <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowIssueModal(true)}>
                                    Issue Stock to Dealer
                                </Button>
                            </Card>
                        ) : viewMode === 'grouped' ? (
                            /* Grouped by Dealer Accordion View */
                            <div className="space-y-4">
                                {paginatedGroupedDealers.map((group) => {
                                    const isCollapsed = !!collapsedDealers[group.dealer?.id];
                                    return (
                                        <div
                                            key={group.dealer?.id || Math.random()}
                                            className="saas-table-container transition-all"
                                        >
                                            {/* Dealer Group Summary Header */}
                                            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                                                        {group.dealer?.name ? group.dealer.name.substring(0, 2).toUpperCase() : 'D'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={route('dealers.show', group.dealer?.id)}
                                                                className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                            >
                                                                {group.dealer?.name}
                                                            </Link>
                                                            <Badge variant="warning">
                                                                {group.items.length} {group.items.length === 1 ? 'item' : 'items'} ({group.totalUnits} {group.totalUnits === 1 ? 'unit' : 'units'})
                                                            </Badge>
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
                                                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 px-3 py-1.5 rounded-xl transition-all shadow-sm whitespace-nowrap"
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
                                                    <table className="saas-table w-full whitespace-nowrap">
                                                        <thead>
                                                            <tr>
                                                                <th>Item & Identity</th>
                                                                <th>Taken Date</th>
                                                                <th>Due Status</th>
                                                                <th>Agreed Price</th>
                                                                <th className="text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {group.items.map((item) => (
                                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                                    <td>
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className={`p-1.5 rounded-lg ${item.type === 'serialized' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'}`}>
                                                                                {item.type === 'serialized' ? <Smartphone size={14} /> : <Layers size={14} />}
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-bold text-slate-900 dark:text-white">
                                                                                    {item.type === 'serialized' ? `${item.device_imei?.product?.brand?.name || ''} ${item.device_imei?.product?.model_name}` : `${item.product?.brand?.name || ''} ${item.product?.model_name}`}
                                                                                </div>
                                                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                                                    {item.type === 'serialized' ? `IMEI: ${item.device_imei?.imei}` : `SKU: ${item.product?.sku || 'N/A'} • Qty Out: ${item.quantity - item.quantity_sold - item.quantity_returned}`}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-slate-600 dark:text-slate-300 text-xs">
                                                                        {dayjs(item.issued_at).format('DD MMM YYYY')}
                                                                    </td>
                                                                    <td className="text-xs">
                                                                        <DueDateBadge date={item.expected_return_date} />
                                                                    </td>
                                                                    <td className="font-bold text-slate-900 dark:text-white">
                                                                        {formatCurrency(item.dealer_price)}
                                                                    </td>
                                                                    <td className="text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setVoidItem(item)}
                                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
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
                            <DataTable
                                headers={[
                                    'Item & IMEI',
                                    'Dealer',
                                    'Taken',
                                    'Due',
                                    'Partner Price',
                                    { label: 'Action', className: 'text-right' },
                                ]}
                            >
                                {paginatedOutwardItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {item.type === 'serialized' ? `${item.device_imei?.product?.brand?.name || ''} ${item.device_imei?.product?.model_name}` : `${item.product?.brand?.name || ''} ${item.product?.model_name}`}
                                            </div>
                                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                                {item.type === 'serialized' ? `IMEI: ${item.device_imei?.imei}` : `SKU: ${item.product?.sku || 'N/A'} • Qty: ${item.quantity - item.quantity_sold - item.quantity_returned}`}
                                            </div>
                                        </td>
                                        <td>
                                            <Link href={route('dealers.show', item.dealer.id)} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                                {item.dealer.name}
                                            </Link>
                                        </td>
                                        <td className="text-slate-600 dark:text-slate-300 text-xs">
                                            {dayjs(item.issued_at).format('DD MMM YYYY')}
                                        </td>
                                        <td>
                                            <DueDateBadge date={item.expected_return_date} />
                                        </td>
                                        <td className="font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(item.dealer_price)}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Link
                                                    href={route('dealers.show', item.dealer.id)}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg whitespace-nowrap transition-colors"
                                                >
                                                    Manage
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setVoidItem(item)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                                                    title="Void / Delete Transaction (Rollback Stock)"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </DataTable>
                        )}

                        {/* Outward Pagination */}
                        {filteredPendingItems.length > 0 && (
                            <Pagination
                                total={viewMode === 'grouped' ? groupedByDealer.length : filteredPendingItems.length}
                                currentPage={outwardPage}
                                perPage={outwardPerPage}
                                onPageChange={setOutwardPage}
                                onPerPageChange={setOutwardPerPage}
                                className="mt-2"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Settle / Payout Modal (Direct settlement on Page 1) */}
            <Modal show={settleItem !== null} onClose={closeSettleModal} maxWidth="md">
                {settleItem && (
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl text-slate-900 dark:text-white">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <DollarSign className="text-rose-600" size={22} />
                                Pay Dealer Consignment Payout
                            </h2>
                            <button type="button" onClick={closeSettleModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Breakdown Box */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-5 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Sourcing Dealer:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {settleItem.dealer?.name || 'Dealer'} ({settleItem.dealer?.phone || 'N/A'})
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Consigned Item:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {settleItem.type === 'serialized' 
                                        ? `${settleItem.device_imei?.product?.brand?.name || ''} ${settleItem.device_imei?.product?.model_name || 'Device'}` 
                                        : `${settleItem.product?.brand?.name || ''} ${settleItem.product?.model_name || 'Item'}`}
                                </span>
                            </div>
                            {settleItem.type === 'serialized' ? (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">IMEI:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{settleItem.device_imei?.imei}</span>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Consignment Batch:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {settleItem.qtySold} Sold of {settleItem.qtyTotal} Received
                                    </span>
                                </div>
                            )}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between items-center text-xs">
                                <span className="text-slate-500">Unit Wholesale Cost:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(settleItem.unitCost)}</span>
                            </div>
                            {settleItem.qtyTotal > 1 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Total Owed for {settleItem.qtySold} Sold:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {formatCurrency(settleItem.unitCost * settleItem.qtySold)}
                                    </span>
                                </div>
                            )}
                            {settleItem.alreadyPaid > 0 && (
                                <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold">
                                    <span>Already Settled to Dealer:</span>
                                    <span>-{formatCurrency(settleItem.alreadyPaid)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                <span className="text-rose-600">Remaining Balance Owed:</span>
                                <span className="text-rose-600 font-black">
                                    {formatCurrency(settleItem.remainingOwed)}
                                </span>
                            </div>
                            {settleItem.retail_price && settleItem.unitCost && (
                                <div className="flex justify-between items-center text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                    <span>Unit Shop Margin:</span>
                                    <span>+{formatCurrency(Number(settleItem.retail_price) - Number(settleItem.unitCost))}</span>
                                </div>
                            )}
                        </div>

                        <form onSubmit={submitSettle} className="space-y-4">
                            {/* Live Float / Account Balance Indicator Box */}
                            {settleData.payment_method === 'Cash' ? (
                                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                                    !hasActiveDrawer 
                                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' 
                                        : activeDrawerCash < Number(settleData.amount)
                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <Wallet size={16} />
                                        <div>
                                            <span className="font-bold block">Active Cash Drawer Shift</span>
                                            <span className="text-[11px] opacity-80">
                                                {!hasActiveDrawer ? 'No active shift open for your cashier account' : 'Physical cash available in till drawer'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-sm block">
                                            UGX {Number(activeDrawerCash).toLocaleString()}
                                        </span>
                                        {hasActiveDrawer && activeDrawerCash < Number(settleData.amount) && (
                                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                                                Insufficient Cash
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                (() => {
                                    const matchingAcc = paymentAccounts.find(a => 
                                        (settleData.payment_method === 'MTN MoMo' && a.provider === 'MTN') ||
                                        (settleData.payment_method === 'Airtel Money' && a.provider === 'Airtel') ||
                                        (settleData.payment_method === 'Bank Transfer' && a.type === 'bank') ||
                                        a.name.toLowerCase().includes(settleData.payment_method.toLowerCase())
                                    );
                                    const accBalance = Number(matchingAcc?.current_balance || 0);
                                    const isLow = accBalance < Number(settleData.amount);

                                    return (
                                        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                                            isLow 
                                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300' 
                                                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={16} />
                                                <div>
                                                    <span className="font-bold block">{matchingAcc?.name || settleData.payment_method} Float</span>
                                                    <span className="text-[11px] opacity-80">Payment Account Balance</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-sm block">
                                                    UGX {accBalance.toLocaleString()}
                                                </span>
                                                {isLow && (
                                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                                                        Low Float
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Payout Payment Method *
                                </label>
                                <select
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-emerald-500 focus:ring-emerald-500 font-semibold"
                                    value={settleData.payment_method}
                                    onChange={e => setSettleData('payment_method', e.target.value)}
                                    required
                                >
                                    <option value="Cash">Cash (Deduct from Active Till Shift)</option>
                                    <option value="MTN MoMo">MTN Mobile Money</option>
                                    <option value="Airtel Money">Airtel Money</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                                {settleErrors.payment_method && <p className="text-rose-500 text-xs mt-1">{settleErrors.payment_method}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Payout Amount (UGX) *
                                </label>
                                <input
                                    type="number"
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-lg font-bold text-rose-600 dark:text-rose-400 focus:border-emerald-500 focus:ring-emerald-500"
                                    value={settleData.amount}
                                    onChange={e => setSettleData('amount', e.target.value)}
                                    required
                                    min="1"
                                    max={settleItem.remainingOwed || undefined}
                                />
                                {settleErrors.amount && <p className="text-rose-500 text-xs mt-1">{settleErrors.amount}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Reference / Payout Notes
                                </label>
                                <textarea
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    rows="2"
                                    placeholder="e.g. Paid to Dealer via MTN MoMo Txn #1234567..."
                                    value={settleData.notes}
                                    onChange={e => setSettleData('notes', e.target.value)}
                                ></textarea>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" onClick={closeSettleModal}>Cancel</Button>
                                <Button 
                                    variant="success" 
                                    type="submit" 
                                    disabled={
                                        processingSettle || 
                                        (settleData.payment_method === 'Cash' && (!hasActiveDrawer || activeDrawerCash < Number(settleData.amount)))
                                    } 
                                    icon={CheckCircle}
                                >
                                    Confirm Payout & Settle
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            {/* Instant Settlement Success & Payout Voucher Modal */}
            <Modal show={!!settledSuccessItem} onClose={() => setSettledSuccessItem(null)} maxWidth="md">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl text-center text-slate-900 dark:text-white">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10">
                        <CheckCircle size={36} />
                    </div>
                    <h3 className="text-xl font-black mb-1">
                        Dealer Settlement Recorded!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                        Payment of <strong className="text-slate-900 dark:text-white">UGX {Number(settledSuccessItem?.settlement_amount || settledSuccessItem?.unitCost || settledSuccessItem?.wholesale_cost || 0).toLocaleString()}</strong> has been recorded and expensed in your cashier shift.
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 mb-6 text-left text-xs space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Dealer:</span>
                            <span className="font-bold">{settledSuccessItem?.dealer?.name || 'Dealer'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Device / Item:</span>
                            <span className="font-bold">
                                {settledSuccessItem?.device_imei?.product?.brand?.name || settledSuccessItem?.product?.brand?.name || ''} {settledSuccessItem?.device_imei?.product?.model_name || settledSuccessItem?.product?.model_name}
                            </span>
                        </div>
                        {settledSuccessItem?.device_imei?.imei && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">IMEI:</span>
                                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{settledSuccessItem.device_imei.imei}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <Button variant="secondary" onClick={() => setSettledSuccessItem(null)}>
                            Close
                        </Button>
                        <a
                            href={`/dealers/items/${settledSuccessItem?.id}/voucher?mode=stream`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <FileText size={16} /> Print Payout Voucher
                        </a>
                    </div>
                </div>
            </Modal>

            {/* Return Inward Stock to Dealer Modal */}
            <Modal show={returnModalItem !== null} onClose={closeReturnModal} maxWidth="md">
                {returnModalItem && (
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl text-slate-900 dark:text-white">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <RotateCcw className="text-blue-600" size={20} />
                                Return Sourced Stock to Dealer
                            </h2>
                            <button type="button" onClick={closeReturnModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs rounded-xl border border-blue-200 dark:border-blue-900/60 mb-4">
                            Returning this item will remove it from active store inventory and credit back the sourcing agreement with <strong>{returnModalItem.dealer?.name}</strong>.
                        </div>

                        <form onSubmit={submitReturn} className="space-y-4">
                            {returnModalItem.type === 'bulk' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Quantity to Return (Available: {returnModalItem.availableQty})
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={returnModalItem.availableQty}
                                        value={returnData.quantity}
                                        onChange={e => setReturnData('quantity', e.target.value)}
                                        className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        required
                                    />
                                    {returnErrors.quantity && <p className="text-rose-500 text-xs mt-1">{returnErrors.quantity}</p>}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Return Reason / Condition Notes
                                </label>
                                <textarea
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    rows="3"
                                    placeholder="e.g. Unsold consignment returned to dealer in good condition..."
                                    value={returnData.notes}
                                    onChange={e => setReturnData('notes', e.target.value)}
                                ></textarea>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" onClick={closeReturnModal}>Cancel</Button>
                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    disabled={processingReturn}
                                    icon={RotateCcw}
                                >
                                    Confirm Return to Dealer
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

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
