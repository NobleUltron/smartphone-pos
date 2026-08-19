import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Barcode from 'react-barcode';

export default function Receipt({ sale, settings }) {
    const isPreview = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).has('preview') : false;

    useEffect(() => {
        // Automatically trigger print dialog after rendering if not in preview mode
        if (!isPreview) {
            window.print();
        }
    }, [isPreview]);

    return (
        <div className={`flex flex-col items-center justify-start font-sans print:bg-white print:py-0 print:block ${isPreview ? 'bg-white py-4 min-h-full' : 'bg-slate-100 dark:bg-slate-950 min-h-screen py-8'}`}>
            <Head title={`Receipt - Sale #${sale.id}`} />
            
            {/* Action Buttons for Screen (Hidden when Printing or in Preview) */}
            {!isPreview && (
                <div className="w-full max-w-[380px] flex flex-col gap-2.5 mb-6 print:hidden">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => window.print()} 
                            className="flex-1 font-bold py-2.5 px-4 rounded-xl shadow-sm border transition-colors flex items-center justify-center gap-2 cursor-pointer bg-white text-slate-900 border-slate-300 hover:bg-slate-50"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print Receipt
                        </button>
                        <Link 
                            href="/pos" 
                            className="flex-1 font-bold py-2.5 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            Back to POS
                        </Link>
                    </div>
                </div>
            )}

            {/* Receipt Container */}
            <div 
                className="receipt-container bg-white w-[380px] mx-auto shadow-2xl rounded-2xl overflow-hidden text-slate-900 print:shadow-none print:rounded-none"
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                </svg>
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
                            ) : (sale.sale_items || sale.saleItems || []).map((item, idx) => {
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
                            <span className="tabular-nums font-medium text-black">{settings?.currency_symbol || 'UGX'} {Number(sale.total_amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Discount</span>
                            <span className="tabular-nums font-medium text-black">{settings?.currency_symbol || 'UGX'} {Number(sale.discount).toLocaleString()}</span>
                        </div>
                        {Number(sale.trade_in_value) > 0 && (
                            <div className="flex justify-between">
                                <span>Trade-In ({sale.trade_in_device})</span>
                                <span className="tabular-nums font-medium text-black">-{settings?.currency_symbol || 'UGX'} {Number(sale.trade_in_value).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-black">
                            <span className="font-bold text-sm uppercase text-black">Total</span>
                            <span className="font-bold text-base tabular-nums leading-none text-black">
                                <span className="text-[13px] mr-1">{settings?.currency_symbol || 'UGX'}</span>{Number(sale.final_amount).toLocaleString()}
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
                                    <span className="font-bold text-black">{settings?.currency_symbol || 'UGX'} {Number(sale.tendered_amount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Change Due:</span>
                                    <span className="font-bold text-black">{settings?.currency_symbol || 'UGX'} {Math.max(0, Number(sale.tendered_amount) - Number(sale.final_amount)).toLocaleString()}</span>
                                </div>
                            </>
                        )}
                        {sale.payment_method === 'Layaway' && sale.layaway_payments && (
                            <>
                                <div className="border-t border-dashed border-gray-300 my-1.5"></div>
                                <div className="flex justify-between">
                                    <span>Total Paid:</span>
                                    <span className="font-bold text-black">{settings?.currency_symbol || 'UGX'} {Number(sale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Balance Due:</span>
                                    <span className="font-bold text-black">{settings?.currency_symbol || 'UGX'} {Number(sale.final_amount - sale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}</span>
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
                        <Barcode value={`SALE-${sale.id}`} width={1.5} height={30} fontSize={10} margin={0} displayValue={true} background="transparent" lineColor="#000" />
                    </div>
                </div>
            </div>

            <style>
                {`
                    @media print {
                        @page {
                            margin: 3mm 0mm;
                            size: 80mm auto;
                        }
                        body {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .receipt-container {
                            width: 80mm !important;
                            max-width: 100% !important;
                            padding: 4mm 4mm 8mm 4mm !important;
                            margin: 0 auto !important;
                            box-shadow: none !important;
                            border-radius: 0 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            page-break-after: auto;
                        }
                        .receipt-container img {
                            max-width: 130px !important;
                            max-height: 60px !important;
                            width: auto !important;
                            height: auto !important;
                            object-fit: contain !important;
                            margin-left: auto !important;
                            margin-right: auto !important;
                            margin-top: 2mm !important;
                            display: block !important;
                        }
                    }
                `}
            </style>
        </div>
    );
}
