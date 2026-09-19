<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - #{{ $receipt->receiptNumber }}</title>
    <style>
        @page {
            margin: 8mm 12mm;
            size: a4 portrait;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.35;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
        }
        .header-table td {
            vertical-align: top;
        }
        .store-title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .store-sub {
            font-size: 10px;
            color: #475569;
            line-height: 1.3;
        }
        .invoice-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }
        .invoice-meta {
            font-size: 10px;
            color: #475569;
            text-align: right;
            line-height: 1.35;
        }
        .badge-refunded {
            display: inline-block;
            background: #e11d48;
            color: #ffffff;
            font-weight: bold;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            text-transform: uppercase;
            margin-top: 2px;
        }
        .badge-paid {
            display: inline-block;
            background: #10b981;
            color: #ffffff;
            font-weight: bold;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            text-transform: uppercase;
            margin-top: 2px;
        }
        .customer-card {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
        }
        .customer-card td {
            padding: 6px 12px;
            vertical-align: top;
            width: 50%;
        }
        .card-heading {
            font-size: 9px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 2px;
        }
        .customer-name {
            font-size: 12.5px;
            font-weight: bold;
            color: #0f172a;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 5px 8px;
            text-align: left;
        }
        .items-table th.text-right { text-align: right; }
        .items-table th.text-center { text-align: center; }
        .items-table td {
            padding: 4px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10.5px;
            vertical-align: top;
        }
        .items-table td.text-right { text-align: right; }
        .items-table td.text-center { text-align: center; }
        .item-desc {
            font-weight: bold;
            color: #0f172a;
            font-size: 11px;
        }
        .imei-badge {
            font-family: 'Courier New', Courier, monospace;
            font-size: 9px;
            background: #f1f5f9;
            color: #334155;
            padding: 1px 4px;
            border-radius: 3px;
            display: inline-block;
            margin-top: 1px;
            border: 1px solid #cbd5e1;
        }
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        .totals-table td {
            padding: 3px 12px;
            font-size: 10.5px;
        }
        .totals-table tr.grand-row td {
            border-top: 2px solid #0f172a;
            background: #0f172a;
            color: #ffffff;
            font-size: 13px;
            font-weight: bold;
            padding: 6px 12px;
        }
        .terms-title {
            font-size: 9.5px;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .terms-list {
            margin: 0;
            padding-left: 12px;
            font-size: 8.5px;
            color: #475569;
            line-height: 1.3;
        }
        .terms-list li {
            margin-bottom: 2px;
        }
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            page-break-inside: avoid;
        }
        .signatures-table td {
            width: 50%;
            vertical-align: bottom;
            padding: 0 15px;
        }
        .sig-box {
            border-top: 1px solid #0f172a;
            padding-top: 3px;
            text-align: center;
        }
        .sig-title {
            font-size: 9.5px;
            font-weight: bold;
            color: #0f172a;
        }
        .sig-sub {
            font-size: 8px;
            color: #64748b;
        }
        .footer-note {
            text-align: center;
            font-size: 8.5px;
            color: #64748b;
            margin-top: 8px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 4px;
        }
    </style>
