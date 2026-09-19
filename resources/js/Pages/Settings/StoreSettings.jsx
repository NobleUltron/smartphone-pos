import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { 
    Store, 
    Receipt as ReceiptIcon, 
    Save, 
    Plus, 
    Trash2, 
    CheckCircle, 
    Barcode as BarcodeIcon, 
    ShieldCheck, 
    Printer, 
    Wifi, 
    Usb, 
    Cpu, 
    RefreshCw, 
    Play, 
    Scissors, 
    DollarSign, 
    AlertTriangle, 
    ExternalLink, 
    Terminal,
    Check,
    Image as ImageIcon
} from 'lucide-react';
import Barcode from 'react-barcode';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import PageHeader from '@/Components/SaaS/PageHeader';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import QzTrayService from '@/Services/QzTrayService';
import ThermalPrintService from '@/Services/ThermalPrintService';
import toast from 'react-hot-toast';

export default function StoreSettings({ auth, settings, windowsPrinters = [] }) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        shop_name: settings?.shop_name || 'SmartPOS Kampala',
        shop_address: settings?.shop_address || '123 Kampala Road, Kampala',
        shop_phone: settings?.shop_phone || '+256 700 000 000',
        currency_symbol: settings?.currency_symbol || 'UGX',
        receipt_footer: settings?.receipt_footer || 'Thank you for shopping with us!',
        store_logo: null,
        terms_conditions: settings?.terms_conditions || [
            'Warranty claims strictly require presentation of this original tax invoice by the original purchaser.',
            'Device IMEI and serial number must match store records; damaged or removed warranty seals void coverage.',
            'Warranty strictly covers manufacturer hardware faults and component failure under normal recommended use.',
            'Physical impact, drops, cracked screens, casing pressure damage, or liquid intrusion void all warranty.',
            'Unauthorized third-party repair, unapproved casing disassembly, jailbreaking, or OS tampering voids warranty.',
            'Goods once inspected and accepted in good working condition are not refundable for cash.',
            'Batteries, power adapters, charging cables, and consumable accessories carry a limited 30-day warranty.',
            'All warranty assessment claims require a 24–72 hour diagnostic period prior to repair or replacement.',
        ],
        allow_cashier_discounts: settings?.allow_cashier_discounts ?? true,
        allow_cashier_price_overwrites: settings?.allow_cashier_price_overwrites ?? true,
        allow_cashier_dealer_intake: settings?.allow_cashier_dealer_intake ?? true,

        // Thermal Printing Configuration
        print_mode: settings?.print_mode || localStorage.getItem('smartpos_print_mode') || 'spooler',
        printer_paper_width: settings?.printer_paper_width || localStorage.getItem('smartpos_paper_width') || '80mm',
        printer_network_ip: settings?.printer_network_ip || localStorage.getItem('smartpos_network_ip') || '192.168.1.150',
        printer_network_port: settings?.printer_network_port || localStorage.getItem('smartpos_network_port') || 9100,
        qz_printer_name: settings?.qz_printer_name || localStorage.getItem('smartpos_qz_printer') || (windowsPrinters.find(p => p.toLowerCase().includes('pos') || p.toLowerCase().includes('receipt') || p.toLowerCase().includes('thermal')) || windowsPrinters[0] || 'E-PoS printer driver (1)'),
        printer_kick_drawer: settings?.printer_kick_drawer ?? (localStorage.getItem('smartpos_kick_drawer') === 'true'),
        printer_cut_paper: settings?.printer_cut_paper ?? (localStorage.getItem('smartpos_auto_cut') !== 'false'),
        printer_print_logo: settings?.printer_print_logo ?? (localStorage.getItem('smartpos_print_logo') !== 'false'),
    });

    const [newTerm, setNewTerm] = useState('');

    // QZ Tray connection state
    const [qzStatus, setQzStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
    const [qzVersion, setQzVersion] = useState('');
    const [qzPrinters, setQzPrinters] = useState([]);
    const [qzLoadingPrinters, setQzLoadingPrinters] = useState(false);
    const [qzError, setQzError] = useState('');

    // Testing and simulation states
    const [testPrinting, setTestPrinting] = useState(false);
    const [simModalOpen, setSimModalOpen] = useState(false);
    const [simData, setSimData] = useState(null);

    // Check QZ Tray connectivity on mount
    useEffect(() => {
        checkQzTrayConnection();
    }, []);

    const checkQzTrayConnection = async () => {
        setQzStatus('checking');
        setQzError('');
        try {
            const res = await QzTrayService.connect(1, 800);
            if (res.success) {
                setQzStatus('connected');
                setQzVersion(res.version || '2.x');
                loadPrinters();
            } else {
                setQzStatus('disconnected');
                setQzError(res.error || 'QZ Tray is not running');
            }
        } catch (e) {
            setQzStatus('disconnected');
            setQzError(e.message || 'Connection failed');
        }
    };

    const loadPrinters = async () => {
        setQzLoadingPrinters(true);
        try {
            const printers = await QzTrayService.getPrinters();
            setQzPrinters(printers);
            // If current printer not in list, but list has printers, suggest or select
            if (printers.length > 0 && !printers.includes(data.qz_printer_name)) {
                const match = printers.find(p => p.toLowerCase().includes('pos') || p.toLowerCase().includes('receipt') || p.toLowerCase().includes('thermal'));
                if (match) {
                    setData('qz_printer_name', match);
                }
            }
        } catch (e) {
            console.warn('Failed to fetch QZ printers:', e);
        } finally {
            setQzLoadingPrinters(false);
        }
    };

    const handleAddTerm = () => {
        if (!newTerm.trim()) return;
        setData('terms_conditions', [...data.terms_conditions, newTerm.trim()]);
        setNewTerm('');
    };

    const handleRemoveTerm = (index) => {
        const updated = data.terms_conditions.filter((_, i) => i !== index);
        setData('terms_conditions', updated);
    };

    const handleTermChange = (index, value) => {
        const updated = [...data.terms_conditions];
        updated[index] = value;
        setData('terms_conditions', updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Persist to localStorage for client-side instant print fallback
        localStorage.setItem('smartpos_print_mode', data.print_mode);
        localStorage.setItem('smartpos_paper_width', data.printer_paper_width);
        localStorage.setItem('smartpos_network_ip', data.printer_network_ip);
        localStorage.setItem('smartpos_network_port', data.printer_network_port);
        localStorage.setItem('smartpos_qz_printer', data.qz_printer_name);
        localStorage.setItem('smartpos_kick_drawer', data.printer_kick_drawer);
        localStorage.setItem('smartpos_auto_cut', data.printer_cut_paper);
        localStorage.setItem('smartpos_print_logo', data.printer_print_logo);

        post('/api/settings', {
            onSuccess: () => {
                toast.success('Store & Thermal Printer settings saved successfully!');
            }
        });
    };

    const handleTestPrint = async () => {
        setTestPrinting(true);
        try {
            const result = await ThermalPrintService.printTestReceipt({
                mode: data.print_mode,
                paper_width: data.printer_paper_width,
                printer_ip: data.printer_network_ip,
                printer_port: Number(data.printer_network_port) || 9100,
                qz_printer_name: data.qz_printer_name,
                kick_drawer: data.printer_kick_drawer,
                cut_paper: data.printer_cut_paper,
                print_logo: data.printer_print_logo,
            });

            if (result.simulated) {
                setSimData(result);
                setSimModalOpen(true);
                toast.success('Simulation generated!');
            } else {
                toast.success(result.message || 'Test print sent successfully!');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Test print failed');
        } finally {
            setTestPrinting(false);
        }
    };

    const handleTestCashDrawer = async () => {
        try {
            await ThermalPrintService.triggerCashDrawer(data.qz_printer_name);
            toast.success('Cash drawer kick pulse sent!');
        } catch (err) {
            toast.error('Drawer kick failed: ' + (err.message || 'Printer not ready'));
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Store Settings" />
            
            <PageHeader 
                title="Store & Receipt Customization"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Store Settings' }]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
                
                {/* Settings Form */}
                <div className="lg:col-span-7 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6" id="settingsForm">
                        
                        {/* Business Details */}
                        <Card>
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                                <Store size={20} className="text-pink-500" /> Business Details
                            </h3>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="shrink-0 flex flex-col gap-2">
                                        <label className="saas-label">Store Logo</label>
                                        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 relative group cursor-pointer hover:border-indigo-400 transition-colors">
                                            {data.store_logo ? (
                                                <img src={URL.createObjectURL(data.store_logo)} className="w-full h-full object-contain p-1" />
                                            ) : settings?.store_logo ? (
                                                <img src={settings.store_logo} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Store className="text-slate-300 w-10 h-10" />
                                            )}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => setData('store_logo', e.target.files[0])} />
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-end">
                                        <label className="saas-label">Shop Name</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            value={data.shop_name} 
                                            onChange={(e) => setData('shop_name', e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="saas-label">Phone Number</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            value={data.shop_phone} 
                                            onChange={(e) => setData('shop_phone', e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <label className="saas-label">Currency Symbol</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            value={data.currency_symbol} 
                                            onChange={(e) => setData('currency_symbol', e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="saas-label">Business Address</label>
                                    <input 
                                        type="text" 
                                        className="saas-input" 
                                        value={data.shop_address} 
                                        onChange={(e) => setData('shop_address', e.target.value)} 
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Thermal & ESC/POS Hardware Printing Card */}
                        <Card>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-2">
                                <div>
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Printer size={20} className="text-rose-500" /> Thermal Printer & ESC/POS Engine
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Direct raw hardware receipt printing without browser print dialogs
                                    </p>
                                </div>

                                {/* QZ Tray Live Status Indicator */}
                                {data.print_mode === 'qztray' && (
                                    <div className="flex items-center gap-2">
                                        {qzStatus === 'checking' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                <RefreshCw size={12} className="animate-spin text-amber-500" /> Checking QZ...
                                            </span>
                                        )}
                                        {qzStatus === 'connected' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                QZ Tray Connected {qzVersion && `(v${qzVersion})`}
                                            </span>
                                        )}
                                        {qzStatus === 'disconnected' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                <AlertTriangle size={12} className="text-rose-500" /> QZ Tray Offline
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Print Mode Selector */}
                                <div>
                                    <label className="saas-label mb-2">Printing Method / Mode</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        
                                        {/* Browser Thermal Option (Cloud & Universal) */}
                                        <div 
                                            onClick={() => setData('print_mode', 'browser')}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                                data.print_mode === 'browser'
                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <Printer size={18} className={data.print_mode === 'browser' ? 'text-indigo-600' : 'text-slate-500'} />
                                                    {data.print_mode === 'browser' && <Check size={16} className="text-indigo-600 font-bold" />}
                                                </div>
                                                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                                    Browser Thermal
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">Cloud & Local</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                                    Universal 80mm roll print dialog. Recommended for Cloud (Render) & mobile devices.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Direct Windows Spooler Option */}
                                        <div 
                                            onClick={() => setData('print_mode', 'spooler')}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                                data.print_mode === 'spooler'
                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <Usb size={18} className={data.print_mode === 'spooler' ? 'text-indigo-600' : 'text-slate-500'} />
                                                    {data.print_mode === 'spooler' && <Check size={16} className="text-indigo-600 font-bold" />}
                                                </div>
                                                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                                    Windows Spooler
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">Local PC</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                                    Direct raw ESC/POS via Winspool. Requires server and printer on the same Windows PC (XAMPP).
                                                </p>
                                            </div>
                                        </div>

                                        {/* Network Socket Option */}
                                        <div 
                                            onClick={() => setData('print_mode', 'network')}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                                data.print_mode === 'network'
                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <Wifi size={18} className={data.print_mode === 'network' ? 'text-indigo-600' : 'text-slate-500'} />
                                                    {data.print_mode === 'network' && <Check size={16} className="text-indigo-600 font-bold" />}
                                                </div>
                                                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                                    Network Socket
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">LAN</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                                    Direct TCP socket on port 9100 for network thermal printers on local LAN.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Dev Mock Option */}
                                        <div 
                                            onClick={() => setData('print_mode', 'mock')}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                                data.print_mode === 'mock'
                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <Terminal size={18} className={data.print_mode === 'mock' ? 'text-indigo-600' : 'text-slate-500'} />
                                                    {data.print_mode === 'mock' && <Check size={16} className="text-indigo-600 font-bold" />}
                                                </div>
                                                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                                    Dev Simulator
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">Testing</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                                    Simulates ESC/POS buffer in-browser for zero-hardware testing.
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Paper Roll Width */}
                                <div>
                                    <label className="saas-label mb-2">Paper Roll Width</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setData('printer_paper_width', '80mm')}
                                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                                data.printer_paper_width === '80mm'
                                                    ? 'border-rose-500 bg-rose-50/40 text-rose-900 font-bold'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="text-left">
                                                <span className="block text-xs font-extrabold">80mm Roll (Standard)</span>
                                                <span className="block text-[11px] opacity-75 font-normal">48 Characters / Line</span>
                                            </div>
                                            {data.printer_paper_width === '80mm' && <Check size={16} className="text-rose-600" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setData('printer_paper_width', '58mm')}
                                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                                data.printer_paper_width === '58mm'
                                                    ? 'border-rose-500 bg-rose-50/40 text-rose-900 font-bold'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="text-left">
                                                <span className="block text-xs font-extrabold">58mm Roll (Compact)</span>
                                                <span className="block text-[11px] opacity-75 font-normal">32 Characters / Line</span>
                                            </div>
                                            {data.printer_paper_width === '58mm' && <Check size={16} className="text-rose-600" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Mode-Specific Configuration Details */}
                                {data.print_mode === 'browser' && (
                                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-bold text-indigo-950">
                                                <Printer size={16} className="text-indigo-600" />
                                                Browser Thermal Printing (Recommended for Cloud / Render)
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle size={11} /> Universal Driverless
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            Thermal receipts open directly in your browser's print dialog, formatted for <strong>{data.printer_paper_width} roll width</strong> with zero margins. Since it uses your computer's native browser printer system, it works immediately with any USB thermal printer plugged into your PC without needing server-side Windows spoolers.
                                        </p>
                                    </div>
                                )}

                                {data.print_mode === 'spooler' && (
                                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="saas-label mb-0">Installed Windows / Thermal Printer</label>
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle size={12} /> Direct Spooler
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {windowsPrinters.length > 0 ? (
                                                <select
                                                    className="saas-input"
                                                    value={data.qz_printer_name}
                                                    onChange={e => setData('qz_printer_name', e.target.value)}
                                                >
                                                    {windowsPrinters.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="saas-input"
                                                    value={data.qz_printer_name}
                                                    onChange={e => setData('qz_printer_name', e.target.value)}
                                                    placeholder="e.g. E-PoS printer driver (1)"
                                                />
                                            )}
                                            <span className="text-[11px] text-slate-500 block">
                                                Detected printers on this host. Select your thermal printer (e.g. <code>E-PoS printer driver (1)</code>).
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {data.print_mode === 'qztray' && (
                                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="saas-label mb-0">Windows / System Printer Target</label>
                                            <button
                                                type="button"
                                                onClick={checkQzTrayConnection}
                                                disabled={qzLoadingPrinters}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                            >
                                                <RefreshCw size={12} className={qzLoadingPrinters ? 'animate-spin' : ''} /> Rescan Printers
                                            </button>
                                        </div>

                                        {qzStatus === 'disconnected' && (
                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                                                <div className="font-bold flex items-center gap-1.5">
                                                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                                                    QZ Tray is not running on this computer
                                                </div>
                                                <p className="text-[11px] leading-relaxed">
                                                    To print directly to your USB thermal printer without browser dialogs, QZ Tray must be running in the background.
                                                </p>
                                                <div className="pt-1">
                                                    <a 
                                                        href="https://qz.io/download/" 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors"
                                                    >
                                                        Download Free QZ Tray <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {qzPrinters.length > 0 ? (
                                                <select
                                                    className="saas-input"
                                                    value={data.qz_printer_name}
                                                    onChange={e => setData('qz_printer_name', e.target.value)}
                                                >
                                                    {qzPrinters.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="saas-input"
                                                    value={data.qz_printer_name}
                                                    onChange={e => setData('qz_printer_name', e.target.value)}
                                                    placeholder="e.g. E-PoS printer driver (1)"
                                                />
                                            )}
                                            <span className="text-[11px] text-slate-500 block">
                                                Exact printer name registered in Windows Control Panel / Settings.
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {data.print_mode === 'network' && (
                                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-2">
                                                <label className="saas-label">Printer IP Address</label>
                                                <input
                                                    type="text"
                                                    className="saas-input"
                                                    placeholder="192.168.1.150"
                                                    value={data.printer_network_ip}
                                                    onChange={e => setData('printer_network_ip', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="saas-label">Port</label>
                                                <input
                                                    type="number"
                                                    className="saas-input"
                                                    placeholder="9100"
                                                    value={data.printer_network_port}
                                                    onChange={e => setData('printer_network_port', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-slate-500 block">
                                            Standard ESC/POS thermal printers listen for raw byte streams on TCP port 9100.
                                        </span>
                                    </div>
                                )}

                                {data.print_mode === 'mock' && (
                                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 text-xs text-indigo-900 space-y-2">
                                        <div className="font-bold flex items-center gap-1.5">
                                            <Terminal size={15} className="text-indigo-600" />
                                            Developer Simulator Mode Active
                                        </div>
                                        <p className="text-[11px] text-indigo-700 leading-relaxed">
                                            Print jobs will not be sent to physical hardware. Instead, the backend ESC/POS command stream will be decoded into an ASCII text preview and displayed in an interactive modal.
                                        </p>
                                    </div>
                                )}

                                {/* Hardware Options */}
                                <div className="space-y-3 pt-1">
                                    <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                        <div>
                                            <span className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <DollarSign size={14} className="text-emerald-600" /> Kick Cash Drawer on Receipt Print
                                            </span>
                                            <span className="block text-[11px] text-slate-500">
                                                Send standard ESC/POS pulse signal (Pin 2) to trigger cash drawer pop.
                                            </span>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            checked={data.printer_kick_drawer}
                                            onChange={e => setData('printer_kick_drawer', e.target.checked)}
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                        <div>
                                            <span className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <Scissors size={14} className="text-blue-600" /> Auto Cut Paper After Receipt
                                            </span>
                                            <span className="block text-[11px] text-slate-500">
                                                Send hardware partial cut command at completion of print.
                                            </span>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            checked={data.printer_cut_paper}
                                            onChange={e => setData('printer_cut_paper', e.target.checked)}
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                        <div>
                                            <span className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <ImageIcon size={14} className="text-pink-600" /> Print Store Logo on Receipt
                                            </span>
                                            <span className="block text-[11px] text-slate-500">
                                                Automatically render and print your uploaded store logo centered at the top.
                                            </span>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            checked={data.printer_print_logo}
                                            onChange={e => setData('printer_print_logo', e.target.checked)}
                                        />
                                    </label>
                                </div>

                                {/* Hardware Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleTestPrint}
                                        isLoading={testPrinting}
                                        icon={Play}
                                        className="text-xs"
                                    >
                                        Execute Test Print
                                    </Button>

                                    {(data.print_mode === 'spooler' || (data.print_mode === 'qztray' && qzStatus === 'connected')) && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleTestCashDrawer}
                                            icon={DollarSign}
                                            className="text-xs text-emerald-700 hover:text-emerald-800"
                                        >
                                            Test Drawer Kick
                                        </Button>
                                    )}
                                </div>

                            </div>
                        </Card>

                        {/* Thermal Receipt Content Customization */}
                        <Card>
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                                <ReceiptIcon size={20} className="text-indigo-500" /> Receipt Text & Policy Customization
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="saas-label">Receipt Footer Note</label>
                                    <input 
                                        type="text" 
                                        className="saas-input" 
                                        value={data.receipt_footer} 
                                        onChange={(e) => setData('receipt_footer', e.target.value)} 
                                        placeholder="Thank you for shopping with us!"
                                    />
                                </div>

                                <div>
                                    <label className="saas-label mb-3">Terms & Conditions Rules</label>
                                    <div className="space-y-3 mb-4">
                                        {data.terms_conditions.map((term, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                                    {index + 1}
                                                </span>
                                                <input 
                                                    type="text" 
                                                    className="saas-input flex-1" 
                                                    value={term} 
                                                    onChange={(e) => handleTermChange(index, e.target.value)} 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveTerm(index)}
                                                    className="w-10 h-10 shrink-0 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                                                    title="Remove Rule"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="text" 
                                            className="saas-input flex-1" 
                                            placeholder="Add new terms & conditions rule..." 
                                            value={newTerm} 
                                            onChange={(e) => setNewTerm(e.target.value)} 
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTerm())}
                                        />
                                        <Button type="button" variant="secondary" onClick={handleAddTerm} icon={Plus}>
                                            Add Rule
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Cashier Permissions & Security Control */}
                        <Card>
                            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <ShieldCheck size={20} className="text-rose-500" /> Cashier Role Permissions & Security
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Fine-tune cashier capabilities to enforce security and prevent unauthorized discounts or price modifications.
                            </p>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900">Allow Custom Cashier Discounts</span>
                                        <span className="block text-[11px] text-slate-500">Permit cashiers to enter manual discounts during POS checkout.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={data.allow_cashier_discounts}
                                        onChange={e => setData('allow_cashier_discounts', e.target.checked)}
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900">Allow Item Price Overwrites</span>
                                        <span className="block text-[11px] text-slate-500">Permit cashiers to override selling prices on individual items.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={data.allow_cashier_price_overwrites}
                                        onChange={e => setData('allow_cashier_price_overwrites', e.target.checked)}
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900">Allow Inward Dealer Stock Intake</span>
                                        <span className="block text-[11px] text-slate-500">Permit cashiers to receive items from partner dealers into shop inventory.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={data.allow_cashier_dealer_intake}
                                        onChange={e => setData('allow_cashier_dealer_intake', e.target.checked)}
                                    />
                                </label>
                            </div>
                        </Card>

                        <div className="flex items-center justify-end gap-4">
                            {recentlySuccessful && (
                                <span className="text-emerald-600 flex items-center gap-1.5 font-medium text-sm animate-fade-in">
                                    <CheckCircle size={16} /> Settings saved successfully!
                                </span>
                            )}
                            <Button type="submit" variant="primary" form="settingsForm" isLoading={processing} icon={Save}>
                                Save All Settings
                            </Button>
                        </div>
                    </form>

                </div>

                {/* Live Receipt Preview */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24">
                        <div className="flex items-center justify-between mb-4 ml-2 mr-1">
                            <h4 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Live Receipt Preview</h4>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                {data.printer_paper_width} • {data.print_mode === 'spooler' ? 'Windows Spooler' : data.print_mode === 'network' ? 'TCP Socket' : data.print_mode === 'qztray' ? 'QZ Tray' : 'Simulator'}
                            </span>
                        </div>
                        
                        <div 
                            className={`rounded-2xl shadow-2xl p-5 mx-auto font-mono text-sm relative overflow-hidden transition-all duration-300 ${
                                data.printer_paper_width === '58mm' ? 'max-w-[280px]' : 'max-w-[360px]'
                            }`}
                            style={{ backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0' }}
                        >
                            {/* Receipt Top Edge decoration */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIGZpbGw9IiNmMThmNmY2IiBwb2ludHM9IjAsMCA4LDAgNCw4Ii8+PC9zdmc+')] bg-repeat-x -mt-1"></div>
                            
                            <div className="text-center mb-5 pt-4 flex flex-col items-center">
                                {data.store_logo ? (
                                    <img src={URL.createObjectURL(data.store_logo)} alt="Store Logo Preview" className="max-w-[140px] max-h-[70px] object-contain mb-2" />
                                ) : settings?.store_logo ? (
                                    <img src={settings.store_logo} alt="Store Logo Preview" className="max-w-[140px] max-h-[70px] object-contain mb-2" />
                                ) : (
                                    <div className="w-10 h-10 border border-slate-900 flex items-center justify-center mb-2 rounded-lg">
                                        <Store size={20} style={{ color: '#0F172A' }} />
                                    </div>
                                )}
                                <h1 className="font-extrabold text-base leading-tight uppercase tracking-wider mb-1" style={{ color: '#0F172A' }}>
                                    {data.shop_name || 'SmartPOS Kampala'}
                                </h1>
                                <div className="text-xs leading-tight font-medium" style={{ color: '#475569' }}>
                                    <p>{data.shop_address || '123 Kampala Road'}</p>
                                    <p>Tel: {data.shop_phone || '+256 700 000 000'}</p>
                                </div>
                            </div>

                            <div className="border-b border-dashed border-slate-300 pb-3 mb-3 text-xs space-y-1.5" style={{ color: '#334155' }}>
                                <div className="flex justify-between"><span className="font-bold">Receipt #:</span> <span>1042</span></div>
                                <div className="flex justify-between"><span className="font-bold">Date:</span> <span>{new Date().toLocaleDateString()}</span></div>
                                <div className="flex justify-between"><span className="font-bold">Cashier:</span> <span>Demo Admin</span></div>
                            </div>

                            <table className="w-full text-xs mb-4">
                                <thead>
                                    <tr className="border-b border-dashed border-slate-300" style={{ color: '#64748B' }}>
                                        <th className="text-left pb-2 font-semibold uppercase tracking-wider">Item</th>
                                        <th className="text-right pb-2 font-semibold uppercase tracking-wider">Price</th>
                                    </tr>
                                </thead>
                                <tbody style={{ color: '#0F172A' }}>
                                    <tr>
                                        <td className="py-2 pr-2">
                                            <div className="font-bold text-xs">Apple iPhone 15 Pro</div>
                                            <div className="text-[10px] font-mono" style={{ color: '#64748B' }}>IMEI: 354892109845231</div>
                                        </td>
                                        <td className="py-2 text-right align-top font-bold text-xs">4,200,000</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="border-t border-dashed border-slate-300 pt-3 flex justify-between font-black text-sm mb-5" style={{ color: '#0F172A' }}>
                                <span>Total:</span>
                                <span>4,200,000 {data.currency_symbol}</span>
                            </div>

                            <div className="text-center border-t border-dashed border-slate-300 pt-4">
                                <p className="font-extrabold text-xs mb-3" style={{ color: '#0F172A' }}>
                                    {data.receipt_footer || 'Thank you for shopping with us!'}
                                </p>
                                
                                {data.terms_conditions?.length > 0 && (
                                    <div 
                                        className="rounded-xl p-3 text-left mb-4 border"
                                        style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                                    >
                                        <strong className="text-[10px] uppercase font-extrabold tracking-wider block mb-1.5" style={{ color: '#475569' }}>
                                            Terms & Conditions:
                                        </strong>
                                        <ol className="list-decimal pl-4 space-y-1 text-[11px] font-medium" style={{ color: '#334155' }}>
                                            {data.terms_conditions.map((term, i) => (
                                                <li key={i}>{term}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center pt-2">
                                <Barcode value="SALE-1042" width={1.2} height={40} fontSize={10} displayValue={true} />
                            </div>
                            
                            {/* Receipt Bottom Edge decoration */}
                            <div className="absolute bottom-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIGZpbGw9IiNmMThmNmY2IiBwb2ludHM9IjAsOCA4LDggNCwwIi8+PC9zdmc+')] bg-repeat-x -mb-1"></div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Dev Simulator Modal */}
            <Modal show={simModalOpen} onClose={() => setSimModalOpen(false)} maxWidth="lg">
                <div className="p-6 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Terminal size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">ESC/POS Simulator Preview</h3>
                                <p className="text-xs text-slate-500">
                                    Simulated thermal paper output ({simData?.byte_count || 0} bytes generated)
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setSimModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                    </div>

                    <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[460px] whitespace-pre shadow-inner">
                        {simData?.preview_text || 'No preview generated.'}
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                        <Button 
                            variant="secondary" 
                            onClick={() => {
                                navigator.clipboard.writeText(simData?.preview_text || '');
                                toast.success('Receipt text copied to clipboard!');
                            }}
                        >
                            Copy ASCII Text
                        </Button>
                        <Button variant="primary" onClick={() => setSimModalOpen(false)}>
                            Close Preview
                        </Button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
