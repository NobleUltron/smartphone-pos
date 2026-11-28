import React from 'react';
import Barcode from 'react-barcode';
import { Receipt, Printer, Store, X, MessageCircle } from 'lucide-react';
import Modal from '@/Components/Modal';
import Button from '@/Components/SaaS/Button';
import { buildSaleReceiptMessage, openWhatsApp } from '@/Utils/whatsapp';

const isRealPhone = (phone) => {
    if (!phone) return false;
    const trimmed = String(phone).trim();
    return trimmed.length > 0 && !trimmed.toUpperCase().startsWith('WALKIN-');
};

export default function ReceiptPreviewModal({ show, sale, settings, onClose }) {
    if (!sale) return null;

    const currency = settings?.currency_symbol || 'UGX';
    const customerPhone = sale.customer?.phone;
    const dealerInfo = sale.dealer_item?.[0]?.dealer;
    const whatsappPhone = isRealPhone(customerPhone)
        ? customerPhone
        : (isRealPhone(dealerInfo?.phone) ? dealerInfo.phone : '');

    const statusLower = (sale.payment_status || '').toLowerCase();
    const statusBadgeClass =
        statusLower === 'refunded'
            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            : statusLower === 'partial'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

    const paperStatusStyle =
        statusLower === 'refunded'
            ? { backgroundColor: '#FFE4E6', color: '#BE123C' }
            : statusLower === 'partial'
                ? { backgroundColor: '#FEF3C7', color: '#B45309' }
                : { backgroundColor: '#D1FAE5', color: '#047857' };

    const layawayPaid = sale.layaway_payments
        ? sale.layaway_payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
        : 0;
    const layawayBalance = Math.max(0, Number(sale.final_amount || 0) - layawayPaid);

    const handleWhatsAppShare = () => {
        const msg = buildSaleReceiptMessage(sale, settings);
        openWhatsApp(whatsappPhone, msg);
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                {/* Theme-aware Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Receipt size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                                    Receipt #{sale.id}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}>
                                    {sale.payment_status || 'Paid'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {new Date(sale.sale_date || sale.created_at).toLocaleString([], {
                                    month: 'short',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                                {sale.user?.name ? ` • ${sale.user.name}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        title="Close Preview"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Preview Tray (Dark-mode friendly backdrop with crisp white paper slip) */}
                <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950/80">
                    <div
                        className="mx-auto rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-[350px] font-sans"
                        style={{ backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0' }}
                    >
                        {/* Store Header */}
                        <div className="flex flex-col items-center text-center mb-4">
                            {settings?.store_logo ? (
                                <div className="mb-2.5 rounded-xl overflow-hidden border border-slate-200/80 shadow-sm bg-white p-0.5">
                                    <img
                                        src={settings.store_logo}
                                        alt="Store Logo"
                                        className="max-w-[120px] max-h-[64px] object-contain rounded-lg block"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-11 h-11 flex items-center justify-center mb-2 rounded-xl"
                                    style={{ border: '1px solid #0F172A' }}
                                >
                                    <Store size={20} style={{ color: '#0F172A' }} />
                                </div>
                            )}
                            <h1
                                className="font-extrabold text-base leading-tight uppercase tracking-wider mb-1"
                                style={{ color: '#0F172A' }}
                            >
                                {settings?.shop_name || 'SmartPOS Kampala'}
                            </h1>
                            <div className="text-xs leading-snug font-medium" style={{ color: '#475569' }}>
                                <p>{settings?.shop_address || '123 Kampala Road, Kampala'}</p>
                                <p>Tel: {settings?.shop_phone || '+256 700 000 000'}</p>
                            </div>
                        </div>

                        {sale.payment_status === 'Refunded' && (
                            <div
                                className="text-center py-1.5 mb-4 font-black text-xs uppercase tracking-widest rounded-lg"
                                style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}
                            >
                                *** REFUNDED ***
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="text-xs mb-3 leading-tight font-mono space-y-1" style={{ color: '#334155' }}>
                            <div className="flex justify-between gap-2">
                                <span className="font-bold">Receipt #:</span>
                                <span className="font-bold" style={{ color: '#0F172A' }}>{sale.id}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="font-bold">Date:</span>
                                <span style={{ color: '#0F172A' }}>
                                    {new Date(sale.sale_date || sale.created_at).toLocaleString([], {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="font-bold">Cashier:</span>
                                <span style={{ color: '#0F172A' }}>{sale.user?.name || 'System'}</span>
                            </div>
                            {sale.customer ? (
                                <>
                                    <div
                                        className="flex justify-between gap-2 mt-1.5 pt-1.5"
                                        style={{ borderTop: '1px solid #E2E8F0' }}
                                    >
                                        <span className="font-bold">Customer:</span>
                                        <span className="font-bold text-right" style={{ color: '#0F172A' }}>
                                            {sale.customer.name}
                                        </span>
                                    </div>
                                    {isRealPhone(sale.customer.phone) && (
                                        <div className="flex justify-between gap-2">
                                            <span className="font-bold">Phone:</span>
                                            <span style={{ color: '#0F172A' }}>{sale.customer.phone}</span>
                                        </div>
                                    )}
                                </>
                            ) : dealerInfo ? (
                                <>
                                    <div
                                        className="flex justify-between gap-2 mt-1.5 pt-1.5"
                                        style={{ borderTop: '1px solid #E2E8F0' }}
                                    >
                                        <span className="font-bold">Partner/Dealer:</span>
                                        <span className="font-bold text-right" style={{ color: '#0F172A' }}>
                                            {dealerInfo.name}
                                        </span>
                                    </div>
                                    {isRealPhone(dealerInfo.phone) && (
                                        <div className="flex justify-between gap-2">
                                            <span className="font-bold">Phone:</span>
                                            <span style={{ color: '#0F172A' }}>{dealerInfo.phone}</span>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>

                        <div className="my-3" style={{ borderTop: '1px dashed #CBD5E1' }}></div>

                        {/* Items */}
                        <div className="mb-3">
                            <div
                                className="flex justify-between text-[11px] font-semibold uppercase pb-1.5 mb-2"
                                style={{ color: '#64748B', borderBottom: '1px dashed #CBD5E1' }}
                            >
                                <span>Item Description</span>
                                <span>Amount</span>
                            </div>
                            <div className="space-y-3">
                                {sale.repair ? (
                                    <div className="text-xs leading-tight">
                                        <div className="flex justify-between font-bold mb-0.5" style={{ color: '#0F172A' }}>
                                            <span className="pr-2 text-[13px]">
                                                Repair: {sale.repair.device_model}
                                            </span>
                                            <span className="whitespace-nowrap tabular-nums">
                                                {Number(sale.repair.estimated_cost).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-xs font-mono" style={{ color: '#475569' }}>
                                            <div>Ticket #: {sale.repair.repair_code}</div>
                                            {sale.repair.imei_serial && <div>IMEI/SN: {sale.repair.imei_serial}</div>}
                                        </div>
                                    </div>
                                ) : (
                                    (sale.sale_items || sale.saleItems || []).map((item, idx) => {
                                        const prod = item.device_imei?.product || item.product;
                                        const brandObj = prod?.brand;
                                        const brandName =
                                            typeof brandObj === 'object'
                                                ? brandObj?.name || ''
                                                : typeof brandObj === 'string'
                                                    ? brandObj
                                                    : '';
                                        const modelName = prod?.model_name || '';
                                        const displayName = `${brandName} ${modelName}`.trim() || 'Unknown Item';

                                        return (
                                            <div key={idx} className="text-xs leading-tight">
                                                <div className="flex justify-between font-bold mb-0.5" style={{ color: '#0F172A' }}>
                                                    <span className="pr-2 text-[13px]">{displayName}</span>
                                                    <span className="whitespace-nowrap tabular-nums">
                                                        {Number(item.price * (item.quantity || 1)).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-mono" style={{ color: '#475569' }}>
                                                    {item.device_imei ? (
                                                        <>
                                                            <div>IMEI: {item.device_imei.imei}</div>
                                                            {item.warranty_months > 0 && (
                                                                <div>WTY: {item.warranty_months} Months</div>
                                                            )}
                                                            {item.notes && (
                                                                <div className="mt-1 font-bold italic underline whitespace-pre-wrap">
                                                                    {item.notes}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                Qty: {item.quantity} @ {Number(item.price).toLocaleString()}
                                                            </div>
                                                            {item.notes && (
                                                                <div className="mt-1 font-bold italic underline whitespace-pre-wrap">
                                                                    {item.notes}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="my-3" style={{ borderTop: '1px dashed #CBD5E1' }}></div>

                        {/* Totals */}
                        <div className="text-xs space-y-1.5 mb-3" style={{ color: '#334155' }}>
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>
                                    {currency} {Number(sale.total_amount).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount</span>
                                <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>
                                    {currency} {Number(sale.discount).toLocaleString()}
                                </span>
                            </div>
                            {Number(sale.trade_in_value) > 0 && (
                                <div className="flex justify-between">
                                    <span>Trade-In ({sale.trade_in_device})</span>
                                    <span className="tabular-nums font-semibold" style={{ color: '#0F172A' }}>
                                        -{currency} {Number(sale.trade_in_value).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            <div
                                className="flex justify-between items-end mt-2 pt-2"
                                style={{ color: '#0F172A', borderTop: '1.5px solid #0F172A' }}
                            >
                                <span className="font-extrabold text-sm uppercase">Total</span>
                                <span className="font-black text-base tabular-nums leading-none">
                                    <span className="text-xs mr-1">{currency}</span>
                                    {Number(sale.final_amount).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="my-3" style={{ borderTop: '1px dashed #CBD5E1' }}></div>

                        {/* Payment Info */}
                        <div className="text-xs font-mono mb-4 leading-tight space-y-1.5" style={{ color: '#334155' }}>
                            <div className="flex justify-between items-center">
                                <span>Payment Method:</span>
                                <span className="font-bold" style={{ color: '#0F172A' }}>
                                    {sale.payment_method}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Payment Status:</span>
                                <span
                                    className="px-2 py-0.5 rounded font-bold uppercase text-[10px]"
                                    style={paperStatusStyle}
                                >
                                    {sale.payment_status}
                                </span>
                            </div>
                            {sale.payment_method === 'Cash' && sale.tendered_amount > 0 && (
                                <>
                                    <div className="my-1.5" style={{ borderTop: '1px dashed #CBD5E1' }}></div>
                                    <div className="flex justify-between">
                                        <span>Tendered Amount:</span>
                                        <span className="font-bold" style={{ color: '#0F172A' }}>
                                            {currency} {Number(sale.tendered_amount).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Change Due:</span>
                                        <span className="font-bold" style={{ color: '#0F172A' }}>
                                            {currency}{' '}
                                            {Math.max(
                                                0,
                                                Number(sale.tendered_amount) - Number(sale.final_amount)
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                </>
                            )}
                            {sale.payment_method === 'Layaway' && sale.layaway_payments && (
                                <>
                                    <div className="my-1.5" style={{ borderTop: '1px dashed #CBD5E1' }}></div>
                                    <div className="flex justify-between">
                                        <span>Total Paid:</span>
                                        <span className="font-bold" style={{ color: '#047857' }}>
                                            {currency} {layawayPaid.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Balance Due:</span>
                                        <span
                                            className="font-extrabold"
                                            style={{ color: layawayBalance > 0 ? '#B45309' : '#047857' }}
                                        >
                                            {currency} {layawayBalance.toLocaleString()}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Terms & Footer */}
                        <div className="text-center text-xs leading-tight">
                            <p
                                className="font-extrabold mb-3 uppercase tracking-wide"
                                style={{ color: '#0F172A' }}
                            >
                                {settings?.receipt_footer || 'Thank you for shopping!'}
                            </p>
                            {settings?.terms_conditions?.length > 0 && (
                                <div
                                    className="mb-3 rounded-xl p-3 text-left"
                                    style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                                >
                                    <div
                                        className="font-extrabold text-[10px] uppercase mb-1"
                                        style={{ color: '#475569' }}
                                    >
                                        Terms &amp; Conditions
                                    </div>
                                    <ol
                                        className="list-decimal pl-4 space-y-0.5 text-[11px] font-medium"
                                        style={{ color: '#334155' }}
                                    >
                                        {settings.terms_conditions.map((term, index) => (
                                            <li key={index}>{term}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>

                        {/* Barcode — unclipped */}
                        <div className="flex justify-center pt-2 pb-1 overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto">
                            <Barcode
                                value={`SALE-${sale.id}`}
                                width={1.2}
                                height={38}
                                fontSize={10}
                                background="#FFFFFF"
                                lineColor="#0F172A"
                                displayValue={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Theme-aware Action Footer */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleWhatsAppShare}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5"
                            title="Send receipt summary via WhatsApp"
                        >
                            <MessageCircle size={15} />
                            WhatsApp
                        </button>
                        <a
                            href={`/pos/receipt/${sale.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="saas-btn saas-btn-primary"
                        >
                            <Printer size={16} />
                            Print
                        </a>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
