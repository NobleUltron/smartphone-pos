import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Barcode from 'react-barcode';
import {
    Printer,
    ArrowLeft,
    Search,
    CheckSquare,
    Square,
    Tag,
    Grid3X3,
    StickyNote,
    Smartphone,
} from 'lucide-react';

export default function LabelStudio({ devices = [], preselectedIds = [], settings = {} }) {
    const shopName = settings?.shop_name || 'SmartPOS';
    const currency = settings?.currency_symbol || 'UGX';

    const [layout, setLayout] = useState('a4'); // 'a4' | 'thermal'
    const [copies, setCopies] = useState(1);
    const [showPrice, setShowPrice] = useState(true);
    const [showShopName, setShowShopName] = useState(true);
    const [showSpecs, setShowSpecs] = useState(true);
    const [search, setSearch] = useState('');

    // Default selection: preselectedIds if provided, otherwise all 'In Stock' devices
    const [selectedIds, setSelectedIds] = useState(() => {
        if (preselectedIds.length > 0) return preselectedIds;
        return devices.filter(d => d.status === 'In Stock').map(d => d.id);
    });

    const filteredDevices = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return devices;
        return devices.filter(d =>
            (d.title || '').toLowerCase().includes(q) ||
            (d.imei || '').toLowerCase().includes(q) ||
            (d.storage || '').toLowerCase().includes(q) ||
            (d.color || '').toLowerCase().includes(q)
        );
    }, [devices, search]);

    const toggleId = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllInStock = () => {
        setSelectedIds(devices.filter(d => d.status === 'In Stock').map(d => d.id));
    };

    const clearSelection = () => setSelectedIds([]);

    // Expand selected devices by number of copies
    const printableLabels = useMemo(() => {
        const chosen = devices.filter(d => selectedIds.includes(d.id));
        const list = [];
        chosen.forEach(dev => {
            for (let c = 0; c < copies; c++) {
                list.push({ ...dev, _copyKey: `${dev.id}-${c}` });
            }
        });
        return list;
    }, [devices, selectedIds, copies]);

    const handlePrint = () => {
        if (printableLabels.length === 0) return;
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 print:bg-white print:p-0">
            <Head title="IMEI Barcode Label Studio" />

            <style>{`
                @media print {
                    @page {
                        size: ${layout === 'thermal' ? '50mm 30mm' : 'A4 portrait'};
                        margin: ${layout === 'thermal' ? '1mm' : '8mm'};
                    }
                    html, body {
                        background: #ffffff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .thermal-label-page {
                        page-break-after: always;
                        break-after: page;
                        width: 48mm !important;
                        height: 28mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 auto !important;
                    }
                    .thermal-label-page:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                }
            `}</style>

            {/* ── TOP STUDIO CONTROLS (Hidden on Print) ───────────────────────── */}
            <div className="no-print max-w-5xl mx-auto mb-6 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Tag size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                    IMEI Barcode Label Studio
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Print scannable box &amp; shelf stickers for your serialized smartphones
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={printableLabels.length === 0}
                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <Printer size={15} />
                                Print {printableLabels.length} Label{printableLabels.length === 1 ? '' : 's'}
                            </button>
                            <Link
                                href="/inventory"
                                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                                <ArrowLeft size={14} /> Inventory
                            </Link>
                        </div>
                    </div>

                    {/* Layout + Toggles Row */}
                    <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                        {/* Format Switcher */}
                        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setLayout('a4')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    layout === 'a4'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Grid3X3 size={14} /> A4 Sticker Sheet (3×7)
                            </button>
                            <button
                                type="button"
                                onClick={() => setLayout('thermal')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    layout === 'thermal'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <StickyNote size={14} /> 50×30mm Thermal Roll
                            </button>
                        </div>

                        {/* Display Toggles */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showPrice}
                                    onChange={(e) => setShowPrice(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Show Price
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showShopName}
                                    onChange={(e) => setShowShopName(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Store Name
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showSpecs}
                                    onChange={(e) => setShowSpecs(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Specs &amp; Grade
                            </label>

                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Copies:</span>
                                {[1, 2, 3].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setCopies(n)}
                                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                                            copies === n
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {n}×
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Device Selector Panel */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="relative flex-1 min-w-[220px] max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filter devices by model, IMEI, storage..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <span className="text-slate-500 dark:text-slate-400">
                                {selectedIds.length} of {devices.length} selected
                            </span>
                            <button
                                type="button"
                                onClick={selectAllInStock}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                            >
                                All In-Stock
                            </button>
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {filteredDevices.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                            {filteredDevices.map((dev) => {
                                const isChecked = selectedIds.includes(dev.id);
                                return (
                                    <button
                                        key={dev.id}
                                        type="button"
                                        onClick={() => toggleId(dev.id)}
                                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                            isChecked
                                                ? 'bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        {isChecked ? (
                                            <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                        ) : (
                                            <Square size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {dev.title}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                                {dev.imei}
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] font-semibold text-slate-500">
                                                    {[dev.storage, dev.color].filter(Boolean).join(' • ') || dev.condition}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    dev.status === 'In Stock'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                }`}>
                                                    {dev.status}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                            No devices match your filter.
                        </div>
                    )}
                </div>
            </div>

            {/* ── PRINTABLE LABELS PREVIEW ────────────────────────────────────── */}
            {printableLabels.length === 0 ? (
                <div className="no-print max-w-md mx-auto py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Smartphone size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No devices selected</p>
                    <p className="text-xs text-slate-400 mt-1">Select one or more phones above to preview and print labels.</p>
                </div>
            ) : layout === 'a4' ? (
                /* A4 3-Column Sticker Sheet */
                <div className="mx-auto max-w-[820px] bg-white text-slate-900 rounded-2xl shadow-xl p-6 print:shadow-none print:rounded-none print:max-w-none print:p-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-3 print:gap-2">
                        {printableLabels.map((lbl) => (
                            <div
                                key={lbl._copyKey}
                                className="border border-dashed border-slate-300 print:border-slate-400 rounded-lg p-2.5 flex flex-col items-center justify-between text-center bg-white break-inside-avoid"
                            >
                                <div className="w-full flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                    <span className="truncate">{showShopName ? shopName : ''}</span>
                                    {showSpecs && (
                                        <span className="px-1 py-0.2 bg-slate-100 text-slate-700 rounded shrink-0">
                                            {lbl.condition}
                                        </span>
                                    )}
                                </div>

                                <div className="text-[11px] font-black text-slate-900 leading-tight truncate w-full">
                                    {lbl.title}
                                </div>

                                {showSpecs && (lbl.storage || lbl.color) && (
                                    <div className="text-[9px] font-semibold text-slate-600 truncate w-full">
                                        {[lbl.storage, lbl.color].filter(Boolean).join(' • ')}
                                    </div>
                                )}

                                <div className="my-1 flex justify-center w-full overflow-hidden">
                                    <Barcode
                                        value={String(lbl.imei)}
                                        format="CODE128"
                                        width={1.15}
                                        height={28}
                                        fontSize={9}
                                        margin={0}
                                        background="#ffffff"
                                        lineColor="#0f172a"
                                    />
                                </div>

                                {showPrice && lbl.price > 0 && (
                                    <div className="text-xs font-black text-slate-900 tracking-tight border-t border-slate-200 pt-1 w-full">
                                        {currency} {Number(lbl.price).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* 50×30mm Thermal Roll Labels */
                <div className="flex flex-col items-center gap-4 print:gap-0">
                    {printableLabels.map((lbl) => (
                        <div
                            key={lbl._copyKey}
                            className="thermal-label-page w-[220px] bg-white text-slate-900 rounded-xl shadow-md border border-slate-200 p-2.5 flex flex-col items-center justify-between text-center"
                        >
                            {showShopName && (
                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-700 truncate w-full">
                                    {shopName}
                                </div>
                            )}

                            <div className="text-[10px] font-black text-slate-900 leading-tight truncate w-full">
                                {lbl.title}
                            </div>

                            {showSpecs && (
                                <div className="text-[8px] font-bold text-slate-600 truncate w-full">
                                    {[lbl.storage, lbl.color, lbl.condition].filter(Boolean).join(' • ')}
                                </div>
                            )}

                            <div className="my-0.5 flex justify-center w-full overflow-hidden">
                                <Barcode
                                    value={String(lbl.imei)}
                                    format="CODE128"
                                    width={1.0}
                                    height={24}
                                    fontSize={8}
                                    margin={0}
                                    background="#ffffff"
                                    lineColor="#000000"
                                />
                            </div>

                            {showPrice && lbl.price > 0 && (
                                <div className="text-[11px] font-black text-slate-900 leading-none">
                                    {currency} {Number(lbl.price).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
