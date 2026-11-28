/**
 * WhatsApp messaging utilities for SmartPOS.
 * Handles East African / Ugandan phone normalization and clean, emoji-safe
 * executive message templates for Digital Receipts, Layaway Reminders,
 * Quotations, Invoices, and Daily Owner Z-Reports.
 */

export function formatWhatsAppPhone(phone) {
    if (!phone) return '';
    const str = String(phone).trim();
    if (str.toUpperCase().startsWith('WALKIN-')) return '';
    let cleaned = str.replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('0') && cleaned.length >= 9) {
        return '256' + cleaned.substring(1);
    }
    if (cleaned.length === 9 && /^[73]/.test(cleaned)) {
        return '256' + cleaned;
    }
    return cleaned;
}

export function openWhatsApp(phone, message) {
    const normalized = formatWhatsAppPhone(phone);
    const encoded = encodeURIComponent(message || '');
    const url = normalized
        ? `https://api.whatsapp.com/send?phone=${normalized}&text=${encoded}`
        : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

const fmtUGX = (val, currency = 'UGX') => `${currency} ${Number(val || 0).toLocaleString()}`;
const DIVIDER = '--------------------';

export function buildSaleReceiptMessage(sale, storeSettings = {}) {
    const storeName = storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS';
    const storePhone = storeSettings?.shop_phone || storeSettings?.store_phone || '';
    const storeAddress = storeSettings?.shop_address || storeSettings?.store_address || '';
    const currency = storeSettings?.currency_symbol || 'UGX';

    const customerName = sale?.customer?.name
        || (sale?.dealer_item?.[0]?.dealer?.name)
        || 'Valued Customer';
    const dateStr = new Date(sale?.sale_date || sale?.created_at || Date.now()).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const isLayaway = sale.payment_method === 'Layaway' || sale.payment_status === 'Partial';
    const isRefunded = sale.payment_status === 'Refunded';
    const items = sale?.sale_items || sale?.saleItems || [];

    const itemLines = [];
    if (sale?.repair) {
        const ref = [
            sale.repair.repair_code ? `Ticket #${sale.repair.repair_code}` : null,
            sale.repair.imei_serial ? `IMEI/SN: ${sale.repair.imei_serial}` : null,
        ].filter(Boolean).join(', ');
        itemLines.push(`- Repair: ${sale.repair.device_model} - ${fmtUGX(sale.final_amount, currency)}${ref ? ` (${ref})` : ''}`);
    } else if (items.length > 0) {
        items.forEach((item) => {
            if (item.device_imei) {
                const brand = item.device_imei.product?.brand?.name || '';
                const model = item.device_imei.product?.model_name || 'Device';
                const name = `${brand} ${model}`.trim();
                const specs = [item.device_imei.storage_capacity, item.device_imei.color].filter(Boolean).join(' / ');
                const meta = [
                    `IMEI: ${item.device_imei.imei}`,
                    item.warranty_months > 0 ? `${item.warranty_months} ${Number(item.warranty_months) === 1 ? 'Month' : 'Months'} warranty` : null,
                ].filter(Boolean).join(', ');
                itemLines.push(`- ${name}${specs ? ` (${specs})` : ''} - ${fmtUGX(item.price, currency)} (${meta})`);
            } else if (item.product) {
                const brand = item.product.brand?.name || '';
                const model = item.product.model_name || 'Item';
                const name = `${brand} ${model}`.trim();
                const qty = item.quantity || 1;
                const qtyPrefix = qty > 1 ? `${qty}x ` : '';
                itemLines.push(`- ${qtyPrefix}${name} - ${fmtUGX(Number(item.price) * qty, currency)}`);
            }
        });
    }

    const lines = [
        `Hello ${customerName},`,
        '',
        isRefunded
            ? `This is a confirmation from *${storeName}* that Receipt #${sale.id} has been refunded.`
            : `Thank you for shopping with *${storeName}*! Here is your receipt summary for your records:`,
        '',
        `*Receipt:* #${sale.id}`,
        `*Date:* ${dateStr}`,
    ];

    if (itemLines.length > 0) {
        lines.push('', itemLines.length === 1 ? '*Item:*' : '*Items:*', ...itemLines);
    }

    lines.push('');

    const discount = Number(sale.discount || 0);
    const tradeIn = Number(sale.trade_in_value || 0);
    if (discount > 0) {
        lines.push(`*Discount:* -${fmtUGX(discount, currency)}`);
    }
    if (tradeIn > 0) {
        lines.push(`*Trade-In (${sale.trade_in_device || 'Device'}):* -${fmtUGX(tradeIn, currency)}`);
    }

    lines.push(`*Total:* ${fmtUGX(sale.final_amount, currency)}`);

    if (isLayaway) {
        const paid = (sale.layaway_payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
        const bal = Math.max(0, Number(sale.final_amount || 0) - paid);
        lines.push(`*Paid So Far:* ${fmtUGX(paid, currency)}`);
        lines.push(`*Balance Due:* ${fmtUGX(bal, currency)} (${sale.payment_method || 'Layaway'} - ${sale.payment_status || 'Partial'})`);
    } else {
        lines.push(`*Payment:* ${sale.payment_method || 'Cash'} (${sale.payment_status || 'Paid'})`);
    }

    lines.push(
        '',
        isLayaway
            ? 'Please feel free to reply to this message whenever you are ready to clear your remaining balance or if you need any assistance.'
            : 'Please keep this message for warranty or support assistance — feel free to reply here anytime!',
        '',
        `*${storeName}*`,
    );

    const footerContact = [storeAddress, storePhone].filter(Boolean).join(' | ');
    if (footerContact) lines.push(footerContact);

    return lines.join('\n');
}

export function buildLayawayReminderMessage(sale, storeSettings = {}) {
    const storeName = storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS';
    const storePhone = storeSettings?.shop_phone || storeSettings?.store_phone || '';
    const customerName = sale?.customer?.name || 'Valued Customer';
    const paid = (sale?.layaway_payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
    const total = Number(sale?.final_amount || 0);
    const balance = Math.max(0, total - paid);

    const itemsSummary = (sale?.sale_items || []).map((item) => {
        if (item.device_imei?.product) {
            const b = item.device_imei.product.brand?.name || '';
            const m = item.device_imei.product.model_name || '';
            return `${b} ${m}`.trim();
        }
        if (item.product) {
            const b = item.product.brand?.name || '';
            const m = item.product.model_name || '';
            return `${item.quantity || 1}x ${b} ${m}`.trim();
        }
        return null;
    }).filter(Boolean).join(', ') || `Order #${sale.id}`;

    const lines = [
        `Hello ${customerName},`,
        '',
        `Friendly reminder from *${storeName}* regarding your layaway plan:`,
        '',
        DIVIDER,
        `*Receipt:* #${sale.id}`,
        `*Item:* ${itemsSummary}`,
        `*Total Price:* ${fmtUGX(total)}`,
        `*Paid So Far:* ${fmtUGX(paid)}`,
        `*Remaining Balance:* ${fmtUGX(balance)}`,
        DIVIDER,
        '',
        `Please reach out or visit the shop at your convenience to clear the remaining balance. Thank you for your continued support!`,
    ];
    if (storePhone) lines.push(`Tel: ${storePhone}`);
    return lines.join('\n');
}

export function buildDailyZReportMessage(report, storeSettings = {}) {
    if (!report) return '';
    const storeName = (storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS').toUpperCase();
    const lines = [
        `*${storeName}*`,
        `DAILY OWNER BRIEF (Z-REPORT)`,
        `Date: ${report.formatted_date || report.date}`,
        DIVIDER,
        `*Total Revenue:* ${fmtUGX(report.total_revenue)}`,
        `Sales Count: ${report.sales_count || 0} sale(s)`,
        `Gross Profit: ${fmtUGX(report.gross_profit)}`,
        `Operating Expenses: ${fmtUGX(report.operating_expenses)}`,
        `*Net Profit:* ${fmtUGX(report.net_profit)}`,
    ];

    if (Number(report.layaway_collections || 0) > 0) {
        lines.push(`Layaway Collections: ${fmtUGX(report.layaway_collections)}`);
    }
    if (Number(report.refunds || 0) > 0) {
        lines.push(`Refunds: -${fmtUGX(report.refunds)}`);
    }

    if (report.payment_breakdown?.length > 0) {
        lines.push('', '*PAYMENT BREAKDOWN*');
        report.payment_breakdown.forEach((p) => {
            lines.push(`- ${p.method}: ${fmtUGX(p.amount)}`);
        });
    }

    if (report.phones_sold?.length > 0) {
        lines.push('', `*PHONES SOLD (${report.phones_sold.length})*`);
        report.phones_sold.slice(0, 12).forEach((ph) => {
            lines.push(`- ${ph.name} - ${fmtUGX(ph.price)}`);
        });
        if (report.phones_sold.length > 12) {
            lines.push(`  ...+${report.phones_sold.length - 12} more`);
        }
    }

    lines.push(
        '',
        `*Business Liquid Cash:* ${fmtUGX(report.business_liquid_cash)}`,
        `Active Layaways Owed: ${fmtUGX(report.active_layaways_balance)}`,
    );

    if (report.shifts?.length > 0) {
        lines.push('', `*CASH DRAWER SHIFTS (${report.shifts.length})*`);
        report.shifts.forEach((sh) => {
            const varianceStr = sh.status === 'closed'
                ? ` | Variance: ${Number(sh.variance) >= 0 ? '+' : ''}${fmtUGX(sh.variance)}`
                : ' | Open';
            lines.push(`- ${sh.cashier} (${sh.status})${varianceStr}`);
        });
    }

    lines.push(DIVIDER);
    return lines.join('\n');
}

export function buildQuotationMessage(quote, storeSettings = {}) {
    const storeName = storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS';
    const storePhone = storeSettings?.shop_phone || storeSettings?.store_phone || '';
    const client = quote?.customer?.company_name || quote?.customer?.name || 'Valued Client';
    const validStr = quote?.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A';

    const lines = [
        `*${storeName.toUpperCase()}*`,
        `QUOTATION / PROFORMA ${quote.quotation_number}`,
        DIVIDER,
        `*Client:* ${client}`,
        `*Total Amount:* ${fmtUGX(quote.total_amount)}`,
        `*Valid Until:* ${validStr}`,
        `*Status:* ${quote.status || 'Draft'}`,
        DIVIDER,
        '',
        `Please let us know if you would like us to convert this quotation into an official Tax Invoice and dispatch your order. Thank you!`,
    ];
    if (storePhone) lines.push(`Tel: ${storePhone}`);
    return lines.join('\n');
}

export function buildInvoiceReminderMessage(inv, storeSettings = {}) {
    const storeName = storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS';
    const storePhone = storeSettings?.shop_phone || storeSettings?.store_phone || '';
    const client = inv?.customer?.company_name || inv?.customer?.name || 'Valued Client';
    const total = Number(inv?.total_amount || 0);
    const paid = Number(inv?.paid_amount || 0);
    const balance = Math.max(0, total - paid);
    const dueStr = inv?.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A';

    const lines = [
        `*${storeName.toUpperCase()}*`,
        `TAX INVOICE ${inv.invoice_number}`,
        DIVIDER,
        `*Client:* ${client}`,
        inv.po_number ? `*PO Ref:* ${inv.po_number}` : null,
        `*Invoiced Total:* ${fmtUGX(total)}`,
        `*Paid So Far:* ${fmtUGX(paid)}`,
        balance > 0 ? `*Balance Due:* ${fmtUGX(balance)}` : `*Status:* PAID IN FULL`,
        `*Due Date:* ${dueStr}`,
        DIVIDER,
        '',
        balance > 0
            ? `Kindly arrange settlement of the remaining balance at your earliest convenience. Thank you for your business!`
            : `Thank you for your prompt payment and continued partnership!`,
    ].filter(Boolean);
    if (storePhone) lines.push(`Tel: ${storePhone}`);
    return lines.join('\n');
}
