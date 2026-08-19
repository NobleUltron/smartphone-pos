import React from 'react';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import { Sparkles, TrendingUp, Clock, AlertTriangle, Lightbulb, ArrowUpRight, Zap, ShieldCheck, CheckCircle2, ChevronRight, MessageSquareCode, ArrowRight, Bot, Smartphone, Activity } from 'lucide-react';

export default function AiSalesAnalytics({ 
    todaySales = 0, 
    inStockCount = 0,
    activeRepairsCount = 0, 
    completedRepairsToday = 0,
    lowStockCount = 0, 
    inventoryValue = 0,
    salesData = [],
    onAskAi = null 
}) {
    // 1. Calculate 7-day average sales from salesData
    const validSales = salesData?.filter(d => typeof d.sales === 'number') || [];
    const avgWeeklySales = validSales.length > 0
        ? Math.round(validSales.reduce((acc, curr) => acc + curr.sales, 0) / validSales.length)
        : 0;

    const salesVelocityPercent = avgWeeklySales > 0 && todaySales > 0
        ? Math.round(((todaySales - avgWeeklySales) / avgWeeklySales) * 100)
        : 0;

    // 2. Dynamic Inventory Health Calculation
    const totalInventoryCount = inStockCount + lowStockCount;
    const inventoryHealthPercent = totalInventoryCount > 0
        ? Math.max(10, Math.min(100, Math.round((inStockCount / totalInventoryCount) * 100)))
        : (inStockCount > 0 ? 100 : 0);

    // 3. Contextual Dynamic AI Insight
    let dynamicInsight = {
        title: "AI Shop Status",
        text: "Store initialized and running smoothly. Check quick prompts below to inspect real-time inventory and workbench metrics.",
        type: "neutral",
        badge: "Status Normal"
    };

    if (inStockCount === 0 && todaySales === 0) {
        dynamicInsight = {
            title: "Store Setup & Testing Mode",
            text: "Database is fresh with zero active transactions. Ready for serialized phone intake and opening today's cashier shift.",
            type: "info",
            badge: "Setup Mode"
        };
    } else if (lowStockCount > 0) {
        dynamicInsight = {
            title: "Inventory Reorder Alert",
            text: `${lowStockCount} product models are running below safe stock levels. Review low stock inventory to prevent missed customer sales.`,
            type: "warning",
            badge: "Action Advised"
        };
    } else if (activeRepairsCount > 3) {
        dynamicInsight = {
            title: "High Workbench Volume",
            text: `${activeRepairsCount} repair tickets are active on the technician workbench. Prioritize customer diagnostic updates to maintain 5-star turnaround times.`,
            type: "notice",
            badge: "Workbench Priority"
        };
    } else if (todaySales > 0) {
        dynamicInsight = {
            title: "Revenue Velocity",
            text: `Shop generated UGX ${Number(todaySales).toLocaleString()} today. Strong sales momentum observed.`,
            type: "success",
            badge: "Positive Momentum"
        };
    }

    const quickChips = [
        { label: "📋 Today's Summary", prompt: "Give me a complete summary of today's sales, stock levels, and repair workbench status." },
        { label: "⚠️ Low Stock Breakdown", prompt: "Which product items or phones are currently low on stock and need reordering?" },
        { label: "🔧 Repair Queue Status", prompt: "What is the status of active customer repairs and technician turnaround today?" },
        { label: "💡 How to Boost Sales", prompt: "Suggest 3 actionable sales & accessory promotion tips for smartphone and repair shops." }
    ];

    const handleChipClick = (prompt) => {
        if (typeof onAskAi === 'function') {
            onAskAi(prompt);
        }
    };

    return (
        <div className="relative rounded-3xl p-6 bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/30 border border-indigo-200/60 shadow-xl shadow-indigo-500/5 transition-all duration-300 overflow-hidden group">
            {/* Ambient Background Decorative Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl -mb-20 pointer-events-none"></div>

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-200/80 relative z-10">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-500/10">
                        <Sparkles size={22} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                SmartPOS AI Copilot
                            </h3>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                Executive Intelligence
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                            Real-time inventory velocity, repair diagnostics, and shop performance analysis
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>AI Engine Online</span>
                    </div>
                </div>
            </div>

            {/* 3 Core Metric Pillar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 relative z-10">
                {/* Pillar 1: Inventory Health */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] uppercase font-extrabold text-slate-600 tracking-wider flex items-center gap-1.5">
                            <Smartphone size={14} className="text-indigo-500" /> Stock Health Index
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {inStockCount > 0 ? `${inStockCount} Phones in Stock` : '0 Stock Units'}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2.5 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-700 ${lowStockCount > 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                            style={{ width: `${inventoryHealthPercent}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                        {lowStockCount > 0 ? (
                            <span className="text-amber-800 font-bold flex items-center gap-1">
                                <AlertTriangle size={13} /> {lowStockCount} item(s) below reorder threshold
                            </span>
                        ) : (
                            <span className="text-emerald-800 font-bold flex items-center gap-1">
                                <CheckCircle2 size={13} /> Stock levels healthy & balanced
                            </span>
                        )}
                    </p>
                </div>

                {/* Pillar 2: Repairs Throughput */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] uppercase font-extrabold text-slate-600 tracking-wider flex items-center gap-1.5">
                            <Zap size={14} className="text-rose-500" /> Workbench Velocity
                        </span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            {activeRepairsCount} Active
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-xl font-black text-slate-900">{activeRepairsCount}</span>
                        <span className="text-xs text-slate-600 font-medium">tickets in progress</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-emerald-700">{completedRepairsToday} ready</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                        {activeRepairsCount > 0 
                            ? 'Diagnostics & repairs actively assigned to technicians.' 
                            : 'All customer repair jobs cleared & delivered.'}
                    </p>
                </div>

                {/* Pillar 3: Sales Momentum */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] uppercase font-extrabold text-slate-600 tracking-wider flex items-center gap-1.5">
                            <Activity size={14} className="text-emerald-500" /> Daily Revenue Momentum
                        </span>
                        {salesVelocityPercent !== 0 && (
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${salesVelocityPercent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                {salesVelocityPercent >= 0 ? `+${salesVelocityPercent}%` : `${salesVelocityPercent}%`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                        <span className="text-xl font-black text-slate-900">{Number(todaySales).toLocaleString()}</span>
                        <span className="text-xs font-bold text-slate-600">UGX</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                        {todaySales > 0 
                            ? `7-day avg: UGX ${avgWeeklySales.toLocaleString()}` 
                            : 'Awaiting first register transaction of the day.'}
                    </p>
                </div>
            </div>

            {/* Smart Contextual Insight Banner */}
            <div className="p-4 rounded-2xl bg-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-10 shadow-lg shadow-indigo-950/20">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-700 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                        <Lightbulb size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">{dynamicInsight.title}</span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/10 text-slate-200">{dynamicInsight.badge}</span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1 leading-relaxed font-medium">
                            {dynamicInsight.text}
                        </p>
                    </div>
                </div>

                {typeof onAskAi === 'function' && (
                    <button
                        type="button"
                        onClick={() => onAskAi("Analyze current store performance and provide 3 key recommendations.")}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
                    >
                        <Bot size={15} />
                        <span>Ask SmartPOS AI</span>
                        <ArrowRight size={14} />
                    </button>
                )}
            </div>

            {/* Quick-Prompt Interactive Action Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-2 relative z-10">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 mr-1">
                    <MessageSquareCode size={13} className="text-indigo-500" /> Quick Inquiries:
                </span>
                {quickChips.map((chip, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => handleChipClick(chip.prompt)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 group/chip"
                    >
                        <span>{chip.label}</span>
                        <ChevronRight size={12} className="text-slate-400 group-hover/chip:text-indigo-600 transition-transform group-hover/chip:translate-x-0.5" />
                    </button>
                ))}
            </div>
        </div>
    );
}
