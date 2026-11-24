import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Printer,
    FileSpreadsheet,
    ArrowLeft,
    TrendingUp,
    Calendar,
    Building2,
} from 'lucide-react';

export default function ProfitLoss({ pnl, settings = {} }) {
    const [dateFrom, setDateFrom] = useState(pnl?.date_from || '');
    const [dateTo, setDateTo] = useState(pnl?.date_to || '');

    const storeName = settings?.shop_name || 'SmartPOS';
    const storeLogo = settings?.store_logo || null;
    const storeAddress = settings?.shop_address || '';
    const storePhone = settings?.shop_phone || '';
    const storeEmail = settings?.shop_email || '';
    const tinNumber = settings?.tin_number || '';
    const currency = settings?.currency_symbol || 'UGX';

    const fmt = (val) => `${currency} ${Number(val || 0).toLocaleString()}`;

    const applyPreset = (preset) => {
        router.get(route('reports.profit-loss'), { preset }, { preserveScroll: true });
    };

    const applyCustomRange = (e) => {
        e.preventDefault();
        if (!dateFrom && !dateTo) return;
        router.get(route('reports.profit-loss'), { date_from: dateFrom, date_to: dateTo }, { preserveScroll: true });
    };

    const exportUrl = pnl?.preset === 'custom'
        ? `/reports/profit-loss/export?date_from=${encodeURIComponent(pnl.date_from)}&date_to=${encodeURIComponent(pnl.date_to)}`
        : `/reports/profit-loss/export?preset=${encodeURIComponent(pnl?.preset || 'this_month')}`;

    const presets = [
        { key: 'this_month', label: 'This Month' },
        { key: 'last_month', label: 'Last Month' },
        { key: 'this_quarter', label: 'This Quarter' },
        { key: 'this_year', label: 'This Year' },
        { key: 'all', label: 'All Time' },
    ];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 print:bg-white print:p-0">
            <Head title={`Profit & Loss Statement — ${pnl?.period_label || ''}`} />

            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm;
                    }
                    html, body {
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* ── TOP CONTROLS BAR (Hidden on Print) ─────────────────────────── */}
            <div className="no-print max-w-[860px] mx-auto mb-6 space-y-3">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {presets.map((p) => (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => applyPreset(p.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        pnl?.preset === p.key
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                                <Printer size={15} /> Print / Save PDF
                            </button>
                            <a
                                href={exportUrl}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                            >
                                <FileSpreadsheet size={15} /> Export Excel (.csv)
                            </a>
                            <Link
                                href="/reports"
                                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
                            >
                                <ArrowLeft size={14} /> Reports
                            </Link>
                        </div>
                    </div>

                    <form onSubmit={applyCustomRange} className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar size={13} /> Custom Range:
                        </span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs"
                        />
                        <span className="text-slate-400 font-bold">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs"
                        />
                        <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                        >
                            Apply Dates
                        </button>
                    </form>
                </div>
            </div>

            {/* ── OFFICIAL EXECUTIVE A4 PROFIT & LOSS DOCUMENT ───────────────── */}
            <div className="mx-auto max-w-[860px] bg-white text-slate-900 rounded-2xl shadow-xl p-8 sm:p-10 print:shadow-none print:rounded-none print:max-w-none print:p-0">
                {/* Letterhead */}
                <div className="flex items-start justify-between gap-4 pb-6 mb-6 border-b-2 border-slate-900">
                    <div className="flex items-center gap-4">
                        {storeLogo && (
                            <img src={storeLogo} alt={storeName} className="h-14 w-14 object-contain rounded-xl border border-slate-200 p-1 bg-white" />
                        )}
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{storeName}</h1>
                            {storeAddress && <p className="text-xs text-slate-600 mt-0.5">{storeAddress}</p>}
                            <p className="text-xs text-slate-600">
                                {[storePhone ? `Tel: ${storePhone}` : null, storeEmail, tinNumber ? `TIN: ${tinNumber}` : null].filter(Boolean).join(' • ')}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase tracking-wider">
                            <TrendingUp size={13} /> Profit &amp; Loss Statement
                        </div>
                        <div className="text-sm font-black text-slate-900 mt-2">{pnl?.period_label}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                            {pnl?.date_from} to {pnl?.date_to}
                        </div>
                    </div>
                </div>

                {/* Top 4 Executive Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Revenue</div>
                        <div className="text-base font-black text-slate-900 mt-1">{fmt(pnl?.revenue?.net_revenue)}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{pnl?.sales_count || 0} completed sale(s)</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Gross Profit</div>
                        <div className="text-base font-black text-emerald-800 mt-1">{fmt(pnl?.gross_profit)}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">{pnl?.gross_margin_pct}% gross margin</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Operating Expenses</div>
                        <div className="text-base font-black text-rose-800 mt-1">{fmt(pnl?.expenses?.total_operating)}</div>
                        <div className="text-[11px] text-rose-700 mt-0.5">Excl. stock &amp; transfers</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">True Owner Net Profit</div>
                        <div className={`text-base font-black mt-1 ${Number(pnl?.true_owner_net_profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {fmt(pnl?.true_owner_net_profit)}
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">{pnl?.net_margin_pct}% net margin</div>
                    </div>
                </div>

                {/* Accounting Waterfall Table */}
                <table className="w-full text-xs border-collapse mb-8">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-[10px] uppercase tracking-wider text-slate-500">
                            <th className="py-2 text-left">Income Statement Line Item</th>
                            <th className="py-2 text-right">Amount ({currency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 1. REVENUE */}
                        <tr className="bg-slate-50">
                            <td colSpan="2" className="py-2 px-2 font-black uppercase tracking-wider text-[11px] text-indigo-700">
                                1. Revenue
                            </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="py-2 pl-4 text-slate-700">Direct POS Sales Revenue</td>
                            <td className="py-2 text-right font-semibold">{fmt(pnl?.revenue?.direct_sales)}</td>
                        </tr>
                        {Number(pnl?.revenue?.repair_sales || 0) > 0 && (
                            <tr className="border-b border-slate-100">
                                <td className="py-2 pl-4 text-slate-700">Repair Services Revenue</td>
                                <td className="py-2 text-right font-semibold">{fmt(pnl?.revenue?.repair_sales)}</td>
                            </tr>
                        )}
                        <tr className="border-b border-slate-100">
                            <td className="py-2 pl-4 text-slate-700">Layaway &amp; Installment Collections</td>
                            <td className="py-2 text-right font-semibold">{fmt(pnl?.revenue?.layaway_collections)}</td>
                        </tr>
                        {Number(pnl?.revenue?.invoice_collections || 0) > 0 && (
                            <tr className="border-b border-slate-100">
                                <td className="py-2 pl-4 text-slate-700">Credit Invoice Collections</td>
                                <td className="py-2 text-right font-semibold">{fmt(pnl?.revenue?.invoice_collections)}</td>
                            </tr>
                        )}
                        {Number(pnl?.revenue?.refunds || 0) > 0 && (
                            <tr className="border-b border-slate-100 text-rose-600">
                                <td className="py-2 pl-4">Less: Customer Refunds &amp; Returns</td>
                                <td className="py-2 text-right font-semibold">({fmt(pnl?.revenue?.refunds)})</td>
                            </tr>
                        )}
                        <tr className="border-b-2 border-slate-300 font-black text-slate-900">
                            <td className="py-2.5 pl-2">Net Revenue</td>
                            <td className="py-2.5 text-right">{fmt(pnl?.revenue?.net_revenue)}</td>
                        </tr>

                        {/* 2. COGS */}
                        <tr className="bg-slate-50">
                            <td colSpan="2" className="py-2 px-2 font-black uppercase tracking-wider text-[11px] text-indigo-700">
                                2. Cost of Goods Sold (COGS)
                            </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="py-2 pl-4 text-slate-700">Device Purchase Cost (Initial Cost Basis)</td>
                            <td className="py-2 text-right font-semibold">{fmt(pnl?.cogs?.device_purchase)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="py-2 pl-4 text-slate-700">Capitalized Refurbishment &amp; Repair Parts</td>
                            <td className="py-2 text-right font-semibold">{fmt(pnl?.cogs?.refurbishment)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="py-2 pl-4 text-slate-700">Bulk Accessories &amp; Parts Cost</td>
                            <td className="py-2 text-right font-semibold">{fmt(pnl?.cogs?.bulk_accessories)}</td>
                        </tr>
                        <tr className="border-b border-slate-300 font-bold text-slate-800">
                            <td className="py-2 pl-2">Total Cost of Goods Sold</td>
                            <td className="py-2 text-right">({fmt(pnl?.cogs?.total)})</td>
                        </tr>
                        <tr className="bg-emerald-50/70 border-b-2 border-emerald-300 font-black text-emerald-900 text-sm">
                            <td className="py-2.5 px-2">GROSS PROFIT ({pnl?.gross_margin_pct}% Margin)</td>
                            <td className="py-2.5 px-2 text-right">{fmt(pnl?.gross_profit)}</td>
                        </tr>

                        {/* 3. OPERATING EXPENSES */}
                        <tr className="bg-slate-50">
                            <td colSpan="2" className="py-2 px-2 font-black uppercase tracking-wider text-[11px] text-indigo-700">
                                3. Operating Expenses
                            </td>
                        </tr>
                        {pnl?.expenses?.by_category?.length > 0 ? (
                            pnl.expenses.by_category.map((exp, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                    <td className="py-2 pl-4 text-slate-700">
                                        {exp.category} <span className="text-slate-400">({exp.count})</span>
                                    </td>
                                    <td className="py-2 text-right font-semibold text-rose-700">{fmt(exp.amount)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr className="border-b border-slate-100">
                                <td className="py-2 pl-4 text-slate-400 italic">No operating expenses recorded in this period.</td>
                                <td className="py-2 text-right font-semibold text-slate-400">{fmt(0)}</td>
                            </tr>
                        )}
                        <tr className="border-b border-slate-300 font-bold text-rose-800">
                            <td className="py-2 pl-2">Total Operating Expenses</td>
                            <td className="py-2 text-right">({fmt(pnl?.expenses?.total_operating)})</td>
                        </tr>
                        <tr className="border-b-2 border-slate-300 font-black text-slate-900">
                            <td className="py-2.5 pl-2">Operating Profit (EBITDA — {pnl?.operating_margin_pct}%)</td>
                            <td className="py-2.5 text-right">{fmt(pnl?.operating_profit)}</td>
                        </tr>

                        {/* 4. PARTNER PROFIT ALLOCATION */}
                        <tr className="bg-slate-50">
                            <td colSpan="2" className="py-2 px-2 font-black uppercase tracking-wider text-[11px] text-indigo-700">
                                4. Partner &amp; Family Capital Profit Share
                            </td>
                        </tr>
                        {pnl?.partners?.breakdown?.length > 0 ? (
                            pnl.partners.breakdown.map((pb, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                    <td className="py-2 pl-4 text-slate-700">
                                        {pb.name} ({pb.share_pct}% share on {pb.units} device{pb.units === 1 ? '' : 's'})
                                    </td>
                                    <td className="py-2 text-right font-semibold text-purple-700">({fmt(pb.amount)})</td>
                                </tr>
                            ))
                        ) : (
                            <tr className="border-b border-slate-100">
                                <td className="py-2 pl-4 text-slate-400 italic">No partner profit share realized in this period.</td>
                                <td className="py-2 text-right font-semibold text-slate-400">{fmt(0)}</td>
                            </tr>
                        )}

                        {/* TRUE OWNER NET PROFIT */}
                        <tr className="bg-slate-900 text-white font-black text-sm">
                            <td className="py-3.5 px-3 rounded-bl-xl">TRUE OWNER NET PROFIT ({pnl?.net_margin_pct}% Net Margin)</td>
                            <td className={`py-3.5 px-3 text-right rounded-br-xl ${Number(pnl?.true_owner_net_profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {fmt(pnl?.true_owner_net_profit)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* 5. Balance Sheet Snapshot (For Bank Loan / URA Context) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-8">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                        <Building2 size={14} className="text-indigo-600" /> Current Financial Position Snapshot (As of Today)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Business Liquid Cash</div>
                            <div className="font-black text-emerald-700 mt-0.5">{fmt(pnl?.balance_sheet?.business_liquid_cash)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Inventory at Cost</div>
                            <div className="font-black text-slate-900 mt-0.5">{fmt(pnl?.balance_sheet?.inventory_value)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Customer Receivables</div>
                            <div className="font-black text-amber-700 mt-0.5">{fmt(pnl?.balance_sheet?.receivables)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Partner &amp; Supplier Owed</div>
                            <div className="font-black text-rose-700 mt-0.5">{fmt(pnl?.balance_sheet?.payables)}</div>
                        </div>
                    </div>
                </div>

                {/* Sign-Off Block for Accountants / Bank Officers */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
                    <div>
                        <div className="border-b border-slate-400 h-8 mb-1.5"></div>
                        <div className="font-bold text-slate-700">Prepared By (Manager / Accountant)</div>
                        <div className="text-[10px]">Date: {new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div className="border-b border-slate-400 h-8 mb-1.5"></div>
                        <div className="font-bold text-slate-700">Approved By (Business Owner / Director)</div>
                        <div className="text-[10px]">{storeName}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
