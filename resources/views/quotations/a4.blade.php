<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quotation - #{{ $quotation->quotation_number }}</title>
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
            color: #2563eb;
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
            font-size: 9px;
            font-weight: bold;
            padding: 2px 5px;
            border-radius: 3px;
            text-transform: uppercase;
        }
        .tag-product {
            display: inline-block;
            background: #f1f5f9;
            color: #475569;
            font-size: 9px;
            font-weight: bold;
            padding: 2px 5px;
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
            width: 45%;
            margin-left: auto;
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
        }
        .totals-box .value {
            text-align: right;
            font-weight: bold;
            color: #0f172a;
        }
        .totals-box .grand-total {
            background: #eff6ff;
            border-top: 2px solid #2563eb;
            border-bottom: 2px solid #2563eb;
            font-size: 13px;
            font-weight: 900;
            color: #1e40af;
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
                    <strong>Tel:</strong> {{ $settings['store_phone'] ?? '+256 700 000 000' }} | 
                    <strong>Email:</strong> {{ $settings['store_email'] ?? 'sales@smartpos.ug' }}<br>
                    @if(!empty($settings['tin_number']))
                        <strong>TIN:</strong> {{ $settings['tin_number'] }}
                    @endif
                </div>
            </td>
            <td style="width: 45%;">
                <div class="doc-title">QUOTATION</div>
                <div class="doc-meta">
                    <strong>Quote Ref:</strong> #{{ $quotation->quotation_number }}<br>
                    <strong>Issue Date:</strong> {{ \Carbon\Carbon::parse($quotation->issue_date)->format('d M Y') }}<br>
                    <strong>Valid Until:</strong> <span style="color: #b91c1c; font-weight: bold;">{{ \Carbon\Carbon::parse($quotation->valid_until)->format('d M Y') }}</span><br>
                    <strong>Prepared By:</strong> {{ $quotation->user->name ?? 'Sales Representative' }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Client and Meta Info -->
    <table class="meta-table">
        <tr>
            <td style="padding-right: 8px;">
                <div class="box">
                    <div class="box-title">Client Details / Quotation For</div>
                    <div class="client-name">
                        {{ $quotation->customer->company_name ?: ($quotation->customer->name ?? 'Valued Corporate Client') }}
                    </div>
                    @if($quotation->customer && $quotation->customer->company_name && $quotation->customer->name)
                        <div style="font-weight: 600; color: #475569; font-size: 10px;">Attn: {{ $quotation->customer->name }}</div>
                    @endif
                    <div style="color: #475569; font-size: 10px; margin-top: 2px;">
                        @if($quotation->customer?->phone) Phone: {{ $quotation->customer->phone }}<br> @endif
                        @if($quotation->customer?->email) Email: {{ $quotation->customer->email }}<br> @endif
                        @if($quotation->customer?->tin_number) <strong>Client TIN:</strong> {{ $quotation->customer->tin_number }}<br> @endif
                        @if($quotation->customer?->address) Address: {{ $quotation->customer->address }} @endif
                    </div>
                </div>
            </td>
            <td style="padding-left: 8px;">
                <div class="box">
                    <div class="box-title">Payment & Banking Details</div>
                    <div style="font-size: 10px; color: #334155; line-height: 1.45;">
                        <strong>Bank:</strong> {{ $settings['bank_name'] ?? 'Stanbic Bank Uganda' }}<br>
                        <strong>Account Name:</strong> {{ $settings['bank_account_name'] ?? ($settings['store_name'] ?? 'SmartPOS Tech Ltd') }}<br>
                        <strong>Account No:</strong> {{ $settings['bank_account_number'] ?? '9030012345678' }}<br>
                        <strong>Currency:</strong> {{ $settings['currency_symbol'] ?? 'UGX' }}<br>
                        @if(!empty($settings['momo_merchant_code']))
                            <strong>Mobile Money Merchant Code:</strong> {{ $settings['momo_merchant_code'] }}
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
                <th style="width: 5%;" class="text-center">#</th>
                <th style="width: 50%;">Description / Item Specification</th>
                <th style="width: 10%;" class="text-center">Type</th>
                <th style="width: 10%;" class="text-center">Qty</th>
                <th style="width: 12%;" class="text-right">Unit Price ({{ $settings['currency_symbol'] ?? 'UGX' }})</th>
                <th style="width: 13%;" class="text-right">Total ({{ $settings['currency_symbol'] ?? 'UGX' }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quotation->items as $index => $item)
                <tr>
                    <td class="text-center" style="color: #64748b; font-weight: bold;">{{ $index + 1 }}</td>
                    <td>
                        <strong style="color: #0f172a;">{{ $item->item_name }}</strong>
                        @if($item->description)
                            <div style="color: #64748b; font-size: 9.5px; margin-top: 1px;">{!! nl2br(e($item->description)) !!}</div>
                        @endif
                    </td>
                    <td class="text-center">
                        <span class="{{ $item->type === 'service' ? 'tag-service' : 'tag-product' }}">
                            {{ $item->type }}
                        </span>
                    </td>
                    <td class="text-center" style="font-weight: bold;">{{ $item->quantity }}</td>
                    <td class="text-right font-mono">{{ number_format($item->unit_price) }}</td>
                    <td class="text-right font-mono" style="font-weight: bold;">{{ number_format($item->total_price) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals Table -->
    <table class="totals-table">
        <tr>
            <td style="width: 55%; padding-right: 15px;">
                @if($quotation->notes)
                    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px; font-size: 9.5px;">
                        <strong style="color: #334155;">Special Notes:</strong>
                        <div style="color: #64748b; margin-top: 2px;">{!! nl2br(e($quotation->notes)) !!}</div>
                    </div>
                @endif
            </td>
            <td style="width: 45%;">
                <table class="totals-box">
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="value font-mono">{{ number_format($quotation->subtotal) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                    </tr>
                    @if($quotation->discount > 0)
                        <tr>
                            <td class="label" style="color: #15803d;">Discount:</td>
                            <td class="value font-mono" style="color: #15803d;">-{{ number_format($quotation->discount) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                        </tr>
                    @endif
                    @if($quotation->tax_amount > 0)
                        <tr>
                            <td class="label">VAT / Tax ({{ $quotation->tax_rate }}%):</td>
                            <td class="value font-mono">+{{ number_format($quotation->tax_amount) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                        </tr>
                    @endif
                    <tr class="grand-total">
                        <td class="label" style="color: #1e40af; font-size: 12px; font-weight: 800;">TOTAL QUOTATION:</td>
                        <td class="value font-mono" style="color: #1e40af; font-size: 13px;">{{ number_format($quotation->total_amount) }} {{ $settings['currency_symbol'] ?? 'UGX' }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Terms and Conditions -->
    @if($quotation->terms_conditions)
        <div class="terms-section">
            <div class="terms-title">Terms & Conditions of Quote</div>
            {!! nl2br(e($quotation->terms_conditions)) !!}
        </div>
    @endif

    <!-- Acceptance & Signature -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Issued By: {{ $quotation->user->name ?? 'Sales Officer' }}</div>
                <div style="font-size: 9px; color: #94a3b8;">For {{ $settings['store_name'] ?? 'SmartPOS' }}</div>
            </td>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Client Acceptance & Official Stamp</div>
                <div style="font-size: 9px; color: #94a3b8;">Authorized Signature / Date</div>
            </td>
        </tr>
    </table>

</body>
</html>
