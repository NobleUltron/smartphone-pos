import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import toast from 'react-hot-toast';
import { 
    BarChart3, TrendingUp, DollarSign, Smartphone, Users2, Activity, Tags, Wallet, Package, Wrench, Sparkles, Handshake, Layers, ArrowUpRight, Receipt, CheckCircle, FileSpreadsheet, X, AlertTriangle 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Sector } from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import PageHeader from '@/Components/SaaS/PageHeader';
import Modal from '@/Components/Modal';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'];

export default function ReportsIndex({ 
    auth, 
    period = 'today', 
    filters = {},
    metrics = {}, 
    inventory = {}, 
    consignments = {}, 
    layaways = {}, 
    expenses = {}, 
    repairs = {}, 
    topBrands = [], 
    topCategories = [], 
    cashierPerformance = [], 
    brandProfitBreakdown = [],
    commissionPayouts = [],
    paymentAccounts = []
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [payingStaff, setPayingStaff] = useState(null);

    const payoutForm = useForm({
        user_id: '',
        amount: '',
        payment_account_id: paymentAccounts[0]?.id || '',
        notes: '',
        period_label: period,
    });

    const openPayoutModal = (staff) => {
        const balance = Number(staff.commission_balance ?? staff.commission_earned ?? 0);
        setPayingStaff(staff);
        payoutForm.clearErrors();
        payoutForm.setData({
            user_id: staff.user_id,
            amount: balance > 0 ? balance : Number(staff.commission_earned || 0),
            payment_account_id: paymentAccounts[0]?.id || '',
            notes: '',
            period_label: period === 'custom' ? `${dateFrom || '...'} to ${dateTo || '...'}` : period,
        });
    };

    const handlePayoutSubmit = (e) => {
        e.preventDefault();
        payoutForm.post('/api/reports/commissions/pay', {
            preserveScroll: true,
            onSuccess: () => {
                setPayingStaff(null);
                toast.success('Staff commission payout recorded!');
            },
            onError: (errs) => {
                toast.error(errs?.amount || errs?.payment_account_id || Object.values(errs || {})[0] || 'Failed to pay commission');
            },
        });
    };

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
        return (
            <g>
                <text x={cx} y={cy - 8} textAnchor="middle" fill="currentColor" className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {payload.name}
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" fill="currentColor" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {value} Units
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 12}
                    outerRadius={outerRadius + 16}
                    fill={fill}
                />
            </g>
        );
    };
    
    const handlePeriodChange = (e) => {
        setDateFrom('');
        setDateTo('');
        router.get('/reports', { period: e.target.value }, { preserveState: true, preserveScroll: true });
    };

    const handleCustomDateApply = (nextFrom, nextTo) => {
        const params = {};
        if (nextFrom) params.date_from = nextFrom;
        if (nextTo) params.date_to = nextTo;
        if (!nextFrom && !nextTo) params.period = 'today';
        router.get('/reports', params, { preserveState: true, preserveScroll: true });
    };

    const periodLabel = period === 'custom'
        ? `${dateFrom || 'Start'} to ${dateTo || 'Today'}`
        : (period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1));

    const netOperatingProfit = Number(metrics?.netOperatingProfit ?? ((metrics?.grossProfit || 0) - (metrics?.operatingExpenses || 0)));
    const netMarginPct = (metrics?.salesVolume || 0) > 0
        ? ((netOperatingProfit / metrics.salesVolume) * 100).toFixed(1)
        : '0.0';

    return (
        <AuthenticatedLayout>
            <Head title="Business Reports" />
            
            <PageHeader 
                title="Business Reports"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }]}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/reports/profit-loss"
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                            <FileSpreadsheet size={14} />
                            <span>Profit &amp; Loss (P&amp;L)</span>
                        </Link>
                        <Link
                            href="/reports/daily-z-report"
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                            <TrendingUp size={14} />
                            <span>Daily Z-Report</span>
                        </Link>
                        <select 
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-400/40 backdrop-blur-md transition-all cursor-pointer" 
                            value={period} 
                            onChange={handlePeriodChange}
                        >
                            <option value="today" className="bg-slate-900 text-white">Today</option>
                            <option value="week" className="bg-slate-900 text-white">This Week</option>
                            <option value="month" className="bg-slate-900 text-white">This Month</option>
                            <option value="year" className="bg-slate-900 text-white">This Year</option>
                            <option value="all" className="bg-slate-900 text-white">All Time</option>
                            {period === 'custom' && <option value="custom" className="bg-slate-900 text-white">Custom Range</option>}
                        </select>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                handleCustomDateApply(e.target.value, dateTo);
                            }}
                            className="bg-white/10 text-white border border-white/20 rounded-xl text-xs font-semibold py-2 px-2.5 outline-none focus:ring-2 focus:ring-indigo-400/40"
                            title="From Date"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                handleCustomDateApply(dateFrom, e.target.value);
                            }}
                            className="bg-white/10 text-white border border-white/20 rounded-xl text-xs font-semibold py-2 px-2.5 outline-none focus:ring-2 focus:ring-indigo-400/40"
                            title="To Date"
                        />
                    </div>
                }
            />

            {/* Sales Metrics Cards */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 mt-8">
                <TrendingUp size={20} className="text-emerald-500" /> 
                Sales Performance ({periodLabel})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-5">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Cash Collected</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(metrics?.totalRevenue || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="success">Sales Vol</Badge>
                        <span className="font-semibold text-slate-700 dark:text-slate-300" title="Total invoice value of goods sold">UGX {Number(metrics?.salesVolume || 0).toLocaleString()}</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Cost of Goods Sold</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(metrics?.cogs || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="danger">Outflow</Badge>
                        <span>COGS</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Gross Profit</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(metrics?.grossProfit || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="success">Est.</Badge>
                        <span>Gross Margin</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Items Sold</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(metrics?.itemsSold || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">Units</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                            <Smartphone size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="info">Volume</Badge>
                        <span>Sold</span>
                    </div>
                </Card>
            </div>

            {/* Net Operating Profit Strip */}
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/40 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">
                        Net Operating Profit ({periodLabel})
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black mt-1 ${netOperatingProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        UGX {netOperatingProfit.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                        Gross Profit (UGX {Number(metrics?.grossProfit || 0).toLocaleString()}) &minus; Operating Expenses (UGX {Number(metrics?.operatingExpenses || 0).toLocaleString()})
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-center">
                        <div className="text-[10px] uppercase font-bold text-indigo-200">Net Margin</div>
                        <div className="text-lg font-black text-white">{netMarginPct}%</div>
                    </div>
                    <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-center">
                        <div className="text-[10px] uppercase font-bold text-indigo-200">Settlements / Refunds</div>
                        <div className="text-sm font-bold text-amber-300">UGX {Number(expenses?.settlements || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Consignments & Dealer Settlements */}
            <div className="flex items-center justify-between mt-10 mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Handshake size={20} className="text-purple-600 dark:text-purple-400" /> 
                    Dealer Consignments & Settlements ({periodLabel})
                </h3>
                <Link href="/dealers/dashboard" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1">
                    Dealer Directory <ArrowUpRight size={14} />
                </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Wholesale Payouts Settled</p>
                            <h3 className="text-3xl font-black text-emerald-600">{Number(consignments?.settledPayouts || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="success">Paid Out</Badge>
                        <span>Settled with sourcing dealers</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Outstanding Payouts Owed</p>
                            <h3 className="text-3xl font-black text-rose-600">{Number(consignments?.unsettledOwed || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="danger">Pending</Badge>
                        <span>Unsettled sold stock</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Consignment Net Profit</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(consignments?.netProfit || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="info">Margin</Badge>
                        <span>Shop gross markup</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Consignment Volume</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(consignments?.inwardSold || 0)} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">Sold</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Smartphone size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="neutral">{consignments?.inwardReceived || 0} Intake</Badge>
                        <span>{consignments?.outwardIssued || 0} Outward Partner</span>
                    </div>
                </Card>
            </div>

            {/* Layaways & Receivables Portfolio */}
            <div className="flex items-center justify-between mt-10 mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wallet size={20} className="text-emerald-600 dark:text-emerald-400" /> 
                    Layaways & Installments Portfolio ({periodLabel})
                </h3>
                <Link href="/layaways" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1">
                    Layaway Management <ArrowUpRight size={14} />
                </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Installments Collected</p>
                            <h3 className="text-3xl font-black text-emerald-600">{Number(layaways?.collected || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="success">Inflow</Badge>
                        <span>Cash from installment payments</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Active Layaway Contracts</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(layaways?.activePlans || 0)} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">Plans</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Layers size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="info">Ongoing</Badge>
                        <span>Customers currently paying</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Outstanding Receivables</p>
                            <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{Number(layaways?.totalReceivable || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="warning">Receivable</Badge>
                        <span>Remaining customer balance</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Completed Layaways</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(layaways?.completedPlans || 0)} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">Finished</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="success">Completed</Badge>
                        <span>Fully paid & released</span>
                    </div>
                </Card>
            </div>

            {/* Expenses & Payout Categories Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card className="lg:col-span-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses & Payouts</span>
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 mb-2">
                            {Number(expenses?.total || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">UGX</span>
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Operating Overheads: <strong className="text-slate-700 dark:text-slate-200">UGX {Number(expenses?.operating || 0).toLocaleString()}</strong> • Settlements & Refunds: <strong className="text-slate-700 dark:text-slate-200">UGX {Number(expenses?.settlements || 0).toLocaleString()}</strong>
                        </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Logged across all shifts</span>
                        <Link href="/expenses" className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1">
                            Expense Ledger <ArrowUpRight size={13} />
                        </Link>
                    </div>
                </Card>

                <Card noPadding className="lg:col-span-2 flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Receipt size={18} className="text-rose-500" />
                            Expense & Payout Breakdown by Category
                        </h3>
                    </div>
                    <div className="p-6">
                        {expenses?.categories?.length > 0 ? (
                            <div className="space-y-4">
                                {expenses.categories.map((cat, idx) => {
                                    const pct = expenses.total > 0 ? Math.round((Number(cat.value) / expenses.total) * 100) : 0;
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between items-center text-sm mb-1.5">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-extrabold text-slate-900 dark:text-white">{Number(cat.value).toLocaleString()} UGX</span>
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-10 text-right">{pct}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-slate-400">
                                No expenses logged for this period.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Repair Operations Metrics Cards */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 mt-8">
                <Wrench size={20} className="text-orange-500" /> 
                Repair Operations ({periodLabel})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.4s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Repair Revenue</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(metrics?.repairRevenue || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="warning">Cash</Badge>
                        <span>Collected from repairs</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.5s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Repairs Completed</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{Number(metrics?.repairsCompleted || 0).toLocaleString()} <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">Tickets</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Badge variant="success">Resolved</Badge>
                        <span>Successfully fixed</span>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Brands */}
                <Card noPadding className="flex flex-col animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Activity size={20} className="text-pink-500" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Top Selling Brands</h3>
                    </div>
                    <div className="p-6 h-[300px]">
                        {topBrands?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        activeIndex={activeIndex}
                                        activeShape={renderActiveShape}
                                        onMouseEnter={onPieEnter}
                                        data={topBrands.map(brand => ({ ...brand, value: Number(brand.value) }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                        isAnimationActive={false}
                                    >
                                        {topBrands.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                        cursor={false}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                No brand sales data available.
                            </div>
                        )}
                    </div>
                </Card>

                {/* Top Categories */}
                <Card noPadding className="flex flex-col animate-slide-up" style={{ animationDelay: '0.5s' }}>
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Tags size={20} className="text-indigo-500" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Top Selling Categories</h3>
                    </div>
                    <div className="p-6 h-[300px]">
                        {topCategories?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={topCategories}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        name="Units Sold"
                                        fill="#3B82F6" 
                                        radius={[6, 6, 0, 0]}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    >
                                        {topCategories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                No category sales data available.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Brand Profit Margin Analysis */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 mt-8">
                <TrendingUp size={20} className="text-emerald-500" />
                Brand Profitability & Margin Breakdown
            </h3>
            
            <Card noPadding className="mb-8 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="saas-table w-full whitespace-nowrap">
                        <thead>
                            <tr>
                                <th>Brand Name</th>
                                <th className="!text-center">Units Sold</th>
                                <th className="!text-right">Sales Revenue</th>
                                <th className="!text-right">Cost of Goods (COGS)</th>
                                <th className="!text-right">Net Profit</th>
                                <th className="!text-center">Profit Margin %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brandProfitBreakdown?.length > 0 ? (
                                brandProfitBreakdown.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        <td className="font-bold text-slate-900 dark:text-white">{item.brand_name}</td>
                                        <td className="text-center font-semibold text-slate-600 dark:text-slate-300">{item.items_sold} pcs</td>
                                        <td className="text-right font-bold text-slate-900 dark:text-white">{Number(item.revenue).toLocaleString()} UGX</td>
                                        <td className="text-right font-medium text-slate-500 dark:text-slate-400">{Number(item.cogs).toLocaleString()} UGX</td>
                                        <td className="text-right font-black text-emerald-600 dark:text-emerald-400">{Number(item.profit).toLocaleString()} UGX</td>
                                        <td className="text-center">
                                            <Badge variant={item.margin_pct >= 20 ? 'success' : item.margin_pct >= 10 ? 'warning' : 'danger'}>
                                                {item.margin_pct}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-6 text-slate-400">
                                        No sales profit data recorded for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Cashier Performance */}
                <div className="lg:col-span-2">
                    <Card noPadding className="h-full animate-slide-up" style={{ animationDelay: '0.6s' }}>
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Users2 size={20} className="text-pink-500" />
                                <h3 className="font-bold text-slate-900 dark:text-white">Staff Sales, Margin &amp; Commission Leaderboard</h3>
                            </div>
                            {cashierPerformance?.some(s => Number(s.commission_earned || 0) > 0) && (
                                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
                                    Total Commissions: UGX {cashierPerformance.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0).toLocaleString()}
                                </span>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="saas-table w-full whitespace-nowrap">
                                <thead>
                                    <tr>
                                        <th>Staff Name</th>
                                        <th>Role</th>
                                        <th className="!text-center">Phones</th>
                                        <th className="!text-center">Txns</th>
                                        <th className="!text-right">Revenue</th>
                                        <th className="!text-right">Net Profit &amp; Margin</th>
                                        <th className="!text-right">Commission</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashierPerformance?.length > 0 ? cashierPerformance.map((staff, idx) => (
                                        <tr key={idx}>
                                            <td className="font-bold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-slate-700">
                                                        {staff.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div>{staff.name}</div>
                                                        <div className="text-[11px] font-medium text-slate-400">
                                                            Avg Ticket: {Number(staff.avg_basket || 0).toLocaleString()} UGX
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {staff.role === 'admin' ? (
                                                    <Badge variant="danger">Admin</Badge>
                                                ) : staff.role === 'manager' ? (
                                                    <Badge variant="primary">Manager</Badge>
                                                ) : (
                                                    <Badge variant="neutral">Cashier</Badge>
                                                )}
                                            </td>
                                            <td className="text-center font-bold text-indigo-600 dark:text-indigo-400">{staff.phones_sold ?? 0}</td>
                                            <td className="text-center text-slate-500 dark:text-slate-400 font-medium">{staff.sales_count}</td>
                                            <td className="text-right font-bold text-slate-900 dark:text-white">
                                                {Number(staff.total_revenue).toLocaleString()} <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">UGX</span>
                                            </td>
                                            <td className="text-right">
                                                <div className="font-black text-emerald-600 dark:text-emerald-400">
                                                    {Number(staff.net_profit || 0).toLocaleString()} <span className="text-slate-400 font-normal text-xs">UGX</span>
                                                </div>
                                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    {Number(staff.margin_pct || 0).toFixed(1)}% margin
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                {staff.commission_type && staff.commission_type !== 'none' ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="font-black text-indigo-600 dark:text-indigo-400">
                                                            {Number(staff.commission_earned || 0).toLocaleString()} <span className="text-slate-400 font-normal text-xs">UGX</span>
                                                        </div>
                                                        <div className="text-[10px] font-semibold text-slate-400">
                                                            {staff.commission_type === 'per_phone'
                                                                ? `${Number(staff.commission_rate).toLocaleString()} / phone`
                                                                : staff.commission_type === 'profit_percent'
                                                                    ? `${staff.commission_rate}% of profit`
                                                                    : `${staff.commission_rate}% of revenue`}
                                                        </div>
                                                        {Number(staff.commission_paid || 0) > 0 && (
                                                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                Paid: {Number(staff.commission_paid).toLocaleString()} UGX
                                                            </div>
                                                        )}
                                                        {Number(staff.commission_balance || 0) > 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openPayoutModal(staff)}
                                                                className="mt-0.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold transition-colors"
                                                            >
                                                                Pay {Number(staff.commission_balance).toLocaleString()}
                                                            </button>
                                                        ) : Number(staff.commission_paid || 0) > 0 ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                Settled ✓
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-500 dark:text-slate-400">
                                                No sales data for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Commission Payout Ledger */}
                        {commissionPayouts.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-slate-800">
                                <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <Wallet size={14} className="text-emerald-600" />
                                        Commission Payout Ledger ({commissionPayouts.length})
                                    </span>
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                        Total Paid: UGX {commissionPayouts.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {commissionPayouts.map(payout => (
                                        <div key={payout.id} className="px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                                    {payout.user?.name || 'Staff'}
                                                    <span className="text-slate-400 font-normal ml-2">
                                                        {new Date(payout.expense_date).toLocaleDateString()} • {payout.payment_account?.name || 'Cash'}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate max-w-md">{payout.description}</div>
                                            </div>
                                            <div className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                                                UGX {Number(payout.amount || 0).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Inventory Snapshot */}
                <div className="lg:col-span-1">
                    <div className="flex flex-col gap-6 h-full animate-slide-up" style={{ animationDelay: '0.7s' }}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Package size={20} className="text-amber-500" /> Current Inventory (Real-Time)
                        </h3>
                        
                        <Card className="border-l-4 border-l-slate-400">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Invested Cost (In Stock)</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                                {Number(inventory?.inStockValue || 0).toLocaleString()} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">UGX</span>
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Money tied up in {inventory?.inStockCount || 0} in-stock items</p>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-500">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Expected Retail Revenue</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                                {Number(inventory?.expectedRevenue || 0).toLocaleString()} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">UGX</span>
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total value if all stock sells</p>
                        </Card>

                        <Card className="border-l-4 border-l-cyan-500">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Potential Profit</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                                {Number(inventory?.potentialProfit || 0).toLocaleString()} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">UGX</span>
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Excludes {inventory?.defectiveCount || 0} defective items</p>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Pay Staff Commission Modal */}
            {payingStaff && (
                <Modal show={true} onClose={() => !payoutForm.processing && setPayingStaff(null)} maxWidth="md">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <Wallet size={20} className="text-emerald-600" />
                                    Pay Staff Commission
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">{payingStaff.name} ({payingStaff.role})</p>
                            </div>
                            <button onClick={() => setPayingStaff(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePayoutSubmit} className="space-y-4">
                            {Object.keys(payoutForm.errors).length > 0 && (
                                <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-xs border border-rose-200 flex items-start gap-2 font-medium">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                                    <div>
                                        {Object.values(payoutForm.errors).map((err, i) => (
                                            <div key={i}>{err}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Commission Earned (Period):</span>
                                    <span className="font-bold text-slate-900 dark:text-white">UGX {Number(payingStaff.commission_earned || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Already Paid (Period):</span>
                                    <span className="font-bold text-emerald-600">UGX {Number(payingStaff.commission_paid || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-extrabold text-sm">
                                    <span className="text-slate-900 dark:text-white">Remaining Due:</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">UGX {Number(payingStaff.commission_balance || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Payout Amount (UGX) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="saas-input w-full text-lg font-bold"
                                    value={payoutForm.data.amount}
                                    onChange={e => payoutForm.setData('amount', e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Pay From Business Wallet *</label>
                                <select
                                    className="saas-input w-full font-medium"
                                    value={payoutForm.data.payment_account_id}
                                    onChange={e => payoutForm.setData('payment_account_id', e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose Business Wallet --</option>
                                    {paymentAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} — Bal: UGX {Number(acc.current_balance || 0).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Records a <strong>Staff Commission</strong> operating expense and deducts from Treasury (and Cash Drawer if paying from open Till).
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Reference (Optional)</label>
                                <input
                                    type="text"
                                    className="saas-input w-full text-sm"
                                    placeholder="e.g. Paid via MTN MoMo"
                                    value={payoutForm.data.notes}
                                    onChange={e => payoutForm.setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="secondary" type="button" onClick={() => setPayingStaff(null)}>Cancel</Button>
                                <Button variant="primary" type="submit" isLoading={payoutForm.processing} className="!bg-emerald-600 hover:!bg-emerald-700">
                                    Confirm Commission Payout
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}

        </AuthenticatedLayout>
    );
}
