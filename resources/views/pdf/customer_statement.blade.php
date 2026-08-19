<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Customer Statement — {{ $customer->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9.5pt;
            color: #1e293b;
            background: #fff;
            padding: 28px 32px;
        }

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
        .doc-title { text-align: right; }
        .doc-title h1 {
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
        }
        .doc-title p { font-size: 8pt; color: #64748b; margin-top: 3px; }

        .info-table {
            width: 100%;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
        }
        .info-table td { padding: 10px 12px; vertical-align: top; width: 50%; }
        .info-title { font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .info-name { font-size: 11pt; font-weight: bold; color: #0f172a; }
        .info-detail { font-size: 8.5pt; color: #334155; margin-top: 2px; }

        .metrics-table {
            width: 100%;
            margin-bottom: 20px;
            border-spacing: 8px;
            margin-left: -8px;
            margin-right: -8px;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
        }
        .metric-card.highlight { background: #fef2f2; border-color: #fca5a5; }
        .metric-card.success { background: #f0fdf4; border-color: #86efac; }
        .metric-label { font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
        .metric-value { font-size: 12pt; font-weight: bold; color: #0f172a; }
        .metric-card.highlight .metric-value { color: #dc2626; }
        .metric-card.success .metric-value { color: #166534; }

        .section-heading {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            padding: 7px 8px;
            text-align: left;
        }
        .items-table td {
            padding: 7px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 8.5pt;
            color: #334155;
            vertical-align: middle;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 7pt;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-paid { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-refunded { background: #fee2e2; color: #991b1b; }

        .signatures-table {
            width: 100%;
            margin-top: 30px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 15px;
        }
        .signatures-table td { width: 50%; vertical-align: top; padding: 0 15px; }
        .sig-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #fafafa; }
        .sig-title { font-size: 8pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 30px; }
        .sig-line { border-bottom: 1px solid #64748b; margin-bottom: 6px; }
        .sig-name { font-size: 7.5pt; color: #64748b; }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="width: 60%;">
                <div class="shop-name">{{ $settings['shop_name'] }}</div>
                <div class="shop-sub">{{ $settings['shop_address'] }} | Phone: {{ $settings['shop_phone'] }}</div>
            </td>
            <td class="doc-title" style="width: 40%;">
                <h1>CUSTOMER STATEMENT</h1>
                <p>Date Generated: {{ date('d M Y, h:i A') }}</p>
                <p>Account Ref: <strong>CUST-{{ $customer->id }}</strong></p>
            </td>
        </tr>
    </table>

    <!-- Customer Details & Summary -->
    <table class="info-table">
        <tr>
            <td style="border-right: 1px solid #e2e8f0;">
                <div class="info-title">Customer Information</div>
                <div class="info-name">{{ $customer->name }}</div>
                <div class="info-detail">Phone: {{ $customer->phone }}</div>
                @if($customer->email)
                    <div class="info-detail">Email: {{ $customer->email }}</div>
                @endif
                @if($customer->address)
                    <div class="info-detail">Address: {{ $customer->address }}</div>
                @endif
            </td>
            <td>
                <div class="info-title">Account Summary</div>
                <div class="info-detail">Total Purchases: <strong>{{ $summary['total_purchases_count'] }}</strong></div>
                <div class="info-detail">Total Lifetime Spend: <strong>{{ $settings['currency_symbol'] }} {{ number_format($summary['total_spent']) }}</strong></div>
                <div class="info-detail">Active Layaway Plans: <strong>{{ $summary['active_layaways_count'] }}</strong></div>
            </td>
        </tr>
    </table>

    <!-- Metrics Cards Grid -->
    <table class="metrics-table">
        <tr>
            <td style="width: 33%;">
                <div class="metric-card success">
                    <div class="metric-label">Total Purchases (UGX)</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['total_spent']) }}</div>
                </div>
            </td>
            <td style="width: 33%;">
                <div class="metric-card">
                    <div class="metric-label">Total Payments Made</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['total_paid']) }}</div>
                </div>
            </td>
            <td style="width: 33%;">
                <div class="metric-card {{ $summary['outstanding_balance'] > 0 ? 'highlight' : '' }}">
                    <div class="metric-label">Outstanding Balance</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['outstanding_balance']) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Itemized Ledger Table -->
    <div class="section-heading">Transaction & Payment Ledger</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 15%;">Receipt #</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 35%;">Purchase Details / Items</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sales as $index => $sale)
                @php
                    $itemNames = $sale->saleItems->map(function ($item) {
                        return $item->product ? (($item->product->brand->name ?? '') . ' ' . $item->product->model_name) : 'Product';
                    })->implode(', ');
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td><strong>{{ $sale->receipt_number }}</strong></td>
                    <td>{{ $sale->created_at->format('d M Y') }}</td>
                    <td>
                        <span>{{ $itemNames }}</span><br/>
                        <span style="font-size: 7.5pt; color: #64748b;">Method: {{ $sale->payment_method }}</span>
                    </td>
                    <td>
                        @if($sale->payment_status === 'Paid')
                            <span class="badge badge-paid">Paid</span>
                        @elseif($sale->payment_status === 'Partial' || $sale->payment_status === 'Pending')
                            <span class="badge badge-pending">Partial / Pending</span>
                        @elseif($sale->payment_status === 'Refunded')
                            <span class="badge badge-refunded">Refunded</span>
                        @endif
                    </td>
                    <td style="text-align: right; font-weight: bold;">
                        {{ $settings['currency_symbol'] }} {{ number_format($sale->final_amount) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">
                        No purchases or transactions recorded for this customer.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Signatures -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Store Manager Signature</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Authorized Manager & Date</div>
                </div>
            </td>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Customer Acknowledgement</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">{{ $customer->name }} Signature & Date</div>
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
