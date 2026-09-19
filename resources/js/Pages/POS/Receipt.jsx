import React, { useEffect, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Barcode from 'react-barcode';
import { 
    Printer, 
    Download, 
    RefreshCw, 
    AlertCircle, 
    Terminal, 
    Check, 
    FileText,
    ExternalLink,
    Store,
    ShieldCheck,
    ArrowLeft
} from 'lucide-react';
import ThermalPrintService from '@/Services/ThermalPrintService';
import Modal from '@/Components/Modal';
import Button from '@/Components/SaaS/Button';
import toast from 'react-hot-toast';

export default function Receipt({ sale, settings }) {
    const isPreview = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).has('preview') : false;
    const receiptRef = useRef(null);
    const a4Ref = useRef(null);

    // Format selection: 'thermal' (80mm POS slip) or 'a4' (Official Tax Invoice)
    const [format, setFormat] = useState('thermal');

    const [isPrinting, setIsPrinting] = useState(false);
    const [printError, setPrintError] = useState(null);
    const [printSuccess, setPrintSuccess] = useState(false);
    const [simModalOpen, setSimModalOpen] = useState(false);
    const [simText, setSimText] = useState('');
    const [pageHeightMm, setPageHeightMm] = useState(130);

    const measureReceiptHeight = () => {
        if (receiptRef.current) {
            // 1 CSS pixel = 0.264583 mm at 96 DPI
            const measuredMm = Math.ceil(receiptRef.current.offsetHeight * 0.264583) + 6;
            setPageHeightMm(Math.max(60, measuredMm));
            return Math.max(60, measuredMm);
        }
        return 130;
    };

    useEffect(() => {
        if (format === 'thermal') {
            measureReceiptHeight();
            const timer = setTimeout(measureReceiptHeight, 300);
            return () => clearTimeout(timer);
        }
    }, [sale, format]);

    // Browser Print for A4 Invoice
    const handleA4BrowserPrint = () => {
        setFormat('a4');
        setTimeout(() => {
            window.print();
        }, 120);
    };

    // Browser Print for Thermal Slip (Fallback)
    const handleThermalBrowserPrint = () => {
        setFormat('thermal');
        measureReceiptHeight();
        setTimeout(() => {
            window.print();
        }, 120);
    };

    // Thermal Print (Direct Spooler on Localhost, Browser Dialog on Cloud / Mobile)
    const handleThermalPrint = async () => {
        setIsPrinting(true);
        setPrintError(null);
        setPrintSuccess(false);

        try {
            const result = await ThermalPrintService.printSaleReceipt(sale.id);

            if (result.mode === 'browser') {
                handleThermalBrowserPrint();
                setPrintSuccess(true);
                toast.success(result.message || 'Opening browser print for 80mm thermal receipt');
            } else if (result.simulated) {
                setSimText(result.preview_text);
                setSimModalOpen(true);
                toast.success('Simulation rendered in Dev Mode');
            } else {
                setPrintSuccess(true);
                toast.success(result.message || 'Receipt printed to thermal printer!');
            }
        } catch (err) {
            console.error('Receipt print failure:', err);
            // If direct Windows spooler fails because server is in cloud (e.g. Render Linux),
            // seamlessly fall back to browser thermal printing immediately!
            if (err.message && (err.message.includes('Windows spooler') || err.message.includes('supported on Windows'))) {
                toast('Cloud server detected. Opening 80mm browser print...', { icon: '🖨️' });
                handleThermalBrowserPrint();
                setPrintSuccess(true);
            } else {
                setPrintError(err.message || 'Printer not detected or connection refused');
                toast.error(err.message || 'Failed to print receipt');
            }
        } finally {
            setIsPrinting(false);
        }
    };

    useEffect(() => {
        // Auto-print if enabled in preferences and not in preview mode
        const autoPrintPref = localStorage.getItem('smartpos_auto_print');
        if (!isPreview && sale?.id && autoPrintPref === 'true') {
            const timer = setTimeout(() => {
                handleThermalPrint();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isPreview, sale?.id]);

    const currency = settings?.currency_symbol || 'UGX';
    const saleItems = sale.sale_items || sale.saleItems || [];

    return (
        <div className={`receipt-wrapper flex flex-col items-center justify-start font-sans print:bg-white print:py-0 print:m-0 print:block print:min-h-0 ${
            isPreview ? 'bg-white py-4 min-h-full' : 'bg-slate-100 dark:bg-slate-950 min-h-screen py-8 px-4'
        }`}>
            <Head title={`Receipt #${sale.id} - ${format === 'a4' ? 'A4 Invoice' : 'Thermal Slip'}`} />
            
            {/* Action Bar (Hidden when Printing or in Preview) */}
            {!isPreview && (
                <div className={`w-full ${format === 'a4' ? 'max-w-[840px]' : 'max-w-[400px]'} flex flex-col gap-3 mb-6 print-action-bar print:hidden transition-all duration-300`}>
                    
                    {/* Format Toggle Tabs */}
                    <div className="flex items-center justify-center p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <button
                            type="button"
                            onClick={() => setFormat('thermal')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                format === 'thermal'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Printer size={15} />
                            <span>80mm Thermal Slip</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormat('a4')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                format === 'a4'
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <FileText size={15} />
                            <span>Official A4 Invoice</span>
                        </button>
                    </div>

                    {/* Error Alert with Fast Fallback */}
                    {printError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2 animate-fade-in">
                            <div className="flex items-center gap-2 font-bold text-rose-900">
                                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                Thermal Print Notice
                            </div>
                            <p className="text-[11px] leading-snug">
                                {printError}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleThermalBrowserPrint}
                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                    <Printer size={12} /> Print 80mm via Browser
                                </button>
                                <button
                                    type="button"
                                    onClick={handleA4BrowserPrint}
                                    className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-800 font-bold text-[11px] hover:bg-rose-50 cursor-pointer"
                                >
                                    Print A4 via Browser
                                </button>
                                <a
                                    href={`/api/receipts/${sale.id}/pdf?format=thermal`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-800 font-bold text-[11px] hover:bg-rose-50 flex items-center gap-1"
                                >
                                    <Download size={12} /> 80mm PDF
                                </a>
                                <a
                                    href={`/api/receipts/${sale.id}/pdf?format=a4`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-800 font-bold text-[11px] hover:bg-rose-50 flex items-center gap-1"
                                >
                                    <Download size={12} /> A4 PDF
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Main Action Buttons */}
                    <div className="flex flex-wrap gap-2.5">
                        {/* Thermal Print Button */}
                        <button 
                            type="button"
                            onClick={handleThermalPrint}
                            disabled={isPrinting}
                            className={`flex-1 min-w-[160px] font-bold py-2.5 px-4 rounded-xl shadow-sm border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                printSuccess
                                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
                            }`}
                        >
                            {isPrinting ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    <span>Printing...</span>
                                </>
                            ) : printSuccess ? (
                                <>
                                    <Check size={18} />
                                    <span>Printed OK</span>
                                </>
                            ) : (
                                <>
                                    <Printer size={18} />
                                    <span>Print Thermal Slip (80mm)</span>
                                </>
                            )}
                        </button>

                        {/* A4 Browser Print Button */}
                        <button 
                            type="button"
                            onClick={handleA4BrowserPrint}
                            className="flex-1 min-w-[160px] font-bold py-2.5 px-4 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <FileText size={18} className="text-slate-600 dark:text-slate-300" />
                            <span>Print A4 Invoice (Browser)</span>
                        </button>

                        {/* Back to POS */}
                        <Link 
                            href="/pos" 
                            className="font-bold py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shrink-0"
                        >
                            <ArrowLeft size={16} />
                            <span>POS</span>
                        </Link>
                    </div>

                    {/* Secondary Row: PDF Downloads & Preferences */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5 px-1">
                        <div className="flex items-center gap-3">
                            <a 
                                href={`/api/receipts/${sale.id}/pdf?format=a4`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-medium transition-colors"
                            >
                                <Download size={13} /> Download A4 PDF
                            </a>
                            <span className="text-slate-300">|</span>
                            <a 
                                href={`/api/receipts/${sale.id}/pdf?format=thermal`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-medium transition-colors"
                            >
                                <Download size={13} /> 80mm PDF
                            </a>
                        </div>

                        <Link 
                            href="/settings"
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
                        >
                            Printer Setup
                        </Link>
                    </div>

                </div>
            )}

            {/* ========================================================= */}
            {/* FORMAT 1: 80MM THERMAL RECEIPT CONTAINER                  */}
            {/* ========================================================= */}
            <div 
                ref={receiptRef}
                className={`receipt-container bg-white w-[380px] max-w-full mx-auto shadow-2xl rounded-2xl overflow-hidden text-slate-900 print:w-[72mm] print:max-w-[72mm] print:p-0 print:shadow-none print:rounded-none print:m-0 print:border-none ${
                    format === 'thermal' ? 'block' : 'hidden print:hidden'
                }`}
                data-receipt-light-mode="true"
                style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
            >
                
                <div className="p-4 print:p-0">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-4 pt-2">
                        {settings?.store_logo ? (
                            <img 
                                src={settings.store_logo} 
                                alt="Store Logo" 
                                className="max-w-[140px] max-h-[65px] w-auto h-auto object-contain mx-auto mb-2 block filter grayscale contrast-125" 
                            />
                        ) : (
                            <div className="w-10 h-10 border border-black flex items-center justify-center mb-2">
                                <Store size={20} className="text-black" />
                            </div>
                        )}
                        <h1 className="font-bold text-base leading-tight uppercase tracking-wide mb-1">{settings?.shop_name || 'SmartPOS Kampala'}</h1>
                        <div className="text-[13px] leading-tight text-gray-800">
                            <p>{settings?.shop_address || '123 Kampala Road'}</p>
                            <p>Tel: {settings?.shop_phone || '+256 700 000 000'}</p>
                        </div>
                    </div>

                    {sale.payment_status === 'Refunded' && (
                        <div className="bg-black text-white text-center py-1.5 mb-4 font-black text-[14px] uppercase tracking-widest">
                            *** REFUNDED ***
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="text-[13px] mb-3 leading-tight font-mono text-gray-700">
                        <div className="flex justify-between">
                            <span>Receipt #:</span>
                            <span className="font-bold text-black">{sale.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="text-black">{new Date(sale.sale_date || sale.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Cashier:</span>
                            <span className="text-black">{sale.user?.name || 'System'}</span>
                        </div>
                        {sale.customer ? (
                            <>
                                <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
                                    <span>Customer:</span>
                                    <span className="font-bold text-black">{sale.customer.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Phone:</span>
                                    <span className="text-black">{sale.customer.phone}</span>
                                </div>
                            </>
                        ) : sale.dealer_item && sale.dealer_item.length > 0 && sale.dealer_item[0].dealer ? (
                            <>
                                <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
                                    <span>Partner/Dealer:</span>
                                    <span className="font-bold text-black">{sale.dealer_item[0].dealer.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Phone:</span>
                                    <span className="text-black">{sale.dealer_item[0].dealer.phone}</span>
                                </div>
                            </>
                        ) : null}
                    </div>

                    <div className="border-t border-dashed border-gray-300 mb-3"></div>

                    {/* Items */}
                    <div className="mb-3">
                        <div className="flex justify-between text-[12px] font-bold uppercase text-gray-500 border-b border-dashed border-gray-300 pb-1 mb-2">
                            <span>Item Description</span>
                            <span>Amount</span>
                        </div>
                        <div className="space-y-3">
                            {sale.repair ? (
                                <div className="text-[13px] leading-tight">
                                    <div className="flex justify-between font-bold text-black mb-0.5">
                                        <span className="pr-2 text-wrap text-[14px]">
                                            Repair: {sale.repair.device_model}
                                        </span>
                                        <span className="whitespace-nowrap tabular-nums">
                                            {Number(sale.repair.estimated_cost).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[12px] text-gray-500">
                                        <div className="font-mono">
                                            <div>Ticket #: {sale.repair.repair_code}</div>
                                            {sale.repair.imei_serial && <div>IMEI/SN: {sale.repair.imei_serial}</div>}
                                        </div>
                                    </div>
                                </div>
                            ) : saleItems.map((item, idx) => {
                                const prod = item.device_imei?.product || item.product;
                                const brandObj = prod?.brand;
                                const brandName = typeof brandObj === 'object' ? (brandObj?.name || '') : (typeof brandObj === 'string' ? brandObj : '');
                                const modelName = prod?.model_name || '';
                                const displayName = `${brandName} ${modelName}`.trim() || 'Unknown Item';

                                return (
                                    <div key={item.id || idx} className="text-[13px] leading-tight">
                                        <div className="flex justify-between font-bold text-black mb-0.5">
                                            <span className="pr-2 text-wrap text-[14px]">
                                                {displayName}
                                            </span>
                                            <span className="whitespace-nowrap tabular-nums">
                                                {Number(item.price * (item.quantity || 1)).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[12px] text-gray-500">
                                            <div className="font-mono">
                                                {item.device_imei ? (
                                                    <>
                                                        <div>IMEI: {item.device_imei.imei}</div>
                                                        {item.warranty_months > 0 && <div>WTY: {item.warranty_months} Months</div>}
                                                        {item.notes && <div className="mt-1 font-bold italic underline whitespace-pre-wrap">{item.notes}</div>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div>Qty: {item.quantity} @ {Number(item.price).toLocaleString()}</div>
                                                        {item.notes && <div className="mt-1 font-bold italic underline whitespace-pre-wrap">{item.notes}</div>}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-300 mb-3"></div>

                    {/* Totals */}
                    <div className="text-[13px] space-y-1.5 mb-3 text-gray-700">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="tabular-nums font-medium text-black">{currency} {Number(sale.total_amount).toLocaleString()}</span>
                        </div>
                        {Number(sale.discount) > 0 && (
                            <div className="flex justify-between">
                                <span>Discount</span>
                                <span className="tabular-nums font-medium text-rose-600">-{currency} {Number(sale.discount).toLocaleString()}</span>
                            </div>
                        )}
                        {Number(sale.trade_in_value) > 0 && (
                            <div className="flex justify-between">
                                <span>Trade-In ({sale.trade_in_device})</span>
                                <span className="tabular-nums font-medium text-blue-600">-{currency} {Number(sale.trade_in_value).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-black">
                            <span className="font-bold text-sm uppercase text-black">Total</span>
                            <span className="font-bold text-base tabular-nums leading-none text-black">
                                <span className="text-[13px] mr-1">{currency}</span>{Number(sale.final_amount).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-300 mb-3"></div>

                    {/* Payment Info */}
                    <div className="text-[13px] font-mono mb-4 leading-tight">
                        <div className="flex justify-between">
                            <span>Payment Method:</span>
                            <span className="font-bold">{sale.payment_method}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Payment Status:</span>
                            <span className="font-bold uppercase">{sale.payment_status}</span>
                        </div>
                        {sale.payment_method === 'Cash' && sale.tendered_amount > 0 && (
                            <>
                                <div className="border-t border-dashed border-gray-300 my-1.5"></div>
                                <div className="flex justify-between">
                                    <span>Tendered Amount:</span>
                                    <span className="font-bold text-black">{currency} {Number(sale.tendered_amount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Change Due:</span>
                                    <span className="font-bold text-black">{currency} {Math.max(0, Number(sale.tendered_amount) - Number(sale.final_amount)).toLocaleString()}</span>
                                </div>
                            </>
                        )}
                        {sale.payment_method === 'Layaway' && sale.layaway_payments && (
                            <>
                                <div className="border-t border-dashed border-gray-300 my-1.5"></div>
                                <div className="flex justify-between">
                                    <span>Total Paid:</span>
                                    <span className="font-bold text-black">{currency} {Number(sale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Balance Due:</span>
                                    <span className="font-bold text-black">{currency} {Number(sale.final_amount - sale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center text-[12px] leading-tight">
                        <p className="font-bold mb-3 uppercase tracking-wide">{settings?.receipt_footer || 'Thank you for shopping!'}</p>
                        
                        {settings?.terms_conditions?.length > 0 && (
                            <div className="mb-4 text-gray-600">
                                <div className="font-bold text-[11px] uppercase mb-1">Terms & Conditions</div>
                                <ul className="text-left list-disc pl-3 m-0 space-y-0.5 text-[11px]">
                                    {settings.terms_conditions.map((term, index) => (
                                        <li key={index}>{term}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="font-mono text-[11px] text-gray-400 mt-2">Powered by SmartPOS</p>
                    </div>

                    {/* Barcode */}
                    <div className="mt-4 flex justify-center">
                        <Barcode value={`SALE-${sale.id}`} width={1.3} height={28} fontSize={10} margin={0} displayValue={true} background="transparent" lineColor="#000" />
                    </div>
                </div>
            </div>

            {/* ========================================================= */}
            {/* FORMAT 2: OFFICIAL A4 TAX INVOICE & WARRANTY CERTIFICATE  */}
            {/* ========================================================= */}
            <div 
                ref={a4Ref}
                className={`a4-invoice-container bg-white w-full max-w-[840px] mx-auto shadow-2xl rounded-2xl p-6 sm:p-8 text-slate-900 border border-slate-200 print:shadow-none print:rounded-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full ${
                    format === 'a4' ? 'block' : 'hidden print:hidden'
                }`}
                style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
            >
                {/* A4 Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-3 mb-3 gap-3">
                    <div className="flex items-start gap-3">
                        {settings?.store_logo ? (
                            <img 
                                src={settings.store_logo} 
                                alt="Store Logo" 
                                className="max-h-12 max-w-[140px] object-contain" 
                            />
                        ) : (
                            <div className="w-11 h-11 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold shrink-0">
                                <Store size={22} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight leading-none mb-1">
                                {settings?.shop_name || 'SmartPOS Kampala'}
                            </h1>
                            <p className="text-[11px] text-slate-600 leading-snug">
                                {settings?.shop_address || '123 Kampala Road, Kampala'}<br />
                                Tel: {settings?.shop_phone || '+256 700 000 000'}
                            </p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right">
                        <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded mb-1">
                            Tax Invoice / Warranty Cert
                        </div>
                        <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                            <div>Invoice #: <strong className="text-slate-900 text-xs font-bold">#{sale.id}</strong></div>
                            <div>Date: <strong className="text-slate-900">{new Date(sale.sale_date || sale.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong></div>
                            <div>Sales Rep: <strong className="text-slate-900">{sale.user?.name || 'System'}</strong></div>
                            <div className="pt-0.5">
                                {sale.payment_status === 'Refunded' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">Refunded</span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">{sale.payment_status}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer & Transaction Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Billed To (Customer)
                        </span>
                        <div className="font-bold text-slate-900 text-xs">
                            {sale.customer?.name || 'Walk-in Customer'}
                        </div>
                        {sale.customer?.phone && (
                            <div className="text-[11px] text-slate-600 font-mono">
                                Tel: {sale.customer.phone}
                            </div>
                        )}
                        {sale.dealer_item && sale.dealer_item.length > 0 && sale.dealer_item[0].dealer && (
                            <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                                Partner/Dealer: {sale.dealer_item[0].dealer.name} ({sale.dealer_item[0].dealer.phone})
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Payment & Order Info
                        </span>
                        <div className="text-[11px] text-slate-700 space-y-0.5">
                            <div className="flex justify-between">
                                <span>Payment Method:</span>
                                <strong className="font-bold text-slate-900">{sale.payment_method}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Currency:</span>
                                <strong className="font-bold text-slate-900">{currency}</strong>
                            </div>
                            {sale.repair && (
                                <div className="flex justify-between text-indigo-700">
                                    <span>Repair Ticket:</span>
                                    <strong>#{sale.repair.repair_code}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products & IMEI Warranty Table */}
                <div className="overflow-x-auto mb-3">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-2 px-2.5 rounded-l-md text-center w-8">#</th>
                                <th className="py-2 px-2.5">Item & Specifications</th>
                                <th className="py-2 px-2.5">IMEI / Serial Number</th>
                                <th className="py-2 px-2.5 text-center w-20">Warranty</th>
                                <th className="py-2 px-2.5 text-right w-24">Unit Price</th>
                                <th className="py-2 px-2.5 text-center w-10">Qty</th>
                                <th className="py-2 px-2.5 rounded-r-md text-right w-28">Total ({currency})</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {sale.repair ? (
                                <tr>
                                    <td className="py-2 px-2.5 text-center text-slate-400 font-mono">1</td>
                                    <td className="py-2 px-2.5">
                                        <div className="font-bold text-slate-900 text-xs">Repair: {sale.repair.device_model}</div>
                                        <div className="text-[10px] text-slate-500">Ticket #{sale.repair.repair_code}</div>
                                    </td>
                                    <td className="py-2 px-2.5 font-mono">
                                        {sale.repair.imei_serial ? (
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 text-[10px]">
                                                {sale.repair.imei_serial}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="py-2 px-2.5 text-center font-semibold text-slate-600 text-[11px]">30 Days</td>
                                    <td className="py-2 px-2.5 text-right font-mono">{Number(sale.repair.estimated_cost).toLocaleString()}</td>
                                    <td className="py-2 px-2.5 text-center font-bold">1</td>
                                    <td className="py-2 px-2.5 text-right font-bold font-mono text-slate-900">
                                        {Number(sale.repair.estimated_cost).toLocaleString()}
                                    </td>
                                </tr>
                            ) : saleItems.map((item, idx) => {
                                const prod = item.device_imei?.product || item.product;
                                const brandObj = prod?.brand;
                                const brandName = typeof brandObj === 'object' ? (brandObj?.name || '') : (typeof brandObj === 'string' ? brandObj : '');
                                const modelName = prod?.model_name || '';
                                const displayName = `${brandName} ${modelName}`.trim() || 'Product';

                                return (
                                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                                        <td className="py-2 px-2.5">
                                            <div className="font-bold text-slate-900 text-xs">{displayName}</div>
                                            {item.notes && (
                                                <div className="text-[10px] text-slate-500 italic mt-0.5">{item.notes}</div>
                                            )}
                                        </td>
                                        <td className="py-2 px-2.5 font-mono">
                                            {item.device_imei?.imei ? (
                                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-bold text-[10px]">
                                                    {item.device_imei.imei}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-[10px]">Standard Stock</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-2.5 text-center">
                                            {item.warranty_months > 0 ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                                                    <ShieldCheck size={11} /> {item.warranty_months} Mo
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px]">None</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-mono">{Number(item.price).toLocaleString()}</td>
                                        <td className="py-2 px-2.5 text-center font-bold">{item.quantity || 1}</td>
                                        <td className="py-2 px-2.5 text-right font-bold font-mono text-slate-900">
                                            {Number(item.price * (item.quantity || 1)).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Full-Width Financial Summary Breakdown (Spanning across the paper) */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-sm mb-3">
                    <div className="p-2.5 sm:p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-700">
                            <span className="font-semibold text-xs">Subtotal</span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                                {currency} {Number(sale.total_amount).toLocaleString()}
                            </span>
                        </div>

                        {Number(sale.discount) > 0 && (
                            <div className="flex justify-between items-center text-rose-600 font-semibold pt-1 border-t border-slate-100">
                                <span>Discount / Markdown</span>
                                <span className="font-mono font-bold">
                                    -{currency} {Number(sale.discount).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {Number(sale.trade_in_value) > 0 && (
                            <div className="flex justify-between items-center text-blue-600 font-semibold pt-1 border-t border-slate-100">
                                <div>
                                    <div className="font-bold text-xs">Trade-in Allowance</div>
                                    {sale.trade_in_device && (
                                        <div className="text-[10px] text-slate-500 font-normal">
                                            ↳ Device: {sale.trade_in_device}
                                        </div>
                                    )}
                                </div>
                                <span className="font-mono font-bold text-xs whitespace-nowrap">
                                    -{currency} {Number(sale.trade_in_value).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Full-Width Grand Total Bar */}
                    <div className="bg-slate-900 text-white px-3 py-2 sm:px-4 sm:py-2.5 flex justify-between items-center">
                        <span className="font-extrabold text-sm uppercase tracking-wider">TOTAL DUE</span>
                        <span className="font-black text-xl font-mono">
                            {currency} {Number(sale.final_amount).toLocaleString()}
                        </span>
                    </div>

                    {/* Full-Width Tendered & Change Breakdown */}
                    <div className="px-3 py-2 sm:px-4 sm:py-2 space-y-1 text-xs border-t border-slate-200 bg-white">
                        {sale.payment_method === 'Cash' && sale.tendered_amount > 0 && (
                            <>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Amount Tendered ({sale.payment_method})</span>
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                        {currency} {Number(sale.tendered_amount).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-emerald-700 font-bold border-t border-slate-100 pt-1">
                                    <span className="text-xs">Change Returned</span>
                                    <span className="font-mono text-sm font-black">
                                        {currency} {Math.max(0, Number(sale.tendered_amount) - Number(sale.final_amount)).toLocaleString()}
                                    </span>
                                </div>
                            </>
                        )}
                        {sale.payment_method === 'Layaway' && sale.layaway_payments && (
                            <>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Total Paid to Date</span>
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                        {currency} {Number(sale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-rose-600 font-bold border-t border-slate-100 pt-1">
                                    <span className="text-xs">Remaining Balance Due</span>
                                    <span className="font-mono text-sm font-black">
                                        {currency} {Number(sale.final_amount - sale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Stacked Section 2: Full-Width Warranty Policy & Store Terms */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-indigo-600" />
                        Official Warranty Policy & Store Terms
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-slate-600 leading-snug">
                        {settings?.terms_conditions?.map((term, index) => (
                            <div key={index} className="flex items-start gap-1.5">
                                <span className="text-indigo-500 font-bold shrink-0">•</span>
                                <span>{term}</span>
                            </div>
                        )) || (
                            <>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>Warranty claims strictly require presentation of this original tax invoice by the original purchaser.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>Device IMEI and serial number must match store records; damaged or removed warranty seals void coverage.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>Warranty strictly covers manufacturer hardware faults and component failure under normal recommended use.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>Physical impact, drops, cracked screens, casing pressure damage, or liquid intrusion void all warranty.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>Unauthorized third-party repair, unapproved casing disassembly, jailbreaking, or OS tampering voids warranty.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>Goods once inspected and accepted in good working condition are not refundable for cash.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>Batteries, power adapters, charging cables, and consumable accessories carry a limited 30-day warranty.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-indigo-500 font-bold shrink-0">•</span>
                                    <span>All warranty assessment claims require a 24–72 hour diagnostic period prior to repair or replacement.</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Official Signatures & Stamp Block */}
                <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200 print:break-inside-avoid">
                    <div className="text-center">
                        <div className="h-6"></div>
                        <div className="border-t border-slate-400 pt-1.5">
                            <div className="font-bold text-[11px] text-slate-900">Customer Acceptance Signature</div>
                            <div className="text-[9px] text-slate-500">I confirm items received in good order & accept warranty terms</div>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="h-6"></div>
                        <div className="border-t border-slate-400 pt-1.5">
                            <div className="font-bold text-[11px] text-slate-900">Authorized Signature & Official Stamp</div>
                            <div className="text-[9px] text-slate-500">SmartPOS Sales & Verification Desk</div>
                        </div>
                    </div>
                </div>

                {/* A4 Bottom Barcode & Footer */}
                <div className="mt-3 pt-2 border-t border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[9px] gap-2">
                    <div>
                        {settings?.receipt_footer ? `${settings.receipt_footer} • ` : ''}Powered by SmartPOS Enterprise POS Engine • Official Tax & Warranty Document
                    </div>
                    <div>
                        <Barcode value={`INV-${sale.id}`} width={1.1} height={20} fontSize={8} margin={0} displayValue={true} background="transparent" lineColor="#334155" />
                    </div>
                </div>
            </div>

            {/* Dev Simulator Modal */}
            <Modal show={simModalOpen} onClose={() => setSimModalOpen(false)} maxWidth="md">
                <div className="p-6 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Terminal size={18} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">Dev Simulator Receipt</h3>
                        </div>
                        <button onClick={() => setSimModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                    </div>

                    <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[460px] whitespace-pre">
                        {simText}
                    </div>

                    <div className="mt-4 flex justify-end">
                        <Button variant="primary" onClick={() => setSimModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Dynamic Print Stylesheet */}
            <style>
                {`
                    @media print {
                        ${format === 'a4' ? `
                            @page {
                                size: A4 portrait;
                                margin: 8mm 12mm;
                            }
                            html, body {
                                width: 100% !important;
                                min-width: 100% !important;
                                height: auto !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                background: #ffffff !important;
                                color: #000000 !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            #app, [data-page], .receipt-wrapper {
                                width: 100% !important;
                                max-width: none !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                background: #ffffff !important;
                            }
                            .receipt-container {
                                display: none !important;
                            }
                            .a4-invoice-container {
                                display: block !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                border: none !important;
                                box-shadow: none !important;
                                page-break-after: avoid !important;
                                page-break-inside: avoid !important;
                            }
                        ` : `
                            @page {
                                size: 80mm ${pageHeightMm}mm;
                                margin: 0;
                            }
                            html, body {
                                width: 80mm !important;
                                max-width: 80mm !important;
                                height: auto !important;
                                max-height: ${pageHeightMm}mm !important;
                                min-height: 0 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                position: static !important;
                                overflow: hidden !important;
                                background: #ffffff !important;
                                color: #000000 !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            #app, [data-page], .receipt-wrapper {
                                margin: 0 !important;
                                padding: 0 !important;
                                width: 80mm !important;
                                max-width: 80mm !important;
                                min-height: 0 !important;
                                height: auto !important;
                                display: block !important;
                                position: static !important;
                                background: #ffffff !important;
                            }
                            .a4-invoice-container {
                                display: none !important;
                            }
                            .receipt-container {
                                display: block !important;
                                width: 72mm !important;
                                max-width: 72mm !important;
                                height: auto !important;
                                box-sizing: border-box !important;
                                padding: 1mm 1.5mm 3mm 1.5mm !important;
                                margin: 0 auto !important;
                                position: relative !important;
                                top: 0 !important;
                                box-shadow: none !important;
                                border: none !important;
                                border-radius: 0 !important;
                                background: #ffffff !important;
                                color: #000000 !important;
                                page-break-after: avoid !important;
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                            .receipt-container * {
                                color: #000000 !important;
                                border-color: #000000 !important;
                                box-sizing: border-box !important;
                            }
                            .receipt-container img {
                                max-width: 120px !important;
                                max-height: 50px !important;
                                width: auto !important;
                                height: auto !important;
                                object-fit: contain !important;
                                margin: 0 auto 1mm auto !important;
                                display: block !important;
                            }
                        `}
                        .print-action-bar,
                        .print\\:hidden,
                        header, nav, footer {
                            display: none !important;
                            height: 0 !important;
                            min-height: 0 !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                    }
                `}
            </style>
        </div>
    );
}