</head>
<body>

    @php
        $logoSrc = null;
        if (!empty($receipt->storeLogo)) {
            $clean = ltrim($receipt->storeLogo, '/\\');
            if (file_exists(public_path($clean))) {
                $logoSrc = public_path($clean);
            } elseif (file_exists(storage_path('app/public/' . str_replace(['storage/', 'public/'], '', $clean)))) {
                $logoSrc = storage_path('app/public/' . str_replace(['storage/', 'public/'], '', $clean));
            } elseif (str_starts_with($receipt->storeLogo, 'data:image')) {
                $logoSrc = $receipt->storeLogo;
            }
        }
    @endphp

    <!-- Top Header -->
    <table class="header-table">
        <tr>
            <td style="width: 55%;">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" style="max-height: 38px; max-width: 130px; margin-bottom: 3px;" alt="Logo"><br>
                @endif
                <div class="store-title">{{ $receipt->storeName }}</div>
                <div class="store-sub">
                    @if($receipt->storeAddress)
                        <div>{{ $receipt->storeAddress }}</div>
                    @endif
                    @if($receipt->storePhone)
                        <div>Tel: {{ $receipt->storePhone }}</div>
                    @endif
                </div>
            </td>
            <td style="width: 45%; text-align: right;">
                <div class="invoice-title">Tax Invoice</div>
                <div class="invoice-meta">
                    <div><strong>Invoice #:</strong> {{ $receipt->receiptNumber }}</div>
                    <div><strong>Date & Time:</strong> {{ $receipt->dateTime }}</div>
                    <div><strong>Served By:</strong> {{ $receipt->cashierName }}</div>
                    <div><strong>Payment Mode:</strong> {{ strtoupper($receipt->paymentMethod) }}</div>
                    <div>
                        @if($receipt->isRefunded)
                            <span class="badge-refunded">Refunded</span>
                        @else
                            <span class="badge-paid">{{ strtoupper($receipt->paymentStatus) }}</span>
                        @endif
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Customer Details Card -->
    <table class="customer-card">
        <tr>
            <td>
                <div class="card-heading">Billed To (Customer)</div>
                <div class="customer-name">{{ $receipt->customerName ?: 'Walk-in Customer' }}</div>
                @if($receipt->customerPhone)
                    <div style="font-size: 10px; color: #475569; margin-top: 1px;">Phone: {{ $receipt->customerPhone }}</div>
                @endif
                @if($receipt->dealerName)
                    <div style="font-size: 10px; color: #475569; margin-top: 1px;">Dealer/Partner: {{ $receipt->dealerName }} ({{ $receipt->dealerPhone }})</div>
                @endif
            </td>
            <td>
                <div class="card-heading">Invoice Details</div>
                <div style="font-size: 10px; color: #334155;">
                    <div>Transaction ID: <strong>#{{ $receipt->receiptNumber }}</strong></div>
                    <div>Currency: <strong>{{ $receipt->currency }}</strong></div>
                    @if($receipt->isRepair)
                        <div>Service: <strong>Repair / Maintenance (Ticket #{{ $receipt->repairCode }})</strong></div>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <!-- Items & Devices Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 25px;" class="text-center">#</th>
                <th>Item & Specifications</th>
                <th>IMEI / Serial Number</th>
                <th class="text-center" style="width: 65px;">Warranty</th>
                <th class="text-right" style="width: 85px;">Unit Price</th>
                <th class="text-center" style="width: 35px;">Qty</th>
                <th class="text-right" style="width: 90px;">Total ({{ $receipt->currency }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach($receipt->items as $idx => $item)
                <tr>
                    <td class="text-center" style="color: #64748b;">{{ $idx + 1 }}</td>
                    <td>
                        <div class="item-desc">{{ $item['description'] }}</div>
                        @if(!empty($item['notes']))
                            <div style="font-size: 9px; color: #64748b;">{{ $item['notes'] }}</div>
                        @endif
                    </td>
                    <td>
                        @if(!empty($item['imei']))
                            <span class="imei-badge">{{ $item['imei'] }}</span>
                        @else
                            <span style="color: #94a3b8; font-size: 9px;">N/A</span>
                        @endif
                    </td>
                    <td class="text-center" style="font-size: 9.5px;">
                        @if(!empty($item['warranty_months']) && $item['warranty_months'] > 0)
                            <strong style="color: #059669;">{{ $item['warranty_months'] }} Mo</strong>
                        @else
                            <span style="color: #94a3b8;">None</span>
                        @endif
                    </td>
                    <td class="text-right">{{ number_format($item['unit_price']) }}</td>
                    <td class="text-center font-bold">{{ $item['quantity'] }}</td>
                    <td class="text-right font-bold">{{ number_format($item['total_price']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Full-Width Financial Totals Breakdown (Spans 100% across the paper) -->
    <table class="totals-table">
        <tr>
            <td style="color: #475569;">Subtotal:</td>
            <td class="text-right font-bold" style="font-family: 'Courier New', Courier, monospace;">
                {{ $receipt->currency }} {{ number_format($receipt->subtotal) }}
            </td>
        </tr>
        @if($receipt->discount > 0)
            <tr>
                <td style="color: #e11d48;">Discount / Markdown:</td>
                <td class="text-right font-bold" style="color: #e11d48; font-family: 'Courier New', Courier, monospace;">
                    -{{ $receipt->currency }} {{ number_format($receipt->discount) }}
                </td>
            </tr>
        @endif
        @if($receipt->tradeInValue > 0)
            <tr>
                <td style="color: #2563eb;">
                    <div style="font-weight: bold;">Trade-in Allowance</div>
                    @if(!empty($receipt->tradeInDevice))
                        <div style="font-size: 9px; color: #64748b; font-weight: normal;">
                            ↳ Device: {{ $receipt->tradeInDevice }}
                        </div>
                    @endif
                </td>
                <td class="text-right font-bold" style="color: #2563eb; font-family: 'Courier New', Courier, monospace; vertical-align: middle;">
                    -{{ $receipt->currency }} {{ number_format($receipt->tradeInValue) }}
                </td>
            </tr>
        @endif
        <tr class="grand-row">
            <td style="letter-spacing: 0.5px;">TOTAL DUE</td>
            <td class="text-right" style="font-family: 'Courier New', Courier, monospace;">
                {{ $receipt->currency }} {{ number_format($receipt->finalAmount) }}
            </td>
        </tr>
        @if(strtolower($receipt->paymentMethod) === 'cash' && $receipt->tenderedAmount > 0)
            <tr>
                <td style="color: #475569; font-size: 10px;">Amount Tendered ({{ strtoupper($receipt->paymentMethod) }}):</td>
                <td class="text-right font-bold" style="font-size: 10.5px; font-family: 'Courier New', Courier, monospace;">
                    {{ $receipt->currency }} {{ number_format($receipt->tenderedAmount) }}
                </td>
            </tr>
            <tr>
                <td style="color: #059669; font-weight: bold;">Change Returned:</td>
                <td class="text-right font-bold" style="color: #059669; font-family: 'Courier New', Courier, monospace;">
                    {{ $receipt->currency }} {{ number_format($receipt->changeDue) }}
                </td>
            </tr>
        @elseif(strtolower($receipt->paymentMethod) === 'layaway')
            <tr>
                <td style="color: #475569; font-size: 10px;">Total Paid to Date:</td>
                <td class="text-right font-bold" style="font-size: 10.5px; font-family: 'Courier New', Courier, monospace;">
                    {{ $receipt->currency }} {{ number_format($receipt->layawayPaid) }}
                </td>
            </tr>
            <tr>
                <td style="color: #dc2626; font-weight: bold;">Remaining Balance Due:</td>
                <td class="text-right font-bold" style="color: #dc2626; font-family: 'Courier New', Courier, monospace;">
                    {{ $receipt->currency }} {{ number_format($receipt->layawayBalance) }}
                </td>
            </tr>
        @endif
    </table>

    <!-- Stacked Section 2: Full-Width Warranty Policy & Store Terms -->
    <div style="width: 100%; box-sizing: border-box; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 10px; margin-bottom: 8px;">
        <div class="terms-title">
            Official Warranty Policy & Store Terms
        </div>
        @php
            $terms = $receipt->termsConditions;
            $half = ceil(count($terms) / 2);
            $termsCol1 = array_slice($terms, 0, $half);
            $termsCol2 = array_slice($terms, $half);
        @endphp
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                    <ul class="terms-list">
                        @foreach($termsCol1 as $term)
                            <li>{{ $term }}</li>
                        @endforeach
                    </ul>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                    <ul class="terms-list">
                        @foreach($termsCol2 as $term)
                            <li>{{ $term }}</li>
                        @endforeach
                    </ul>
                </td>
            </tr>
        </table>
    </div>

    <!-- Signatures and Official Stamp -->
    <table class="signatures-table">
        <tr>
            <td>
                <div style="height: 18px;"></div>
                <div class="sig-box">
                    <div class="sig-title">Customer Acceptance & Signature</div>
                    <div class="sig-sub">I confirm receipt of goods in good working condition</div>
                </div>
            </td>
            <td>
                <div style="height: 18px;"></div>
                <div class="sig-box">
                    <div class="sig-title">Authorized Store Stamp & Signature</div>
                    <div class="sig-sub">SmartPOS Sales & Verification Desk</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Footer Note -->
    <div class="footer-note">
        <strong>{{ $receipt->footerNote }}</strong> • This invoice serves as an official proof of purchase and warranty certificate. Powered by SmartPOS.
    </div>

</body>
</html>
