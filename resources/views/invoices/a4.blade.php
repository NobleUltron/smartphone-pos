<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - #{{ $invoice->invoice_number }}</title>
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
        .status-unpaid { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
        .status-overdue { background: #f43f5e; color: #ffffff; }

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
            min-height: 90px;
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
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            border: 1px solid #0f172a;
            text-align: left;
        }
        .items-table th.text-right, .items-table td.text-right {
            text-align: right;
        }
        .items-table th.text-center, .items-table td.text-center {
            text-align: center;
        }
        .items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10.5px;
        }
        .items-table tr:nth-child(even) td {
            background: #f8fafc;
        }
        .tag-service {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            font-size: 8px;
            font-weight: bold;
            padding: 1px 5px;
            border-radius: 3px;
            text-transform: uppercase;
        }
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            margin-bottom: 20px;
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
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            white-space: nowrap;
        }
        .totals-box .balance-row td {
            background: #fff1f2;
            border-top: 1px solid #fecdd3;
            border-bottom: 2px solid #e11d48;
            padding: 7px 8px;
        }
        .totals-box .balance-row .label {
            font-size: 12px;
            font-weight: 900;
            color: #be123c;
            white-space: nowrap;
        }
        .totals-box .balance-row .value {
            font-size: 13.5px;
            font-weight: 900;
            color: #be123c;
            white-space: nowrap;
        }
        .terms-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 20px;
            font-size: 9.5px;
            color: #475569;
            line-height: 1.45;
        }
        .terms-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            margin-bottom: 5px;
        }
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
        }
        .signatures-table td {
            width: 50%;
            vertical-align: top;
            padding: 0 15px;
        }
        .sig-line {
            border-bottom: 1px dashed #94a3b8;
            height: 45px;
            margin-bottom: 5px;
        }
        .sig-label {
            font-size: 9.5px;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="width: 55%;">
                <div class="store-title">{{ $settings['store_name'] ?? 'SMARTPHONE POS & SERVICE CENTER' }}</div>
                <div class="store-sub">
                    {{ $settings['store_address'] ?? 'Plot 12 Kampala Road, Kampala, Uganda' }}<br>
                    <strong>Tel:</strong> {{ $settings['store_phone'] ?? '+256 700 000 000' }}@if(!empty($settings['store_email']) || !empty($settings['shop_email'])) | <strong>Email:</strong> {{ $settings['store_email'] ?? $settings['shop_email'] }}@endif<br>
                    @if(!empty($settings['tin_number']))
                        <strong>Vendor TIN:</strong> {{ $settings['tin_number'] }}
                    @endif
                </div>
            </td>
            <td style="width: 45%;">
                <div class="doc-title">TAX INVOICE</div>
                <div class="doc-meta">
                    <strong>Invoice No:</strong> #{{ $invoice->invoice_number }}<br>
                    @if($invoice->po_number)
                        <strong>Client PO Ref:</strong> {{ $invoice->po_number }}<br>
                    @endif
                    <strong>Issue Date:</strong> {{ \Carbon\Carbon::parse($invoice->issue_date)->format('d M Y') }}<br>
                    <strong>Payment Due Date:</strong> <span style="font-weight: bold; color: #b91c1c;">{{ \Carbon\Carbon::parse($invoice->due_date)->format('d M Y') }}</span><br>
                    <strong>Terms:</strong> {{ $invoice->payment_terms }}<br>
                    <span class="status-badge status-{{ strtolower($invoice->payment_status) }}">
                        Status: {{ $invoice->payment_status }}
                    </span>
                </div>
            </td>
        </tr>
    </table>

    <!-- Client and Bank Details -->
    <table class="meta-table">
        <tr>
            <td style="padding-right: 8px;">
                <div class="box">
                    <div class="box-title">Invoiced To / Buyer</div>
                    <div class="client-name">
                        {{ $invoice->customer->company_name ?: ($invoice->customer->name ?? 'Corporate Client') }}
                    </div>
                    @if($invoice->customer && $invoice->customer->company_name && $invoice->customer->name)
                        <div style="font-weight: 600; color: #475569; font-size: 10px;">Contact Person: {{ $invoice->customer->name }}</div>
                    @endif
                    <div style="color: #475569; font-size: 10px; margin-top: 2px;">
                        @if($invoice->customer?->phone) Phone: {{ $invoice->customer->phone }}<br> @endif
                        @if($invoice->customer?->email) Email: {{ $invoice->customer->email }}<br> @endif
                        @if($invoice->customer?->tin_number) <strong>Buyer TIN:</strong> {{ $invoice->customer->tin_number }}<br> @endif
                        @if($invoice->customer?->address) Address: {{ $invoice->customer->address }} @endif
                    </div>
                </div>
            </td>
            <td style="padding-left: 8px;">
                <div class="box">
                    <div class="box-title">Bank Remittance Instructions</div>
                    <div style="font-size: 10px; color: #334155; line-height: 1.45;">
                        <strong>Bank:</strong> {{ $settings['bank_name'] ?? 'Stanbic Bank Uganda' }}<br>
                        <strong>Account Name:</strong> {{ $settings['bank_account_name'] ?? ($settings['store_name'] ?? 'SmartPOS Tech Ltd') }}<br>
                        <strong>Account No:</strong> {{ $settings['bank_account_number'] ?? '9030012345678' }}<br>
                        <strong>Currency:</strong> {{ $settings['currency_symbol'] ?? 'UGX' }}<br>
                        <em>Please quote Invoice #{{ $invoice->invoice_number }} as your payment reference.</em>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;" class="text-center">#</th>
                <th style="width: 55%;">Description / Item Specification</th>
                <th style="width: 10%;" class="text-center">Qty</th>
                <th style="width: 15%;" class="text-right">Unit Price ({{ $settings['currency_symbol'] ?? 'UGX' }})</th>
                <th style="width: 15%;" class="text-right">Total ({{ $settings['currency_symbol'] ?? 'UGX' }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
                <tr>
                    <td class="text-center" style="color: #64748b; font-weight: bold;">{{ $index + 1 }}</td>
                    <td>
                        <strong style="color: #0f172a;">{{ $item->item_name }}</strong>
                        @if($item->type === 'service')
                            <span class="tag-service" style="margin-left: 5px;">SERVICE</span>
                        @endif
                        @if($item->description)
                            <div style="color: #64748b; font-size: 9.5px; margin-top: 2px;">{!! nl2br(e($item->description)) !!}</div>
                        @endif
                    </td>
                    <td class="text-center" style="font-weight: bold;">{{ $item->quantity }}</td>
                    <td class="text-right font-mono" style="white-space: nowrap;">{{ number_format($item->unit_price) }}</td>
                    <td class="text-right font-mono" style="font-weight: bold; white-space: nowrap;">{{ number_format($item->total_price) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals Table -->
    <table class="totals-table">
        <tr>
            <td style="width: 50%; padding-right: 20px;">
                @if($invoice->notes)
                    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; font-size: 9.5px;">
                        <strong style="color: #334155;">Notes / Reference:</strong>
                        <div style="color: #64748b; margin-top: 3px; line-height: 1.4;">{!! nl2br(e($invoice->notes)) !!}</div>
                    </div>
                @endif
            </td>
            <td style="width: 50%;">
                <table class="totals-box">
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="value font-mono">{{ number_format($invoice->subtotal) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                    </tr>
                    @if($invoice->discount > 0)
                        <tr>
                            <td class="label" style="color: #15803d;">Discount:</td>
                            <td class="value font-mono" style="color: #15803d;">-{{ number_format($invoice->discount) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                        </tr>
                    @endif
                    @if($invoice->tax_amount > 0)
                        <tr>
                            <td class="label">VAT / Tax ({{ $invoice->tax_rate }}%):</td>
                            <td class="value font-mono">+{{ number_format($invoice->tax_amount) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                        </tr>
                    @endif
                    <tr class="grand-total">
                        <td class="label">TOTAL INVOICE:</td>
                        <td class="value font-mono">{{ number_format($invoice->total_amount) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                    </tr>
                    <tr>
                        <td class="label" style="color: #15803d; font-weight: bold;">Paid to Date:</td>
                        <td class="value font-mono" style="color: #15803d;">-{{ number_format($invoice->paid_amount) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                    </tr>
                    <tr class="balance-row">
                        <td class="label">BALANCE DUE:</td>
                        <td class="value font-mono">{{ number_format($invoice->balance_due) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Terms and Conditions -->
    @if($invoice->terms_conditions)
        <div class="terms-section">
            <div class="terms-title">Commercial Terms & Payment Conditions</div>
            {!! nl2br(e($invoice->terms_conditions)) !!}
        </div>
    @endif

    <!-- Authorized Signature -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Signature & Store Stamp</div>
                <div style="font-size: 9px; color: #94a3b8;">For {{ $settings['store_name'] ?? 'SmartPOS Tech Ltd' }}</div>
            </td>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Goods Received in Good Condition By (Client)</div>
                <div style="font-size: 9px; color: #94a3b8;">Signature / Date / Company Stamp</div>
            </td>
        </tr>
    </table>

</body>
</html>
