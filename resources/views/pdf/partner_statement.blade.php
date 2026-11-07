<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Partner Capital Statement — {{ $partner->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 8.5pt;
            color: #1e293b;
            background: #fff;
            padding: 24px 28px;
        }

        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
        }
        .shop-name {
            font-size: 15pt;
            font-weight: bold;
            color: #0f172a;
        }
        .shop-sub {
            font-size: 8pt;
            color: #64748b;
            margin-top: 2px;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h1 {
            font-size: 12pt;
            font-weight: bold;
            color: #4f46e5;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .doc-title p {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 2px;
        }

        .info-table {
            width: 100%;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
        }
        .info-table td {
            padding: 8px 12px;
            vertical-align: top;
        }
        .info-label {
            font-size: 7pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
        }
        .info-val {
            font-size: 9pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
        }

        /* ── Metric Cards ── */
        .metrics-table {
            width: 100%;
            margin-bottom: 16px;
            border-collapse: separate;
            border-spacing: 6px;
        }
        .metric-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            background: #ffffff;
            text-align: center;
        }
        .metric-title {
            font-size: 6.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
        }
        .metric-val {
            font-size: 11pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
        }
        .metric-val.highlight {
            color: #4f46e5;
        }
        .metric-val.success {
            color: #059669;
        }

        /* ── Section Titles ── */
        .section-title {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 14px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
        }

        /* ── Tables ── */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 8pt;
        }
        .data-table th {
            background: #f1f5f9;
            color: #334155;
            font-weight: bold;
            text-align: left;
            padding: 5px 8px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            font-size: 7.5pt;
            text-transform: uppercase;
        }
        .data-table td {
            padding: 5px 8px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge {
            display: inline-block;
            padding: 2px 5px;
            font-size: 6.5pt;
            font-weight: bold;
            border-radius: 3px;
            text-transform: uppercase;
        }
        .badge-instock { background: #dbeafe; color: #1e40af; }
        .badge-sold { background: #dcfce7; color: #166534; }
        .badge-deposit { background: #e0e7ff; color: #3730a3; }
        .badge-payout { background: #fee2e2; color: #991b1b; }

        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 7pt;
            color: #94a3b8;
        }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 55%;">
                <div class="shop-name">{{ $settings['store_name'] ?? 'SmartPOS' }}</div>
                <div class="shop-sub">{{ $settings['store_address'] ?? 'Kampala, Uganda' }}</div>
                <div class="shop-sub">Tel: {{ $settings['store_phone'] ?? '+256 000 000 000' }} | Email: {{ $settings['store_email'] ?? 'info@smartpos.com' }}</div>
            </td>
            <td class="doc-title" style="width: 45%;">
                <h1>Partner Capital Statement</h1>
                <p>Generated on: {{ $date }}</p>
                <p>Status: Confidential & Verified</p>
            </td>
        </tr>
    </table>

    <table class="info-table">
        <tr>
            <td style="width: 35%;">
                <div class="info-label">Partner / Investor</div>
                <div class="info-val">{{ $partner->name }}</div>
                <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Phone: {{ $partner->phone ?? 'N/A' }}</div>
            </td>
            <td style="width: 30%;">
                <div class="info-label">Agreed Profit Share</div>
                <div class="info-val">{{ number_format($partner->profit_share_percentage, 0) }}% to Partner</div>
                <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Shop Share: {{ number_format(100 - $partner->profit_share_percentage, 0) }}%</div>
            </td>
            <td style="width: 35%;">
                <div class="info-label">Current Net Value</div>
                <div class="info-val" style="color: #4f46e5;">UGX {{ number_format($summary['total_portfolio_value']) }}</div>
                <div style="font-size: 7.5pt; color: #059669; font-weight: bold; margin-top: 2px;">
                    Ready Cash: UGX {{ number_format($summary['cash_balance_available']) }}
                </div>
            </td>
        </tr>
    </table>

    <!-- 4 KPI Cards -->
    <table class="metrics-table">
        <tr>
            <td class="metric-card" style="width: 25%;">
                <div class="metric-title">Total Capital Injected</div>
                <div class="metric-val">UGX {{ number_format($summary['total_deposits']) }}</div>
            </td>
            <td class="metric-card" style="width: 25%;">
                <div class="metric-title">Active Stock on Hand</div>
                <div class="metric-val">UGX {{ number_format($summary['in_stock_cost']) }}</div>
                <div style="font-size: 6.5pt; color: #64748b;">{{ $summary['in_stock_count'] }} phones sitting on shelf</div>
            </td>
            <td class="metric-card" style="width: 25%;">
                <div class="metric-title">Partner Profit Earned</div>
                <div class="metric-val success">+UGX {{ number_format($summary['partner_profit_earned']) }}</div>
                <div style="font-size: 6.5pt; color: #64748b;">From {{ $summary['sold_count'] }} sold phones</div>
            </td>
            <td class="metric-card" style="width: 25%;">
                <div class="metric-title">Total Payouts Disbursed</div>
                <div class="metric-val" style="color: #dc2626;">UGX {{ number_format($summary['total_payouts']) }}</div>
                <div style="font-size: 6.5pt; color: #64748b;">Principal & profit withdrawn</div>
            </td>
        </tr>
    </table>

    <!-- Section: Unsold Phones on Shelf -->
    <div class="section-title">1. Phones Currently In Stock (Purchased with Partner Capital)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Phone Model & Specs</th>
                <th style="width: 25%;">IMEI Number</th>
                <th class="text-right" style="width: 15%;">Cost Price (UGX)</th>
                <th class="text-center" style="width: 15%;">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($summary['in_stock_devices'] as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td><strong>{{ $item['model_name'] }}</strong> ({{ $item['storage_capacity'] ?? '-' }}, {{ $item['color'] ?? '-' }})</td>
                    <td>{{ $item['imei'] }}</td>
                    <td class="text-right">{{ number_format($item['cost_price']) }}</td>
                    <td class="text-center"><span class="badge badge-instock">In Stock</span></td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="text-center" style="padding: 10px; color: #94a3b8;">No active phones on shelf right now. All purchased items are sold.</td>
                </tr>
            @endforelse
            @if(count($summary['in_stock_devices']) > 0)
                <tr style="font-weight: bold; background: #f8fafc;">
                    <td colspan="3" class="text-right">Total Active Stock Cost:</td>
                    <td class="text-right">UGX {{ number_format($summary['in_stock_cost']) }}</td>
                    <td></td>
                </tr>
            @endif
        </tbody>
    </table>

    <!-- Section: Sold Phones & Profit Analysis -->
    <div class="section-title">2. Sold Phones & Profit Breakdown</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 32%;">Phone Model</th>
                <th style="width: 20%;">IMEI</th>
                <th class="text-right" style="width: 13%;">Cost (UGX)</th>
                <th class="text-right" style="width: 15%;">Sold Price (UGX)</th>
                <th class="text-right" style="width: 15%;">Partner Profit (UGX)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($summary['sold_devices'] as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td><strong>{{ $item['model_name'] }}</strong></td>
                    <td>{{ $item['imei'] }}</td>
                    <td class="text-right">{{ number_format($item['cost_price']) }}</td>
                    <td class="text-right">{{ number_format($item['sold_price']) }}</td>
                    <td class="text-right" style="color: #059669; font-weight: bold;">+{{ number_format($item['partner_profit']) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" class="text-center" style="padding: 10px; color: #94a3b8;">No sales recorded for this partner's phones yet.</td>
                </tr>
            @endforelse
            @if(count($summary['sold_devices']) > 0)
                <tr style="font-weight: bold; background: #f8fafc;">
                    <td colspan="3" class="text-right">Totals:</td>
                    <td class="text-right">UGX {{ number_format($summary['sold_cost_basis']) }}</td>
                    <td class="text-right">UGX {{ number_format($summary['sold_revenue']) }}</td>
                    <td class="text-right" style="color: #059669;">+UGX {{ number_format($summary['partner_profit_earned']) }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    <!-- Section: Financial Cash Ledger -->
    <div class="section-title">3. Capital Injections & Payout Transactions Ledger</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 15%;">Date</th>
                <th style="width: 15%;">Type</th>
                <th style="width: 25%;">Payment Account</th>
                <th style="width: 30%;">Notes / Reference</th>
                <th class="text-right" style="width: 15%;">Amount (UGX)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($transactions as $tx)
                <tr>
                    <td>{{ $tx->transaction_date ? \Carbon\Carbon::parse($tx->transaction_date)->format('d M Y') : '-' }}</td>
                    <td>
                        @if($tx->type === 'deposit')
                            <span class="badge badge-deposit">Capital Deposit</span>
                        @elseif($tx->type === 'profit_payout')
                            <span class="badge badge-payout">Profit Payout</span>
                        @else
                            <span class="badge badge-payout">Principal Return</span>
                        @endif
                    </td>
                    <td>{{ $tx->paymentAccount->name ?? 'Direct Cash' }}</td>
                    <td>{{ $tx->notes ?? ($tx->reference ?? '-') }}</td>
                    <td class="text-right" style="font-weight: bold; {{ $tx->type === 'deposit' ? 'color: #3730a3;' : 'color: #dc2626;' }}">
                        {{ $tx->type === 'deposit' ? '+' : '-' }}{{ number_format($tx->amount) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="text-center" style="padding: 10px; color: #94a3b8;">No capital transactions recorded yet.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        This document is an official accounting statement generated from the SmartPOS system. Any questions or reconciliations should be addressed to the store manager.
    </div>

</body>
</html>

