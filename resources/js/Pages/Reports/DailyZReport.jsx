import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import toast from 'react-hot-toast';
import {
    Printer,
    FileText,
    MessageCircle,
    ArrowLeft,
    Copy,
    Check,
    TrendingUp,
    Wallet,
    Smartphone,
    Banknote,
    ShieldCheck,
} from 'lucide-react';
import { buildDailyZReportMessage, openWhatsApp } from '@/Utils/whatsapp';

export default function DailyZReport({ report, settings = {} }) {
    const [format, setFormat] = useState('a4'); // 'thermal' | 'a4'
    const [copied, setCopied] = useState(false);
    const [ownerPhone, setOwnerPhone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('smartpos_owner_whatsapp') || '';
        }
        return '';
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const storeName = settings?.shop_name || 'SmartPOS';
    const storeAddress = settings?.shop_address || '';
    const storePhone = settings?.shop_phone || '';
    const storeLogo = settings?.store_logo || null;
    const currency = settings?.currency_symbol || 'UGX';

    const fmt = (val) => `${currency} ${Number(val || 0).toLocaleString()}`;

    const handleDateChange = (newDate) => {
        if (!newDate) return;
        router.get(route('reports.daily-z-report.page'), { date: newDate }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleOwnerPhoneChange = (val) => {
        setOwnerPhone(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem('smartpos_owner_whatsapp', val);
        }
    };

    const handlePrintThermal = () => {
        setFormat('thermal');
        setTimeout(() => window.print(), 120);
    };

    const handlePrintA4 = () => {
        setFormat('a4');
        setTimeout(() => window.print(), 120);
    };

    const handleSendWhatsApp = () => {
        const msg = buildDailyZReportMessage(report, settings);
        openWhatsApp(ownerPhone, msg);
    };

    const handleCopy = async () => {
        const msg = buildDailyZReportMessage(report, settings);
        try {
            await navigator.clipboard.writeText(msg);
            setCopied(true);
            toast.success('Daily Z-Report copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    const activeWallets = (report?.wallets || []).filter(w => Number(w.current_balance) > 0);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 print:bg-white print:p-0">
            <Head title={`Daily Z-Report — ${report?.formatted_date || ''}`} />

            <style>{`
                @media print {
                    @page {
                        size: ${format === 'thermal' ? '80mm auto' : 'A4 portrait'};
                        margin: ${format === 'thermal' ? '2mm' : '12mm'};
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

            {/* ── TOP ACTION TOOLBAR (Matched to POS/Receipt.jsx) ─────────────── */}
            <div className="no-print max-w-2xl mx-auto mb-6 space-y-3">
                {/* Format Toggle Pill + Date Picker */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <div className="inline-flex items-center p-1 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setFormat('thermal')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                format === 'thermal'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Printer size={13} /> 80mm Thermal Slip
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormat('a4')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                format === 'a4'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <FileText size={13} /> Official A4 Z-Report
                        </button>
                    </div>

                    <input
                        type="date"
                        value={report?.date || todayStr}
                        max={todayStr}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                        type="button"
                        onClick={handlePrintThermal}
                        className="font-bold py-2.5 px-4 rounded-xl shadow-sm border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-2 text-sm cursor-pointer"
                    >
                        <Printer size={16} /> Print Thermal (80mm)
                    </button>

                    <button
                        type="button"
                        onClick={handlePrintA4}
                        className="font-bold py-2.5 px-4 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 text-sm cursor-pointer"
                    >
                        <FileText size={16} className="text-slate-600 dark:text-slate-300" /> Print A4 Report
                    </button>

                    <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="font-bold py-2.5 px-4 rounded-xl shadow-sm border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-2 text-sm cursor-pointer"
                    >
                        <MessageCircle size={16} /> WhatsApp
                    </button>

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="font-bold py-2.5 px-3.5 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                        {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>

                    <Link
                        href="/dashboard"
                        className="font-bold py-2.5 px-4 rounded-xl shadow-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm"
                    >
                        <ArrowLeft size={15} /> Dashboard
                    </Link>
                </div>

                {/* Optional Owner WhatsApp Input */}
                <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Owner WhatsApp #:</span>
                        <input
                            type="text"
                            value={ownerPhone}
                            onChange={(e) => handleOwnerPhoneChange(e.target.value)}
                            placeholder="e.g. 0772123456 (optional)"
                            className="border-0 bg-transparent p-0 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-0 w-44"
                        />
                    </div>
                </div>
            </div>

            {/* ── 80MM THERMAL Z-REPORT VIEW ───────────────────────────────────── */}
            {format === 'thermal' && (
                <div className="mx-auto w-full max-w-[340px] bg-white text-slate-900 rounded-2xl shadow-xl p-6 font-mono text-[11px] leading-relaxed print:shadow-none print:rounded-none print:max-w-none print:p-2">
                    <div className="text-center pb-3 border-b border-dashed border-slate-300">
                        {storeLogo && (
                            <img src={storeLogo} alt={storeName} className="h-12 mx-auto mb-2 object-contain" />
                        )}
                        <div className="text-sm font-black uppercase tracking-wider">{storeName}</div>
                        {storeAddress && <div className="text-[10px] text-slate-600">{storeAddress}</div>}
                        {storePhone && <div className="text-[10px] text-slate-600">Tel: {storePhone}</div>}
                        <div className="mt-2 font-black text-xs uppercase tracking-widest border-y border-slate-900 py-1">
                            DAILY Z-REPORT
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1">{report?.formatted_date}</div>
                    </div>

                    <div className="py-3 border-b border-dashed border-slate-300 space-y-1">
                        <div className="flex justify-between"><span>Sales Count:</span><span className="font-bold">{report?.sales_count || 0}</span></div>
                        <div className="flex justify-between"><span>Total Revenue:</span><span className="font-bold">{fmt(report?.total_revenue)}</span></div>
                        <div className="flex justify-between"><span>COGS:</span><span>{fmt(report?.cogs)}</span></div>
                        <div className="flex justify-between"><span>Gross Profit:</span><span className="font-bold">{fmt(report?.gross_profit)}</span></div>
                        <div className="flex justify-between"><span>Op. Expenses:</span><span>-{fmt(report?.operating_expenses)}</span></div>
                        {Number(report?.refunds || 0) > 0 && (
                            <div className="flex justify-between"><span>Refunds:</span><span>-{fmt(report?.refunds)}</span></div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t border-slate-300 text-xs font-black">
                            <span>NET PROFIT:</span>
                            <span>{fmt(report?.net_profit)}</span>
                        </div>
                    </div>

                    <div className="py-3 border-b border-dashed border-slate-300 space-y-1">
                        <div className="font-bold uppercase text-[10px] mb-1">Payment Breakdown</div>
                        {report?.payment_breakdown?.length > 0 ? (
                            report.payment_breakdown.map((p, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{p.method}</span>
                                    <span className="font-bold">{fmt(p.amount)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-slate-500 italic">No payments collected</div>
                        )}
                    </div>

                    {report?.phones_sold?.length > 0 && (
                        <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5">
                            <div className="font-bold uppercase text-[10px]">Phones Sold ({report.phones_sold.length})</div>
                            {report.phones_sold.map((ph, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between font-bold">
                                        <span className="truncate pr-2">{ph.name}</span>
                                        <span>{fmt(ph.price)}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-500">IMEI: {ph.imei} (#{ph.sale_id})</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="py-3 border-b border-dashed border-slate-300 space-y-1">
                        <div className="font-bold uppercase text-[10px] mb-1">Business Liquid Cash</div>
                        {activeWallets.map((w) => (
                            <div key={w.id} className="flex justify-between text-[10px]">
                                <span>{w.name}</span>
                                <span>{fmt(w.current_balance)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-black">
                            <span>TOTAL LIQUID:</span>
                            <span>{fmt(report?.business_liquid_cash)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                            <span>Active Layaways Due:</span>
                            <span>{fmt(report?.active_layaways_balance)}</span>
                        </div>
                    </div>

                    {report?.shifts?.length > 0 && (
                        <div className="py-3 border-b border-dashed border-slate-300 space-y-1">
                            <div className="font-bold uppercase text-[10px] mb-1">Cash Drawer Shifts</div>
                            {report.shifts.map((sh) => (
                                <div key={sh.id} className="flex justify-between text-[10px]">
                                    <span>#{sh.id} {sh.cashier} ({sh.status})</span>
                                    {sh.status === 'closed' && (
                                        <span className="font-bold">{sh.variance >= 0 ? '+' : ''}{fmt(sh.variance)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-3 text-center text-[9px] text-slate-500">
                        <div>Printed: {new Date().toLocaleString()}</div>
                        <div className="font-bold mt-0.5">SmartPOS Owner Z-Report</div>
                    </div>
                </div>
            )}

            {/* ── OFFICIAL A4 Z-REPORT VIEW ────────────────────────────────────── */}
            {format === 'a4' && (
                <div className="mx-auto w-full max-w-[820px] bg-white text-slate-900 rounded-2xl shadow-xl p-8 sm:p-10 print:shadow-none print:rounded-none print:max-w-none print:p-0">
                    {/* Executive Header */}
                    <div className="flex items-start justify-between gap-4 pb-6 mb-6 border-b-2 border-slate-900">
                        <div className="flex items-center gap-4">
                            {storeLogo && (
                                <img src={storeLogo} alt={storeName} className="h-14 w-14 object-contain rounded-xl border border-slate-200 p-1 bg-white" />
                            )}
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{storeName}</h1>
                                {storeAddress && <p className="text-xs text-slate-600 mt-0.5">{storeAddress}</p>}
                                {storePhone && <p className="text-xs text-slate-600">Tel: {storePhone}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase tracking-wider">
                                <TrendingUp size={13} /> Daily Owner Brief (Z-Report)
                            </div>
                            <div className="text-sm font-black text-slate-900 mt-2">{report?.formatted_date}</div>
                            <div className="text-[11px] text-slate-500">Generated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>

                    {/* 4 Core KPI Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
                        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Total Revenue</div>
                            <div className="text-lg font-black text-slate-900 mt-1">{fmt(report?.total_revenue)}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-medium">{report?.sales_count || 0} sale(s)</div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Gross Profit</div>
                            <div className="text-lg font-black text-slate-900 mt-1">{fmt(report?.gross_profit)}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-medium">COGS: {fmt(report?.cogs)}</div>
                        </div>

                        <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Op. Expenses</div>
                            <div className="text-lg font-black text-slate-900 mt-1">{fmt(report?.operating_expenses)}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-medium">Refunds: {fmt(report?.refunds)}</div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-900 text-white">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Net Profit</div>
                            <div className={`text-lg font-black mt-1 ${Number(report?.net_profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {fmt(report?.net_profit)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{report?.formatted_date}</div>
                        </div>
                    </div>

                    {/* Payment Breakdown & Liquid Cash */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                                <Banknote size={14} className="text-indigo-600" /> Payment Breakdown
                            </h3>
                            {report?.payment_breakdown?.length > 0 ? (
                                <div className="space-y-2">
                                    {report.payment_breakdown.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/70 last:border-0">
                                            <span className="font-semibold text-slate-700">{p.method}</span>
                                            <span className="font-black text-slate-900">{fmt(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No payments collected on this date.</p>
                            )}
                        </div>

                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                                <Wallet size={14} className="text-emerald-600" /> Business Liquid Cash
                            </h3>
                            <div className="text-xl font-black text-emerald-600 mb-3">
                                {fmt(report?.business_liquid_cash)}
                            </div>
                            <div className="space-y-1.5">
                                {activeWallets.map((w) => (
                                    <div key={w.id} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600">{w.name}</span>
                                        <span className="font-bold text-slate-900">{fmt(w.current_balance)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                                <span className="font-bold text-amber-600">Active Layaways Due:</span>
                                <span className="font-black text-amber-600">{fmt(report?.active_layaways_balance)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Phones Sold Table */}
                    {report?.phones_sold?.length > 0 && (
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 mb-6">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                                <Smartphone size={14} className="text-purple-600" /> Phones Sold ({report.phones_sold.length})
                            </h3>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                                        <th className="py-2 text-left">Device</th>
                                        <th className="py-2 text-left">IMEI</th>
                                        <th className="py-2 text-left">Receipt</th>
                                        <th className="py-2 text-right">Sale Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/70">
                                    {report.phones_sold.map((ph, idx) => (
                                        <tr key={idx}>
                                            <td className="py-2 font-bold text-slate-900">{ph.name}</td>
                                            <td className="py-2 font-mono text-slate-600">{ph.imei}</td>
                                            <td className="py-2 font-mono text-slate-600">#{ph.sale_id}</td>
                                            <td className="py-2 text-right font-black text-slate-900">{fmt(ph.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Cash Drawer Shifts */}
                    {report?.shifts?.length > 0 && (
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 mb-6">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
                                <ShieldCheck size={14} className="text-sky-600" /> Cash Drawer Shifts ({report.shifts.length})
                            </h3>
                            <div className="space-y-2">
                                {report.shifts.map((sh) => (
                                    <div key={sh.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/70 last:border-0">
                                        <span className="font-bold text-slate-800">
                                            Shift #{sh.id} — {sh.cashier}
                                            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                sh.status === 'open'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {sh.status}
                                            </span>
                                        </span>
                                        {sh.status === 'closed' ? (
                                            <span className={`font-black ${sh.variance === 0 ? 'text-emerald-600' : sh.variance > 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                                                Variance: {sh.variance >= 0 ? '+' : ''}{fmt(sh.variance)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 font-medium">Opening: {fmt(sh.starting_cash)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{storeName} — Official Daily Z-Report</span>
                        <span>Printed: {new Date().toLocaleString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
