/**
 * WhatsApp messaging utilities for SmartPOS.
 * Handles East African / Ugandan phone normalization and clean message templates
 * for Digital Receipts, Layaway Reminders, and Daily Owner Z-Reports.
 */

export function formatWhatsAppPhone(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
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
        ? `https://wa.me/${normalized}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

const fmtUGX = (val) => `UGX ${Number(val || 0).toLocaleString()}`;

export function buildSaleReceiptMessage(sale, storeSettings = {}) {
    const storeName = storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS';
    const storePhone = storeSettings?.shop_phone || storeSettings?.store_phone || '';
    const storeAddress = storeSettings?.shop_address || storeSettings?.store_address || '';
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

    const lines = [
        `🧾 *OFFICIAL RECEIPT #${sale.id}*`,
        `*${storeName}*`,
    ];
    if (storeAddress) lines.push(`📍 ${storeAddress}`);
    if (storePhone) lines.push(`📞 ${storePhone}`);
    lines.push(
        `────────────────────`,
        `👤 Customer: ${customerName}`,
        `📅 Date: ${dateStr}`,
        `💳 Payment: ${sale.payment_method || 'Cash'} (${sale.payment_status || 'Paid'})`,
        ``,
        `*Items Purchased:*`
    );

    if (sale?.repair) {
        lines.push(`• Repair: ${sale.repair.device_model} (${sale.repair.repair_code || ''}) — ${fmtUGX(sale.final_amount)}`);
    } else if (sale?.sale_items?.length > 0) {
        sale.sale_items.forEach((item) => {
            if (item.device_imei) {
                const brand = item.device_imei.product?.brand?.name || '';
                const model = item.device_imei.product?.model_name || 'Device';
                const specs = [item.device_imei.storage_capacity, item.device_imei.color].filter(Boolean).join(' / ');
                const warranty = item.warranty_months > 0 ? ` | Warranty: ${item.warranty_months}m` : '';
                lines.push(`• ${brand} ${model}${specs ? ` (${specs})` : ''} — ${fmtUGX(item.price)}`);
                lines.push(`  IMEI: ${item.device_imei.imei}${warranty}`);
            } else if (item.product) {
                const brand = item.product.brand?.name || '';
                const model = item.product.model_name || 'Item';
                const qty = item.quantity || 1;
                lines.push(`• ${qty}x ${brand} ${model} — ${fmtUGX(Number(item.price) * qty)}`);
            }
        });
    }

    lines.push(`────────────────────`);
    if (Number(sale.discount || 0) > 0) {
        lines.push(`Discount: -${fmtUGX(sale.discount)}`);
    }
    if (Number(sale.trade_in_value || 0) > 0) {
        lines.push(`Trade-In (${sale.trade_in_device || 'Device'}): -${fmtUGX(sale.trade_in_value)}`);
    }
    lines.push(`*TOTAL: ${fmtUGX(sale.final_amount)}*`);

    if (sale.payment_method === 'Layaway' || sale.payment_status === 'Partial') {
        const paid = (sale.layaway_payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
        const bal = Math.max(0, Number(sale.final_amount || 0) - paid);
        lines.push(`✅ Paid So Far: ${fmtUGX(paid)}`);
        lines.push(`⏳ *Balance Due: ${fmtUGX(bal)}*`);
    }

    lines.push(``, `Thank you for shopping with *${storeName}*! 🙏`);
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
        ``,
        `Friendly reminder from *${storeName}* regarding your installment / layaway plan:`,
        ``,
        `🧾 Receipt: #${sale.id}`,
        `📱 Item: ${itemsSummary}`,
        `💰 Total Price: ${fmtUGX(total)}`,
        `✅ Paid So Far: ${fmtUGX(paid)}`,
        `⏳ *Remaining Balance: ${fmtUGX(balance)}*`,
        ``,
        `Please reach out or visit the shop at your convenience to clear the remaining balance. Thank you for your continued support! 🙏`,
    ];
    if (storePhone) lines.push(`📞 ${storePhone}`);
    return lines.join('\n');
}

