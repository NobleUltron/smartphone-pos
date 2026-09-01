import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
    BarChart3, TrendingUp, DollarSign, Smartphone, Users2, Activity, Tags, Wallet, Package, Wrench, Sparkles, Handshake, Layers, ArrowUpRight, Receipt, CheckCircle 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Sector } from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import PageHeader from '@/Components/SaaS/PageHeader';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'];

export default function ReportsIndex({ 
    auth, 
    period = 'today', 
    metrics = {}, 
    inventory = {}, 
    consignments = {}, 
    layaways = {}, 
    expenses = {}, 
    repairs = {}, 
    topBrands = [], 
    topCategories = [], 
    cashierPerformance = [], 
    brandProfitBreakdown = [] 
}) {
    const [activeIndex, setActiveIndex] = useState(0);

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
        return (
            <g>
                <text x={cx} y={cy - 8} textAnchor="middle" fill="#1E293B" className="font-bold text-sm">
                    {payload.name}
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748B" className="text-xs font-medium">
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
        router.get('/reports', { period: e.target.value }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Business Reports" />
            
            <PageHeader 
                title="Business Reports"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }]}
                actions={
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Date Range:</label>
                        <select 
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-indigo-400/40 backdrop-blur-md transition-all cursor-pointer" 
                            value={period} 
                            onChange={handlePeriodChange}
                        >
                            <option value="today" className="bg-slate-900 text-white">Today</option>
                            <option value="week" className="bg-slate-900 text-white">This Week</option>
                            <option value="month" className="bg-slate-900 text-white">This Month</option>
                            <option value="year" className="bg-slate-900 text-white">This Year</option>
                            <option value="all" className="bg-slate-900 text-white">All Time</option>
                        </select>
                    </div>
                }
            />

            {/* Sales Metrics Cards */}
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 mt-8">
                <TrendingUp size={20} className="text-emerald-500" /> 
                Sales Performance ({period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cash Collected</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.totalRevenue || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="success">Sales Vol</Badge>
                        <span className="font-semibold text-slate-700" title="Total invoice value of goods sold">UGX {Number(metrics?.salesVolume || 0).toLocaleString()}</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cost of Goods Sold</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.cogs || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="danger">Outflow</Badge>
                        <span>COGS</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gross Profit</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.grossProfit || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="success">Est.</Badge>
                        <span>Margin</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Items Sold</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.itemsSold || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">Units</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                            <Smartphone size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="info">Volume</Badge>
                        <span>Sold</span>
                    </div>
                </Card>
            </div>

            {/* Consignments & Dealer Settlements */}
            <div className="flex items-center justify-between mt-10 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Handshake size={20} className="text-purple-600" /> 
                    Dealer Consignments & Settlements ({period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)})
                </h3>
                <Link href="/dealers/dashboard" className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
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
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Consignment Net Profit</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(consignments?.netProfit || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="info">Margin</Badge>
                        <span>Shop gross markup</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Consignment Volume</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(consignments?.inwardSold || 0)} <span className="text-lg text-slate-500 font-normal">Sold</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Smartphone size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="neutral">{consignments?.inwardReceived || 0} Intake</Badge>
                        <span>{consignments?.outwardIssued || 0} Outward Partner</span>
                    </div>
                </Card>
            </div>

            {/* Layaways & Receivables Portfolio */}
            <div className="flex items-center justify-between mt-10 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Wallet size={20} className="text-emerald-600" /> 
                    Layaways & Installments Portfolio ({period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)})
                </h3>
                <Link href="/layaways" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
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
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Layaway Contracts</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(layaways?.activePlans || 0)} <span className="text-lg text-slate-500 font-normal">Plans</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Layers size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="info">Ongoing</Badge>
                        <span>Customers currently paying</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Outstanding Receivables</p>
                            <h3 className="text-3xl font-black text-indigo-600">{Number(layaways?.totalReceivable || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="warning">Receivable</Badge>
                        <span>Remaining customer balance</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Completed Layaways</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(layaways?.completedPlans || 0)} <span className="text-lg text-slate-500 font-normal">Finished</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
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
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenses & Payouts</span>
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-rose-600 mb-2">
                            {Number(expenses?.total || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span>
                        </h3>
                        <p className="text-sm text-slate-500">Total operational outflows in this period, including dealer payouts, refunds, and overheads.</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Logged across all shifts</span>
                        <Link href="/expenses" className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
                            Expense Ledger <ArrowUpRight size={13} />
                        </Link>
                    </div>
                </Card>

                <Card noPadding className="lg:col-span-2 flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
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
                                                <span className="font-bold text-slate-800">{cat.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-extrabold text-slate-900">{Number(cat.value).toLocaleString()} UGX</span>
                                                    <span className="text-xs font-semibold text-slate-500 w-10 text-right">{pct}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 mt-8">
                <Wrench size={20} className="text-orange-500" /> 
                Repair Operations ({period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.4s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Repair Revenue</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.repairRevenue || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">UGX</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="warning">Cash</Badge>
                        <span>Collected from repairs</span>
                    </div>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.5s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Repairs Completed</p>
                            <h3 className="text-3xl font-black text-slate-900">{Number(metrics?.repairsCompleted || 0).toLocaleString()} <span className="text-lg text-slate-500 font-normal">Tickets</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="success">Resolved</Badge>
                        <span>Successfully fixed</span>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Brands */}
                <Card noPadding className="flex flex-col animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Activity size={20} className="text-pink-500" />
                        <h3 className="font-bold text-slate-900">Top Selling Brands</h3>
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
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Tags size={20} className="text-indigo-500" />
                        <h3 className="font-bold text-slate-900">Top Selling Categories</h3>
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
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 mt-8">
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
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="font-bold text-slate-900">{item.brand_name}</td>
                                        <td className="text-center font-semibold text-slate-600">{item.items_sold} pcs</td>
                                        <td className="text-right font-bold text-slate-900">{Number(item.revenue).toLocaleString()} UGX</td>
                                        <td className="text-right font-medium text-slate-500">{Number(item.cogs).toLocaleString()} UGX</td>
                                        <td className="text-right font-black text-emerald-600">{Number(item.profit).toLocaleString()} UGX</td>
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
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                            <Users2 size={20} className="text-pink-500" />
                            <h3 className="font-bold text-slate-900">Staff Sales & Profit Performance</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="saas-table w-full whitespace-nowrap">
                                <thead>
                                    <tr>
                                        <th>Staff Name</th>
                                        <th>Role</th>
                                        <th className="!text-center">Txns</th>
                                        <th className="!text-right">Revenue</th>
                                        <th className="!text-right">Discounts</th>
                                        <th className="!text-right">Net Profit</th>
                                        <th className="!text-right">Avg Ticket</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashierPerformance?.length > 0 ? cashierPerformance.map((staff, idx) => (
                                        <tr key={idx}>
                                            <td className="font-bold text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200">
                                                        {staff.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {staff.name}
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
                                            <td className="text-center text-slate-500 font-medium">{staff.sales_count}</td>
                                            <td className="text-right font-bold text-slate-900">
                                                {Number(staff.total_revenue).toLocaleString()} <span className="text-slate-500 font-normal text-xs">UGX</span>
                                            </td>
                                            <td className="text-right font-semibold text-rose-600">
                                                {Number(staff.total_discounts || 0).toLocaleString()} <span className="text-slate-400 font-normal text-xs">UGX</span>
                                            </td>
                                            <td className="text-right font-black text-emerald-600">
                                                {Number(staff.net_profit || 0).toLocaleString()} <span className="text-slate-400 font-normal text-xs">UGX</span>
                                            </td>
                                            <td className="text-right font-medium text-slate-600">
                                                {Number(staff.avg_basket || 0).toLocaleString()} <span className="text-slate-400 font-normal text-xs">UGX</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-500">
                                                No sales data for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Inventory Snapshot */}
                <div className="lg:col-span-1">
                    <div className="flex flex-col gap-6 h-full animate-slide-up" style={{ animationDelay: '0.7s' }}>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Package size={20} className="text-amber-500" /> Current Inventory (Real-Time)
                        </h3>
                        
                        <Card className="border-l-4 border-l-slate-400">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invested Cost (In Stock)</p>
                            <h3 className="text-2xl font-black text-slate-900 mb-1">
                                {Number(inventory?.inStockValue || 0).toLocaleString()} <span className="text-sm text-slate-500 font-normal">UGX</span>
                            </h3>
                            <p className="text-sm text-slate-500">Money tied up in {inventory?.inStockCount || 0} in-stock items</p>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-500">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expected Retail Revenue</p>
                            <h3 className="text-2xl font-black text-slate-900 mb-1">
                                {Number(inventory?.expectedRevenue || 0).toLocaleString()} <span className="text-sm text-slate-500 font-normal">UGX</span>
                            </h3>
                            <p className="text-sm text-slate-500">Total value if all stock sells</p>
                        </Card>

                        <Card className="border-l-4 border-l-cyan-500">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Potential Profit</p>
                            <h3 className="text-2xl font-black text-slate-900 mb-1">
                                {Number(inventory?.potentialProfit || 0).toLocaleString()} <span className="text-sm text-slate-500 font-normal">UGX</span>
                            </h3>
                            <p className="text-sm text-slate-500">Excludes {inventory?.defectiveCount || 0} defective items</p>
                        </Card>
                    </div>
                </div>
            </div>

        </AuthenticatedLayout>
    );
}
