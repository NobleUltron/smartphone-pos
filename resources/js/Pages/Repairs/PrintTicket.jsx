import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Barcode from 'react-barcode';

export default function PrintTicket({ repair, settings }) {
    useEffect(() => {
        // Automatically open print dialog when page loads
        window.print();
    }, []);

    const balance = Math.max(0, Number(repair.estimated_cost) - Number(repair.deposit));
    const cName = repair.customer?.name || repair.customer_name || 'Walk-in Customer';
    const cPhone = repair.customer?.phone || repair.customer_phone || '';

    return (
        <div className="min-h-screen bg-slate-100 py-8 flex flex-col items-center justify-start font-sans print:bg-white print:py-0">
            <Head title={`Print Ticket - ${repair.repair_code}`} />
            
            {/* Action Buttons for Screen (Hidden when Printing) */}
            <div className="w-full max-w-[320px] flex gap-3 mb-6 print:hidden">
                <button 
                    onClick={() => window.print()} 
                    className="flex-1 bg-white text-slate-700 font-semibold py-2.5 px-4 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print
                </button>
                <Link 
                    href="/repairs" 
                    className="flex-1 bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    Repairs
                </Link>
            </div>

            {/* Receipt Container */}
            <div className="receipt-container bg-white w-[380px] mx-auto shadow-xl rounded-xl overflow-hidden text-black print:shadow-none print:rounded-none">
                
                <div className="p-4 print:p-0">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-4">
                        <div className="w-10 h-10 border border-black flex items-center justify-center mb-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                <line x1="12" y1="18" x2="12.01" y2="18"></line>
                            </svg>
                        </div>
                        <h1 className="font-bold text-lg leading-tight uppercase tracking-wide mb-1">{settings?.shop_name || 'SmartPOS'}</h1>
                        <div className="text-[13px] leading-tight text-gray-800">
                            <p>{settings?.shop_address || '123 Kampala Road'}</p>
                            <p>Tel: {settings?.shop_phone || '+256 700 000 000'}</p>
                        </div>
                    </div>

                    <div className="bg-black text-white text-center py-1.5 mb-4 font-black text-[14px] uppercase tracking-widest">
                        REPAIR TICKET
                    </div>

                    {/* Metadata */}
                    <div className="text-[13px] mb-3 leading-tight font-mono text-gray-700">
                        <div className="flex justify-between">
                            <span>Ticket #:</span>
                            <span className="font-bold text-black">{repair.repair_code}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="text-black">{new Date(repair.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {repair.expected_completion_date && (
                            <div className="flex justify-between">
                                <span>Due:</span>
                                <span className="font-bold text-black">{new Date(repair.expected_completion_date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                        <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
                            <span>Customer:</span>
                            <span className="font-bold text-black">{cName}</span>
                        </div>
                        {cPhone && (
                            <div className="flex justify-between mt-1">
                                <span>Phone:</span>
                                <span className="text-black">{cPhone}</span>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-dashed border-gray-300 mb-3"></div>

                    {/* Device Details */}
                    <div className="mb-3">
                        <div className="text-[12px] font-bold uppercase text-gray-500 border-b border-dashed border-gray-300 pb-1 mb-2">
                            Device Details
                        </div>
                        <div className="text-[13px] leading-tight">
                            <div className="font-bold text-black mb-1">{repair.device_model}</div>
                            {repair.imei_serial && <div className="text-[12px] text-gray-600 font-mono">IMEI/SN: {repair.imei_serial}</div>}
                        </div>
                    </div>

                    {/* Reported Issue */}
                    <div className="mb-3">
                        <div className="text-[12px] font-bold uppercase text-gray-500 border-b border-dashed border-gray-300 pb-1 mb-2">
                            Reported Issue
                        </div>
                        <div className="text-[13px] leading-tight text-black whitespace-pre-wrap">
                            {repair.issue_description}
                        </div>
                    </div>

                    {/* Pre-Repair Checklist */}
                    {repair.pre_repair_checklist && (
                        <div className="mb-3">
                            <div className="text-[12px] font-bold uppercase text-gray-500 border-b border-dashed border-gray-300 pb-1 mb-2">
                                Pre-Repair Checklist
                            </div>
                            <div className="flex flex-wrap text-[12px] font-mono leading-tight">
                                {Object.entries(repair.pre_repair_checklist).map(([key, value]) => (
                                    <div key={key} className="w-1/2 capitalize mb-1 text-black">
                                        <span className="inline-block w-4">[{value ? 'X' : ' '}]</span> {key.replace('_', ' ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Parts Used */}
                    {repair.parts && repair.parts.length > 0 && (
                        <>
                            <div className="border-t border-dashed border-gray-300 mb-3"></div>
                            <div className="mb-3">
                                <div className="flex justify-between text-[12px] font-bold uppercase text-gray-500 border-b border-dashed border-gray-300 pb-1 mb-2">
                                    <span>Parts Used</span>
                                    <span>Amount</span>
                                </div>
                                <div className="space-y-2 text-[13px] leading-tight">
                                    {repair.parts.map(part => (
                                        <div key={part.pivot.id} className="flex justify-between font-medium text-black">
                                            <span className="pr-2">{part.pivot.quantity}x {part.brand?.name ? part.brand.name + ' ' : ''}{part.model_name}</span>
                                            <span className="tabular-nums">{(part.pivot.price * part.pivot.quantity).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="border-t border-dashed border-gray-300 mb-3"></div>

                    {/* Totals */}
                    <div className="text-[13px] space-y-1.5 mb-3 text-gray-700">
                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-black">
                            <span className="font-bold text-sm uppercase text-black">Estimated Cost</span>
                            <span className="font-bold text-base tabular-nums leading-none text-black">
                                <span className="text-[13px] mr-1">{settings?.currency_symbol || 'UGX'}</span>{Number(repair.estimated_cost).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    
                    <div className="text-[13px] font-mono mb-4 leading-tight border-t border-dashed border-gray-300 pt-3">
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="font-bold uppercase">{repair.status}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span>Deposit Paid:</span>
                            <span className="font-bold text-black">{settings?.currency_symbol || 'UGX'} {Number(repair.deposit).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span>Balance Due:</span>
                            <span className="font-bold text-black">{settings?.currency_symbol || 'UGX'} {balance.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-[12px] leading-tight">
                        <div className="mb-4 text-gray-600">
                            <div className="font-bold text-[11px] uppercase mb-1">Terms & Conditions</div>
                            <ul className="text-left list-disc pl-3 m-0 space-y-0.5 text-[11px]">
                                <li>Keep this ticket to claim your device.</li>
                                <li>Devices not claimed within 30 days of completion may be sold to recover costs.</li>
                                <li>We are not responsible for data loss. Please back up your device.</li>
                            </ul>
                        </div>
                        <p className="font-bold mb-2 uppercase tracking-wide">Thank you for choosing us!</p>
                        <p className="font-mono text-[11px] text-gray-400 mt-2">Powered by SmartPOS</p>
                    </div>

                    {/* Barcode */}
                    <div className="mt-4 flex justify-center">
                        <Barcode value={repair.repair_code} width={1.5} height={30} fontSize={10} margin={0} displayValue={true} background="transparent" lineColor="#000" />
                    </div>
                </div>
            </div>
            {/* Spacer for thermal tear-off */}
            <div className="h-10 print:h-[40px]"></div>
        </div>
    );
}
