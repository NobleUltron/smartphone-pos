<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Receipt - #{{ $receipt->receiptNumber }}</title>
    <style>
        @page {
            margin: 10mm 12mm;
            size: a4 portrait;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
        }
        .header-table td {
            vertical-align: top;
        }
        .store-title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }
        .store-sub {
            font-size: 10px;
            color: #475569;
            line-height: 1.35;
        }
        .doc-title {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
        }
        .doc-meta {
            font-size: 10px;
            color: #475569;
            text-align: right;
            line-height: 1.4;
        }
        .status-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 4px;
            margin-top: 3px;
        }
        .status-paid { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .status-partial { background: #fef9c3; color: #a16207; border: 1px solid #fde047; }
        .status-refunded { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
        .status-pending { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .meta-table td {
            vertical-align: top;
            width: 50%;
        }
        .box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            min-height: 85px;
        }
        .box-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
        }
        .client-name {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 7px 8px;
            border: 1px solid #0f172a;
            text-align: left;
            white-space: nowrap;
        }
        .items-table th.text-right, .items-table td.text-right {
            text-align: right;
            white-space: nowrap;
        }
        .items-table th.text-center, .items-table td.text-center {
            text-align: center;
        }
        .items-table td {
            padding: 7px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10.5px;
            vertical-align: top;
        }
        .items-table tr:nth-child(even) td {
            background: #f8fafc;
        }
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
            margin-top: 5px;
            margin-bottom: 15px;
        }
        .totals-table td {
            vertical-align: top;
        }
        .totals-box {
            width: 100%;
            border-collapse: collapse;
        }
        .totals-box td {
            padding: 4px 8px;
            font-size: 11px;
        }
        .totals-box .label {
            text-align: right;
            color: #64748b;
            font-weight: 600;
            white-space: nowrap;
            padding-right: 12px;
        }
        .totals-box .value {
            text-align: right;
            font-weight: bold;
            color: #0f172a;
            white-space: nowrap;
        }
        .totals-box .grand-total td {
            background: #f1f5f9;
            border-top: 2px solid #0f172a;
            border-bottom: 1px solid #cbd5e1;
            padding: 6px 8px;
        }
        .totals-box .grand-total .label {
            font-size: 11.5px;
            font-weight: 900;
            color: #0f172a;
            white-space: nowrap;
        }
        .totals-box .grand-total .value {
            font-size: 12.5px;
            font-weight: 900;
            color: #0f172a;
            white-space: nowrap;
        }
        .totals-box .balance-row td {
            background: #fff1f2;
            border-top: 1px solid #fecdd3;
            border-bottom: 2px solid #e11d48;
            padding: 6px 8px;
        }
        .totals-box .balance-row .label {
            font-size: 11.5px;
            font-weight: 900;
            color: #be123c;
            white-space: nowrap;
        }
        .totals-box .balance-row .value {
            font-size: 12.5px;
            font-weight: 900;
            color: #be123c;
            white-space: nowrap;
        }

        .terms-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 15px;
            font-size: 8.5px;
            color: #475569;
            line-height: 1.35;
        }
        .terms-title {
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }
        .terms-list {
            margin: 0;
            padding-left: 12px;
        }
        .terms-list li {
            margin-bottom: 2px;
        }

        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            page-break-inside: avoid;
        }
        .signatures-table td {
            width: 50%;
            vertical-align: top;
            padding: 0 15px;
        }
        .sig-line {
            border-bottom: 1px dashed #94a3b8;
            height: 38px;
            margin-bottom: 5px;
        }
        .sig-label {
            font-size: 9.5px;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
        }
        .sig-sub {
            font-size: 8px;
            color: #94a3b8;
        }
        .footer-note {
            text-align: center;
            font-size: 8.5px;
            color: #64748b;
            margin-top: 10px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 5px;
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
        $storeEmail = $receipt->storeEmail ?? \App\Models\Setting::get('store_email', \App\Models\Setting::get('shop_email'));
        $tinNumber = $receipt->tinNumber ?? \App\Models\Setting::get('tin_number');
    @endphp

    <!-- Top Header -->
    <table class="header-table">
        <tr>
            <td style="width: 55%;">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" style="max-height: 42px; max-width: 150px; margin-bottom: 4px;" alt="Logo"><br>
                @endif
                <div class="store-title">{{ $receipt->storeName }}</div>
                <div class="store-sub">
                    @if($receipt->storeAddress)
                        {{ $receipt->storeAddress }}<br>
                    @endif
                    @if($receipt->storePhone)
                        <strong>Tel:</strong> {{ $receipt->storePhone }}
                    @endif
                    @if(!empty($storeEmail))
                        @if($receipt->storePhone) | @endif <strong>Email:</strong> {{ $storeEmail }}
                    @endif
                    <br>
                    @if(!empty($tinNumber))
                        <strong>Vendor TIN:</strong> {{ $tinNumber }}
                    @endif
                </div>
            </td>
            <td style="width: 45%;">
                <div class="doc-title">RETAIL SALES RECEIPT</div>
                <div class="doc-meta">
                    <strong>Receipt No:</strong> #{{ $receipt->receiptNumber }}<br>
                    <strong>Date & Time:</strong> {{ $receipt->dateTime }}<br>
                    <strong>Cashier:</strong> {{ $receipt->cashierName }}<br>
                    <strong>Payment Mode:</strong> {{ strtoupper($receipt->paymentMethod) }}<br>
                    @if($receipt->isRefunded)
                        <span class="status-badge status-refunded">Refunded</span>
                    @elseif(strtolower($receipt->paymentStatus) === 'partial')
                        <span class="status-badge status-partial">Partial Payment</span>
                    @elseif(strtolower($receipt->paymentStatus) === 'pending')
                        <span class="status-badge status-pending">Pending</span>
                    @else
                        <span class="status-badge status-paid">{{ strtoupper($receipt->paymentStatus) }}</span>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <!-- Customer Details & Transaction Info Cards -->
    <table class="meta-table">
        <tr>
            <td style="padding-right: 8px;">
                <div class="box">
                    <div class="box-title">Billed To / Customer</div>
                    <div class="client-name">
                        {{ $receipt->customerName ?: 'Walk-in Customer' }}
                    </div>
                    @if($receipt->customerPhone)
                        <div style="font-size: 10px; color: #475569; margin-top: 2px;">
                            <strong>Phone:</strong> {{ $receipt->customerPhone }}
                        </div>
                    @endif
                    @if($receipt->dealerName)
                        <div style="font-size: 10px; color: #475569; margin-top: 2px;">
                            <strong>Dealer/Partner:</strong> {{ $receipt->dealerName }} @if($receipt->dealerPhone)({{ $receipt->dealerPhone }})@endif
                        </div>
                    @endif
                </div>
            </td>
            <td style="padding-left: 8px;">
                <div class="box">
                    <div class="box-title">Transaction & Receipt Info</div>
                    <div style="font-size: 10px; color: #334155; line-height: 1.45;">
                        <strong>Transaction ID:</strong> #{{ $receipt->receiptNumber }}<br>
                        <strong>Currency:</strong> {{ $receipt->currency }}<br>
                        <strong>Payment Method:</strong> {{ strtoupper($receipt->paymentMethod) }}<br>
                        @if($receipt->isRepair)
                            <strong>Service:</strong> Repair Ticket #{{ $receipt->repairCode }} ({{ $receipt->repairDevice }})
                        @endif
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 4%;" class="text-center">#</th>
                <th style="width: 38%;">Description & Specifications</th>
                <th style="width: 20%;">IMEI / Serial Number</th>
                <th style="width: 10%;" class="text-center">Warranty</th>
                <th style="width: 13%;" class="text-right">Unit Price ({{ $receipt->currency }})</th>
                <th style="width: 4%;" class="text-center">Qty</th>
                <th style="width: 14%;" class="text-right">Total ({{ $receipt->currency }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach($receipt->items as $idx => $item)
                <tr>
                    <td class="text-center" style="color: #64748b; font-weight: bold;">{{ $idx + 1 }}</td>
                    <td>
                        <div class="item-desc">{{ $item['description'] }}</div>
                        @if(!empty($item['notes']))
                            <div style="font-size: 9px; color: #64748b; margin-top: 1px;">{!! nl2br(e($item['notes'])) !!}</div>
                        @endif
                    </td>
                    <td>
                        @if(!empty($item['imei']))
                            <span class="imei-badge">{{ $item['imei'] }}</span>
                        @else
                            <span style="color: #94a3b8; font-size: 9px;">Standard Stock</span>
                        @endif
                    </td>
                    <td class="text-center">
                        @if(!empty($item['warranty_months']) && $item['warranty_months'] > 0)
                            <span style="color: #15803d; font-weight: bold; background: #dcfce7; padding: 1px 5px; border-radius: 3px; font-size: 9px; border: 1px solid #86efac;">
                                {{ $item['warranty_months'] }} Mo
                            </span>
                        @else
                            <span style="color: #94a3b8; font-size: 9px;">None</span>
                        @endif
                    </td>
                    <td class="text-right font-mono" style="white-space: nowrap;">{{ number_format($item['unit_price']) }}</td>
                    <td class="text-center" style="font-weight: bold;">{{ $item['quantity'] }}</td>
                    <td class="text-right font-mono" style="font-weight: bold; white-space: nowrap;">{{ number_format($item['total_price']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals & Payment Summary Table -->
    <table class="totals-table">
        <tr>
            <td style="width: 48%; padding-right: 15px;">
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 9.5px; line-height: 1.45;">
                    <strong style="color: #0f172a; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px;">Payment & Settlement:</strong>
                    <div style="color: #475569; margin-top: 3px;">
                        <div>Mode of Payment: <strong>{{ strtoupper($receipt->paymentMethod) }}</strong></div>
                        <div>Served by Cashier: <strong>{{ $receipt->cashierName }}</strong></div>
                        <div>Transaction Reference: <strong>#{{ $receipt->receiptNumber }}</strong></div>
                        @if($receipt->tradeInValue > 0 && !empty($receipt->tradeInDevice))
                            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dotted #cbd5e1; color: #2563eb;">
                                Trade-in Device: <strong>{{ $receipt->tradeInDevice }}</strong>
                            </div>
                        @endif
                    </div>
                </div>
            </td>
            <td style="width: 52%;">
                <table class="totals-box">
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="value font-mono">{{ number_format($receipt->subtotal) }} {{ $receipt->currency }}</td>
                    </tr>
                    @if($receipt->discount > 0)
                        <tr>
                            <td class="label" style="color: #e11d48;">Discount / Markdown:</td>
                            <td class="value font-mono" style="color: #e11d48;">-{{ number_format($receipt->discount) }} {{ $receipt->currency }}</td>
                        </tr>
                    @endif
                    @if($receipt->tradeInValue > 0)
                        <tr>
                            <td class="label" style="color: #2563eb;">Trade-in Allowance:</td>
                            <td class="value font-mono" style="color: #2563eb;">-{{ number_format($receipt->tradeInValue) }} {{ $receipt->currency }}</td>
                        </tr>
                    @endif
                    <tr class="grand-total">
                        <td class="label">TOTAL DUE:</td>
                        <td class="value font-mono">{{ number_format($receipt->finalAmount) }} {{ $receipt->currency }}</td>
                    </tr>
                    @if(strtolower($receipt->paymentMethod) === 'cash' && $receipt->tenderedAmount > 0)
                        <tr>
                            <td class="label">Amount Tendered (CASH):</td>
                            <td class="value font-mono">{{ number_format($receipt->tenderedAmount) }} {{ $receipt->currency }}</td>
                        </tr>
                        <tr>
                            <td class="label" style="color: #15803d; font-weight: bold;">Change Returned:</td>
                            <td class="value font-mono" style="color: #15803d; font-weight: bold; font-size: 11.5px;">{{ number_format($receipt->changeDue) }} {{ $receipt->currency }}</td>
                        </tr>
                    @elseif(strtolower($receipt->paymentMethod) === 'layaway' || $receipt->isRepair)
                        <tr>
                            <td class="label" style="color: #15803d;">Total Paid to Date:</td>
                            <td class="value font-mono" style="color: #15803d;">{{ number_format($receipt->layawayPaid) }} {{ $receipt->currency }}</td>
                        </tr>
                        @if($receipt->layawayBalance > 0)
                            <tr class="balance-row">
                                <td class="label">REMAINING BALANCE:</td>
                                <td class="value font-mono">{{ number_format($receipt->layawayBalance) }} {{ $receipt->currency }}</td>
                            </tr>
                        @else
                            <tr>
                                <td class="label" style="color: #15803d; font-weight: bold;">Balance Due:</td>
                                <td class="value font-mono" style="color: #15803d; font-weight: bold;">0 {{ $receipt->currency }} (FULLY PAID)</td>
                            </tr>
                        @endif
                    @endif
                </table>
            </td>
        </tr>
    </table>

    <!-- Warranty Policy & Store Terms -->
    @if(!empty($receipt->termsConditions) && count($receipt->termsConditions) > 0)
        @php
            $terms = $receipt->termsConditions;
            $half = ceil(count($terms) / 2);
            $termsCol1 = array_slice($terms, 0, $half);
            $termsCol2 = array_slice($terms, $half);
        @endphp
        <div class="terms-section">
            <div class="terms-title">Official Warranty Policy & Store Terms</div>
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
    @endif

    <!-- Signatures and Official Stamp -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Customer Acceptance & Signature</div>
                <div class="sig-sub">I confirm items received in good order & accept warranty terms</div>
            </td>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Store Stamp & Signature</div>
                <div class="sig-sub">SmartPOS Sales & Verification Desk</div>
            </td>
        </tr>
    </table>

    <!-- Footer Note -->
    <div class="footer-note">
        <strong>{{ $receipt->footerNote }}</strong> • This receipt serves as an official proof of purchase and warranty certificate. Powered by SmartPOS.
    </div>

</body>
</html>
