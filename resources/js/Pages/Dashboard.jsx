import React, { useState, useRef, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { TrendingUp, Smartphone, AlertTriangle, Sparkles, User, Banknote, PieChart as PieChartIcon, Minimize2, Maximize2, Trash2, Send, Bot, Clock, ArrowRight, ShoppingCart, Settings, Handshake, Layers, DollarSign, Wrench, Wallet, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import PageHeader from '@/Components/SaaS/PageHeader';
import AiSalesAnalytics from '@/Components/SaaS/AiSalesAnalytics';

export default function Dashboard({ 
    auth, 
    todaySales = 0, 
    inStockCount = 0, 
    scrappedCount = 0, 
    lowStockCount = 0, 
    activeRepairsCount = 0, 
    completedRepairsToday = 0, 
    salesData = [], 
    recentSales = [], 
    inventoryValue = 0, 
    topBrands = [],
    dealerMetrics = {},
    layawayMetrics = {},
    repairMetrics = {},
    shiftMetrics = {}
}) {
    const COLORS = ['#F43F5E', '#1E293B', '#38BDF8', '#8B5CF6', '#10B981'];
    
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "👋 **Hello! I am SmartPOS AI.** Ask me about low stock alerts, today's sales summary, or inventory stats!", time: 'Just now' }
    ]);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const chatEndRef = useRef(null);
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

    useEffect(() => {
        if (!isMinimized) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading, isMinimized]);

    const handleSend = async (textToSend) => {
        const query = textToSend || prompt;
        if (!query || !query.trim() || loading) return;

        const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMsg = { role: 'user', text: query, time: userTime };
        
        setMessages(prev => [...prev, userMsg]);
        setPrompt('');
        setLoading(true);

        try {
            const res = await axios.post('/api/gemini/ask', { prompt: query });
            const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const aiMsg = { role: 'assistant', text: res.data.reply, time: aiTime };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const errorMsg = { role: 'assistant', text: "⚠️ Unable to fetch response. Please try again.", time: aiTime };
            setMessages(prev => [...prev, errorMsg]);
        }
        setLoading(false);
    };

    const renderFormattedText = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, idx) => {
            const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
            const formattedLine = parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={pIdx} className="font-extrabold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={pIdx} className="italic text-slate-500 dark:text-slate-400 font-medium">{part.slice(1, -1)}</em>;
                }
                return part;
            });

            return (
                <div key={idx} className={line.trim().startsWith('•') || line.trim().startsWith('-') ? 'pl-2 my-0.5' : 'my-0.5'} style={{ minHeight: line.trim() === '' ? '6px' : 'auto' }}>
                    {formattedLine}
                </div>
            );
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {/* Welcome Header */}
            <div className="mb-8 p-6 lg:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden animate-slide-up border border-slate-700/50">
                {/* Background Glow Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-32 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl -mb-16 pointer-events-none"></div>
                
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none text-indigo-300">
                    <Sparkles size={160} strokeWidth={1} />
                </div>
                
                <div className="flex items-center gap-5 z-10">
                    <div className="relative">
                        <img 
                            src={auth.user?.profile_photo_url} 
                            alt={auth.user?.name || 'Admin'} 
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border-2 border-white/20 shadow-xl object-cover ring-4 ring-indigo-500/30"
                        />
                        <div className="absolute bottom-0 right-0 bg-emerald-500 w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 border-slate-900 shadow-sm flex items-center justify-center">
                            <span className="absolute w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl lg:text-3xl tracking-tight mb-1.5">
                            <span className="text-slate-400 font-medium">Welcome back,</span> <span className="font-black text-white">{auth.user?.name || 'Admin'}</span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md shadow-sm flex items-center gap-1.5">
                                <User size={12} /> Store Owner
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                System Online
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 z-10 mt-4 md:mt-0">
                    <Link 
                        href="/settings" 
                        className="w-full sm:w-auto px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    >
                        <Settings size={18} />
                        <span>Store Settings</span>
                    </Link>
                    <Link 
                        href="/reports" 
                        className="group w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 focus:ring-2 focus:ring-white/50 outline-none"
                    >
                        <PieChartIcon size={18} className="transition-transform group-hover:scale-110" /> 
                        <span>View Reports</span> 
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>

            {/* AI Business Intelligence & Sales Analytics */}
            <div className="mb-8">
                <AiSalesAnalytics 
                    todaySales={todaySales}
                    inStockCount={inStockCount}
                    activeRepairsCount={activeRepairsCount}
                    completedRepairsToday={completedRepairsToday}
                    lowStockCount={lowStockCount}
                    inventoryValue={inventoryValue}
                    salesData={salesData}
                    onAskAi={(query) => {
                        setIsMinimized(false);
                        handleSend(query);
                    }}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {/* Metric: Today's Sales */}
                <Card className="relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">Today's Sales</h6>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-bold text-slate-900">{Number(todaySales).toLocaleString()}</h3>
                                <span className="text-sm text-slate-500 font-medium">UGX</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-500/30 group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        <Badge variant="success">Active Shift</Badge> Gross Revenue
                    </div>
                    <TrendingUp className="absolute -right-4 -bottom-6 w-32 h-32 text-rose-500/5 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform" />
                </Card>

                {/* Metric: Phones in Stock */}
                <Card className="relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">Phones in Stock</h6>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-bold text-slate-900">{inStockCount}</h3>
                                <span className="text-sm text-slate-500 font-medium">Units</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-blue-500/30 group-hover:scale-110 transition-transform">
                            <Smartphone size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        {scrappedCount > 0 ? (
                            <span className="text-rose-600 font-medium flex items-center gap-1"><AlertTriangle size={14}/> {scrappedCount} Defective</span>
                        ) : (
                            <span className="text-emerald-600 font-medium flex items-center gap-1"><Sparkles size={14}/> All stock good</span>
                        )}
                    </div>
                    <Smartphone className="absolute -right-4 -bottom-6 w-32 h-32 text-blue-500/5 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform" />
                </Card>

                {/* Metric: Inventory Value */}
                <Card className="relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">Inventory Value</h6>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-bold text-slate-900">{Number(inventoryValue).toLocaleString()}</h3>
                                <span className="text-sm text-slate-500 font-medium">UGX</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                            <Banknote size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        Estimated total capital
                    </div>
                    <Banknote className="absolute -right-4 -bottom-6 w-32 h-32 text-emerald-500/5 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform" />
                </Card>

                {/* Metric: Low Stock Alerts */}
                <Card className="relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">Low Stock Alerts</h6>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-bold text-slate-900">{lowStockCount}</h3>
                                <span className="text-sm text-slate-500 font-medium">Items</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-purple-500/30 group-hover:scale-110 transition-transform">
                            <AlertTriangle size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        {lowStockCount > 0 ? (
                            <span className="text-amber-600 font-medium flex items-center gap-1">Restock needed soon</span>
                        ) : (
                            <span className="text-emerald-600 font-medium flex items-center gap-1">Stock levels healthy</span>
                        )}
                    </div>
                    <AlertTriangle className="absolute -right-4 -bottom-6 w-32 h-32 text-purple-500/5 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform" />
                </Card>

                {/* Metric: Active Repairs */}
                <Card className="relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">Active Repairs</h6>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-bold text-slate-900">{activeRepairsCount}</h3>
                                <span className="text-sm text-slate-500 font-medium">Tickets</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-orange-500/30 group-hover:scale-110 transition-transform">
                            <Bot size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        Pending or In Progress
                    </div>
                    <Bot className="absolute -right-4 -bottom-6 w-32 h-32 text-orange-500/5 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform" />
                </Card>

                {/* Metric: Repairs Completed Today */}
                <Card className="relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">Repairs Completed</h6>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-bold text-slate-900">{completedRepairsToday}</h3>
                                <span className="text-sm text-slate-500 font-medium">Today</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-400 to-blue-600 text-white shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                            <Sparkles size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        <Badge variant="success">Completed</Badge> devices ready
                    </div>
                    <Sparkles className="absolute -right-4 -bottom-6 w-32 h-32 text-indigo-500/5 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform" />
                </Card>
            </div>

            {/* Operational Portfolios & Working Capital Grid */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers size={18} className="text-indigo-500" />
                        Consignments, Layaways & Working Capital
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time balances & receivables</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {/* Dealer Consignments */}
                    <Card className="relative overflow-hidden group hover:border-purple-500/40 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
                                    Dealer Consignments
                                </span>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {dealerMetrics?.owedAmount > 0 ? (
                                        <span className="text-rose-600">UGX {Number(dealerMetrics.owedAmount).toLocaleString()}</span>
                                    ) : (
                                        <span>UGX 0</span>
                                    )}
                                </h4>
                                <span className="text-xs text-slate-500 font-medium block">Wholesale Payouts Owed</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-sm">
                                <Handshake size={20} />
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="space-y-1">
                                <div className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white">{dealerMetrics?.pendingInwardCount || 0}</span> Consigned in shop
                                </div>
                                <div className="text-slate-500">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{dealerMetrics?.outwardPendingCount || 0}</span> with Partners
                                    {dealerMetrics?.outwardOverdueCount > 0 && (
                                        <span className="text-rose-600 font-bold ml-1">({dealerMetrics.outwardOverdueCount} Overdue)</span>
                                    )}
                                </div>
                            </div>
                            <Link 
                                href="/dealers/dashboard" 
                                className="p-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
                                title="View Dealer Consignments"
                            >
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </Card>

                    {/* Layaway Receivables */}
                    <Card className="relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                                    Layaway Plans
                                </span>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                                    UGX {Number(layawayMetrics?.totalReceivable || 0).toLocaleString()}
                                </h4>
                                <span className="text-xs text-slate-500 font-medium block">Uncollected Receivables</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-sm">
                                <Wallet size={20} />
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="space-y-1">
                                <div className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white">{layawayMetrics?.activeCount || 0}</span> Active Customer Plans
                                </div>
                                <div className="text-emerald-600 font-semibold">
                                    +UGX {Number(layawayMetrics?.todayCollections || 0).toLocaleString()} Paid Today
                                </div>
                            </div>
                            <Link 
                                href="/layaways" 
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors"
                                title="View Layaway Plans"
                            >
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </Card>

                    {/* Repairs & Services */}
                    <Card className="relative overflow-hidden group hover:border-amber-500/40 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                                    Repairs & Workshop
                                </span>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {repairMetrics?.activeCount || 0} <span className="text-sm font-semibold text-slate-500">Tickets</span>
                                </h4>
                                <span className="text-xs text-slate-500 font-medium block">In Queue / Diagnosing</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shadow-sm">
                                <Wrench size={20} />
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="space-y-1">
                                <div className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white">{repairMetrics?.completedToday || 0}</span> Finished Today
                                </div>
                                <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                    +UGX {Number(repairMetrics?.todayRevenue || 0).toLocaleString()} Collected Today
                                </div>
                            </div>
                            <Link 
                                href="/repairs" 
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg transition-colors"
                                title="View Repairs Workshop"
                            >
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </Card>

                    {/* Cash Drawer & Till Shifts */}
                    <Card className="relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block mb-1">
                                    Till Shifts & Expenses
                                </span>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {shiftMetrics?.activeDrawersCount || 0} <span className="text-sm font-semibold text-slate-500">Open Shift(s)</span>
                                </h4>
                                <span className="text-xs text-slate-500 font-medium block">Active Cash Registers</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-300 flex items-center justify-center shadow-sm">
                                <Banknote size={20} />
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="space-y-1">
                                <div className="text-slate-600 dark:text-slate-300">
                                    Expenses Today: <span className="font-bold text-rose-600">UGX {Number(shiftMetrics?.todayExpenses || 0).toLocaleString()}</span>
                                </div>
                                <div className="text-emerald-600 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Register Audited
                                </div>
                            </div>
                            <Link 
                                href="/cash-drawer" 
                                className="p-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 rounded-lg transition-colors"
                                title="View Cash Drawer Shifts"
                            >
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 7-Day Revenue Trend */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">7-Day Revenue Trend</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.6}/>
                                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `UGX ${(val/1000)}k`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <Tooltip 
                                        formatter={(value) => [`UGX ${value.toLocaleString()}`, 'Sales']} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }} 
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#F43F5E" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, strokeWidth: 0, fill: '#1E293B' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Top Selling Brands */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <PieChartIcon size={20} className="text-rose-500" /> Top Selling Brands
                        </h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        activeIndex={activeIndex}
                                        activeShape={renderActiveShape}
                                        onMouseEnter={onPieEnter}
                                        data={topBrands}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {topBrands.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => [`${value} items`, 'Sales']} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                                        cursor={false}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {topBrands.map((brand, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="font-medium text-slate-600">{brand.name}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <Card noPadding className="overflow-hidden mb-28">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Clock size={20} className="text-rose-500" /> Recent Transactions
                    </h3>
                    {recentSales?.length > 0 && (
                        <Link href="/receipts" className="text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors">
                            View All <ArrowRight size={16} />
                        </Link>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <div className="w-56 mx-auto text-left">Customer</div>
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <div className="w-36 mx-auto text-left">Amount</div>
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <div className="w-24 mx-auto text-center">Status</div>
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <div className="w-32 mx-auto text-left">Time</div>
                                </th>
                                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <div className="w-40 mx-auto text-left">Cashier</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentSales?.length > 0 ? recentSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3 w-56 mx-auto whitespace-nowrap">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                                                <User size={18} />
                                            </div>
                                            <span className="font-semibold text-slate-900 text-left">{sale.customer_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="w-36 mx-auto font-bold text-slate-900 text-left whitespace-nowrap">
                                            {Number(sale.amount).toLocaleString()} UGX
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="w-24 mx-auto text-center whitespace-nowrap">
                                            {sale.payment_status === 'Refunded' ? (
                                                <Badge variant="danger">Refunded</Badge>
                                            ) : sale.payment_status === 'Partial' ? (
                                                <Badge variant="warning">Partial</Badge>
                                            ) : (
                                                <Badge variant="success">Paid</Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="w-32 mx-auto text-left whitespace-nowrap">
                                            <Badge variant="neutral">{sale.time}</Badge>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2 w-40 mx-auto whitespace-nowrap">
                                            <img 
                                                src={sale.cashier_photo} 
                                                alt={sale.cashier}
                                                className="w-6 h-6 rounded-full object-cover shadow-sm border border-slate-200 shrink-0"
                                            />
                                            <span className="text-slate-600 text-sm font-medium text-left">{sale.cashier}</span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <ShoppingCart size={40} className="mb-4 text-slate-300" />
                                            <p className="font-medium text-slate-600">No recent sales.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Gemini AI Floating Assistant - Styled to match SaaS */}
            {isMinimized ? (
                <button 
                    onClick={() => setIsMinimized(false)}
                    className="fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-2xl shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
                    title="Open SmartPOS AI"
                >
                    <Sparkles size={24} className="text-amber-300 group-hover:rotate-12 transition-transform" />
                </button>
            ) : (
                <div 
                    className="fixed bottom-0 right-4 shadow-2xl rounded-t-2xl overflow-hidden bg-white border border-slate-200/60 border-b-0 z-50 transition-all duration-300 ease-in-out flex flex-col" 
                    style={{ 
                        width: isExpanded ? '460px' : '380px',
                        height: isExpanded ? '600px' : '500px'
                    }}
                >
                {/* AI Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <Sparkles size={18} className="text-amber-300" />
                        </div>
                        <div>
                            <h6 className="mb-0 font-bold text-sm tracking-wide">SmartPOS AI</h6>
                            <p className="text-[11px] text-indigo-100 font-medium m-0 leading-tight">Store Assistant & Analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-md hover:bg-white/10 text-indigo-100 hover:text-white transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                            <Maximize2 size={16} />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-white/10 text-indigo-100 hover:text-white transition-colors" onClick={() => setIsMinimized(!isMinimized)}>
                            <Minimize2 size={16} />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-rose-500/80 text-indigo-100 hover:text-white transition-colors" onClick={() => setMessages([{ role: 'assistant', text: "👋 Chat reset. What would you like to ask?", time: 'Just now' }])}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                <>
                    {/* Chat Body */}
                        <div className="flex-1 p-4 bg-slate-50/50 overflow-y-auto">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="mr-3 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                                            <Bot size={16} />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                                        <div className={`p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                            msg.role === 'user' 
                                                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'
                                        }`}>
                                            {renderFormattedText(msg.text)}
                                        </div>
                                        <div className={`text-[10px] text-slate-400 mt-1 font-medium ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            {msg.time}
                                        </div>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="ml-3 w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-sm mt-1 order-3">
                                            <User size={16} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="flex mb-4 items-end gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm flex items-center gap-1.5 h-10">
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Prompts */}
                        <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                            <button className="whitespace-nowrap px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors" onClick={() => handleSend("Which phones are low on stock?")}>
                                ⚡ Low Stock
                            </button>
                            <button className="whitespace-nowrap px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors" onClick={() => handleSend("Give me today's sales summary")}>
                                📊 Sales Summary
                            </button>
                            <button className="whitespace-nowrap px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors" onClick={() => handleSend("How many active repairs do we have?")}>
                                🛠️ Active Repairs
                            </button>
                            <button className="whitespace-nowrap px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors" onClick={() => handleSend("What are our overdue dealer items?")}>
                                🤝 Overdue Dealers
                            </button>
                            <button className="whitespace-nowrap px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors" onClick={() => handleSend("What is our total layaway balance?")}>
                                💰 Layaway Balances
                            </button>
                            <button className="whitespace-nowrap px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors" onClick={() => handleSend("What is our total inventory value?")}>
                                📱 Stock Value
                            </button>
                        </div>

                        {/* Input Footer */}
                        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0 rounded-b-2xl">
                            <input 
                                type="text" 
                                className="flex-1 bg-slate-100 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded-xl px-4 py-2.5 text-sm transition-all outline-none text-slate-700 placeholder:text-slate-400" 
                                placeholder="Message SmartPOS AI..." 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                disabled={loading}
                            />
                            <button 
                                className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-indigo-600/20 shrink-0"
                                onClick={() => handleSend()} 
                                disabled={loading || !prompt.trim()}
                            >
                                <Send size={18} className="ml-1" />
                            </button>
                        </div>
                    </>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