export function buildDailyZReportMessage(report, storeSettings = {}) {
    if (!report) return '';
    const storeName = storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS';
    const lines = [
        `📊 *DAILY OWNER BRIEF (Z-REPORT)*`,
        `*${storeName}*`,
        `📅 Date: ${report.formatted_date || report.date}`,
        `────────────────────`,
        `💰 *Total Revenue:* ${fmtUGX(report.total_revenue)}`,
        `🛒 Sales Count: ${report.sales_count || 0} sale(s)`,
        `📈 Gross Profit: ${fmtUGX(report.gross_profit)}`,
        `💸 Operating Expenses: ${fmtUGX(report.operating_expenses)}`,
        `🏆 *Net Profit:* ${fmtUGX(report.net_profit)}`,
    ];

    if (Number(report.layaway_collections || 0) > 0) {
        lines.push(`🔄 Layaway Collections: ${fmtUGX(report.layaway_collections)}`);
    }
    if (Number(report.refunds || 0) > 0) {
        lines.push(`↩️ Refunds: -${fmtUGX(report.refunds)}`);
    }

    if (report.payment_breakdown?.length > 0) {
        lines.push(``, `💳 *Payment Breakdown:*`);
        report.payment_breakdown.forEach((p) => {
            lines.push(`• ${p.method}: ${fmtUGX(p.amount)}`);
        });
    }

    if (report.phones_sold?.length > 0) {
        lines.push(``, `📱 *Phones Sold (${report.phones_sold.length}):*`);
        report.phones_sold.slice(0, 12).forEach((ph) => {
            lines.push(`• ${ph.name} — ${fmtUGX(ph.price)}`);
        });
        if (report.phones_sold.length > 12) {
            lines.push(`  ...+${report.phones_sold.length - 12} more`);
        }
    }

    lines.push(
        ``,
        `🏦 *Current Business Liquid Cash:* ${fmtUGX(report.business_liquid_cash)}`,
        `⏳ Active Layaways Owed to Shop: ${fmtUGX(report.active_layaways_balance)}`
    );

    if (report.shifts?.length > 0) {
        lines.push(``, `🔐 *Cash Drawer Shifts (${report.shifts.length}):*`);
        report.shifts.forEach((sh) => {
            const varianceStr = sh.status === 'closed'
                ? ` | Variance: ${Number(sh.variance) >= 0 ? '+' : ''}${fmtUGX(sh.variance)}`
                : ' | Open';
            lines.push(`• ${sh.cashier} (${sh.status})${varianceStr}`);
        });
    }

    lines.push(`────────────────────`, `Generated via SmartPOS`);
    return lines.join('\n');
}

export function buildQuotationMessage(quote, storeSettings = {}) {
    const storeName = storeSettings?.shop_name || storeSettings?.store_name || 'SmartPOS';
    const storePhone = storeSettings?.shop_phone || storeSettings?.store_phone || '';
    const client = quote?.customer?.company_name || quote?.customer?.name || 'Valued Client';
    const validStr = quote?.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A';

    const lines = [
        `📄 *QUOTATION / PROFORMA ${quote.quotation_number}*`,
        `*${storeName}*`,
        `────────────────────`,
        `🏢 Client: ${client}`,
        `💰 Total Amount: *${fmtUGX(quote.total_amount)}*`,
        `📅 Valid Until: ${validStr}`,
        `📌 Status: ${quote.status || 'Draft'}`,
        ``,
        `Please let us know if you would like us to convert this quotation into an official Tax Invoice and dispatch your order. Thank you! 🙏`,
    ];
    if (storePhone) lines.push(`📞 ${storePhone}`);
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
        `🧾 *TAX INVOICE ${inv.invoice_number}*`,
        `*${storeName}*`,
        `────────────────────`,
        `🏢 Client: ${client}`,
        inv.po_number ? `🔖 PO Ref: ${inv.po_number}` : null,
        `💰 Invoiced Total: ${fmtUGX(total)}`,
        `✅ Paid So Far: ${fmtUGX(paid)}`,
        balance > 0 ? `⏳ *Balance Due: ${fmtUGX(balance)}*` : `✅ *PAID IN FULL*`,
        `📅 Due Date: ${dueStr}`,
        ``,
        balance > 0
            ? `Kindly arrange settlement of the remaining balance at your earliest convenience. Thank you for your business! 🙏`
            : `Thank you for your prompt payment and continued partnership! 🙏`,
    ].filter(Boolean);
    if (storePhone) lines.push(`📞 ${storePhone}`);
    return lines.join('\n');
}
