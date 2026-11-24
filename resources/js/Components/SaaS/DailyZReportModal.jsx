import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import toast from 'react-hot-toast';
import {
    X,
    Calendar,
    RefreshCw,
    MessageCircle,
    Copy,
    Printer,
    TrendingUp,
    Wallet,
    Smartphone,
    Banknote,
    ShieldCheck,
    Check,
} from 'lucide-react';
import { buildDailyZReportMessage, openWhatsApp } from '@/Utils/whatsapp';

export default function DailyZReportModal({ show, onClose }) {
    const { store_settings: storeSettings } = usePage().props;
    const todayStr = new Date().toISOString().slice(0, 10);

    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [ownerPhone, setOwnerPhone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('smartpos_owner_whatsapp') || '';
        }
        return '';
    });

    const fetchReport = async (dateVal) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/reports/daily-z-report', {
                params: { date: dateVal },
            });
            setReport(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load Daily Z-Report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchReport(selectedDate);
        }
    }, [show, selectedDate]);

    const handleOwnerPhoneChange = (val) => {
        setOwnerPhone(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem('smartpos_owner_whatsapp', val);
        }
    };

    const handleSendWhatsApp = () => {
        if (!report) return;
        const msg = buildDailyZReportMessage(report, storeSettings);
        openWhatsApp(ownerPhone, msg);
    };

    const handleCopy = async () => {
        if (!report) return;
        const msg = buildDailyZReportMessage(report, storeSettings);
        try {
            await navigator.clipboard.writeText(msg);
            setCopied(true);
            toast.success('Daily Z-Report copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    const handlePrint = () => {
        if (!report) return;
        const storeName = storeSettings?.store_name || 'SmartPOS';
        const storeAddress = storeSettings?.store_address || '';
        const storePhone = storeSettings?.store_phone || '';

        const paymentsHtml = report.payment_breakdown?.length
            ? report.payment_breakdown.map(p => `<tr><td>${p.method}</td><td class="num">${fmt(p.amount)}</td></tr>`).join('')
            : `<tr><td colspan="2" class="muted">No payments collected on this date.</td></tr>`;

        const walletsHtml = (report.wallets || []).filter(w => Number(w.current_balance) > 0)
            .map(w => `<tr><td>${w.name}</td><td class="num">${fmt(w.current_balance)}</td></tr>`).join('');

        const phonesHtml = report.phones_sold?.length
            ? `<div class="section">
                <h3>Phones Sold (${report.phones_sold.length})</h3>
                <table><thead><tr><th>Device</th><th>IMEI</th><th>Receipt</th><th class="num">Price</th></tr></thead>
                <tbody>${report.phones_sold.map(ph => `<tr><td>${ph.name}</td><td class="mono">${ph.imei}</td><td>#${ph.sale_id}</td><td class="num">${fmt(ph.price)}</td></tr>`).join('')}</tbody></table>
               </div>`
            : '';

        const shiftsHtml = report.shifts?.length
            ? `<div class="section">
                <h3>Cash Drawer Shifts (${report.shifts.length})</h3>
                <table><thead><tr><th>Shift</th><th>Cashier</th><th>Status</th><th class="num">Variance</th></tr></thead>
                <tbody>${report.shifts.map(sh => `<tr><td>#${sh.id}</td><td>${sh.cashier}</td><td>${sh.status.toUpperCase()}</td><td class="num">${sh.status === 'closed' ? (sh.variance >= 0 ? '+' : '') + fmt(sh.variance) : '—'}</td></tr>`).join('')}</tbody></table>
               </div>`
            : '';

        const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Daily Z-Report - ${report.formatted_date}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 28px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
  .header p { margin: 3px 0 0; font-size: 12px; color: #475569; }
  .badge { text-align: right; }
  .badge .title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; }
  .badge .date { font-size: 12px; color: #334155; margin-top: 3px; font-weight: 600; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
  .kpi.dark { background: #0f172a; color: #fff; border-color: #0f172a; }
  .kpi .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .kpi.dark .lbl { color: #94a3b8; }
  .kpi .val { font-size: 16px; font-weight: 800; margin-top: 4px; }
  .kpi.dark .val { color: #34d399; }
  .kpi .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .kpi.dark .sub { color: #cbd5e1; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
  .section { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
  .section h3 { margin: 0 0 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; text-align: left; }
  th { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .num { text-align: right; font-weight: 700; }
  .mono { font-family: monospace; font-size: 11px; }
  .muted { color: #94a3b8; font-style: italic; }
  .total-row td { border-top: 1.5px solid #cbd5e1; border-bottom: none; padding-top: 8px; font-weight: 800; color: #059669; }
  .layaway-row td { border-bottom: none; color: #d97706; font-weight: 700; }
  .footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${storeName}</h1>
      ${storeAddress ? `<p>${storeAddress}</p>` : ''}
      ${storePhone ? `<p>Tel: ${storePhone}</p>` : ''}
    </div>
    <div class="badge">
      <div class="title">Daily Owner Brief (Z-Report)</div>
      <div class="date">${report.formatted_date}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="lbl">Total Revenue</div><div class="val">${fmt(report.total_revenue)}</div><div class="sub">${report.sales_count} sale(s)</div></div>
    <div class="kpi"><div class="lbl">Gross Profit</div><div class="val">${fmt(report.gross_profit)}</div><div class="sub">COGS: ${fmt(report.cogs)}</div></div>
    <div class="kpi"><div class="lbl">Op. Expenses</div><div class="val">${fmt(report.operating_expenses)}</div><div class="sub">Refunds: ${fmt(report.refunds)}</div></div>
    <div class="kpi dark"><div class="lbl">Net Profit</div><div class="val">${fmt(report.net_profit)}</div><div class="sub">${report.formatted_date}</div></div>
  </div>

  <div class="grid2">
    <div class="section" style="margin-bottom:0">
      <h3>Payment Breakdown</h3>
      <table><tbody>${paymentsHtml}</tbody></table>
    </div>
    <div class="section" style="margin-bottom:0">
      <h3>Business Liquid Cash</h3>
      <table>
        <tbody>
          ${walletsHtml}
          <tr class="total-row"><td>Total Liquid Cash</td><td class="num">${fmt(report.business_liquid_cash)}</td></tr>
          <tr class="layaway-row"><td>Active Layaways Due</td><td class="num">${fmt(report.active_layaways_balance)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  ${phonesHtml}
  ${shiftsHtml}

  <div class="footer">
    <span>Generated via SmartPOS</span>
    <span>Printed: ${new Date().toLocaleString()}</span>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            toast.error('Please allow pop-ups to print the Z-Report');
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
    };

    const fmt = (val) => `UGX ${Number(val || 0).toLocaleString()}`;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl max-h-[88vh] overflow-y-auto">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                Daily Owner Brief (Z-Report)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                End-of-day sales, profit, payment split &amp; cash position
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={selectedDate}
                            max={todayStr}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={() => fetchReport(selectedDate)}
                            disabled={loading}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {loading && !report ? (
                    <div className="py-16 text-center text-slate-400 text-sm font-medium">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-500" />
                        Generating Daily Z-Report...
                    </div>
                ) : report ? (
                    <div className="space-y-5">
                        {/* 4 Core KPI Tiles */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/70 dark:border-indigo-500/20">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Total Revenue
                                </div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                                    {fmt(report.total_revenue)}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                    {report.sales_count} sale(s)
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Gross Profit
                                </div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                                    {fmt(report.gross_profit)}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                    COGS: {fmt(report.cogs)}
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-500/10 border border-rose-200/70 dark:border-rose-500/20">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                    Op. Expenses
                                </div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                                    {fmt(report.operating_expenses)}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                    Refunds: {fmt(report.refunds)}
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                    Net Profit
                                </div>
                                <div className={`text-base font-black mt-1 ${Number(report.net_profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {fmt(report.net_profit)}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                    {report.formatted_date}
                                </div>
                            </div>
                        </div>

                        {/* Payment Breakdown & Liquid Cash */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">
                                    <Banknote size={14} className="text-indigo-500" /> Payment Breakdown
                                </h4>
                                {report.payment_breakdown?.length > 0 ? (
                                    <div className="space-y-2">
                                        {report.payment_breakdown.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-600 dark:text-slate-300">{p.method}</span>
                                                <span className="font-black text-slate-900 dark:text-white">{fmt(p.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No payments collected on this date.</p>
                                )}
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">
                                    <Wallet size={14} className="text-emerald-500" /> Business Liquid Cash
                                </h4>
                                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mb-2">
                                    {fmt(report.business_liquid_cash)}
                                </div>
                                <div className="space-y-1">
                                    {(report.wallets || []).filter(w => Number(w.current_balance) > 0).map((w) => (
                                        <div key={w.id} className="flex items-center justify-between text-[11px]">
                                            <span className="text-slate-500 dark:text-slate-400">{w.name}</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{fmt(w.current_balance)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[11px]">
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">Active Layaways Due:</span>
                                    <span className="font-black text-amber-600 dark:text-amber-400">{fmt(report.active_layaways_balance)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Phones Sold */}
                        {report.phones_sold?.length > 0 && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2.5">
                                    <Smartphone size={14} className="text-purple-500" /> Phones Sold ({report.phones_sold.length})
                                </h4>
                                <div className="divide-y divide-slate-200/70 dark:divide-slate-700/70 max-h-40 overflow-y-auto">
                                    {report.phones_sold.map((ph, idx) => (
                                        <div key={idx} className="py-1.5 flex items-center justify-between text-xs gap-2">
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{ph.name}</div>
                                                <div className="text-[10px] font-mono text-slate-400">IMEI: {ph.imei} • Receipt #{ph.sale_id}</div>
                                            </div>
                                            <span className="font-black text-slate-900 dark:text-white shrink-0">{fmt(ph.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cash Drawer Shifts */}
                        {report.shifts?.length > 0 && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                                    <ShieldCheck size={14} className="text-sky-500" /> Cash Drawer Shifts ({report.shifts.length})
                                </h4>
                                <div className="space-y-1.5">
                                    {report.shifts.map((sh) => (
                                        <div key={sh.id} className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                Shift #{sh.id} — {sh.cashier}
                                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    sh.status === 'open'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {sh.status}
                                                </span>
                                            </span>
                                            {sh.status === 'closed' && (
                                                <span className={`font-black ${sh.variance === 0 ? 'text-emerald-600' : sh.variance > 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                                                    Variance: {sh.variance >= 0 ? '+' : ''}{fmt(sh.variance)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Owner WhatsApp Number + Action Bar */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1 max-w-xs">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                    Owner WhatsApp # (Optional — remembered)
                                </label>
                                <input
                                    type="text"
                                    value={ownerPhone}
                                    onChange={(e) => handleOwnerPhoneChange(e.target.value)}
                                    placeholder="e.g. 0772123456 (or leave blank)"
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                                />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap sm:self-end">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                                >
                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    {copied ? 'Copied' : 'Copy Text'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                                >
                                    <Printer size={14} /> Print
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendWhatsApp}
                                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                                >
                                    <MessageCircle size={15} /> Send to WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
}
