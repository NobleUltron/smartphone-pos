<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Official Receipt - #{{ $payment->receipt_number }}</title>
    <style>
        @page {
            margin: 10mm 14mm;
            size: a4 portrait;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.45;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
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
            color: #15803d;
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
        .receipt-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px 22px;
            margin-bottom: 20px;
        }
        .row-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .row-table td {
            padding: 6px 0;
            border-bottom: 1px dashed #cbd5e1;
        }
        .row-label {
            width: 30%;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        .row-value {
            width: 70%;
            color: #0f172a;
            font-size: 11.5px;
            font-weight: 600;
        }
        .highlight-amount {
            background: #dcfce7;
            border: 1px solid #86efac;
            border-radius: 6px;
            padding: 12px 16px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .highlight-amount-text {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #166534;
        }
        .highlight-amount-val {
            font-size: 20px;
            font-weight: 900;
            color: #15803d;
            font-family: monospace;
        }
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 40px;
        }
        .signatures-table td {
            width: 50%;
            vertical-align: top;
            padding: 0 15px;
        }
        .sig-line {
            border-bottom: 1px dashed #94a3b8;
            height: 50px;
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
                    <strong>Email:</strong> {{ $settings['store_email'] ?? 'accounts@smartpos.ug' }}<br>
                    @if(!empty($settings['tin_number']))
                        <strong>TIN:</strong> {{ $settings['tin_number'] }}
                    @endif
                </div>
            </td>
            <td style="width: 45%;">
                <div class="doc-title">OFFICIAL RECEIPT</div>
                <div class="doc-meta">
                    <strong>Receipt No:</strong> #{{ $payment->receipt_number }}<br>
                    <strong>Payment Date:</strong> {{ \Carbon\Carbon::parse($payment->payment_date)->format('d M Y') }}<br>
                    <strong>Invoice Ref:</strong> #{{ $payment->invoice->invoice_number }}<br>
                    <strong>Issued By:</strong> {{ $payment->user->name ?? 'Cashier' }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Receipt Details Card -->
    <div class="receipt-card">
        <table class="row-table">
            <tr>
                <td class="row-label">Received From:</td>
                <td class="row-value">
                    <span style="font-size: 13px; font-weight: 800; color: #0f172a;">
                        {{ $payment->invoice->customer->company_name ?: ($payment->invoice->customer->name ?? 'Valued Client') }}
                    </span>
                    @if($payment->invoice->customer && $payment->invoice->customer->company_name && $payment->invoice->customer->name)
                        <div style="font-size: 10px; color: #64748b; font-weight: normal;">Contact Person: {{ $payment->invoice->customer->name }}</div>
                    @endif
                </td>
            </tr>
            <tr>
                <td class="row-label">Payment Towards:</td>
                <td class="row-value">
                    Tax Invoice #{{ $payment->invoice->invoice_number }}
                    @if($payment->invoice->po_number)
                        (Client PO: {{ $payment->invoice->po_number }})
                    @endif
                </td>
            </tr>
            <tr>
                <td class="row-label">Payment Method:</td>
                <td class="row-value">
                    <strong>{{ $payment->payment_method }}</strong>
                    @if($payment->paymentAccount)
                        <span style="color: #64748b; font-size: 10.5px;">(Account: {{ $payment->paymentAccount->name }})</span>
                    @endif
                </td>
            </tr>
            @if($payment->transaction_reference)
                <tr>
                    <td class="row-label">Transaction / Wire Ref:</td>
                    <td class="row-value font-mono">
                        {{ $payment->transaction_reference }}
                    </td>
                </tr>
            @endif
            @if($payment->notes)
                <tr>
                    <td class="row-label">Notes / Remarks:</td>
                    <td class="row-value" style="color: #475569;">
                        {{ $payment->notes }}
                    </td>
                </tr>
            @endif
        </table>

        <!-- Amount Box -->
        <table style="width: 100%; background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; margin-top: 15px;">
            <tr>
                <td style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534;">
                    Amount Received:
                </td>
                <td style="text-align: right; font-size: 18px; font-weight: 900; color: #15803d; font-family: monospace;">
                    {{ $settings['currency_symbol'] ?? 'UGX' }} {{ number_format($payment->amount) }}
                </td>
            </tr>
        </table>

        <!-- Invoice Balance Summary -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10.5px;">
            <tr>
                <td style="padding: 4px 0; color: #64748b;">Total Invoice Amount:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: bold; font-family: monospace;">
                    {{ $settings['currency_symbol'] ?? 'UGX' }} {{ number_format($payment->invoice->total_amount) }}
                </td>
            </tr>
            <tr>
                <td style="padding: 4px 0; color: #64748b;">Total Paid to Date:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #15803d; font-family: monospace;">
                    {{ $settings['currency_symbol'] ?? 'UGX' }} {{ number_format($payment->invoice->paid_amount) }}
                </td>
            </tr>
            <tr style="border-top: 1px solid #cbd5e1; font-weight: 800;">
                <td style="padding: 6px 0; color: #0f172a;">Remaining Balance on Invoice:</td>
                <td style="padding: 6px 0; text-align: right; color: {{ $payment->invoice->balance_due > 0 ? '#b91c1c' : '#15803d' }}; font-family: monospace; font-size: 12px;">
                    {{ $settings['currency_symbol'] ?? 'UGX' }} {{ number_format($payment->invoice->balance_due) }}
                </td>
            </tr>
        </table>
    </div>

    <!-- Signatures -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Received By: {{ $payment->user->name ?? 'Cashier / Finance' }}</div>
                <div style="font-size: 9px; color: #94a3b8;">Official Signature & Stamp</div>
            </td>
            <td>
                <div class="sig-line"></div>
                <div class="sig-label">Payer Confirmation</div>
                <div style="font-size: 9px; color: #94a3b8;">Client Representative</div>
            </td>
        </tr>
    </table>

</body>
</html>
