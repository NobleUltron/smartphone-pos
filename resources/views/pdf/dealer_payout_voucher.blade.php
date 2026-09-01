<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Payout Voucher — {{ $item->dealer->name ?? 'Dealer' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9.5pt;
            color: #1e293b;
            background: #fff;
            padding: 24px 30px;
        }

        /* ── Header ─────────────────────────────────── */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .shop-name {
            font-size: 16pt;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .shop-sub {
            font-size: 8.5pt;
            color: #64748b;
            margin-top: 3px;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h1 {
            font-size: 14pt;
            font-weight: bold;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .voucher-badge {
            display: inline-block;
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
            padding: 3px 8px;
            font-size: 8.5pt;
            font-weight: bold;
            border-radius: 4px;
            margin-top: 4px;
        }

        /* ── Info Box ────────────────────────────────── */
        .info-table {
            width: 100%;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
        }
        .info-table td {
            padding: 10px 14px;
            vertical-align: top;
            width: 50%;
        }
        .info-title {
            font-size: 7.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }
        .info-name {
            font-size: 11pt;
            font-weight: bold;
            color: #0f172a;
        }
        .info-detail {
            font-size: 8.5pt;
            color: #334155;
            margin-top: 2px;
        }

        /* ── Highlight Box ───────────────────────────── */
        .highlight-box {
            background: #f0fdf4;
            border: 1.5px solid #86efac;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 18px;
        }
        .highlight-title {
            font-size: 8pt;
            font-weight: bold;
            color: #166534;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .highlight-amount {
            font-size: 18pt;
            font-weight: bold;
            color: #15803d;
        }
        .highlight-sub {
            font-size: 8.5pt;
            color: #166534;
            margin-top: 2px;
        }

        /* ── Data Tables ─────────────────────────────── */
        .section-heading {
            font-size: 10pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            border-left: 3px solid #059669;
            padding-left: 6px;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        table.data-table th {
            background: #f1f5f9;
            color: #475569;
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }
        table.data-table td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            font-size: 8.5pt;
            vertical-align: middle;
        }
        table.data-table tr:nth-child(even) td {
            background: #fafafa;
        }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .font-bold { font-weight: bold; }

        /* ── Settlement Breakdown Table ──────────────── */
        .breakdown-table {
            width: 60%;
            margin-left: auto;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .breakdown-table td {
            padding: 6px 10px;
            font-size: 9pt;
            border-bottom: 1px solid #e2e8f0;
        }
        .breakdown-table tr.total td {
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            font-weight: bold;
            font-size: 10.5pt;
            color: #059669;
            background: #f8fafc;
        }

        /* ── Dual Signatures ─────────────────────────── */
        .signatures-table {
            width: 100%;
            margin-top: 30px;
            border-collapse: collapse;
        }
        .signatures-table td {
            width: 45%;
            vertical-align: top;
            padding: 0 10px;
        }
        .signature-line {
            border-bottom: 1px dashed #94a3b8;
            height: 45px;
            margin-bottom: 6px;
        }
        .signature-label {
            font-size: 8.5pt;
            font-weight: bold;
            color: #334155;
        }
        .signature-sub {
            font-size: 7.5pt;
            color: #64748b;
        }

        /* ── Footer ──────────────────────────────────── */
        .footer {
            margin-top: 24px;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            font-size: 7.5pt;
            color: #94a3b8;
            text-align: center;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="width: 60%; vertical-align: middle;">
                <div class="shop-name">{{ $settings['shop_name'] ?? 'SmartPOS' }}</div>
                <div class="shop-sub">
                    {{ $settings['shop_address'] ?? 'Kampala, Uganda' }} &bull; 
                    Tel: {{ $settings['shop_phone'] ?? '+256 700 000 000' }}
                    @if(!empty($settings['shop_email'])) &bull; {{ $settings['shop_email'] }} @endif
                </div>
            </td>
            <td class="doc-title" style="width: 40%; vertical-align: middle;">
                <h1>PAYOUT VOUCHER</h1>
                <div class="voucher-badge">VCH-{{ str_pad($item->id, 5, '0', STR_PAD_LEFT) }}</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">
                    Date: {{ $item->settled_at ? \Carbon\Carbon::parse($item->settled_at)->format('d M Y, h:i A') : now()->format('d M Y, h:i A') }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Info Box: Dealer & Payment Meta -->
    <table class="info-table">
        <tr>
            <td>
                <div class="info-title">Dealer / Consignor Details</div>
                <div class="info-name">{{ $item->dealer->name ?? 'N/A' }}</div>
                <div class="info-detail"><strong>Phone:</strong> {{ $item->dealer->phone ?? 'N/A' }}</div>
                @if(!empty($item->dealer->location))
                    <div class="info-detail"><strong>Location:</strong> {{ $item->dealer->location }}</div>
                @endif
                @if(!empty($item->dealer->national_id))
                    <div class="info-detail"><strong>National ID / NIN:</strong> {{ $item->dealer->national_id }}</div>
                @endif
            </td>
            <td>
                <div class="info-title">Settlement & Payment Details</div>
                <div class="info-detail"><strong>Payment Method:</strong> {{ $item->settlement_method ?? 'Cash' }}</div>
                <div class="info-detail"><strong>Settled Date:</strong> {{ $item->settled_at ? \Carbon\Carbon::parse($item->settled_at)->format('d M Y') : now()->format('d M Y') }}</div>
                <div class="info-detail"><strong>Settlement Status:</strong> <span style="color: #059669; font-weight: bold;">PAID & SETTLED</span></div>
                @if(!empty($item->settlement_notes))
                    <div class="info-detail"><strong>Reference / Notes:</strong> {{ $item->settlement_notes }}</div>
                @endif
            </td>
        </tr>
    </table>

    <!-- Highlight Box: Payout Amount -->
    <div class="highlight-box">
        <div class="highlight-title">Total Amount Paid to Dealer</div>
        <div class="highlight-amount">
            UGX {{ number_format($item->settlement_amount > 0 ? $item->settlement_amount : ($item->wholesale_cost ?? $item->dealer_price ?? 0)) }}
        </div>
        <div class="highlight-sub">
            Settled via <strong>{{ $item->settlement_method ?? 'Cash' }}</strong> for sold consignment stock.
        </div>
    </div>

    <!-- Item Specification Table -->
    <div class="section-heading">Consigned Device & Product Details</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 35%;">Item Description</th>
                <th style="width: 25%;">IMEI / Serial / Specs</th>
                <th style="width: 15%;" class="text-right">Retail POS Price</th>
                <th style="width: 20%;" class="text-right">Wholesale Cost (Paid)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-center font-bold">1</td>
                <td>
                    <div class="font-bold" style="font-size: 9.5pt; color: #0f172a;">
                        {{ $item->product->brand->name ?? '' }} {{ $item->product->name ?? 'Consigned Device' }}
                    </div>
                    <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
                        Received on: {{ \Carbon\Carbon::parse($item->created_at)->format('d M Y') }}
                        @if($item->sold_at) &bull; Sold on: {{ \Carbon\Carbon::parse($item->sold_at)->format('d M Y') }} @endif
                    </div>
                </td>
                <td>
                    @if($item->deviceImei)
                        <div class="font-bold" style="color: #4f46e5; font-size: 8.5pt;">
                            IMEI: {{ $item->deviceImei->imei_number }}
                        </div>
                        <div style="font-size: 7.5pt; color: #475569;">
                            {{ $item->deviceImei->storage ?? '' }} &bull; {{ $item->deviceImei->color ?? '' }} &bull; {{ $item->deviceImei->condition ?? '' }}
                        </div>
                    @elseif($item->imei)
                        <div class="font-bold" style="color: #4f46e5; font-size: 8.5pt;">IMEI: {{ $item->imei }}</div>
                        <div style="font-size: 7.5pt; color: #475569;">
                            {{ $item->storage ?? '' }} &bull; {{ $item->color ?? '' }} &bull; {{ $item->condition ?? '' }}
                        </div>
                    @else
                        <div style="color: #64748b;">Quantity: {{ $item->quantity }} pcs</div>
                    @endif
                </td>
                <td class="text-right font-bold text-slate-700">
                    UGX {{ number_format($item->retail_price ?? 0) }}
                </td>
                <td class="text-right font-bold" style="color: #059669;">
                    UGX {{ number_format($item->settlement_amount > 0 ? $item->settlement_amount : ($item->wholesale_cost ?? $item->dealer_price ?? 0)) }}
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Financial Breakdown Table -->
    <table class="breakdown-table">
        <tr>
            <td>Gross Customer Selling Price:</td>
            <td class="text-right font-bold">UGX {{ number_format($item->retail_price ?? 0) }}</td>
        </tr>
        <tr>
            <td>Shop Retained Margin / Commission:</td>
            <td class="text-right font-bold" style="color: #4f46e5;">
                UGX {{ number_format(max(0, ($item->retail_price ?? 0) - ($item->settlement_amount > 0 ? $item->settlement_amount : ($item->wholesale_cost ?? $item->dealer_price ?? 0)))) }}
            </td>
        </tr>
        <tr class="total">
            <td>Net Payout Amount to Dealer:</td>
            <td class="text-right">
                UGX {{ number_format($item->settlement_amount > 0 ? $item->settlement_amount : ($item->wholesale_cost ?? $item->dealer_price ?? 0)) }}
            </td>
        </tr>
    </table>

    <!-- Signatures -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="signature-line"></div>
                <div class="signature-label">Authorized Store Cashier / Signatory</div>
                <div class="signature-sub">Name & Official Stamp</div>
            </td>
            <td style="width: 10%;"></td>
            <td>
                <div class="signature-line"></div>
                <div class="signature-label">Dealer / Recipient Signature</div>
                <div class="signature-sub">I confirm full receipt of payment for the consigned items above.</div>
            </td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        {{ $settings['shop_name'] ?? 'SmartPOS' }} &bull; Generated by SmartPOS on {{ now()->format('d M Y, h:i A') }} &bull; Voucher #VCH-{{ str_pad($item->id, 5, '0', STR_PAD_LEFT) }}
    </div>

</body>
</html>
